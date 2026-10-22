-- Schema para Win Rate Analytics, Embudo de Conversión Licitatoria y ROI

ALTER TABLE pipeline_procesos ADD COLUMN IF NOT EXISTS modalidad VARCHAR(100) DEFAULT 'LICITACION_PUBLICA';
ALTER TABLE pipeline_procesos ADD COLUMN IF NOT EXISTS tipo_proponente VARCHAR(50) DEFAULT 'INDIVIDUAL'; -- INDIVIDUAL, CONSORCIO
ALTER TABLE pipeline_procesos ADD COLUMN IF NOT EXISTS valor_ofertado NUMERIC(16, 2);
ALTER TABLE pipeline_procesos ADD COLUMN IF NOT EXISTS costo_preparacion_estimado NUMERIC(16, 2) DEFAULT 0;
ALTER TABLE pipeline_procesos ADD COLUMN IF NOT EXISTS motivo_perdida VARCHAR(100); -- PRECIO, DESCALIFICACION_FINANCIERA, DESCALIFICACION_EXPERIENCIA, EMPATE_DESEMPATE, DESIERTO
ALTER TABLE pipeline_procesos ADD COLUMN IF NOT EXISTS fecha_adjudicacion_prevista DATE;

CREATE TABLE IF NOT EXISTS metricas_analytics_cache (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER,
  periodo VARCHAR(50) DEFAULT 'ALL',
  metricas JSONB NOT NULL,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipeline_modalidad ON pipeline_procesos(modalidad);
CREATE INDEX IF NOT EXISTS idx_pipeline_tipo_proponente ON pipeline_procesos(tipo_proponente);
