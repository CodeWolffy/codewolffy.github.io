interface LockedElement {
  count: number;
  overflow?: string;
  paddingRight?: string;
}

const lockedElements = new WeakMap<HTMLElement, LockedElement>();

/** Each owner releases only its captured elements, including across Astro body swaps. */
export function lockPageScroll(doc: Document = document, view: Window = window) {
  const root = doc.documentElement;
  const body = doc.body;
  const scrollbarWidth = Math.max(0, view.innerWidth - root.clientWidth);

  for (const element of [root, body]) {
    const existing = lockedElements.get(element);
    if (existing) {
      existing.count += 1;
      continue;
    }

    lockedElements.set(element, {
      count: 1,
      overflow: element === root ? element.style.overflow : undefined,
      paddingRight: element === body ? element.style.paddingRight : undefined,
    });
    // Lock the viewport only. Body overflow would create a nearer scroll container
    // for the sticky header, moving its menu offscreen on already-scrolled pages.
    if (element === root) element.style.overflow = 'hidden';
    if (element === body && scrollbarWidth > 0) {
      const padding = Number.parseFloat(view.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${padding + scrollbarWidth}px`;
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    for (const element of [root, body]) {
      const state = lockedElements.get(element);
      if (!state || --state.count > 0) continue;
      if (state.overflow !== undefined) element.style.overflow = state.overflow;
      if (state.paddingRight !== undefined) element.style.paddingRight = state.paddingRight;
      lockedElements.delete(element);
    }
  };
}
