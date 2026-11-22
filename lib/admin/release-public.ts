/** Strip server-only fields before sending release rows to the browser. */
export function sanitizeReleaseRow<T extends { storage_path?: string }>(
  row: T,
): Omit<T, "storage_path"> {
  const copy = { ...row };
  delete copy.storage_path;
  return copy as Omit<T, "storage_path">;
}

export function sanitizeReleaseRows<T extends { storage_path?: string }>(rows: T[]) {
  return rows.map(sanitizeReleaseRow);
}