import { useEffectEvent, useLayoutEffect, useRef, type RefObject } from 'react';

type PlayerFocusOptions = {
  isOpen: boolean;
  isModal: boolean;
  panelRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

const focusableSelector = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

function getFocusableElements(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !element.closest('[inert], [hidden], [aria-hidden="true"]') &&
      element.getClientRects().length > 0 &&
      element.ownerDocument.defaultView?.getComputedStyle(element).visibility === 'visible'
  );
}

function isolatePage(panel: HTMLElement) {
  const document = panel.ownerDocument;
  const window = document.defaultView;
  const body = document.body;
  const inertElements: { element: HTMLElement; wasInert: boolean }[] = [];
  let branch: HTMLElement | null = panel;

  // Keep the panel's ancestor chain available, including the clickable backdrop.
  while (branch && branch !== body) {
    const parent: HTMLElement | null = branch.parentElement;
    if (!parent) break;
    for (const sibling of parent.children) {
      if (
        sibling !== branch &&
        sibling instanceof HTMLElement &&
        !sibling.hasAttribute('data-player-backdrop')
      ) {
        inertElements.push({ element: sibling, wasInert: sibling.inert });
        sibling.inert = true;
      }
    }
    branch = parent;
  }

  const scrollX = window?.scrollX ?? 0;
  const scrollY = window?.scrollY ?? 0;
  const overrides: [HTMLElement, string, string][] = [
    [document.documentElement, 'overflow', 'hidden'],
    [body, 'overflow', 'hidden'],
    [body, 'position', 'fixed'],
    [body, 'top', `${-scrollY}px`],
    [body, 'left', `${-scrollX}px`],
    [body, 'width', '100%'],
  ];
  const originalStyles = overrides.map(([element, property, value]) => {
    const originalValue = element.style.getPropertyValue(property);
    const priority = element.style.getPropertyPriority(property);
    element.style.setProperty(property, value);
    return { element, property, originalValue, priority };
  });

  return () => {
    for (const { element, wasInert } of inertElements) element.inert = wasInert;
    for (const { element, property, originalValue, priority } of originalStyles) {
      if (originalValue) element.style.setProperty(property, originalValue, priority);
      else element.style.removeProperty(property);
    }
    // An old island's unmount must never scroll a newly swapped-in document.
    if (body.isConnected && document.body === body) {
      window?.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    }
  };
}

export function usePlayerFocus({
  isOpen,
  isModal,
  panelRef,
  triggerRef,
  onClose,
}: PlayerFocusOptions) {
  const wasOpenRef = useRef(false);
  const skipReturnFocusRef = useRef(false);
  const closePlayer = useEffectEvent(onClose);

  useLayoutEffect(() => {
    if (!isOpen) {
      const trigger = triggerRef.current;
      if (wasOpenRef.current && !skipReturnFocusRef.current && trigger?.ownerDocument.hasFocus()) {
        trigger.focus({ preventScroll: true });
      }
      wasOpenRef.current = false;
      skipReturnFocusRef.current = false;
      return;
    }

    const panel = panelRef.current;
    if (!panel) return;
    const document = panel.ownerDocument;
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;
    skipReturnFocusRef.current = false;
    let active = true;

    const focusPanel = () => {
      const closeButton = getFocusableElements(panel).find((element) =>
        element.hasAttribute('data-player-close')
      );
      (closeButton ?? panel).focus({ preventScroll: true });
    };
    const restorePage = isModal ? isolatePage(panel) : () => {};

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!active || event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closePlayer();
        return;
      }
      if (!isModal || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const elements = getFocusableElements(panel);
      const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
      const atBoundary = event.shiftKey
        ? currentIndex <= 0
        : currentIndex === -1 || currentIndex === elements.length - 1;
      if (!atBoundary) return;
      event.preventDefault();
      const next = event.shiftKey ? elements.at(-1) : elements[0];
      (next ?? panel).focus({ preventScroll: true });
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (
        active &&
        isModal &&
        document.hasFocus() &&
        event.target instanceof Node &&
        !panel.contains(event.target)
      ) {
        focusPanel();
      }
    };

    const cleanup = () => {
      if (!active) return;
      active = false;
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('astro:before-swap', handleBeforeSwap);
      restorePage();
    };

    const handleBeforeSwap = () => {
      skipReturnFocusRef.current = true;
      // React may batch the close update; release the old DOM synchronously.
      cleanup();
      closePlayer();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('astro:before-swap', handleBeforeSwap);

    if (
      document.hasFocus() &&
      (justOpened || (isModal && !panel.contains(document.activeElement)))
    ) {
      focusPanel();
    }

    return cleanup;
  }, [isOpen, isModal, panelRef, triggerRef]);
}
