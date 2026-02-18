class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = ResizeObserverMock;
}

if (!(globalThis as any).scrollTo) {
  (globalThis as any).scrollTo = () => {};
}
