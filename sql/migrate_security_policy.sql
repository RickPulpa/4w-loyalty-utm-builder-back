-- Migración: políticas de seguridad (contraseñas, bloqueo por intentos, cambio obligatorio).
-- Seguro de re-ejecutar. Al crear las columnas, TODOS los usuarios existentes quedan con
-- "cambio de contraseña obligatorio" (must_change_password = 1) para su próximo ingreso.

USE utm_builder;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'must_change_password');
SET @sql = IF(@c = 0,
  'ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT ''users.must_change_password ya existe.''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_changed_at');
SET @sql = IF(@c = 0,
  'ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL',
  'SELECT ''users.password_changed_at ya existe.''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'failed_attempts');
SET @sql = IF(@c = 0,
  'ALTER TABLE users ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0',
  'SELECT ''users.failed_attempts ya existe.''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'locked_at');
SET @sql = IF(@c = 0,
  'ALTER TABLE users ADD COLUMN locked_at DATETIME NULL',
  'SELECT ''users.locked_at ya existe.''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Historial de contraseñas (solo hashes) para impedir reutilizar las últimas 5.
CREATE TABLE IF NOT EXISTS password_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_password_history_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
