
enum ELEMENT_TYPE {
  TEXT_ELEMENT = 'TEXT_ELEMENT',
}

interface Element {
  type: ELEMENT_TYPE;
  props: Props;
}

interface Props {
  nodeValue?: string;
  style?: string | object;
  children: Element[];
}

function createElement(type: ELEMENT_TYPE, props: Props, ...children: Element[]): Element {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === 'object' ? child : createTextElement(child)),
    },
  };
}

function createTextElement(text: string):Element {
  return {
    type: ELEMENT_TYPE.TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function render(element: Element, container: HTMLElement|Text|null) {
  const { type, props: {children, style, ...restProps } } = element;
  const dom = type === ELEMENT_TYPE.TEXT_ELEMENT
    ? document.createTextNode("")
    : document.createElement(type);
  Object.entries(restProps).forEach(([name, value]) => {
    // @ts-ignore
    dom[name] = value;
  })
  if (typeof style === "object") {
    Object.entries(style).forEach(([name, value]) => {
      // @ts-ignore
      dom.style[name] = value;
    })
  } else {

   }
  children.forEach(child => {
    render(child, dom)
  });
  container?.appendChild(dom);
}

const Didact = {
  createElement,
  render,
};

/** @jsxRuntime classic /
/** @jsx Didact.createElement */
const element = (
  <div style={ {background: 'red'}}>
    <h1>Hello World</h1>
    Test
    <h2 style={{textAlign: "center"}}>from Didact</h2>
  </div>
);
const container = document.getElementById("root");
Didact.render(element, container);

export { };
