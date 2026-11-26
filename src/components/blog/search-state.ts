export const SEARCH_DEBOUNCE_MS = 200;

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface SearchViewStateInput {
  searchStatus: SearchStatus;
  searchValue: string;
  isComposing: boolean;
  settledQuery: string;
}

export function getTrimmedSearchQuery(searchValue: string): string {
  return searchValue.trim();
}

export function shouldShowSearchSkeleton({
  searchStatus,
  searchValue,
  isComposing,
  settledQuery,
}: SearchViewStateInput): boolean {
  if (searchStatus === 'loading') return true;
  if (searchStatus !== 'ready') return false;
  const query = getTrimmedSearchQuery(searchValue);
  if (!query) return false;
  return isComposing || settledQuery !== query;
}
