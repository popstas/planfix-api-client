/**
 * Offset pagination shared by example scripts. Wraps the canonical loop
 * (`offset += pageSize`, stop on a short page) used with getTaskList,
 * getContactList and postListDirectoryEntries.
 */

export interface PaginateOptions {
  /** Items per request; Planfix examples conventionally use 100. */
  pageSize?: number;
  /** Stop after yielding this many items. */
  limit?: number;
  /**
   * Keep offset at 0 on every request. Use for write loops where each
   * processed item drops out of the filter (reference:
   * contacts-migrate-telegram.ts). The loop still stops on a short page,
   * so the caller must actually shrink the result set to avoid re-reading
   * the same items forever.
   */
  fixedOffset?: boolean;
}

/**
 * Iterate all items behind a paged endpoint.
 *
 * Usage:
 *   for await (const task of paginate(
 *     (offset, pageSize) =>
 *       taskApi.getTaskList({ getTaskListRequest: { offset, pageSize, fields, filters } })
 *         .then(r => r.tasks ?? []),
 *     { limit: 50 },
 *   )) { ... }
 */
export async function* paginate<T>(
  fetchPage: (offset: number, pageSize: number) => Promise<T[]>,
  opts: PaginateOptions = {},
): AsyncGenerator<T, void, undefined> {
  const pageSize = opts.pageSize ?? 100;
  let offset = 0;
  let yielded = 0;

  while (true) {
    const batch = await fetchPage(offset, pageSize);
    for (const item of batch) {
      if (opts.limit !== undefined && yielded >= opts.limit) return;
      yielded++;
      yield item;
    }
    if (batch.length < pageSize) return;
    if (opts.limit !== undefined && yielded >= opts.limit) return;
    if (!opts.fixedOffset) offset += pageSize;
  }
}

/** Drain an async generator into an array. */
export async function collectAll<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) items.push(item);
  return items;
}
