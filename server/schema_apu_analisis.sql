-- ====================================================================
-- RADAR SECOP - SCHEMA DE ANÁLISIS DE PRECIOS UNITARIOS (APU) Y DESBALANCE
-- Normativa: Decreto 1082/2015, Ley 1882/2018, Pliegos Tipo ANCP-CCE
-- ====================================================================

CREATE TABLE IF NOT EXISTS analisis_apu_proceso (
  id SERIAL PRIMARY KEY,
  proceso_referencia VARCHAR(150) NOT NULL,
  entidad VARCHAR(255) NOT NULL,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  presupuesto_total_oficial NUMERIC(16, 2) NOT NULL,
  presupuesto_total_oferta NUMERIC(16, 2) NOT NULL,
  desviacion_global_pct NUMERIC(6, 2),
  front_loading_ratio NUMERIC(5, 3),
  items_analizados JSONB NOT NULL,
  aiu_config JSONB,
  estado_dictamen VARCHAR(50) DEFAULT 'EQUILIBRADO', -- EQUILIBRADO, OBSERVADO_DESBALANCE, ALERTA_PRECIO_BAJO, RECHAZO_SOBRECOSTO
  resumen_alertas JSONB,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_apu_proceso_ref ON analisis_apu_proceso(proceso_referencia);
CREATE INDEX IF NOT EXISTS idx_apu_empresa_id ON analisis_apu_proceso(empresa_id);
