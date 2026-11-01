/** Which page of a list to load. */
export interface PageQuery {
  page: number;
  pageSize: number;
}

/** One page of a list, plus the total number of items. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
