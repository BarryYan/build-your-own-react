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

function createDom(fiber) {
  const { type, props: {children, ...restProps } } = fiber;
  const dom = type === ELEMENT_TYPE.TEXT_ELEMENT
    ? document.createTextNode("")
    : document.createElement(type);
  Object.entries(restProps).forEach(([name, value]) => {
    dom[name] = value;
  })
  return dom;
}

function render(element, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element]
    }
  }
}


let nextUnitOfWork = null;
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  if (fiber.parent) {
    fiber.parent.dom.append(fiber.dom);
  }
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;
  while (index < elements.length) {
    const element = elements[index];
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }
    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber;
    index++;
  }
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
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
