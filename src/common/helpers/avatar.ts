/** Karakter 3D untuk Office. Hanya nilai yang dikenal yang disimpan; sisanya dibuang. */
export const AVATAR_STYLES = ['pendek', 'panjang', 'botak', 'hijab'] as const;
const HEX = /^#[0-9a-fA-F]{6}$/;

export type AvatarConfig = {
  skin: string;
  style: (typeof AVATAR_STYLES)[number];
  hairColor: string;
  shirt: string;
  pants: string;
  hijabColor: string;
  glasses: boolean;
};

export function sanitizeAvatar(raw: unknown): AvatarConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const hex = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v : d);
  return {
    skin: hex(r.skin, '#E8B48F'),
    style: (AVATAR_STYLES as readonly unknown[]).includes(r.style) ? (r.style as AvatarConfig['style']) : 'pendek',
    hairColor: hex(r.hairColor, '#2B2B33'),
    shirt: hex(r.shirt, '#3D5A80'),
    pants: hex(r.pants, '#2F3446'),
    hijabColor: hex(r.hijabColor, '#E8A0BF'),
    glasses: r.glasses === true,
  };
}
