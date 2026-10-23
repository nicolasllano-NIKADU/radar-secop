-- ====================================================================
-- RADAR SECOP - SCHEMA DE SOBRES Y PROPUESTAS ECONÓMICAS OFICIALES CCE
-- Normativa: Ley 80/1993, Ley 1150/2007, Ley 1882/2018, Pliegos Tipo ANCP-CCE
-- ====================================================================

CREATE TABLE IF NOT EXISTS propuestas_economicas_sobres (
  id SERIAL PRIMARY KEY,
  proceso_referencia VARCHAR(150) NOT NULL,
  entidad VARCHAR(255) NOT NULL,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  valor_total_oferta NUMERIC(16, 2) NOT NULL,
  valor_total_letras TEXT NOT NULL,
  validez_dias INTEGER DEFAULT 90,
  ciudad_firma VARCHAR(100) DEFAULT 'Bogotá D.C.',
  aiu_config JSONB NOT NULL,
  totales_liquidacion JSONB NOT NULL,
  items_presupuesto JSONB NOT NULL,
  datos_proponente JSONB NOT NULL,
  datos_consorcio JSONB,
  datos_banco JSONB,
  observaciones TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prop_econ_ref ON propuestas_economicas_sobres(proceso_referencia);
CREATE INDEX IF NOT EXISTS idx_prop_econ_empresa ON propuestas_economicas_sobres(empresa_id);
