import syntaxJsx from "@babel/plugin-syntax-jsx";

/**
 * Check if first parameter is `h`
 * @param t
 * @param path ObjectMethod | ClassMethod
 * @returns boolean
 */
const firstParamIsH = (t, path) => {
  const params = path.get("params");
  return params.length && t.isIdentifier(params[0]) && params[0].node.name === "h";
};

/**
 * Check if body contains JSX
 * @param t
 * @param path ObjectMethod | ClassMethod
 * @returns boolean
 */
const hasJSX = (t, path) => {
  const JSXChecker = {
    hasJSX: false,
  };
  path.traverse(
    {
      JSXElement() {
        this.hasJSX = true;
      },
    },
    JSXChecker
  );
  return JSXChecker.hasJSX;
};

/**
 * Check if is inside a JSX expression
 * @param t
 * @param path ObjectMethod | ClassMethod
 * @returns boolean
 */
const isInsideJSXExpression = (t, path) => {
  if (!path.parentPath) {
    return false;
  }
  if (t.isJSXExpressionContainer(path.parentPath)) {
    return true;
  }
  return isInsideJSXExpression(t, path.parentPath);
};

/**
 * generate code after inject h
 * @param {*} t
 * @param {*} path
 * @param {*} isRender
 * @returns void
 */
const generateCode = (t, path, isRender) => {
  if (firstParamIsH(t, path) || !hasJSX(t, path) || isInsideJSXExpression(t, path)) {
    return;
  }

  path.get("body").unshiftContainer("body", t.variableDeclaration("const", [t.variableDeclarator(t.identifier("h"), isRender ? t.memberExpression(t.identifier("arguments"), t.numericLiteral(0), true) : t.memberExpression(t.thisExpression(), t.identifier("$createElement")))]));
};

export default (babel) => {
  const t = babel.types;

  return {
    inherits: syntaxJsx,
    visitor: {
      Program(path1) {
        path1.traverse({
          "ObjectMethod|ClassMethod"(path) {
            const isRender = path.node.key.name === "render";
            generateCode(t, path, isRender);
          },
          ObjectProperty(path) {
            const isRender = "render" === path.node.key.name;
            const isFunctionExpression = "FunctionExpression" === path.node.value.type;
            if (isFunctionExpression && isRender) {
              path.traverse({
                FunctionExpression(path) {
                  generateCode(t, path, true);
                },
              });
            }
          },
        });
      },
    },
  };
};
