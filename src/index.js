function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === 'object' ? child : createTextElement(child)),
    },
  };
}

const ELEMENT_TYPE = {
  TEXT_ELEMENT: 'TEXT_ELEMENT',
}

function createTextElement(text) {
  return {
    type: ELEMENT_TYPE.TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function render(element, container) {
  const { type, props: {children, ...restProps } } = element;
  const dom = type === ELEMENT_TYPE.TEXT_ELEMENT
    ? document.createTextNode("")
    : document.createElement(type);
  Object.entries(restProps).forEach(([name, value]) => {
    dom[name] = value;
  })
  children.forEach(child => {
    render(child, dom)
  });
  container.appendChild(dom);
}

const Didact = {
  createElement,
  render,
};

/** @jsxRuntime classic /
/** @jsx Didact.createElement */
const element = (
  <div style="background: red">
    <h1>Hello World</h1>
    Test
    <h2 style="text-align: right">from Didact</h2>
  </div>
);
const container = document.getElementById("root");
Didact.render(element, container);
