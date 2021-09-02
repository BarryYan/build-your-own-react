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

let wipRoot = null;
let nextUnitOfWork = null;
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    }
  }
  nextUnitOfWork = wipRoot;
}

requestIdleCallback(workLoop);

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
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

function commitRoot() {
  commitWork(wipRoot.child);
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  domParent.append(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
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
