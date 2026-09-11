-- UTM Builder — datos iniciales
-- Carga lo confirmado en el prototipo de Lovable (Honda Naming System, Honda
-- Perú): Área de Negocio, Tipo de Campaña, Objetivo, Coyuntura, Estrategia de
-- Audiencia, Género, Región, Plataforma, Formato, Creatividad y Tipo de
-- Promoción. Quedan vacías (cargalas desde Administrar): "Modelo" (se veían
-- más filas debajo de BRV que no llegamos a scrollear) y "Concesionario" (en
-- el prototipo depende de la Región elegida, algo que este catálogo plano
-- todavía no modela — ver README).

USE utm_builder;

-- ============ Nivel: CAMPAÑA ============

INSERT INTO categories (level, `key`, label, is_required, field_type, sort_order) VALUES
  ('campaign', 'area_negocio', 'Área de Negocio', TRUE, 'select', 1),
  ('campaign', 'tipo_campana', 'Tipo de Campaña', TRUE, 'select', 2),
  ('campaign', 'objetivo', 'Objetivo', TRUE, 'select', 3),
  ('campaign', 'modelo', 'Modelo', TRUE, 'select', 4),
  ('campaign', 'coyuntura', 'Coyuntura', TRUE, 'select', 5),
  ('campaign', 'anio_mes', 'Año-Mes', TRUE, 'month', 6)
ON DUPLICATE KEY UPDATE label = VALUES(label), field_type = VALUES(field_type);

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

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'AON' AS label, 'AON' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'DIA-PADRE', 'DPAD', 2
  UNION ALL SELECT 'DIA-MADRE', 'DMAD', 3
  UNION ALL SELECT 'FIESTAS-PATRIAS', 'FPAT', 4
  UNION ALL SELECT 'NAVIDAD', 'NAV', 5
) v ON TRUE
WHERE c.`key` = 'coyuntura'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

-- ============ Nivel: CONJUNTO DE ANUNCIOS ============

INSERT INTO categories (level, `key`, label, is_required, field_type, sort_order) VALUES
  ('adset', 'estrategia_audiencia', 'Estrategia de Audiencia', TRUE, 'select', 1),
  ('adset', 'genero', 'Género', FALSE, 'select', 2),
  ('adset', 'region', 'Región', TRUE, 'select', 3),
  ('adset', 'concesionario', 'Concesionario', FALSE, 'select', 4),
  ('adset', 'rango_edad', 'Rango de Edad', FALSE, 'age_range', 5),
  ('adset', 'plataforma', 'Plataforma', TRUE, 'multi_select', 6)
ON DUPLICATE KEY UPDATE label = VALUES(label), field_type = VALUES(field_type);

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'BROAD' AS label, 'BROAD' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'INTERESES', 'INT', 2
  UNION ALL SELECT 'REMARKETING', 'RMKT', 3
  UNION ALL SELECT 'SIMILAR-BBDD', 'SIMBD', 4
  UNION ALL SELECT 'SIMILAR-PIXEL', 'SIMPX', 5
  UNION ALL SELECT 'PERSONALIZADO-BBDD', 'PERBD', 6
  UNION ALL SELECT 'PERSONALIZADO-PIXEL', 'PERPX', 7
  UNION ALL SELECT 'BBDD-CLIENTES', 'BBDDC', 8
  UNION ALL SELECT 'ADVANTAGE', 'ADV', 9
) v ON TRUE
WHERE c.`key` = 'estrategia_audiencia'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'TODOS' AS label, 'TOD' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'SOLO-HOMBRES', 'HOM', 2
  UNION ALL SELECT 'SOLO-MUJERES', 'MUJ', 3
) v ON TRUE
WHERE c.`key` = 'genero'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'LIMA' AS label, 'LIMA' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'PROVINCIAS', 'PROV', 2
  UNION ALL SELECT 'LIMA-PROVINCIAS', 'LIMPR', 3
) v ON TRUE
WHERE c.`key` = 'region'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

-- "Plataforma" es multi-selección (se puede elegir Facebook, Instagram, o
-- ambos). Las abreviaturas FB/IG son un punto de partida editable — si Honda
-- ya usa otro código en Salesforce, se ajusta desde el admin.
INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'FACEBOOK' AS label, 'FB' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'INSTAGRAM', 'IG', 2
) v ON TRUE
WHERE c.`key` = 'plataforma'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

-- ============ Nivel: ANUNCIO ============

INSERT INTO categories (level, `key`, label, is_required, field_type, sort_order) VALUES
  ('ad', 'formato', 'Formato', TRUE, 'select', 1),
  ('ad', 'creatividad', 'Creatividad', TRUE, 'select', 2),
  ('ad', 'tipo_promocion', 'Tipo de Promoción', TRUE, 'select', 3)
ON DUPLICATE KEY UPDATE label = VALUES(label), field_type = VALUES(field_type);

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'CAROUSEL' AS label, 'CRSL' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'SINGLE-IMAGE', 'SIMG', 2
  UNION ALL SELECT 'REELS', 'REEL', 3
  UNION ALL SELECT 'VIDEO', 'VID', 4
  UNION ALL SELECT 'COLLECTION', 'COLL', 5
  UNION ALL SELECT 'STORIES', 'STOR', 6
) v ON TRUE
WHERE c.`key` = 'formato'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'FOTO-ROJO' AS label, 'FTRJ' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'VIDEO-INTERIOR', 'VDIN', 2
  UNION ALL SELECT 'SPECS', 'SPEC', 3
  UNION ALL SELECT 'CON-PRECIO', 'CPRE', 4
  UNION ALL SELECT 'SIN-PRECIO', 'SPRE', 5
  UNION ALL SELECT 'TEASER', 'TEAS', 6
) v ON TRUE
WHERE c.`key` = 'creatividad'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'BANCOS' AS label, 'BANC' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'MANTENIMIENTO-GRATIS', 'MNTGR', 2
  UNION ALL SELECT 'DESCUENTOS', 'DESC', 3
  UNION ALL SELECT 'SIN-PROMO', 'SINPR', 4
) v ON TRUE
WHERE c.`key` = 'tipo_promocion'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);
