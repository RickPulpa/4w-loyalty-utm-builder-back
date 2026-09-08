-- UTM Builder — datos iniciales
-- Carga solo lo que vimos confirmado en el proyecto de Lovable (Campaign Naming
-- Studio, Honda Perú). El resto de las categorías se crean vacías para que las
-- completes vos mismo desde el panel de administración — la lista de Lovable
-- tenía 107 valores en total y varias categorías (Coyuntura, Estrategia de
-- Audiencia, Género, Región, Concesionario, Formato, Creatividad, y el resto
-- de "Modelo") no llegamos a verlas completas.

USE utm_builder;

-- ============ Nivel: CAMPAÑA ============

INSERT INTO categories (level, `key`, label, is_required, sort_order) VALUES
  ('campaign', 'area_negocio', 'Área de Negocio', TRUE, 1),
  ('campaign', 'tipo_campana', 'Tipo de Campaña', TRUE, 2),
  ('campaign', 'objetivo', 'Objetivo', TRUE, 3),
  ('campaign', 'modelo', 'Modelo', TRUE, 4),
  ('campaign', 'coyuntura', 'Coyuntura', TRUE, 5)
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'COMERCIAL' AS label, 'COM' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'POST-VENTA', 'PV', 2
  UNION ALL SELECT 'SEMINUEVOS', 'SEMI', 3
  UNION ALL SELECT 'LOYALTY', 'LOY', 4
) v ON TRUE
WHERE c.`key` = 'area_negocio'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'PERFORMANCE' AS label, 'PERF' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'BRANDING', 'BRND', 2
  UNION ALL SELECT 'LANZAMIENTO', 'LANZ', 3
  UNION ALL SELECT 'FIDELIZACION', 'FID', 4
) v ON TRUE
WHERE c.`key` = 'tipo_campana'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'LEADS' AS label, 'LDS' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'CLICS', 'CLK', 2
  UNION ALL SELECT 'IMPRESIONES', 'IMPR', 3
  UNION ALL SELECT 'REPRODUCCIONES', 'VIEW', 4
  UNION ALL SELECT 'ALCANCE', 'ALC', 5
  UNION ALL SELECT 'VISITAS-WEB', 'VWEB', 6
  UNION ALL SELECT 'INTERACCIONES', 'INTR', 7
) v ON TRUE
WHERE c.`key` = 'objetivo'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

-- Lista de "Modelo" parcial: en Lovable se veían más filas debajo de BRV que
-- no llegamos a scrollear. Agregá las que falten desde el admin.
INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'WRV' AS label, 'WRV' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'HRV', 'HRV', 2
  UNION ALL SELECT 'CRV', 'CRV', 3
  UNION ALL SELECT 'CRV-H', 'CRVH', 4
  UNION ALL SELECT 'PILOT', 'PLT', 5
  UNION ALL SELECT 'CIVIC', 'CVC', 6
  UNION ALL SELECT 'ZRV', 'ZRV', 7
  UNION ALL SELECT 'ZRV-H', 'ZRVH', 8
  UNION ALL SELECT 'BRV', 'BRV', 9
) v ON TRUE
WHERE c.`key` = 'modelo'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

-- ============ Nivel: CONJUNTO DE ANUNCIOS ============
-- Vimos los campos pero no sus valores completos (excepto Plataforma).

INSERT INTO categories (level, `key`, label, is_required, sort_order) VALUES
  ('adset', 'estrategia_audiencia', 'Estrategia de Audiencia', TRUE, 1),
  ('adset', 'genero', 'Género', FALSE, 2),
  ('adset', 'region', 'Región', TRUE, 3),
  ('adset', 'concesionario', 'Concesionario', FALSE, 4),
  ('adset', 'plataforma', 'Plataforma', TRUE, 5)
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- En Lovable "Plataforma" se veía como botones Facebook/Instagram, pero no
-- llegamos a ver qué código/abreviatura les asigna Honda internamente — mejor
-- cargalos vos desde el admin para no inventar un código que no coincida con
-- lo que ya usan en Salesforce.

-- ============ Nivel: ANUNCIO ============
-- Solo vimos los nombres de los campos, sin valores.

INSERT INTO categories (level, `key`, label, is_required, sort_order) VALUES
  ('ad', 'formato', 'Formato', TRUE, 1),
  ('ad', 'creatividad', 'Creatividad', TRUE, 2)
ON DUPLICATE KEY UPDATE label = VALUES(label);
