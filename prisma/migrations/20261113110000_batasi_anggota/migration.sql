-- Posisi Anggota hanya boleh mengerjakan tiket: cabut izin lain yang dulu diberikan secara bawaan.
DELETE FROM "position_permissions"
WHERE "position_id" = (SELECT "id" FROM "positions" WHERE "name" = 'Anggota')
  AND "permission_id" IN (
    SELECT "id" FROM "permissions" WHERE "name" NOT IN (
      'VIEW_USER', 'VIEW_DIVISION', 'VIEW_AGENT', 'VIEW_PROJECT',
      'VIEW_TICKET', 'UPDATE_TICKET', 'COMMENT_TICKET', 'VIEW_DOC'
    )
  );
