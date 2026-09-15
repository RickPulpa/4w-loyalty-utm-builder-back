-- Migración: agrega el field_type 'chip_select', las columnas depends_on_key /
-- depends_on_value_label (categories) y region_scope (catalog_values).
-- Seguro de re-ejecutar: no falla si las columnas ya existen o el enum ya está al día.

USE utm_builder;

-- field_type: sumar 'chip_select' al ENUM (MODIFY COLUMN es idempotente: da el
-- mismo resultado si ya incluye el valor).
ALTER TABLE categories
  MODIFY COLUMN field_type ENUM('select', 'multi_select', 'chip_select', 'month', 'age_range')
  NOT NULL DEFAULT 'select';

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'depends_on_key'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE categories ADD COLUMN depends_on_key VARCHAR(100) NULL AFTER field_type',
  'SELECT ''depends_on_key ya existe, nada que hacer.'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'depends_on_value_label'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE categories ADD COLUMN depends_on_value_label VARCHAR(150) NULL AFTER depends_on_key',
  'SELECT ''depends_on_value_label ya existe, nada que hacer.'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catalog_values' AND COLUMN_NAME = 'region_scope'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE catalog_values ADD COLUMN region_scope ENUM(''LIMA'', ''PROVINCIAS'') NULL AFTER abbreviation',
  'SELECT ''region_scope ya existe, nada que hacer.'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
