// Strip MongoDB internals and whitespace from MCP tool responses to reduce token usage.
// Keeps all semantic data; removes fields Claude never needs.
const STRIP_KEYS = new Set(['__v', 'userId', 'createdAt', 'updatedAt']);

function strip(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(strip);
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>)
        .filter(([k]) => !STRIP_KEYS.has(k))
        .map(([k, v]) => [k, strip(v)])
    );
  }
  return val;
}

/** Compact GET response — strips internals + removes pretty-print whitespace. */
export function compactJSON(data: unknown): string {
  return JSON.stringify(strip(data));
}

/** Compact mutation response — only return ok + id, not the full echoed document. */
export function okResponse(data: unknown): string {
  const id = (data as Record<string, unknown>)?._id;
  return JSON.stringify({ ok: true, ...(id ? { id } : {}) });
}

/**
 * CSV for flat array responses — field names appear once as headers instead of
 * repeating on every row, which cuts tokens significantly on large transaction lists.
 * Falls back to compactJSON for empty arrays or non-array data.
 */
export function toCSV(data: unknown): string {
  const rows = strip(data);
  if (!Array.isArray(rows) || rows.length === 0) return compactJSON(data);

  // Union of all keys across every row (handles sparse fields)
  const keys = [
    ...new Set(
      rows.flatMap((row) => (row && typeof row === 'object' ? Object.keys(row as object) : []))
    ),
  ];

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // Quote only when necessary (contains comma, quote, or newline)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = rows.map((row) =>
    keys.map((k) => escape((row as Record<string, unknown>)[k])).join(',')
  );
  return [keys.join(','), ...lines].join('\n');
}
