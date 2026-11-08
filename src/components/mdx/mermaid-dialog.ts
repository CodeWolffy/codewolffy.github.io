import { lockPageScroll } from '../../lib/scroll-lock';

const focusableSelector =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable="true"]';

/** Native modal dialogs provide focus containment and make the background inert. */
export function createMermaidDialog(dialog: HTMLDialogElement) {
  const doc = dialog.ownerDocument;
  const view = doc.defaultView;
  let releaseScroll: (() => void) | undefined;
  let trigger: HTMLElement | null = null;
  let restoreFocus = true;

  const finishClose = () => {
    // Ignore a queued close event from an earlier opening of the same dialog.
    if (dialog.open) return;
    releaseScroll?.();
    releaseScroll = undefined;
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
  };

  const close = (returnFocus = true) => {
    restoreFocus = returnFocus;
    if (dialog.open) dialog.close();
    // close events are queued. Release the captured page before Astro swaps it.
    finishClose();
  };
  const handleCancel = (event: Event) => {
    event.preventDefault();
    close();
  };
  const handleNavigation = () => close(false);
  const handleClick = (event: Event) => {
    if (event.target === dialog) close();
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      !dialog.open ||
      !dialog.isConnected ||
      event.key !== 'Tab' ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    const elements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(':disabled') &&
        !element.closest('[inert], [hidden], [aria-hidden="true"]') &&
        element.getClientRects().length > 0 &&
        view?.getComputedStyle(element).visibility === 'visible'
    );
    const index = elements.indexOf(doc.activeElement as HTMLElement);
    const atBoundary = event.shiftKey ? index <= 0 : index < 0 || index === elements.length - 1;
    if (!atBoundary) return;
    // Native modality prevents background activation but may send Tab to browser
    // chrome at a boundary. Keep the keyboard sequence within this dialog.
    event.preventDefault();
    const next = event.shiftKey ? elements.at(-1) : elements[0];
    (next ?? dialog).focus({ preventScroll: true });
  };
  dialog.addEventListener('cancel', handleCancel);
  dialog.addEventListener('close', finishClose);
  dialog.addEventListener('click', handleClick);
  doc.addEventListener('astro:before-swap', handleNavigation);
  doc.addEventListener('keydown', handleKeyDown, true);

  return {
    open(opener: HTMLElement) {
      if (dialog.open || !dialog.isConnected || !view) return;
      restoreFocus = true;
      trigger = opener;
      dialog.showModal();
      releaseScroll = lockPageScroll(doc, view);
      dialog.querySelector<HTMLElement>('[data-action="close-modal"]')?.focus({
        preventScroll: true,
      });
    },
    close,
    dispose() {
      close(false);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', finishClose);
      dialog.removeEventListener('click', handleClick);
      doc.removeEventListener('astro:before-swap', handleNavigation);
      doc.removeEventListener('keydown', handleKeyDown, true);
    },
  };
}
