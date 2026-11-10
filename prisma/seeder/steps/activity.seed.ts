import { Prisma, PrismaClient } from '@prisma/client';
import { requests as demoRequests } from '../demo/data/org';
import { tickets as demoTickets } from '../demo/data/tickets';
import { docs as demoDocs } from '../demo/data/docs';
import { approvals, audit, notifications, runs } from '../demo/data/activity';
import { SeededProject } from './projects.seed';
import { at, bytes, IdMap, must } from './util';

/** Pemilik workspace; notifikasi demo ditujukan ke dia. */
const OWNER = 'bhagas';

export const seedActivity = async (
  prisma: PrismaClient,
  users: IdMap,
  divisions: IdMap,
  projects: Map<string, SeededProject>,
  tickets: IdMap,
  posts: IdMap,
) => {
  console.log('📨 Permintaan, dokumen, persetujuan, notifikasi, audit...');
  for (const [i, r] of demoRequests.entries()) {
    const ticketKey = r.ticketKey ?? demoTickets.find((t) => t.requestId === r.id)?.key;
    await prisma.workRequest.create({
      data: {
        code: `REQ-${i + 1}`,
        title: r.title,
        detail: r.detail,
        division_id: must(divisions, r.division, 'Divisi'),
        kind: r.kind,
        requester_id: must(users, r.fromId, 'Pengaju'),
        priority: r.priority,
        due_date: r.due ? new Date(`${r.due}T00:00:00Z`) : undefined,
        references: r.references,
        status: r.status,
        note: r.note,
        agent_summary: r.agentSummary,
        project_id: r.project ? projects.get(r.project)?.id : undefined,
        ticket_id: ticketKey ? tickets.get(ticketKey) : undefined,
        created_at: at(r.created),
        attachments: {
          create: r.attachments.map((a) => ({
            name: a.name, size: bytes(a.size), kind: a.kind, uploader_id: must(users, a.by, 'Pengunggah'), created_at: at(a.time),
          })),
        },
      },
    });
  }

  for (const d of demoDocs) {
    await prisma.doc.create({
      data: {
        slug: d.id,
        project_id: projects.get(d.project)!.id,
        title: d.title,
        kind: d.kind,
        status: d.status,
        version: d.version,
        pages: d.pages,
        sections: d.sections as unknown as Prisma.InputJsonValue,
        author_id: must(users, d.authorId, 'Penulis'),
        reviewer_id: d.reviewerId ? users.get(d.reviewerId) : undefined,
        created_at: at(d.updated),
        updated_at: at(d.updated),
      },
    });
  }

  const owner = must(users, OWNER, 'Owner');
  for (const a of approvals) {
    await prisma.approval.create({
      data: {
        agent_id: must(users, a.agentId, 'Agent'),
        project_id: projects.get(a.project)!.id,
        kind: a.kind,
        title: a.title,
        detail: a.detail,
        preview: a.preview,
        risk: a.risk,
        status: a.status,
        decided_by: a.status === 'menunggu' ? undefined : owner,
        decided_at: at(a.decidedAt),
        content_post_id: a.postId ? posts.get(a.postId) : undefined,
        created_at: at(a.created),
      },
    });
  }

  for (const r of runs) {
    await prisma.agentRun.create({
      data: {
        code: r.id,
        agent_id: must(users, r.agentId, 'Agent'),
        project_id: projects.get(r.project)!.id,
        ticket_id: r.ticketKey ? tickets.get(r.ticketKey) : undefined,
        title: r.title,
        status: r.status,
        started_at: at(r.started)!,
        duration: r.duration,
        tokens_in: r.tokensIn,
        tokens_out: r.tokensOut,
        cost: Math.round(r.cost),
        steps: r.steps as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.notification.createMany({
    data: notifications.map((n) => ({
      recipient_id: owner,
      actor_id: users.get(n.actorId),
      kind: n.kind,
      text: n.text,
      target: n.target,
      href: n.href,
      project_slug: n.project,
      read_at: n.read ? at(n.time) : null,
      created_at: at(n.time),
    })),
  });

  await prisma.auditLog.createMany({
    data: audit.map((e) => ({
      actor_id: users.get(e.actorId),
      action: e.action,
      target: e.target,
      category: e.category,
      ip: e.ip,
      created_at: at(e.time),
    })),
  });
};
