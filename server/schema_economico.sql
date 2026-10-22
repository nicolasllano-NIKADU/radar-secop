-- ====================================================================
-- RADAR SECOP - SCHEMA DE PONDERACIÓN ECONÓMICA Y SIMULACIÓN MONTE CARLO
-- Normativa: Ley 1882/2018, Ley 2022/2020, Pliegos Tipo ANCP-CCE, Concepto C-382/2020
-- ====================================================================

CREATE TABLE IF NOT EXISTS simulaciones_economicas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  proceso_referencia VARCHAR(150),
  entidad VARCHAR(255),
  presupuesto_oficial NUMERIC(16, 2) NOT NULL,
  puntaje_maximo NUMERIC(5, 2) DEFAULT 60.00,
  competidores_estimados INTEGER DEFAULT 6,
  precio_optimo_sugerido NUMERIC(16, 2),
  porcentaje_optimo_po NUMERIC(5, 2),
  esperanza_puntaje NUMERIC(5, 2),
  desglose_metodos JSONB,
  distribucion_simulada JSONB,
  ofertas_reales JSONB,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_simulaciones_proceso ON simulaciones_economicas(proceso_referencia);
CREATE INDEX IF NOT EXISTS idx_simulaciones_empresa ON simulaciones_economicas(empresa_id);
