-- UTM Builder — schema MySQL
-- Ejecutar este archivo primero (crea la base, las tablas y las relaciones).
-- Después correr sql/seed.sql para cargar los valores ya confirmados desde Lovable.

CREATE DATABASE IF NOT EXISTS utm_builder
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE utm_builder;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NULL,
  role ENUM('admin', 'editor') NOT NULL DEFAULT 'editor',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada "categoría" es un campo administrable del formulario (Área de Negocio,
-- Objetivo, Modelo, etc.). `level` indica en qué parte del nombre entra:
-- campaign (nombre de campaña), adset (conjunto de anuncios) o ad (anuncio).
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level ENUM('campaign', 'adset', 'ad') NOT NULL,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada valor posible dentro de una categoría (ej: categoría "Objetivo" ->
-- valor "LEADS" con abreviatura "LDS"). La abreviatura es siempre editable a
-- mano desde el panel de administración; el backend solo la *sugiere*.
CREATE TABLE IF NOT EXISTS catalog_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  label VARCHAR(150) NOT NULL,
  abbreviation VARCHAR(32) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_catalog_values_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_value_per_category (category_id, label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prefijos fijos y separador usados para armar el nombre final
-- (ej: prefix_campaign = "PE_HONDA_META_", separator = "_").
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`, `value`) VALUES
  ('prefix_campaign', 'PE_HONDA_META_'),
  ('prefix_adset', ''),
  ('prefix_ad', ''),
  ('separator', '_')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
