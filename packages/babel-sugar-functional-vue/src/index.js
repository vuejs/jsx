import syntaxJsx from '@babel/plugin-syntax-jsx'

/**
 * Check path has JSX
 * @param t
 * @param path
 * @returns boolean
 */
const hasJSX = (t, path) => {
  let hasJSX = false
  let parentScope

  path.traverse({
    JSXElement(elPath) {
      if (parentScope === elPath.scope) {
        hasJSX = true
      }
    },

    ArrowFunctionExpression(blockPath) {
      const isParent = blockPath.parentPath === path

      if (!isParent) {
        return
      }

      parentScope = blockPath.scope
    },
  })

  return hasJSX
}

/**
 * Check if it's a functional componet declarator
 * @param t
 * @param path
 * @returns boolean
 */
const isFunctionalComponentDeclarator = (t, path) => {
  const firstCharacter = path.get('id.name').node[0]
  if (firstCharacter < 'A' || firstCharacter > 'Z') {
    return false
  }

  return hasJSX(t, path)
}

/**
 * Convert arrow function to functional component
 * @param t
 * @param path
 * @param name
 */
const convertFunctionalComponent = (t, path, name = null) => {
  const params = [t.identifier('h'), ...path.node.params]
  const body = path.node.body
  const props = [
    t.objectProperty(t.identifier('functional'), t.booleanLiteral(true)),
    t.objectProperty(t.identifier('render'), t.arrowFunctionExpression(params, body)),
  ]
  if (process.env.NODE_ENV === 'development' && name) {
    props.unshift(t.objectProperty(t.identifier('name'), t.stringLiteral(name)))
  }
  path.replaceWith(t.objectExpression(props))
}

export default babel => {
  const t = babel.types

  return {
    inherits: syntaxJsx,
    visitor: {
      Program(p) {
        p.traverse({
          ExportDefaultDeclaration: {
            exit(path) {
              if (!t.isArrowFunctionExpression(path.node.declaration) || !hasJSX(t, path)) {
                return
              }

              convertFunctionalComponent(t, path.get('declaration'))
            },
          },
          VariableDeclaration: {
            exit(path) {
              if (
                path.node.declarations.length !== 1 ||
                !t.isVariableDeclarator(path.node.declarations[0]) ||
                !t.isArrowFunctionExpression(path.node.declarations[0].init)
              ) {
                return
              }

              const declarator = path.get('declarations')[0]

              if (!isFunctionalComponentDeclarator(t, declarator)) {
                return
              }

              const name = path.node.declarations[0].id.name
              convertFunctionalComponent(t, path.get('declarations')[0].get('init'), name)
            },
          },
        })
      }
    },
  }
}
