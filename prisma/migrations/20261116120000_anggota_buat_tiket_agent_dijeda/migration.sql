-- Anggota boleh membuat tiket (di proyek yang diikutinya).
INSERT INTO position_permissions (position_id, permission_id)
SELECT pos.id, perm.id FROM positions pos, permissions perm
WHERE pos.name = 'Anggota' AND perm.name = 'ADD_TICKET'
ON CONFLICT (position_id, permission_id) DO NOTHING;

-- Agent yang sedang dijeda tercatat dengan status "dijeda" (sebelumnya tampil "Siaga").
UPDATE users SET status = 'dijeda'
WHERE kind = 'agent' AND id IN (SELECT user_id FROM agent_profiles WHERE current_task = 'Dijeda');
