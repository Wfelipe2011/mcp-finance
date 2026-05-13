-- Silver Layer — Dimensions
-- change: silver-dimensions
-- Views e tabelas do modelo dimensional (star schema)
-- Não modifica tabelas bronze; apenas SELECT sobre elas

-- ────────────────────────────────────────────────
-- d_users  (tabela seed — surrogate key para membros da família)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS d_users (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL
);

INSERT INTO d_users (name, display_name) VALUES
  ('wilson felipe da silva',             'Wilson'),
  ('giulia cristina rodrigues de souza', 'Giulia')
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────
-- d_data  (view de calendário — extraída das transações reais)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW d_data AS
SELECT
  dates.data,
  EXTRACT(YEAR  FROM dates.data)::INT  AS year,
  EXTRACT(MONTH FROM dates.data)::INT  AS month,
  CASE EXTRACT(MONTH FROM dates.data)::INT
    WHEN 1  THEN 'Janeiro'
    WHEN 2  THEN 'Fevereiro'
    WHEN 3  THEN 'Março'
    WHEN 4  THEN 'Abril'
    WHEN 5  THEN 'Maio'
    WHEN 6  THEN 'Junho'
    WHEN 7  THEN 'Julho'
    WHEN 8  THEN 'Agosto'
    WHEN 9  THEN 'Setembro'
    WHEN 10 THEN 'Outubro'
    WHEN 11 THEN 'Novembro'
    WHEN 12 THEN 'Dezembro'
  END AS month_name_pt,
  EXTRACT(QUARTER FROM dates.data)::INT             AS quarter,
  'T' || EXTRACT(QUARTER FROM dates.data)::INT      AS quarter_label,
  EXTRACT(DOW FROM dates.data)::INT                 AS day_of_week,
  CASE EXTRACT(DOW FROM dates.data)::INT
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Segunda-feira'
    WHEN 2 THEN 'Terça-feira'
    WHEN 3 THEN 'Quarta-feira'
    WHEN 4 THEN 'Quinta-feira'
    WHEN 5 THEN 'Sexta-feira'
    WHEN 6 THEN 'Sábado'
  END AS day_name_pt,
  EXTRACT(DOW FROM dates.data)::INT IN (0, 6)       AS is_weekend
FROM (
  SELECT DISTINCT date::DATE AS data
  FROM transactions_enriched
  WHERE date IS NOT NULL
) dates;

-- ────────────────────────────────────────────────
-- d_conta  (view de contas bancárias e cartões)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW d_conta AS
SELECT
  a.id                AS account_id,
  a.name              AS nome,
  a.type              AS tipo,
  a.subtype           AS subtipo,
  i.connector         AS banco,
  LOWER(a.owner)      AS dono,
  a.cc_credit_limit   AS limite_credito,
  a.currency_code     AS moeda
FROM accounts a
INNER JOIN items i ON a.item_id = i.id;

-- ────────────────────────────────────────────────
-- d_categoria  (view de hierarquia de categorias PT-BR)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW d_categoria AS
SELECT
  cl.category_id,
  cl.name_pt      AS category_pt,
  cg.group_id     AS group_code,
  cg.name_pt      AS group_pt
FROM category_labels cl
LEFT JOIN category_groups cg ON cl.group_id = cg.group_id;
