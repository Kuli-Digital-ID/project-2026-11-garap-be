import { ROLE_SKILLS, loadCatalog, parseFrontmatter, readSkill, readSkillReference, skillIndex, skillsFor } from '../core/skills';

describe('katalog skill', () => {
  it('memuat semua skill terpasang dengan nama dan deskripsi', () => {
    const c = loadCatalog(true);
    expect(c.size).toBeGreaterThanOrEqual(38);
    for (const s of c.values()) {
      expect(s.description.length).toBeGreaterThan(20);
      expect(s.name).toBe(s.slug);
    }
  });

  it('semua skill di pemetaan posisi benar-benar ada', () => {
    const c = loadCatalog();
    const missing = ROLE_SKILLS.flatMap((r) => r.skills).filter((s) => !c.has(s));
    expect(missing).toEqual([]);
  });

  it('parseFrontmatter menangani nilai bertanda kutip dan lipat', () => {
    const { meta, body } = parseFrontmatter('---\nname: x\ndescription: >\n  baris satu\n  baris dua\nlicense: "MIT"\n---\n# Isi');
    expect(meta).toEqual({ name: 'x', description: 'baris satu baris dua', license: 'MIT' });
    expect(body).toBe('# Isi');
  });
});

describe('skill per posisi', () => {
  const slugs = (role: string, labels: string[] = []) => skillsFor(role, labels).map((s) => s.slug);

  it('Backend Developer mendapat skill backend', () => {
    const s = slugs('Backend Developer');
    expect(s).toEqual(expect.arrayContaining(['nestjs-expert', 'postgres-pro', 'api-designer', 'test-master']));
    expect(s).not.toContain('swift-expert');
  });

  it('Frontend, Mobile, Fullstack, Architect, DevOps, QA masing-masing punya skill', () => {
    expect(slugs('Frontend Engineer')).toContain('react-expert');
    expect(slugs('Mobile Developer')).toContain('swift-expert');
    expect(slugs('Fullstack Engineer')).toEqual(expect.arrayContaining(['fullstack-guardian', 'nextjs-developer']));
    expect(slugs('Solution Architect')).toContain('architecture-designer');
    expect(slugs('DevOps Engineer')).toContain('devops-engineer');
    expect(slugs('QA Tester')).toContain('playwright-expert');
  });

  it('BA, SA, dan PM mendapat skill analisis/manajemen, tanpa skill dev', () => {
    const dev = ['nestjs-expert', 'react-expert', 'swift-expert', 'test-master', 'playwright-expert', 'devops-engineer'];
    expect(slugs('Business Analyst')).toEqual(expect.arrayContaining(['brd-writer', 'user-story-writer', 'klarifikasi-kebutuhan']));
    expect(slugs('System Analyst')).toEqual(expect.arrayContaining(['srs-writer', 'use-case-flow']));
    for (const role of ['PM Assistant', 'Project Manager']) {
      expect(slugs(role)).toEqual(expect.arrayContaining(['epic-timeline-planner', 'sprint-planning', 'status-report-risk']));
    }
    for (const role of ['Business Analyst', 'System Analyst', 'PM Assistant', 'Project Manager']) {
      for (const d of dev) expect(slugs(role)).not.toContain(d);
    }
  });

  it('QA Document Reviewer memakai skill review dokumen, bukan skill uji perangkat lunak', () => {
    const s = slugs('QA Document Reviewer');
    expect(s).toContain('doc-review-checklist');
    expect(s).not.toContain('playwright-expert');
    expect(slugs('QA Tester')).toContain('playwright-expert');
  });

  it('posisi tanpa skill (mis. Marketing Writer) tidak mendapat apa pun', () => {
    expect(slugs('Marketing Writer')).toEqual([]);
    expect(slugs('Customer Success')).toEqual([]);
  });

  it('nama skill di daftar keahlian ikut dipasang', () => {
    expect(slugs('Marketing Writer', ['Copywriting', 'feature-forge'])).toEqual(['feature-forge']);
  });

  it('tidak ada duplikat', () => {
    const s = slugs('Fullstack Engineer');
    expect(new Set(s).size).toBe(s.length);
  });
});

describe('skill buatan sendiri', () => {
  it('menyebut alat Garap yang benar-benar ada', () => {
    const { TOOL_SPECS, SKILL_TOOL_SPECS } = require('../core/agent-tools');
    const names = new Set([...TOOL_SPECS, ...SKILL_TOOL_SPECS].map((t: { name: string }) => t.name));
    const own = ['brd-writer', 'user-story-writer', 'klarifikasi-kebutuhan', 'srs-writer', 'use-case-flow', 'doc-review-checklist', 'epic-timeline-planner', 'sprint-planning', 'status-report-risk'];
    const allowed = [...loadCatalog().values()].filter((s) => own.includes(s.slug));
    expect(allowed).toHaveLength(own.length);
    for (const s of allowed) {
      const text = readSkill(s.slug, allowed);
      const tools = [...text.matchAll(/`((?:get|list|create|update|move|comment|submit|read|load|send|request|save)_[a-z_]+)`/g)].map((m) => m[1]);
      for (const t of tools) expect({ skill: s.slug, tool: t, ada: names.has(t) }).toEqual({ skill: s.slug, tool: t, ada: true });
    }
  });
});

describe('membaca skill', () => {
  const allowed = skillsFor('Backend Developer');

  it('load menghasilkan isi tanpa frontmatter dan menyebut file referensi', () => {
    const out = readSkill('nestjs-expert', allowed);
    expect(out).toContain('# Skill: nestjs-expert');
    expect(out).not.toContain('license: MIT');
    expect(out).toContain('authentication.md');
  });

  it('skill di luar jatah ditolak', () => {
    expect(() => readSkill('swift-expert', allowed)).toThrow(/tidak tersedia/);
  });

  it('referensi terbuka, path keluar folder ditolak', () => {
    expect(readSkillReference('nestjs-expert', 'authentication.md', allowed).length).toBeGreaterThan(100);
    expect(() => readSkillReference('nestjs-expert', '../SKILL.md', allowed)).toThrow(/tidak ada/);
    expect(() => readSkillReference('nestjs-expert', '../../../../.env', allowed)).toThrow(/tidak ada/);
    expect(() => readSkillReference('nestjs-expert', '/etc/passwd', allowed)).toThrow(/tidak ada/);
  });

  it('indeks ringkas untuk prompt', () => {
    const idx = skillIndex(allowed);
    expect(idx.split('\n').length).toBe(allowed.length);
    expect(idx).toMatch(/^- nestjs-expert: /m);
    expect(idx.length / allowed.length).toBeLessThan(260);
  });
});
