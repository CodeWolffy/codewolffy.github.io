const focusableSelector =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable="true"]';
const inertOwners = new WeakMap<HTMLElement, { count: number; original: boolean }>();

/** Keep a custom modal's controls reachable while its backdrop covers the page. */
export function containOverlayFocus(
  root: HTMLElement,
  initialFocus: HTMLElement | null,
  additionalControls: HTMLElement[] = []
) {
  const doc = root.ownerDocument;
  const regions = [root, ...additionalControls];
  const protectedBranches = new Set<HTMLElement>();
  for (const region of regions) {
    for (let branch: HTMLElement | null = region; branch; branch = branch.parentElement) {
      protectedBranches.add(branch);
      if (branch === doc.body) break;
    }
  }

  const isolated = new Set<HTMLElement>();
  for (const branch of protectedBranches) {
    if (regions.includes(branch)) continue;
    for (const child of branch.children) {
      if (
        !(child instanceof HTMLElement) ||
        protectedBranches.has(child) ||
        child.hasAttribute('data-overlay-backdrop')
      ) {
        continue;
      }
      isolated.add(child);
    }
  }
  for (const element of isolated) {
    const owner = inertOwners.get(element);
    if (owner) owner.count += 1;
    else {
      inertOwners.set(element, { count: 1, original: element.inert });
      element.inert = true;
    }
  }

  const contains = (node: Node | null) => regions.some((region) => region.contains(node));
  const focusables = () =>
    Array.from(
      new Set(
        regions.flatMap((region) => [
          ...(region.matches(focusableSelector) ? [region] : []),
          ...region.querySelectorAll<HTMLElement>(focusableSelector),
        ])
      )
    )
      .filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.matches(':disabled') &&
          !element.closest('[inert], [hidden], [aria-hidden="true"]') &&
          element.getClientRects().length > 0 &&
          doc.defaultView?.getComputedStyle(element).visibility === 'visible'
      )
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const focusFirst = () => (initialFocus ?? focusables()[0] ?? root).focus({ preventScroll: true });
  const isActive = () => root.isConnected && !root.closest('[inert]');
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive() || event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey)
      return;
    const elements = focusables();
    const index = elements.indexOf(doc.activeElement as HTMLElement);
    const atBoundary = event.shiftKey ? index <= 0 : index < 0 || index === elements.length - 1;
    if (!atBoundary) return;
    event.preventDefault();
    (event.shiftKey ? elements.at(-1) : elements[0])?.focus({ preventScroll: true });
  };
  const handleFocusIn = (event: FocusEvent) => {
    if (isActive() && event.target instanceof Node && !contains(event.target)) focusFirst();
  };
  doc.addEventListener('keydown', handleKeyDown);
  doc.addEventListener('focusin', handleFocusIn);
  if (!contains(doc.activeElement)) focusFirst();

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    doc.removeEventListener('keydown', handleKeyDown);
    doc.removeEventListener('focusin', handleFocusIn);
    doc.removeEventListener('astro:before-swap', release);
    for (const element of isolated) {
      const owner = inertOwners.get(element);
      if (!owner || --owner.count > 0) continue;
      element.inert = owner.original;
      inertOwners.delete(element);
    }
  };
  doc.addEventListener('astro:before-swap', release);
  return release;
}
