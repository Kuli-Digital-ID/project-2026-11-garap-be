import { PrismaClient } from '@prisma/client';
import { projects as demoProjects, epics as demoEpics } from '../demo/data/projects';
import { tickets as demoTickets } from '../demo/data/tickets';
import { day, IdMap, must } from './util';

export interface SeededProject {
  id: number;
  statuses: Map<string, number>;
  activeSprintId?: number;
  sprintByName: Map<string, number>;
  epics: IdMap;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const seedProjects = async (prisma: PrismaClient, users: IdMap, divisions: IdMap) => {
  console.log('📁 Proyek, alur kerja, sprint, epic...');
  const out = new Map<string, SeededProject>();
  for (const p of demoProjects) {
    const own = demoTickets.filter((t) => t.project === p.slug);
    const seq = own.reduce((max, t) => Math.max(max, Number(t.key.split('-')[1])), 0);
    const row = await prisma.project.create({
      data: {
        slug: p.slug,
        key: p.key,
        name: p.name,
        color: p.color,
        description: p.description,
        client: p.client,
        template: p.template,
        status: p.status,
        start_date: day(p.start),
        target_date: day(p.target),
        ticket_seq: seq,
        lead_id: users.get(p.leadId),
        division_id: divisions.get(p.division),
        members: { create: [...new Set(p.memberIds)].map((id) => ({ user_id: must(users, id, 'Anggota') })) },
        workflow: {
          create: p.workflow.map((s, i) => ({ code: s.id, name: s.name, category: s.category, color: s.color, wip: s.wip, position: i })),
        },
      },
      include: { workflow: true },
    });

    const sprintByName = new Map<string, number>();
    // Sprint lama yang sudah ditutup (tiket dengan archivedSprint).
    const archived = [...new Set(own.map((t) => t.archivedSprint).filter(Boolean) as string[])];
    for (const [i, name] of archived.entries()) {
      const end = addDays(p.sprint.start, -1 - i * 14);
      const s = await prisma.sprint.create({
        data: { project_id: row.id, name, start_date: day(addDays(end, -13))!, end_date: day(end)!, state: 'selesai', completed_at: day(end) },
      });
      sprintByName.set(name, s.id);
    }
    const active = await prisma.sprint.create({
      data: {
        project_id: row.id,
        name: p.sprint.name,
        goal: p.sprint.goal,
        start_date: day(p.sprint.start)!,
        end_date: day(p.sprint.end)!,
        state: p.status === 'Selesai' ? 'selesai' : 'aktif',
        completed_at: p.status === 'Selesai' ? day(p.sprint.end) : null,
      },
    });
    sprintByName.set(p.sprint.name, active.id);

    const epics: IdMap = new Map();
    for (const e of demoEpics.filter((x) => x.project === p.slug)) {
      const er = await prisma.epic.create({
        data: { project_id: row.id, name: e.name, color: e.color, start_week: e.start, weeks: e.weeks, progress: e.progress, owner_id: users.get(e.ownerId) },
      });
      epics.set(e.id, er.id);
    }

    out.set(p.slug, {
      id: row.id,
      statuses: new Map(row.workflow.map((s) => [s.code, s.id])),
      activeSprintId: p.status === 'Selesai' ? undefined : active.id,
      sprintByName,
      epics,
    });
  }
  console.log(`   ${out.size} proyek`);
  return out;
};
