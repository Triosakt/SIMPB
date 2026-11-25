CREATE TABLE IF NOT EXISTS chat_conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_kerja_id BIGINT UNSIGNED NOT NULL,
  last_message_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chat_conversation_unit (unit_kerja_id),
  CONSTRAINT fk_chat_conversation_unit
    FOREIGN KEY (unit_kerja_id)
    REFERENCES unit_kerja(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  sender_role ENUM('perwakilan_unit', 'admin_ortala') NOT NULL,
  message TEXT NOT NULL,
  read_by_admin_at TIMESTAMP NULL DEFAULT NULL,
  read_by_unit_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_messages_conversation (conversation_id, id),
  KEY idx_chat_messages_sender (sender_id),
  KEY idx_chat_messages_admin_unread (sender_role, read_by_admin_at),
  KEY idx_chat_messages_unit_unread (sender_role, read_by_unit_at),
  CONSTRAINT fk_chat_message_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_message_sender
    FOREIGN KEY (sender_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;