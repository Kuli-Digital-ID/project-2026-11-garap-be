import { PrismaClient } from '@prisma/client';
import { PasswordUtil } from '../../../src/common/utils/password.util';
import { PositionName } from '../../../src/common/constants/permissions.constant';
import { members, agentProfiles } from '../demo/data/members';
import { divisions as demoDivisions } from '../demo/data/org';
import { at, IdMap, must } from './util';

export const seedOrganization = async (prisma: PrismaClient, positions: Map<PositionName, number>) => {
  console.log('🏢 Divisi, anggota, agent...');
  const divisions: IdMap = new Map();
  for (const d of demoDivisions) {
    const row = await prisma.division.create({
      data: { slug: d.id, name: d.name, color: d.color, description: d.description, request_kinds: d.requestKinds },
    });
    divisions.set(d.id, row.id);
  }

  // Password hanya untuk login lokal saat pengembangan (AUTH_PASSWORD_LOGIN=true).
  const devPassword = process.env.SEED_DEV_PASSWORD ?? 'password123';
  const hashed = await PasswordUtil.hash(devPassword);

  const users: IdMap = new Map();
  for (const m of members) {
    const [first, ...rest] = m.fullName.split(' ');
    const row = await prisma.user.create({
      data: {
        username: m.id,
        email: m.email ?? `${m.id}@agent.garap.local`,
        password: m.kind === 'human' ? hashed : null,
        first_name: first,
        last_name: rest.join(' '),
        display_name: m.name,
        initials: m.initials,
        color: m.color,
        kind: m.kind,
        role: m.role,
        team: m.team,
        status: m.status,
        floor: m.floor,
        joined_at: at(m.joined),
        position_id: positions.get(m.access)!,
        division_id: divisions.get(m.division),
      },
    });
    users.set(m.id, row.id);
  }

  for (const d of demoDivisions) {
    await prisma.division.update({ where: { id: divisions.get(d.id) }, data: { lead_id: users.get(d.leadId) } });
  }

  for (const a of agentProfiles) {
    await prisma.agentProfile.create({
      data: {
        user_id: must(users, a.id, 'Agent'),
        provider: a.provider ?? 'anthropic',
        model_id: a.modelId ?? a.model.toLowerCase().replace(/[ .]/g, '-'),
        model: a.model,
        description: a.description,
        skills: a.skills,
        budget: a.budget,
        spent: a.spent,
        tasks_done: a.tasksDone,
        avg_minutes: a.avgMinutes,
        approval_rate: a.approvalRate,
        current_task: a.currentTask,
        supervisor_id: users.get(a.supervisorId),
        tools: a.tools,
        learnings: a.learnings,
        usage: a.usage.map((n) => Math.round(n)),
      },
    });
  }
  console.log(`   ${divisions.size} divisi, ${users.size} anggota (${agentProfiles.length} agent)`);
  return { users, divisions, devPassword };
};
