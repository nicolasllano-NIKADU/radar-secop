-- ====================================================================
-- RADAR SECOP - SCHEMA DE CRITERIOS DIFERENCIALES MIPYMES Y GÉNERO
-- Normativa: Ley 2069 de 2020, Decreto 1860 de 2021, Decreto 957 de 2019
-- ====================================================================

CREATE TABLE IF NOT EXISTS criterios_diferenciales_evaluaciones (
  id SERIAL PRIMARY KEY,
  proceso_referencia VARCHAR(150) NOT NULL,
  entidad VARCHAR(255) NOT NULL,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  sector_economico VARCHAR(50) NOT NULL, -- MANUFACTURA, SERVICIOS, COMERCIO
  ingresos_brutos_cop NUMERIC(16, 2) NOT NULL,
  ingresos_uvt NUMERIC(12, 2) NOT NULL,
  clasificacion_tamano VARCHAR(50) NOT NULL, -- MICRO, PEQUEÑA, MEDIANA, GRAN_EMPRESA
  acredita_mipyme BOOLEAN DEFAULT FALSE,
  es_empresa_mujeres BOOLEAN DEFAULT FALSE,
  supuesto_mujeres VARCHAR(50), -- SUPUESTO_A_PROPIEDAD_CONTROL, SUPUESTO_B_DIRECCION, SUPUESTO_C_PERSONA_NATURAL, SUPUESTO_D_ASOCIATIVO, NINGUNO
  porcentaje_participacion_femenina NUMERIC(5, 2) DEFAULT 0,
  acredita_discapacidad BOOLEAN DEFAULT FALSE,
  acredita_primer_empleo BOOLEAN DEFAULT FALSE,
  acredita_reincorporados_victimas BOOLEAN DEFAULT FALSE,
  puntaje_diferencial_total NUMERIC(5, 2) DEFAULT 0,
  posicion_arbol_desempate INTEGER DEFAULT 10,
  resumen_evaluacion JSONB NOT NULL,
  datos_firmantes JSONB,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crit_dif_ref ON criterios_diferenciales_evaluaciones(proceso_referencia);
CREATE INDEX IF NOT EXISTS idx_crit_dif_empresa ON criterios_diferenciales_evaluaciones(empresa_id);
