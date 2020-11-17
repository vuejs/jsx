import syntaxJsx from '@babel/plugin-syntax-jsx'

const PLUGIN_DATA_PREFIX = `@vue/babel-sugar-inject-h_${Date.now()}`

// helpers for ast custom data get/set
const getv = (p, k) => p.getData(`${PLUGIN_DATA_PREFIX}_${k}`)
const setv = (p, k, v) => p.setData(`${PLUGIN_DATA_PREFIX}_${k}`, v)

/**
 * Get the index of the parameter `h`
 * @param t
 * @param path ObjectMethod | ClassMethod | Function
 * @returns number -1 if not found
 */
const indexOfParamH = (t, path) => {
  const params = path.get('params')
  return params.length ? params.findIndex(p => t.isIdentifier(p) && p.node.name === 'h') : -1
}

/**
 * Check if expression is an object member function
 */
const isObjectMemberFunc = (t, path) => t.isFunction(path) && t.isObjectMember(path.parentPath)

/**
 * Check if expression is an object function-typed member
 */
const isMemberFunction = (t, path) => t.isObjectMethod(path) || t.isClassMethod(path) || isObjectMemberFunc(t, path)

// find JSX, returns the first walked jsx expression
const findJSXElement = (t, path) => {
  let elem = null
  path.traverse({
    JSXElement (p) {
      elem = p
      p.stop()
    }
  })
  return elem
}

/**
 * Get function-typed ancestry of the specific node range
 * @param path JSXElement
 * @param root The last boundary node
 * @returns the ancestry paths
 */
const getFuncAncestry = (t, path, root) => {
  const paths = []
  if (path !== root) {
    while (path = path.parentPath) {
      if (t.isFunction(path)) {
        paths.push(path)
      }
      if (path === root) break
    }
  }
  return paths
}

/**
 * Check if is inside a JSX expression
 * @param t
 * @param path ObjectMethod | ClassMethod
 * @returns boolean
 */
const isInsideJSXExpression = (t, path) => path.findParent(p => p && t.isJSX(p)) !== null

/**
 * Cleanup and reduce stack that `distance` gt than reference's
 * @param stack
 * @param reference The reference node to match
 */
const cleanupStack = (stack, path) => {
  const ref = getv(path, 'distance')
  stack.forEach(p => {
    if (getv(p, 'distance') > ref) setv(p, 'hasJSX', false)
  })
}

/**
 * Prepend parameter `h` to function params (ensure as the first parameter)
 *
 * @param path {ArrowFunctionExpression|FunctionExpression}
 */
const addParamH = (t, path) => {
  path.node.params = [t.identifier('h')].concat(path.node.params)
}

/**
 * Prepend `h` variable to function body, i.e. const h = xxx;
 *
 * @param path {ObjectMethod|ClassMethod|FunctionExpression}
 */
const patchVariableH = (t, path) => {
  const funcName = path.isFunctionExpression()
    ? path.parent.key.name
    : path.node.key.name
  const isRender = funcName === 'render'

  if (isRender) {
    addParamH(t, path)
    return
  }

  path
    .get('body')
    .unshiftContainer(
      'body',
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('h'),
          t.memberExpression(t.thisExpression(), t.identifier('$createElement')),
        ),
      ]),
    )
}

export default babel => {
  const t = babel.types

  return {
    inherits: syntaxJsx,
    visitor: {
      Program (p) {
        const stack = []
        p.traverse({
          'ObjectMethod|ClassMethod|FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
            enter (path) {
              const jsxElem = findJSXElement(t, path)
              if (!jsxElem || isInsideJSXExpression(t, path)) {
                return
              }

              const ancestry = getFuncAncestry(t, jsxElem, path)
              const isObjFn = isMemberFunction(t, path)

              // check if JSX expression is in method
              if (!isObjFn && ancestry.some(p => isMemberFunction(t, p))) {
                return
              }

              // add to pending stack
              stack.push(path)

              setv(path, 'hasJSX', true)
              setv(path, 'distance', ancestry.length)

              // check params already has param `h`
              if (indexOfParamH(t, path) !== -1) {
                setv(path, 'fixed', true)
                return
              }

              if (isObjFn) {
                if (path.isArrowFunctionExpression()) {
                  addParamH(t, path)
                } else {
                  patchVariableH(t, path)
                }
                setv(path, 'fixed', true)
              }
            },
            exit (path) {
              if (!getv(path, 'hasJSX')) {
                return
              }
              stack.pop()

              // skip and cancel remaining nodes if `h` has fixed
              if (getv(path, 'fixed')) {
                cleanupStack(stack, path)
                return
              }

              // skip, functional JSX `h` should to be fixed in top of pending stack
              if (!isObjectMemberFunc(t, path) && stack.some(p => getv(p, 'hasJSX'))) {
                return
              }

              addParamH(t, path)
              setv(path, 'fixed', true)

              cleanupStack(stack, path)
            }
          }
        })
      }
    },
  }
}
