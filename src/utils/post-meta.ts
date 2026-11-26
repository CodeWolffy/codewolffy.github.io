export function formatPostDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function labelContainsToken(container: string, token: string): boolean {
  const normalizedContainer = container.trim().toLowerCase();
  const normalizedToken = token.trim().toLowerCase();
  if (!normalizedContainer || !normalizedToken) return false;
  if (normalizedContainer === normalizedToken) return true;

  if (/^[\x20-\x7e]+$/.test(normalizedToken)) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedToken)}([^a-z0-9]|$)`, 'i');
    return pattern.test(normalizedContainer);
  }

  return normalizedContainer.includes(normalizedToken);
}

export function getDedupedMainTagLabel(
  tagIds: string[] | undefined,
  tagMap: Map<string, string>,
  ...contextLabels: Array<string | undefined>
): string | undefined {
  if (!tagIds || tagIds.length === 0) return undefined;

  const activeContexts = contextLabels.filter((label): label is string => Boolean(label?.trim()));
  for (const tagId of tagIds) {
    const label = tagMap.get(tagId) || tagId;
    const isRedundant = activeContexts.some((ctx) => labelContainsToken(ctx, label));
    if (!isRedundant) return label;
  }

  return undefined;
}
