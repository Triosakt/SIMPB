ALTER TABLE chat_messages
  MODIFY COLUMN message TEXT NULL,
  ADD COLUMN attachment_path VARCHAR(500) NULL AFTER message,
  ADD COLUMN attachment_name VARCHAR(255) NULL AFTER attachment_path,
  ADD COLUMN attachment_mime VARCHAR(100) NULL AFTER attachment_name,
  ADD COLUMN attachment_size BIGINT UNSIGNED NULL AFTER attachment_mime;
