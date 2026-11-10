import { Prisma, PrismaClient } from '@prisma/client';
import { tickets as demoTickets } from '../demo/data/tickets';
import { SeededProject } from './projects.seed';
import { at, bytes, day, IdMap, must } from './util';

export const seedTickets = async (prisma: PrismaClient, users: IdMap, projects: Map<string, SeededProject>) => {
  console.log('🎫 Tiket...');
  const ids: IdMap = new Map();
  for (const [i, t] of demoTickets.entries()) {
    const p = projects.get(t.project);
    if (!p) throw new Error(`Proyek ${t.project} untuk ${t.key} tidak ada`);
    const statusId = p.statuses.get(t.status) ?? p.statuses.get(t.column);
    if (!statusId) throw new Error(`Status ${t.status} tidak ada di alur ${t.project}`);
    const sprintId = t.archivedSprint ? p.sprintByName.get(t.archivedSprint) : t.inSprint ? p.activeSprintId : undefined;
    const row = await prisma.ticket.create({
      data: {
        key: t.key,
        number: Number(t.key.split('-')[1]),
        project_id: p.id,
        title: t.title,
        description: t.description,
        type: t.type,
        status_id: statusId,
        priority: t.priority,
        labels: t.labels,
        points: t.points,
        due_date: day(t.due),
        rank: i,
        assignee_id: t.assigneeId ? must(users, t.assigneeId, 'Penerima') : undefined,
        reporter_id: must(users, t.reporterId, 'Pelapor'),
        epic_id: t.epicId ? p.epics.get(t.epicId) : undefined,
        sprint_id: sprintId,
        agent_note: (t.agentNote as unknown as Prisma.InputJsonValue) ?? undefined,
        dev: (t.dev as unknown as Prisma.InputJsonValue) ?? undefined,
        created_at: at(t.created),
        checklist: { create: t.checklist.map((c, j) => ({ text: c.text, done: c.done, position: j })) },
        comments: {
          create: t.comments.map((c) => ({ author_id: must(users, c.authorId, 'Penulis'), body: c.text, created_at: at(c.time) })),
        },
        attachments: {
          create: (t.attachments ?? []).map((a) => ({
            name: a.name, size: bytes(a.size), kind: a.kind, uploader_id: must(users, a.by, 'Pengunggah'), created_at: at(a.time),
          })),
        },
        watchers: { create: [...new Set(t.watchers ?? [])].map((w) => ({ user_id: must(users, w, 'Pemantau') })) },
      },
    });
    ids.set(t.key, row.id);
  }

  // Sub-tugas, relasi, dan waktu update asli (setelah semua tiket ada).
  for (const t of demoTickets) {
    const id = ids.get(t.key)!;
    if (t.parentKey && ids.has(t.parentKey)) {
      await prisma.ticket.update({ where: { id }, data: { parent_id: ids.get(t.parentKey) } });
    }
    for (const l of t.links ?? []) {
      const other = ids.get(l.key);
      if (!other) continue;
      const [from, to, type] =
        l.type === 'diblokir' ? [other, id, 'memblokir'] : l.type === 'memblokir' ? [id, other, 'memblokir'] : [Math.min(id, other), Math.max(id, other), l.type];
      await prisma.ticketLink.upsert({
        where: { from_id_to_id_type: { from_id: from, to_id: to, type } },
        create: { from_id: from, to_id: to, type },
        update: {},
      });
    }
  }
  await Promise.all(
    demoTickets.map((t) => prisma.$executeRaw`UPDATE tickets SET updated_at = ${at(t.updated)} WHERE id = ${ids.get(t.key)}`),
  );
  console.log(`   ${ids.size} tiket`);
  return ids;
};
