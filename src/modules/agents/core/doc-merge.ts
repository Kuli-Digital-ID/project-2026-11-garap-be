export interface DocSection { heading: string; body: string }

const norm = (h: string) => h.toLowerCase().replace(/^\s*[\d.]+\s*/, '').replace(/\s+/g, ' ').trim();

/**
 * Gabungkan bagian baru ke bagian dokumen yang sudah ada: judul yang sama (tanpa memedulikan huruf besar/kecil
 * dan nomor di depan) diganti isinya di tempat yang sama, judul baru ditambahkan di akhir.
 */
export function mergeSections(current: unknown, incoming: DocSection[]): DocSection[] {
  const out: DocSection[] = (Array.isArray(current) ? current : []).map((s) => ({ heading: String((s as DocSection).heading ?? ''), body: String((s as DocSection).body ?? '') }));
  for (const inc of incoming) {
    const heading = String(inc.heading ?? '').trim();
    if (!heading) continue;
    const i = out.findIndex((s) => norm(s.heading) === norm(heading));
    if (i >= 0) out[i] = { heading: out[i].heading, body: String(inc.body ?? '') };
    else out.push({ heading, body: String(inc.body ?? '') });
  }
  return out;
}
