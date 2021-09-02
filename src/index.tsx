enum ELEMENT_TYPE {
  TEXT_ELEMENT = 'TEXT_ELEMENT',
  UNKNOW_ELEMENT = 'UNKNOW_ELEMENT'
}

interface Element {
  type: ELEMENT_TYPE;
  props: Props;
}

interface Fiber extends Element {
  parent: Fiber|null;
  child: Fiber | null;
  sibling: Fiber | null;
  dom: HTMLElement|null;
}

interface Props {
  nodeValue?: string;
  style?: string | {
    [key: string]: string | number
  };
  children: Element[];
}


function createElement(type: ELEMENT_TYPE, props: Props, ...children: Fiber[]): Element {
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

function createDom(fiber:Fiber):HTMLElement {
  const { type, props: {children, style, ...restProps } } = fiber;
  const dom = (type === ELEMENT_TYPE.TEXT_ELEMENT
    ? document.createTextNode("")
    : document.createElement(type)) as HTMLElement;
  Object.entries(restProps).forEach(([name, value]) => {
    // @ts-ignore
    dom[name] = value;
  })
  if (typeof style === 'object') {
    Object.entries(style).forEach(([name, value]) => {
      // @ts-ignore
      dom.style[name] = value;
    })
  }
  return dom;
}

function render(element:Element, container:HTMLElement) {
  nextUnitOfWork = {
    type: ELEMENT_TYPE.UNKNOW_ELEMENT,
    dom: container,
    props: {
      children: [element]
    },
    parent: null,
    child: null,
    sibling: null,
  };
}

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}


let nextUnitOfWork:Fiber|null = null;
function workLoop(deadline: IdleDeadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  // @ts-ignore
  window.requestIdleCallback(workLoop);
}

// @ts-ignore
window.requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Fiber):Fiber|null {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  if (fiber.parent) {
    fiber.parent.dom?.append(fiber.dom);
  }
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling:Fiber|null = null;
  while (index < elements.length) {
    const element = elements[index];
    const newFiber: Fiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      child: null,
      sibling: null,
      dom: null
    }
    if (index === 0) {
      fiber.child = newFiber;
    } else if(prevSibling){
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber;
    index++;
  }
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber:Fiber|null = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
}

const Didact = {
  createElement,
  render,
};

/** @jsxRuntime classic /
/** @jsx Didact.createElement */
const element = (
  <div style={{background: 'red'}}>
    <h1>Hello World</h1>
    Test
    <h2 style={{textAlign: "center"}}>from Didact</h2>
  </div>
);
const container = document.getElementById("root") as HTMLElement;
Didact.render(element, container);

export { };
