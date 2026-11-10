import { PrismaClient } from '@prisma/client';
import { contentByTicket, contentSchedules, socialChannels } from '../demo/data/content';
import { SeededProject } from './projects.seed';
import { at, day, IdMap, must } from './util';

/**
 * Akun sosmed, konten rutin, dan publikasi demo. Akun demo tidak punya token platform,
 * jadi akun "otomatis" ditandai perlu-login-ulang sampai dihubungkan lewat OAuth.
 */
export const seedContent = async (prisma: PrismaClient, users: IdMap, projects: Map<string, SeededProject>, tickets: IdMap) => {
  console.log('📣 Akun sosmed, konten rutin, publikasi...');
  const channels: IdMap = new Map();
  for (const c of socialChannels) {
    const row = await prisma.socialChannel.create({
      data: {
        platform: c.platform,
        name: c.name,
        handle: c.handle,
        mode: 'manual',
        status: c.mode === 'otomatis' ? 'perlu-login-ulang' : 'terhubung',
        added_by: users.get(c.addedBy),
        created_at: at(c.added),
        projects: { create: c.projects.map((slug) => ({ project_id: projects.get(slug)!.id })) },
      },
    });
    channels.set(c.id, row.id);
  }

  const schedules: IdMap = new Map();
  for (const s of contentSchedules) {
    const p = projects.get(s.project)!;
    const row = await prisma.contentSchedule.create({
      data: {
        project_id: p.id,
        title: s.title,
        format: s.format,
        channel_ids: s.channelIds.map((id) => must(channels, id, 'Akun sosmed')),
        days: s.days,
        time: s.time,
        lead_days: s.leadDays,
        assignee_id: s.assigneeId ? users.get(s.assigneeId) : undefined,
        checklist: s.checklist,
        active: s.active,
        created_by: users.get('mega'),
      },
    });
    schedules.set(s.id, row.id);
  }

  const posts: IdMap = new Map();
  for (const [key, c] of Object.entries(contentByTicket)) {
    const ticketId = tickets.get(key);
    if (!ticketId) continue;
    const t = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        content_format: c.format,
        ...(c.scheduleId ? { schedule_id: must(schedules, c.scheduleId, 'Konten rutin'), occurrence: t.due_date ?? day(c.posts[0].scheduledAt) } : {}),
      },
    });
    for (const p of c.posts) {
      const row = await prisma.contentPost.create({
        data: {
          ticket_id: ticketId,
          channel_id: must(channels, p.channelId, 'Akun sosmed'),
          title: p.title,
          caption: p.caption,
          scheduled_at: at(p.scheduledAt),
          status: p.status,
          approved_by: p.approvedBy ? users.get(p.approvedBy) : undefined,
          approved_at: p.approvedBy ? at(p.scheduledAt) : undefined,
          published_at: at(p.publishedAt),
          url: p.url,
          metrics: p.metrics ? { ...p.metrics } : undefined,
          metrics_at: p.metrics ? at(p.publishedAt) : undefined,
        },
      });
      posts.set(p.id, row.id);
    }
  }
  console.log(`   ${channels.size} akun, ${schedules.size} konten rutin, ${posts.size} publikasi`);
  return posts;
};
