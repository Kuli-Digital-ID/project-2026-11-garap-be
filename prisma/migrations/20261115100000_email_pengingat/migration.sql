-- Preferensi notifikasi per pengguna + kunci anti-ganda untuk pengingat tenggat.
ALTER TABLE "users" ADD COLUMN "notif_prefs" JSONB;
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" TEXT;
CREATE UNIQUE INDEX "notifications_recipient_id_dedupe_key_key" ON "notifications"("recipient_id", "dedupe_key");
