# Skill agent Garap

Skill dibaca agent lewat tool `load_skill` (lihat `src/modules/agents/core/skills.ts`). Pemasangan per posisi ada di `ROLE_SKILLS` di file yang sama.

## Dari pihak lain (MIT)
Disalin dari https://github.com/Jeffallan/claude-skills (lisensi MIT, lihat `LICENSE-claude-skills`), commit `078a25cc5bfd8011459be7b91d004e900c1d02d3`:
skill pengembangan (nestjs-expert, react-expert, postgres-pro, test-master, devops-engineer, dll.) plus `feature-forge` dan `the-fool`.

## Buatan Kuli Digital (bahasa Indonesia, memakai alat Garap)
brd-writer, user-story-writer, klarifikasi-kebutuhan (Business Analyst) · srs-writer, use-case-flow (System Analyst) ·
epic-timeline-planner, sprint-planning, status-report-risk (Project Manager) · doc-review-checklist (QA Document Reviewer).

## Menambah skill
Buat folder `<nama>/SKILL.md` (frontmatter `name` sama dengan nama folder, `description` satu baris; file pendukung di `references/*.md`), lalu daftarkan di `ROLE_SKILLS`.
