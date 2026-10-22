-- ====================================================================
-- RADAR SECOP - SCHEMA DE VERIFICACIÓN DE GARANTÍAS Y PÓLIZAS CCE
-- Normativa: Decreto 1082 de 2015, Ley 80/1993, Ley 1150/2007, Pliegos Tipo CCE
-- ====================================================================

CREATE TABLE IF NOT EXISTS matriz_garantias_verificacion (
  id SERIAL PRIMARY KEY,
  proceso_referencia VARCHAR(150) NOT NULL,
  entidad VARCHAR(255) NOT NULL,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  etapa VARCHAR(50) DEFAULT 'PRECONTRACTUAL', -- PRECONTRACTUAL (Seriedad Oferta) o CONTRACTUAL (Garantía Única + RCE)
  presupuesto_oficial NUMERIC(16, 2) NOT NULL,
  valor_oferta_contrato NUMERIC(16, 2),
  plazo_ejecucion_meses INTEGER DEFAULT 6,
  anticipo_porcentaje NUMERIC(5, 2) DEFAULT 0.00,
  smmlv_aplicable NUMERIC(16, 2) DEFAULT 1423500.00,
  estado_global VARCHAR(50) DEFAULT 'PENDIENTE', -- APROBADO_CONFORME, DEFICIT_VALOR, DEFICIT_VIGENCIA, RECHAZADO
  puntaje_cumplimiento NUMERIC(5, 2) DEFAULT 0.00,
  amparos_items JSONB,
  observaciones_juridicas TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matriz_garantias_proceso ON matriz_garantias_verificacion(proceso_referencia);
CREATE INDEX IF NOT EXISTS idx_matriz_garantias_empresa ON matriz_garantias_verificacion(empresa_id);
