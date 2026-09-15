-- UTM Builder — datos iniciales
-- Carga lo confirmado en el prototipo de Lovable (Honda Naming System, Honda
-- Perú) y en la segunda ronda de feedback del cliente (PPT con capturas
-- anotadas): Área de Negocio, Tipo de Campaña, Objetivo, Coyuntura, Estrategia
-- de Audiencia, Género, Región, Concesionario (con region_scope), Plataforma,
-- Formato, Creatividad, Tipo de Promoción y los campos condicionales de
-- Promociones Bancarias (Entidad Financiera, Beneficio Bancario). Queda vacío
-- (cargalo desde Administrar): "Modelo" (se veían más filas debajo de BRV que
-- no llegamos a scrollear).

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
  ('adset', 'concesionario', 'Concesionario', FALSE, 'chip_select', 4),
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

-- "Concesionario" depende de la Región elegida en el Generador (LIMA muestra solo
-- region_scope='LIMA', PROVINCIAS solo 'PROVINCIAS', LIMA-PROVINCIAS muestra todos
-- — ver ConcesionarioOptions en generator.component.ts). Lista según lo confirmado
-- en las capturas del cliente; sumá más sedes desde Administrar cuando las tengan.
INSERT INTO catalog_values (category_id, label, abbreviation, region_scope, sort_order)
SELECT id, v.label, v.abbreviation, v.region_scope, v.sort_order
FROM categories c
JOIN (
  SELECT 'VMOTOR-INDEPENDENCIA' AS label, 'VMOTOR-INDEP' AS abbreviation, 'LIMA' AS region_scope, 1 AS sort_order
  UNION ALL SELECT 'MAQUINARIAS-LAMOLINA', 'MAQ-LAMOLINA', 'LIMA', 2
  UNION ALL SELECT 'PANA-SANMIGUEL', 'PANA-SANMIG', 'LIMA', 3
  UNION ALL SELECT 'PANA-SANISIDRO', 'PANA-SANISI', 'LIMA', 4
  UNION ALL SELECT 'AREQUIPA-SEDE', 'AREQUIPA', 'PROVINCIAS', 5
  UNION ALL SELECT 'TRUJILLO-SEDE', 'TRUJILLO', 'PROVINCIAS', 6
  UNION ALL SELECT 'PIURA-SEDE', 'PIURA', 'PROVINCIAS', 7
  UNION ALL SELECT 'PUCALLPA-SEDE', 'PUCALLPA', 'PROVINCIAS', 8
) v ON TRUE
WHERE c.`key` = 'concesionario'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation), region_scope = VALUES(region_scope);

-- ============ Nivel: ANUNCIO ============

-- "Entidad Financiera" y "Beneficio Bancario" son condicionales: solo aparecen en
-- el Generador cuando Tipo de Promoción = BANCOS (ver depends_on_key/depends_on_value_label).
INSERT INTO categories
  (level, `key`, label, is_required, field_type, depends_on_key, depends_on_value_label, sort_order)
VALUES
  ('ad', 'formato', 'Formato', TRUE, 'select', NULL, NULL, 1),
  ('ad', 'creatividad', 'Creatividad', TRUE, 'select', NULL, NULL, 2),
  ('ad', 'tipo_promocion', 'Tipo de Promoción', TRUE, 'select', NULL, NULL, 3),
  ('ad', 'entidad_financiera', 'Entidad Financiera', TRUE, 'select', 'tipo_promocion', 'BANCOS', 4),
  ('ad', 'beneficio_bancario', 'Beneficio Bancario', TRUE, 'select', 'tipo_promocion', 'BANCOS', 5)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  field_type = VALUES(field_type),
  depends_on_key = VALUES(depends_on_key),
  depends_on_value_label = VALUES(depends_on_value_label);

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

INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'BCP' AS label, 'BCP' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'BBVA', 'BBVA', 2
  UNION ALL SELECT 'INTERBANK', 'IBK', 3
) v ON TRUE
WHERE c.`key` = 'entidad_financiera'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);

-- El 4to valor ("0-INICIAL") sale de una captura poco nítida del PPT del cliente —
-- confirmá el texto exacto y ajustalo desde Administrar si hace falta.
INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
SELECT id, v.label, v.abbreviation, v.sort_order
FROM categories c
JOIN (
  SELECT 'CUOTAS' AS label, 'CUOT' AS abbreviation, 1 AS sort_order
  UNION ALL SELECT 'BONO', 'BONO', 2
  UNION ALL SELECT 'TASA-PREFERENCIAL', 'TASAPREF', 3
  UNION ALL SELECT '0-INICIAL', '0INI', 4
) v ON TRUE
WHERE c.`key` = 'beneficio_bancario'
ON DUPLICATE KEY UPDATE abbreviation = VALUES(abbreviation);
