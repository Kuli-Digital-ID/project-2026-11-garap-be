ALTER TABLE "attachments" ADD COLUMN "chat_message_id" INTEGER;
CREATE INDEX "attachments_chat_message_id_idx" ON "attachments"("chat_message_id");
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_chat_message_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
