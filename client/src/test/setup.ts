import { Window } from "happy-dom";

const windowInstance = new Window({
  url: "http://localhost",
});

Object.assign(windowInstance, {
  SyntaxError,
});

Object.assign(globalThis, {
  window: windowInstance,
  document: windowInstance.document,
  navigator: windowInstance.navigator,
  localStorage: windowInstance.localStorage,
  sessionStorage: windowInstance.sessionStorage,
  MutationObserver: windowInstance.MutationObserver,
  Node: windowInstance.Node,
  DocumentFragment: windowInstance.DocumentFragment,
  HTMLElement: windowInstance.HTMLElement,
  Event: windowInstance.Event,
  CustomEvent: windowInstance.CustomEvent,
  getComputedStyle: windowInstance.getComputedStyle.bind(windowInstance),
});

if (!("requestAnimationFrame" in globalThis)) {
  (globalThis as { requestAnimationFrame?: (cb: FrameRequestCallback) => number }).requestAnimationFrame =
    (cb) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
}

if (!("cancelAnimationFrame" in globalThis)) {
  (
    globalThis as { cancelAnimationFrame?: (handle: number) => void }
  ).cancelAnimationFrame = (handle) => clearTimeout(handle);
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
