import { fallbackPersona, plainChat, stripReasoning } from '../core/persona';

describe('persona', () => {
  it('fallback deterministik & memuat nama', () => {
    const a = fallbackPersona({ name: 'Loli', role: 'PM Assistant' });
    expect(a).toContain('Loli');
    expect(fallbackPersona({ name: 'Loli', role: 'PM Assistant' })).toBe(a);
  });
  it('membuang <think>', () => {
    expect(stripReasoning('<think>mikir dulu</think>Halo Bhagas!')).toBe('Halo Bhagas!');
  });
  it('mengambil Refined Response', () => {
    const raw = 'User (Bhagas) wants a sprint.\n\nPlan:\n1. get_planning\n\nDraft response: x\n\nSelf-Correction: no\n\nRefined Response: "Siap, sprint-nya saya buat ya."';
    expect(stripReasoning(raw)).toBe('Siap, sprint-nya saya buat ya.');
  });
  it('jawaban normal tidak diubah', () => {
    expect(stripReasoning('Oke, saya cek dulu ya.')).toBe('Oke, saya cek dulu ya.');
  });
  it('plainChat meratakan format', () => {
    expect(plainChat('## Judul\n**tebal** teks')).toBe('Judul\ntebal teks');
  });
});
