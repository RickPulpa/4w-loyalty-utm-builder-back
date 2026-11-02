-- Migración: login con 2FA por correo + rol super_admin.
-- Seguro de re-ejecutar. Después de correrla, "rick" queda como super admin con su correo.

USE utm_builder;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE users ADD COLUMN email VARCHAR(190) NULL UNIQUE AFTER password_hash',
  'SELECT ''users.email ya existe, nada que hacer.'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE users
  MODIFY COLUMN role ENUM('super_admin', 'admin', 'editor') NOT NULL DEFAULT 'editor';

CREATE TABLE IF NOT EXISTS login_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_login_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_login_codes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE users SET email = 'rick@pulpa.digital', role = 'super_admin' WHERE username = 'rick';
