import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { containOverlayFocus } from '../src/components/ui/overlay-focus';

function createPage(t: TestContext) {
  let order = 0;
  const doc = Object.assign(new EventTarget(), {
    body: null as unknown as FakeElement,
    activeElement: null as FakeElement | null,
    defaultView: { getComputedStyle: () => ({ visibility: 'visible' }) },
  });
  class FakeElement {
    static DOCUMENT_POSITION_FOLLOWING = 4;
    ownerDocument = doc;
    children: FakeElement[] = [];
    parentElement: FakeElement | null = null;
    isConnected = true;
    inert = false;
    tabIndex = -1;
    backdrop = false;
    order = order++;
    constructor(parent?: FakeElement, focusable = false) {
      if (parent) {
        this.parentElement = parent;
        parent.children.push(this);
      }
      if (focusable) this.tabIndex = 0;
    }
    contains(node: FakeElement | null): boolean {
      return node === this || this.children.some((child) => child.contains(node));
    }
    hasAttribute(name: string) {
      return name === 'data-overlay-backdrop' && this.backdrop;
    }
    matches(selector: string) {
      return selector !== ':disabled' && this.tabIndex >= 0;
    }
    closest(): FakeElement | null {
      return this.inert ? this : (this.parentElement?.closest() ?? null);
    }
    querySelectorAll(): FakeElement[] {
      return this.children.flatMap((child) => [
        ...(child.tabIndex >= 0 ? [child] : []),
        ...child.querySelectorAll(),
      ]);
    }
    getClientRects() {
      return [{}];
    }
    compareDocumentPosition(other: FakeElement) {
      return this.order < other.order ? 4 : 2;
    }
    focus() {
      if (this.closest()) return;
      doc.activeElement = this;
      const event = new Event('focusin');
      Object.defineProperty(event, 'target', { value: this });
      doc.dispatchEvent(event);
    }
  }
  for (const name of ['HTMLElement', 'Node']) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value: FakeElement });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
  const body = new FakeElement();
  doc.body = body;
  const header = new FakeElement(body);
  const menuButton = new FakeElement(header, true);
  const otherHeaderControl = new FakeElement(header, true);
  const backdrop = new FakeElement(header);
  backdrop.backdrop = true;
  const panel = new FakeElement(header);
  const first = new FakeElement(panel, true);
  const last = new FakeElement(panel, true);
  const main = new FakeElement(body);
  const articleLink = new FakeElement(main, true);
  const tab = (shiftKey = false) => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { key: 'Tab', shiftKey });
    doc.dispatchEvent(event);
    return event;
  };
  const contain = (withMenuButton = false) =>
    containOverlayFocus(
      panel as unknown as HTMLElement,
      first as unknown as HTMLElement,
      withMenuButton ? [menuButton as unknown as HTMLElement] : []
    );
  return {
    doc,
    menuButton,
    otherHeaderControl,
    backdrop,
    first,
    last,
    main,
    articleLink,
    tab,
    contain,
  };
}

test('a mobile search panel isolates the page and wraps keyboard focus', (t) => {
  const page = createPage(t);
  const release = page.contain();
  assert.equal(page.main.inert, true);
  assert.equal(page.otherHeaderControl.inert, true);
  assert.equal(page.backdrop.inert, false, 'backdrop clicks remain available');
  assert.equal(page.doc.activeElement, page.first);
  page.last.focus();
  assert.equal(page.tab().defaultPrevented, true);
  assert.equal(page.doc.activeElement, page.first);
  page.tab(true);
  assert.equal(page.doc.activeElement, page.last);
  page.articleLink.focus();
  assert.equal(page.doc.activeElement, page.last, 'background inert prevents focus');
  release();
  assert.equal(page.main.inert, false);
  page.articleLink.focus();
  assert.equal(page.doc.activeElement, page.articleLink);
});

test('the menu trigger remains reachable while other header actions are isolated', (t) => {
  const page = createPage(t);
  const release = page.contain(true);
  assert.equal(page.menuButton.inert, false);
  assert.equal(page.otherHeaderControl.inert, true);
  page.menuButton.focus();
  page.tab(true);
  assert.equal(page.doc.activeElement, page.last);
  page.tab();
  assert.equal(page.doc.activeElement, page.menuButton);
  release();
});

test('navigation releases overlapping focus scopes without overwriting original inert state', (t) => {
  const page = createPage(t);
  page.otherHeaderControl.inert = true;
  const firstRelease = page.contain();
  const lastRelease = page.contain();
  firstRelease();
  assert.equal(page.main.inert, true);
  page.doc.dispatchEvent(new Event('astro:before-swap'));
  assert.equal(page.main.inert, false);
  assert.equal(page.otherHeaderControl.inert, true);
  lastRelease();
  assert.equal(page.main.inert, false);
});
