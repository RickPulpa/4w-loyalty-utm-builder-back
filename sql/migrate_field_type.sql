-- Migración: agrega `field_type` a `categories` en bases creadas antes de este cambio.
-- Si ya corriste schema.sql de cero (con field_type incluido), no hace falta correr esto.
-- Seguro de re-ejecutar: no falla si la columna ya existe.

USE utm_builder;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'field_type'
);

SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE categories
     ADD COLUMN field_type ENUM(''select'', ''multi_select'', ''month'', ''age_range'')
     NOT NULL DEFAULT ''select'' AFTER is_required',
  'SELECT ''field_type ya existe, nada que hacer.'''
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
