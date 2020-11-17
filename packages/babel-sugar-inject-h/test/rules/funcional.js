const functionalTests = [
  {
    name: 'Simple injection in purge function (expressions)',
    from: `
const funcExpr = (ctx) => {
  return <C {...ctx} />
};

function funcTest(ctx) {
  return <C {...ctx} />
}
`,
    to: `
const funcExpr = (h, ctx) => {
  return <C {...ctx} />;
};

function funcTest(h, ctx) {
  return <C {...ctx} />;
}
`,
  },
  {
    name: 'Injection in closure with nested function expressions',
    from: `
const funcExpr = (ctx) => () => () => {
  return <C {...ctx} />
}

function funcTest(ctx) {
  return function () {
    return function () {
      return <C {...ctx} />
    }
  }
}
`,
    to: `
const funcExpr = (h, ctx) => () => () => {
  return <C {...ctx} />;
};

function funcTest(h, ctx) {
  return function () {
    return function () {
      return <C {...ctx} />;
    };
  };
}
`,
  },
  {
    name: 'Injection disabled in nested functional JSX expressions (variant jsx types)',
    from: `
const obj = {
  method () {
    return (
      <C foo={{
        render() {
          return <div />
        },
        foo: function() {
          return <div />
        }
      }} { ...{
        scopedSlots: {
          default: scope => <Icon />
        }
      }} />
    )
  }
}
`,
    to: `
const obj = {
  method() {
    const h = this.$createElement;
    return <C foo={{
      render() {
        return <div />;
      },

      foo: function () {
        return <div />;
      }
    }} {...{
      scopedSlots: {
        default: scope => <Icon />
      }
    }} />;
  }

};
`,
  },
  {
    name: 'Injection disabled when the closure has an explicit parameter named `h`',
    from: `
function funcTestWithH(ctx, h) {
  return <C {...ctx} />
}

const closure1WithH = (ctx, h) => {
  return <C {...ctx} />
}

const closure2WithH = ctx => () => h => {
  return <C {...ctx} />
}

const closure3WithH = ctx => h => () => {
  return <C {...ctx} />
}

const closure4WithH = (h, ctx) => () => () => {
  return <C {...ctx} />
}
`,
    to: `
function funcTestWithH(ctx, h) {
  return <C {...ctx} />;
}

const closure1WithH = (ctx, h) => {
  return <C {...ctx} />;
};

const closure2WithH = ctx => () => h => {
  return <C {...ctx} />;
};

const closure3WithH = ctx => h => () => {
  return <C {...ctx} />;
};

const closure4WithH = (h, ctx) => () => () => {
  return <C {...ctx} />;
};
`,
  },
  {
    name: 'Injection in object member with type of function/arrow expressions',
    from: `
const obj = {
  foo: function () {
    return <C />
  },
  baz: () => <C />,
  render: () => <C />
}
`,
    to: `
const obj = {
  foo: function () {
    const h = this.$createElement;
    return <C />;
  },
  baz: h => <C />,
  render: h => <C />
};
`,
  },
  {
    name: 'Injection should be disabled when the functional JSX scope owned by an object',
    from: `
const closureFunc = cfg => {
  const obj = {
    ...cfg,
    render: () => <C />
  }
  return obj
}
`,
    to: `
const closureFunc = cfg => {
  const obj = { ...cfg,
    render: h => <C />
  };
  return obj;
};
`,
  },
  {
    name: 'Injection in object method/function with closure JSX expressions',
    from: `
const obj = {
  arrowFn: () => {
    const closureFunc = cfg => {
      return <C cfg={cfg} />
    }
    return closureFunc({})
  },
  func: function () {
    const closureFunc = cfg => {
      return <C cfg={cfg} />
    }
    return closureFunc({})
  },
  renderItem() {
    const closureFunc = cfg => {
      return <C cfg={cfg} />
    }
    return closureFunc({})
  }

};
`,
    to: `
const obj = {
  arrowFn: h => {
    const closureFunc = cfg => {
      return <C cfg={cfg} />;
    };

    return closureFunc({});
  },
  func: function () {
    const h = this.$createElement;

    const closureFunc = cfg => {
      return <C cfg={cfg} />;
    };

    return closureFunc({});
  },

  renderItem() {
    const h = this.$createElement;

    const closureFunc = cfg => {
      return <C cfg={cfg} />;
    };

    return closureFunc({});
  }

};
`,
  },
]

module.exports = functionalTests
