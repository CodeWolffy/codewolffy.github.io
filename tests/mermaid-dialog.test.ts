import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { createMermaidDialog } from '../src/components/mdx/mermaid-dialog';
import { lockPageScroll } from '../src/lib/scroll-lock';

function createHarness() {
  const root = { clientWidth: 980, style: { overflow: 'auto', paddingRight: '' } };
  const body = { style: { overflow: '', paddingRight: '8px' } };
  const view = {
    innerWidth: 1000,
    getComputedStyle: (element: { visibility?: string }) => ({
      paddingRight: '8px',
      visibility: element.visibility ?? 'visible',
    }),
  };
  const doc = Object.assign(new EventTarget(), {
    documentElement: root,
    body,
    defaultView: view,
    activeElement: null as unknown,
  });
  let focusedClose = 0;
  let focusedTrigger = 0;
  const trigger = { isConnected: true, focus: () => (focusedTrigger += 1) };
  const control = (name: string) => ({
    name,
    tabIndex: 0,
    disabled: false,
    hidden: false,
    hasRect: true,
    visibility: 'visible',
    matches() {
      return this.disabled;
    },
    closest() {
      return this.hidden ? this : null;
    },
    getClientRects() {
      return this.hasRect ? [{}] : [];
    },
    focus() {
      doc.activeElement = this;
      if (name === 'close') focusedClose += 1;
    },
  });
  const first = control('zoom-out');
  const middle = control('zoom-in');
  const last = control('close');
  const controls = [first, middle, last];
  const dialog = Object.assign(new EventTarget(), {
    ownerDocument: doc,
    open: false,
    isConnected: true,
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
      queueMicrotask(() => dialog.dispatchEvent(new Event('close')));
    },
    querySelector: () => last,
    querySelectorAll: () => controls,
    focus: () => {
      doc.activeElement = dialog;
    },
  });
  const controller = createMermaidDialog(dialog as unknown as HTMLDialogElement);
  const open = () => controller.open(trigger as unknown as HTMLElement);
  const tab = (shiftKey = false) => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { key: 'Tab', shiftKey });
    doc.dispatchEvent(event);
    return event;
  };
  return {
    root,
    body,
    doc,
    dialog,
    controller,
    trigger,
    open,
    first,
    middle,
    last,
    control,
    controls,
    tab,
    focusCounts: () => ({ close: focusedClose, trigger: focusedTrigger }),
    lock: () => lockPageScroll(doc as unknown as Document, view as unknown as Window),
  };
}

test('Escape closes the dialog, releases scroll and returns focus exactly once', async () => {
  const harness = createHarness();
  harness.open();
  harness.open();
  assert.equal(harness.dialog.open, true);
  assert.equal(harness.root.style.overflow, 'hidden');
  assert.equal(harness.body.style.paddingRight, '28px');
  assert.deepEqual(harness.focusCounts(), { close: 1, trigger: 0 });

  const cancel = new Event('cancel', { cancelable: true });
  harness.dialog.dispatchEvent(cancel);
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(harness.dialog.open, false);
  assert.equal(harness.root.style.overflow, 'auto');
  assert.equal(harness.body.style.paddingRight, '8px');
  await setImmediate();
  assert.deepEqual(harness.focusCounts(), { close: 1, trigger: 1 });
  harness.controller.dispose();
});

test('native close also cleans up scroll ownership', async () => {
  const harness = createHarness();
  harness.open();
  harness.dialog.close();
  await setImmediate();
  assert.equal(harness.root.style.overflow, 'auto');
  assert.deepEqual(harness.focusCounts(), { close: 1, trigger: 1 });
  harness.controller.dispose();
});

test('navigation releases the captured page synchronously without restoring old focus', async () => {
  const harness = createHarness();
  harness.open();
  harness.doc.dispatchEvent(new Event('astro:before-swap'));
  assert.equal(harness.root.style.overflow, 'auto');
  assert.equal(harness.body.style.paddingRight, '8px');
  harness.doc.body = { style: { overflow: 'clip', paddingRight: '12px' } };
  harness.trigger.isConnected = false;
  await setImmediate();
  assert.deepEqual(harness.doc.body.style, { overflow: 'clip', paddingRight: '12px' });
  assert.deepEqual(harness.focusCounts(), { close: 1, trigger: 0 });
  harness.controller.dispose();
  harness.controller.dispose();
});

test('a queued close event cannot unlock a dialog that was reopened immediately', async () => {
  const harness = createHarness();
  harness.open();
  harness.controller.close();
  harness.open();
  await setImmediate();
  assert.equal(harness.dialog.open, true);
  assert.equal(harness.root.style.overflow, 'hidden');
  assert.equal(harness.body.style.paddingRight, '28px');
  harness.controller.dispose();
  assert.equal(harness.root.style.overflow, 'auto');
});

test('closing fullscreen keeps another panel scroll lock active', () => {
  const harness = createHarness();
  const releaseOther = harness.lock();
  harness.open();
  harness.controller.close();
  assert.equal(harness.root.style.overflow, 'hidden');
  releaseOther();
  assert.equal(harness.root.style.overflow, 'auto');
  assert.equal(harness.body.style.paddingRight, '8px');
  harness.controller.dispose();
});

test('Tab from the initially focused close button wraps to the first visible control', () => {
  const harness = createHarness();
  harness.open();
  assert.equal(harness.doc.activeElement, harness.last);
  assert.equal(harness.tab().defaultPrevented, true);
  assert.equal(harness.doc.activeElement, harness.first);
  assert.equal(harness.tab(true).defaultPrevented, true);
  assert.equal(harness.doc.activeElement, harness.last);
  harness.middle.focus();
  assert.equal(harness.tab().defaultPrevented, false, 'interior Tab follows native order');
  assert.equal(harness.tab(true).defaultPrevented, false);
  harness.controller.dispose();
});

test('focus boundaries exclude hidden, disabled, inert and negative-tabindex controls', () => {
  const harness = createHarness();
  const disabled = harness.control('disabled');
  disabled.disabled = true;
  const hidden = harness.control('hidden-or-inert');
  hidden.hidden = true;
  const noRect = harness.control('display-none');
  noRect.hasRect = false;
  const invisible = harness.control('visibility-hidden');
  invisible.visibility = 'hidden';
  const negative = harness.control('programmatic-only');
  negative.tabIndex = -1;
  harness.controls.unshift(disabled, hidden, noRect);
  harness.controls.push(invisible, negative);
  harness.open();
  assert.equal(harness.tab().defaultPrevented, true);
  assert.equal(harness.doc.activeElement, harness.first);
  harness.tab(true);
  assert.equal(harness.doc.activeElement, harness.last);
  harness.controller.dispose();
});

test('Tab recovers focus from the body and does not trap focus after close or disposal', () => {
  const harness = createHarness();
  harness.open();
  harness.doc.activeElement = harness.body;
  harness.tab();
  assert.equal(harness.doc.activeElement, harness.first);
  harness.doc.activeElement = harness.body;
  harness.tab(true);
  assert.equal(harness.doc.activeElement, harness.last);
  harness.controller.close();
  assert.equal(harness.tab().defaultPrevented, false);
  harness.open();
  harness.controller.dispose();
  assert.equal(harness.tab().defaultPrevented, false);
});

test('an empty dialog retains focus without throwing when no controls are available', () => {
  const harness = createHarness();
  harness.open();
  harness.controls.splice(0);
  assert.equal(harness.tab().defaultPrevented, true);
  assert.equal(harness.doc.activeElement, harness.dialog);
  assert.equal(harness.tab(true).defaultPrevented, true);
  assert.equal(harness.doc.activeElement, harness.dialog);
  harness.controller.dispose();
});
