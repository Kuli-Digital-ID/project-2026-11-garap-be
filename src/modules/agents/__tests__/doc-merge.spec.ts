import { mergeSections } from '../core/doc-merge';

describe('mergeSections', () => {
  const current = [{ heading: 'Latar belakang', body: '' }, { heading: 'Tujuan', body: '' }, { heading: 'Ruang lingkup', body: '' }];

  it('mengisi bagian kosong tanpa mengubah urutan', () => {
    const r = mergeSections(current, [{ heading: 'tujuan', body: 'Isi tujuan' }, { heading: 'Latar belakang', body: 'Isi latar' }]);
    expect(r.map((s) => s.heading)).toEqual(['Latar belakang', 'Tujuan', 'Ruang lingkup']);
    expect(r[0].body).toBe('Isi latar');
    expect(r[1].body).toBe('Isi tujuan');
    expect(r[2].body).toBe('');
  });

  it('mengabaikan nomor di depan judul saat mencocokkan', () => {
    const r = mergeSections([{ heading: '1. Tujuan', body: 'lama' }], [{ heading: 'Tujuan', body: 'baru' }]);
    expect(r).toEqual([{ heading: '1. Tujuan', body: 'baru' }]);
  });

  it('menambahkan judul baru di akhir', () => {
    const r = mergeSections(current, [{ heading: 'Risiko', body: 'x' }]);
    expect(r).toHaveLength(4);
    expect(r[3]).toEqual({ heading: 'Risiko', body: 'x' });
  });

  it('aman bila dokumen belum punya bagian', () => {
    expect(mergeSections(null, [{ heading: 'A', body: 'b' }])).toEqual([{ heading: 'A', body: 'b' }]);
  });
});
