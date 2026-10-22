-- Schema para Observaciones a Pliegos y Estrategia de Ponderación (100 Puntos ANCP-CCE)

CREATE TABLE IF NOT EXISTS observaciones_pliego (
  id SERIAL PRIMARY KEY,
  proceso_id VARCHAR(255) NOT NULL,
  empresa_id INT REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_observacion VARCHAR(50) DEFAULT 'BORRADOR', -- BORRADOR, DEFINITIVO, INFORME_EVALUACION
  titulo VARCHAR(255) NOT NULL,
  clausula_impugnada TEXT,
  argumento_juridico TEXT,
  peticion_concreta TEXT,
  documento_generado TEXT,
  estado VARCHAR(50) DEFAULT 'BORRADOR', -- BORRADOR, RADICADO_SECOP, RESPONDIDO_ACEPTADO, RESPONDIDO_RECHAZADO
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estrategia_puntaje_pliego (
  id SERIAL PRIMARY KEY,
  proceso_id VARCHAR(255) NOT NULL,
  empresa_id INT REFERENCES empresas(id) ON DELETE CASCADE,
  puntaje_economico NUMERIC(5,2) DEFAULT 0,
  puntaje_industria_nacional NUMERIC(5,2) DEFAULT 0,
  puntaje_discapacidad NUMERIC(5,2) DEFAULT 0,
  puntaje_mipyme_mujeres NUMERIC(5,2) DEFAULT 0,
  puntaje_calidad_tecnica NUMERIC(5,2) DEFAULT 0,
  puntaje_total NUMERIC(5,2) DEFAULT 0,
  criterios_desempate JSONB,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unq_proceso_empresa_puntaje UNIQUE (proceso_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_obs_proceso ON observaciones_pliego(proceso_id);
CREATE INDEX IF NOT EXISTS idx_puntaje_proceso ON estrategia_puntaje_pliego(proceso_id);
