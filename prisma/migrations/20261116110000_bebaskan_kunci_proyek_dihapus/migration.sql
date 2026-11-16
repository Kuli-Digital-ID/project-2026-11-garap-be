-- Proyek yang sudah dihapus masih menahan kunci tiket (DOL-1) dan slug dokumen yang unik global,
-- sehingga proyek baru dengan kunci/nama sama gagal ("sudah ada"). Bebaskan untuk data yang sudah terlanjur.
UPDATE agent_jobs SET status = 'failed', error = 'Proyek dihapus'
WHERE status IN ('queued', 'running') AND ticket_key IN (
  SELECT t.key FROM tickets t JOIN projects p ON p.id = t.project_id WHERE p.deleted_at IS NOT NULL
);

UPDATE tickets t SET key = t.key || '~' || p.id
FROM projects p
WHERE t.project_id = p.id AND p.deleted_at IS NOT NULL AND t.key NOT LIKE '%~%';

UPDATE docs d SET slug = d.slug || '-dihapus-' || p.id
FROM projects p
WHERE d.project_id = p.id AND p.deleted_at IS NOT NULL AND d.slug NOT LIKE '%-dihapus-%';
