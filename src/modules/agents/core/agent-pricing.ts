/** Harga per 1 juta token dalam USD (perkiraan; ubah lewat env bila tarif Anthropic berubah). */
interface Price { in: number; out: number }

const DEFAULT: Record<string, Price> = {
  // Tarif Claude 5.5 (Nov 2026). Haiku di atas 100 ribu token per prompt lebih mahal; tidak dihitung terpisah di sini.
  haiku: { in: 0.1, out: 0.5 },
  sonnet: { in: 2, out: 10 },
  opus: { in: 4, out: 20 },
};

function priceFor(model: string): Price {
  const override = process.env.AGENT_PRICE_USD_PER_MTOK; // contoh: "3,15" (masuk,keluar)
  if (override) {
    const [i, o] = override.split(',').map(Number);
    if (i > 0 && o > 0) return { in: i, out: o };
  }
  const m = model.toLowerCase();
  const hit = Object.keys(DEFAULT).find((k) => m.includes(k));
  return DEFAULT[hit ?? 'sonnet'];
}

export interface Usage {
  tokensIn: number;
  tokensOut: number;
  cacheRead?: number;
  cacheWrite?: number;
}

/** Biaya dalam rupiah (dibulatkan ke atas, minimal Rp1 bila ada pemakaian). */
export function costRupiah(model: string, u: Usage): number {
  const p = priceFor(model);
  const usd =
    (u.tokensIn * p.in + (u.cacheRead ?? 0) * p.in * 0.1 + (u.cacheWrite ?? 0) * p.in * 1.25 + u.tokensOut * p.out) / 1_000_000;
  const idr = usd * (Number(process.env.USD_IDR) || 16500);
  return idr > 0 ? Math.max(1, Math.ceil(idr)) : 0;
}
