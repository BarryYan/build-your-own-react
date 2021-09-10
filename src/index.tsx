enum ELEMENT_TYPE {
  TEXT_ELEMENT = 'TEXT_ELEMENT',
  REACT_ELEMENT = 'REACT_ELEMENT'
}

interface Element {
  type: ELEMENT_TYPE;
  props: Props;
}

enum EFFECT_TAG {
  UPDATE = 'UPDATE',
  PLACEMENT = 'PLACEMENT',
  DELETION = 'DELETION'
}

interface Fiber extends Element {
  dom: HTMLElement | null;
  parent: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  alternate: Fiber | null;
  effectTag?: EFFECT_TAG;
  hooks?: Array<{
    state: any,
    queue: Array<Function>
  }>;
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

function createTextElement(text: string): Element {
  return {
    type: ELEMENT_TYPE.TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createDom(fiber: Fiber): HTMLElement {
  const { type, props } = fiber;
  const dom = (type === ELEMENT_TYPE.TEXT_ELEMENT
    ? document.createTextNode("")
    : document.createElement(type)) as HTMLElement;

  updateDom(dom, {} as Props, props);
  return dom;
}

let wipRoot: Fiber | null = null;
let currentRoot: Fiber | null = null;
let nextUnitOfWork: Fiber | null = null;
let deletions: Fiber[] = [];

function render(element: Element, container: HTMLElement) {
  wipRoot = {
    type: ELEMENT_TYPE.REACT_ELEMENT,
    dom: container,
    props: {
      children: [element]
    },
    parent: null,
    child: null,
    sibling: null,
    alternate: currentRoot,
  };
  nextUnitOfWork = wipRoot;
  deletions = []
}

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}


// @ts-ignore
window.requestIdleCallback(workLoop);

function workLoop(deadline: IdleDeadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  // @ts-ignore
  window.requestIdleCallback(workLoop);
}


function performUnitOfWork(fiber: Fiber): Fiber | null {
  const isFunctionComponent = typeof fiber.type === 'function';
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber: Fiber | null = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
}

let wipFiber: Fiber | null = null;
let hookIndex: number = 0;

function updateFunctionComponent(fiber: Fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [(fiber.type as unknown as Function)(fiber.props)]
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber: Fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
}

function useState(initState: any) {
  const oldHook = wipFiber?.alternate && wipFiber?.alternate.hooks && wipFiber?.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initState,
    queue: []
  }

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = action(hook.state)
  });

  // @ts-ignore
  const setState = (state) => {
    const action = typeof state === 'function' ? state : () => state;
    // @ts-ignore
    hook.queue.push(action);

    wipRoot = {
      dom: currentRoot!.dom,
      props: currentRoot!.props,
      alternate: currentRoot,
    } as Fiber;
    nextUnitOfWork = wipRoot
    deletions = []
  }
  wipFiber?.hooks?.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function reconcileChildren(wipFiber: Fiber, elements: Element[]) {
  let index = 0;
  let oldFiber: Fiber | null = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling: Fiber | null = null;

  while (index < elements.length || oldFiber) {
    const element = elements[index];
    let newFiber: Fiber | null = null;
    const sameType = oldFiber && element && oldFiber.type === element.type;
    if (sameType) {
      newFiber = {
        type: oldFiber!.type,
        props: element!.props,
        dom: oldFiber!.dom,
        alternate: oldFiber,
        parent: wipFiber,
        child: null,
        sibling: null,
        effectTag: EFFECT_TAG.UPDATE,
      }
    }

    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        alternate: null,
        parent: wipFiber,
        child: null,
        sibling: null,
        effectTag: EFFECT_TAG.PLACEMENT,
      }
    }

    if (oldFiber && !sameType) {
      oldFiber.effectTag = EFFECT_TAG.DELETION;
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}

function commitRoot() {
  deletions.forEach(commitWork)
  if (wipRoot) {
    commitWork(wipRoot.child);
    currentRoot = wipRoot;
    wipRoot = null;
  }
}

function commitWork(fiber: Fiber | null) {
  if (!fiber) {
    return;
  }
  let domParentFiber = fiber.parent;
  while (!domParentFiber?.dom) {
    domParentFiber = domParentFiber!.parent;
  }
  const domParent = domParentFiber?.dom;
  if (fiber.effectTag === EFFECT_TAG.PLACEMENT && fiber.dom) {
    domParent?.append(fiber.dom as Node);
  } else if (fiber.effectTag === EFFECT_TAG.UPDATE && fiber.dom) {
    updateDom(fiber.dom, fiber.alternate!.props, fiber.props);
  } else if (fiber.effectTag === EFFECT_TAG.DELETION) {
    commitDeletion(fiber, domParent)
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber: Fiber | null, domParent: HTMLElement) {
  if (fiber?.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber!.child, domParent);
  }
}

const isEvent = (key: string) => key.startsWith('on');
const isProperty = (key: string) => key !== "children" && !isEvent(key)
// @ts-ignore
const isNew = (prev, next) => key => prev[key] !== next[key];
// @ts-ignore
const isGone = (prev, next) => key => !(key in next);
function updateDom(dom: HTMLElement, prevProps: Props, nextProps: Props) {
  // Remove old event
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      // @ts-ignore
      dom.removeEventListener(eventType, prevProps[name]);
    })
  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      // @ts-ignore
      dom[name] = ''
    })
  // Add new properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      // @ts-ignore
      dom[name] = nextProps[name]
    })
  // Add new event
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      // @ts-ignore
      dom.addEventListener(eventType, nextProps[name]);
    })

  // Set style object properties
  const { style } = nextProps;
  if (typeof style === 'object') {
    Object.entries(style).forEach(([name, value]) => {
      // @ts-ignore
      dom.style[name] = value;
    })
  }
}

const Didact = {
  createElement,
  render,
  useState
};

/** @jsxRuntime classic /
/** @jsx Didact.createElement */
const container = document.getElementById("root") as HTMLElement;

const App = (props: { name: string }) => {
  const [count, setCount] = Didact.useState(0);
  const { name } = props;
  return (
    <div style={{ background: 'red' }} >
      <h1 onClick={() => setCount(count + 1)}>Hello {name}</h1>
      <h1 onClick={() => setCount((c: number) => c + 1)}>Count: {count}</h1>
    </div>
  );
}

const element = <App name="World" />;
Didact.render(element, container);


export { };
