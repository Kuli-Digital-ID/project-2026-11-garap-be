/** Waktu di data demo ditulis tanpa zona ("2026-11-01T08:50") dan berarti WIB. */
export const at = (s?: string | null): Date | undefined => {
  if (!s) return undefined;
  if (s.length <= 10) return new Date(`${s}T00:00:00Z`);
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : `${s.length === 16 ? `${s}:00` : s}+07:00`);
};

/** Tanggal saja (kolom @db.Date). */
export const day = (s?: string | null): Date | undefined => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : undefined);

/** "420 KB" → 430080 */
export const bytes = (s: string): number => {
  const m = /([\d.,]+)\s*(B|KB|MB|GB)/i.exec(s);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(',', '.'));
  const mult = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }[m[2].toUpperCase() as 'B'];
  return Math.round(n * mult);
};

export type IdMap = Map<string, number>;

export const must = (map: IdMap, key: string, what: string): number => {
  const id = map.get(key);
  if (id === undefined) throw new Error(`${what} "${key}" tidak ditemukan di data demo`);
  return id;
};
