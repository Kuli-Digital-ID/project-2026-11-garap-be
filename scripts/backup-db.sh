#!/usr/bin/env bash
# Cadangan harian database Garap + lampiran. Jalankan di VPS (user dev) lewat cron, contoh:
#   15 2 * * *  /home/dev/backend/garap-be/scripts/backup-db.sh >> /home/dev/backups/garap/backup.log 2>&1
# Hasil: $BACKUP_DIR/garap-db-YYYYmmdd-HHMM.sql.gz (+ garap-uploads-*.tgz tiap hari Minggu).
# Pulihkan:  gunzip -c garap-db-XXXX.sql.gz | psql "$DATABASE_URL"   (ke database kosong)
set -euo pipefail

APP_DIR="${APP_DIR:-/home/dev/backend/garap-be}"
BACKUP_DIR="${BACKUP_DIR:-/home/dev/backups/garap}"
KEEP_DAYS="${KEEP_DAYS:-14}"
UPLOAD_VOLUME="${UPLOAD_VOLUME:-garap-uploads}"

mkdir -p "$BACKUP_DIR"
umask 077

# DATABASE_URL dibaca dari .env aplikasi (tanpa ?schema=... yang tidak dikenal pg_dump).
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' | sed 's/?schema=[a-z_]*//')"
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL tidak ditemukan di $APP_DIR/.env" >&2; exit 1; }

STAMP="$(date +%Y%m%d-%H%M)"
OUT="$BACKUP_DIR/garap-db-$STAMP.sql.gz"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
# Cadangan kosong/rusak lebih berbahaya daripada tidak ada: pastikan ada isinya.
[ "$(gzip -dc "$OUT" | grep -c 'CREATE TABLE')" -gt 5 ] || { echo "Cadangan $OUT tampak kosong" >&2; exit 1; }
echo "$(date -Is) db ok: $OUT ($(du -h "$OUT" | cut -f1))"

# Lampiran (volume podman) seminggu sekali.
if [ "$(date +%u)" = "7" ] && command -v podman >/dev/null; then
  MP="$(podman volume inspect "$UPLOAD_VOLUME" --format '{{.Mountpoint}}' 2>/dev/null || true)"
  if [ -n "$MP" ] && [ -d "$MP" ]; then
    tar -czf "$BACKUP_DIR/garap-uploads-$STAMP.tgz" -C "$MP" .
    echo "$(date -Is) lampiran ok"
  fi
fi

find "$BACKUP_DIR" -name 'garap-*' -mtime +"$KEEP_DAYS" -delete
