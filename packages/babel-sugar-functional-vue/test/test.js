import test from 'ava'
import { transform } from '@babel/core'
import plugin from '../dist/plugin.testing'
import jsxPlugin from '../../babel-plugin-transform-vue-jsx/dist/plugin.testing'

const transpile = src =>
  new Promise((resolve, reject) => {
    transform(
      src,
      {
        plugins: [plugin],
      },
      (err, result) => {
        if (err) {
          return reject(err)
        }
        resolve(result.code)
      },
    )
  })

const transpileWithJSXPlugin = src =>
  new Promise((resolve, reject) => {
    transform(
      src,
      {
        plugins: [plugin, jsxPlugin],
      },
      (err, result) => {
        if (err) {
          return reject(err)
        }
        resolve(result.code)
      },
    )
  })

const tests = [
  {
    name: 'Generic functional component',
    from: `export const A = ({ props, listeners }) => <div onClick={listeners.click}>{props.msg}</div>`,
    to: `export const A = {
  functional: true,
  render: (h, {
    props,
    listeners
  }) => <div onClick={listeners.click}>{props.msg}</div>
};`,
  },
  {
    name: 'Default export functional component',
    from: `export default ({ props, listeners }) => <div onClick={listeners.click}>{props.msg}</div>`,
    to: `export default {
  functional: true,
  render: (h, {
    props,
    listeners
  }) => <div onClick={listeners.click}>{props.msg}</div>
};`,
  },
  {
    name: 'Named functional component in DevMode',
    NODE_ENV: 'development',
    from: `export const A = ({ props, listeners }) => <div onClick={listeners.click}>{props.msg}</div>`,
    to: `export const A = {
  name: "A",
  functional: true,
  render: (h, {
    props,
    listeners
  }) => <div onClick={listeners.click}>{props.msg}</div>
};`,
  },
  {
    name: 'Lowercase should not compile',
    from: `export const a = ({ props, listeners }) => <div onClick={listeners.click}>{props.msg}</div>`,
    to: `export const a = ({
  props,
  listeners
}) => <div onClick={listeners.click}>{props.msg}</div>;`,
  },
  {
    name: 'Wrapper does not compile',
    from: `const Wrapped = () => wrap({
  render() {
    return <div></div>
  }
})`,
    to: `const Wrapped = () => wrap({
  render() {
    return <div></div>;
  }

});`,
  },
  {
    name: 'Wrapper of function does not compile',
    from: `const Wrapped = () => wrap(() => <span />)`,
    to: `const Wrapped = () => wrap(() => <span />);`,
  },
  {
    name: 'If JSX in function arguments does not compile',
    from: `const Wrapped = (jsx = () => <span />) => jsx`,
    to: `const Wrapped = (jsx = () => <span />) => jsx;`,
  },
  {
    name: 'If JSX in nested function does not compile',
    from: `const Wrapped = () => function () { return <span /> }`,
    to: `const Wrapped = () => function () {
  return <span />;
};`,
  },
  {
    name: 'Default export',
    from: `export default ({ props, listeners }) => <div onClick={listeners.click}>{props.msg}</div>`,
    to: `export default {
  functional: true,
  render: (h, {
    props,
    listeners
  }) => <div onClick={listeners.click}>{props.msg}</div>
};`,
  },
  {
    name: 'Ignore non-arrow function',
    from: `const a = 2; export default 3`,
    to: `const a = 2;
export default 3;`,
  },
]

tests.map(({ name, from, to, NODE_ENV }) => {
  test.serial(name, async t => {
    const nodeEnvCopy = process.env.NODE_ENV
    if (NODE_ENV) {
      process.env.NODE_ENV = NODE_ENV
    }
    t.is(await transpile(from), to)
    if (NODE_ENV) {
      process.env.NODE_ENV = nodeEnvCopy
    }
  })
})

test('Should work with JSX plugin enabled', async t => {
  const from = `export const A = ({ props, listeners }) => <div onClick={listeners.click}>{props.msg}</div>`
  const to = `export const A = {
  functional: true,
  render: (h, {
    props,
    listeners
  }) => h("div", {
    "on": {
      "click": listeners.click
    }
  }, [props.msg])
};`
  t.is(await(transpileWithJSXPlugin(from)), to)
})
