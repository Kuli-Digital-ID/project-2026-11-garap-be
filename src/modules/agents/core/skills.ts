import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, normalize, resolve, sep } from 'path';

/**
 * Skill agent: panduan kerja (SKILL.md) yang dimuat agent hanya saat dibutuhkan.
 * Daftar nama + deskripsi singkat masuk system prompt; isi lengkapnya diambil lewat tool load_skill.
 * Sumber skill dev: github.com/Jeffallan/claude-skills (MIT), lihat agent-skills/SOURCE.md.
 */

export interface Skill {
  slug: string;
  name: string;
  description: string;
  dir: string;
}

const skillsRoot = () => resolve(process.env.AGENT_SKILLS_DIR || join(process.cwd(), 'agent-skills'));

let cache: { root: string; skills: Map<string, Skill> } | null = null;

/** Pecah frontmatter YAML sederhana (key: value, termasuk nilai berlipat > atau |). */
export function parseFrontmatter(src: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta: Record<string, string> = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^[>|][+-]?$/.test(v)) {
      const parts: string[] = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      v = parts.join(' ');
    }
    meta[kv[1]] = v.replace(/^(["'])([\s\S]*)\1$/, '$2');
  }
  return { meta, body: m[2] };
}

export function loadCatalog(force = false): Map<string, Skill> {
  const root = skillsRoot();
  if (!force && cache && cache.root === root) return cache.skills;
  const skills = new Map<string, Skill>();
  if (existsSync(root)) {
    for (const slug of readdirSync(root)) {
      const dir = join(root, slug);
      const file = join(dir, 'SKILL.md');
      if (!statSync(dir).isDirectory() || !existsSync(file)) continue;
      const { meta } = parseFrontmatter(readFileSync(file, 'utf8'));
      skills.set(slug, { slug, name: meta.name || slug, description: meta.description || '', dir });
    }
  }
  cache = { root, skills };
  return skills;
}

const COMMON_DEV = ['test-master', 'code-reviewer', 'debugging-wizard', 'secure-code-guardian'];

/** Pemetaan posisi → skill. Satu posisi bisa cocok dengan beberapa aturan; hasilnya digabung. */
export const ROLE_SKILLS: { match: RegExp; skills: string[] }[] = [
  { match: /backend|back-end|back end/i, skills: ['nestjs-expert', 'typescript-pro', 'api-designer', 'postgres-pro', 'sql-pro', 'database-optimizer', 'websocket-engineer', 'architecture-designer', ...COMMON_DEV] },
  { match: /frontend|front-end|front end|web developer/i, skills: ['react-expert', 'nextjs-developer', 'typescript-pro', 'javascript-pro', 'playwright-expert', ...COMMON_DEV] },
  { match: /mobile|\bios\b|android/i, skills: ['swift-expert', 'react-native-expert', 'flutter-expert', 'kotlin-specialist', ...COMMON_DEV] },
  { match: /full-?stack|software (engineer|developer)|programmer|\bdeveloper\b/i, skills: ['fullstack-guardian', 'nestjs-expert', 'nextjs-developer', 'react-expert', 'typescript-pro', 'postgres-pro', 'api-designer', 'feature-forge', ...COMMON_DEV] },
  { match: /architect/i, skills: ['architecture-designer', 'api-designer', 'postgres-pro', 'database-optimizer', 'nestjs-expert', 'cloud-architect', 'spec-miner', 'security-reviewer'] },
  { match: /devops|sre|site reliability|infrastruktur|infrastructure/i, skills: ['devops-engineer', 'monitoring-expert', 'sre-engineer', 'cloud-architect', 'secure-code-guardian'] },
  { match: /\bqa\b(?!\s+document)|tester|quality assurance/i, skills: ['test-master', 'playwright-expert', 'debugging-wizard', 'code-reviewer'] },
  // Posisi analisis & manajemen (skill buatan sendiri, bahasa Indonesia, memakai alat Garap).
  { match: /business analyst|\bba\b|analis bisnis/i, skills: ['brd-writer', 'user-story-writer', 'klarifikasi-kebutuhan', 'feature-forge', 'the-fool'] },
  { match: /system analyst|\bsa\b|analis sistem/i, skills: ['srs-writer', 'use-case-flow', 'klarifikasi-kebutuhan', 'user-story-writer', 'api-designer', 'architecture-designer', 'the-fool'] },
  { match: /project manager|product manager|\bpm\b|manajer proyek|scrum master/i, skills: ['epic-timeline-planner', 'sprint-planning', 'status-report-risk', 'user-story-writer', 'klarifikasi-kebutuhan', 'the-fool'] },
  { match: /document reviewer|reviewer dokumen|qa document/i, skills: ['doc-review-checklist', 'klarifikasi-kebutuhan', 'the-fool'] },
  { match: /technical writer|penulis teknis|dokumentasi/i, skills: ['code-documenter'] },
];

/** Skill untuk seorang agent: dari posisinya, ditambah nama skill yang ditulis eksplisit di daftar keahliannya. */
export function skillsFor(role: string, labels: string[] = []): Skill[] {
  const catalog = loadCatalog();
  const slugs = new Set<string>();
  for (const r of ROLE_SKILLS) if (r.match.test(role || '')) r.skills.forEach((s) => slugs.add(s));
  for (const l of labels) {
    const slug = l.trim().toLowerCase().replace(/\s+/g, '-');
    if (catalog.has(slug)) slugs.add(slug);
  }
  return [...slugs].map((s) => catalog.get(s)).filter((s): s is Skill => !!s);
}

const firstSentence = (d: string, max = 170) => {
  const s = d.split(/(?<=\.)\s/)[0] || d;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

/** Daftar singkat untuk system prompt. */
export function skillIndex(skills: Skill[]): string {
  return skills.map((s) => `- ${s.slug}: ${firstSentence(s.description)}`).join('\n');
}

export function readSkill(slug: string, allowed: Skill[]): string {
  const s = allowed.find((x) => x.slug === slug.trim());
  if (!s) throw new Error(`Skill "${slug}" tidak tersedia untuk Anda. Pilihan: ${allowed.map((x) => x.slug).join(', ')}`);
  const { body } = parseFrontmatter(readFileSync(join(s.dir, 'SKILL.md'), 'utf8'));
  const refs = join(s.dir, 'references');
  const files = existsSync(refs) ? readdirSync(refs).filter((f) => f.endsWith('.md')) : [];
  return [`# Skill: ${s.name}`, body.trim(), files.length ? `\n(File referensi bisa dibuka dengan read_skill_reference: ${files.join(', ')})` : ''].filter(Boolean).join('\n\n');
}

export function readSkillReference(slug: string, file: string, allowed: Skill[]): string {
  const s = allowed.find((x) => x.slug === slug.trim());
  if (!s) throw new Error(`Skill "${slug}" tidak tersedia untuk Anda.`);
  const refs = resolve(s.dir, 'references');
  const target = resolve(refs, normalize(file.trim()));
  if (!target.startsWith(refs + sep) || !target.endsWith('.md') || !existsSync(target)) {
    const files = existsSync(refs) ? readdirSync(refs).filter((f) => f.endsWith('.md')) : [];
    throw new Error(`Referensi "${file}" tidak ada. Pilihan: ${files.join(', ') || '(tidak ada)'}`);
  }
  return readFileSync(target, 'utf8');
}
