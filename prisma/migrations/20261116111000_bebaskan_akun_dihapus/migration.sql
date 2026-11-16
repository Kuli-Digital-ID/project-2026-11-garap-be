-- Akun anggota yang sudah dihapus masih menahan username & email (unik global): bebaskan.
UPDATE users SET username = username || '~hapus' || id, email = 'hapus' || id || '.' || email
WHERE deleted_at IS NOT NULL AND username NOT LIKE '%~hapus%';
