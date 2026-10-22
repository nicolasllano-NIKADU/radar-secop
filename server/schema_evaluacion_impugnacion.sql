-- Schema para Traslado del Informe de Evaluación, Subsanaciones y Memoriales de Impugnación Cruzada

CREATE TABLE IF NOT EXISTS impugnaciones_evaluacion (
  id SERIAL PRIMARY KEY,
  proceso_id VARCHAR(255) NOT NULL,
  empresa_id INT REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_accion VARCHAR(50) NOT NULL, -- 'DEFENSA_SUBSANACION' o 'IMPUGNACION_COMPETIDOR'
  competidor_nombre VARCHAR(255),
  competidor_nit VARCHAR(50),
  causal_codigo VARCHAR(100) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion_hechos TEXT NOT NULL,
  fundamento_juridico TEXT NOT NULL,
  peticion_concreta TEXT NOT NULL,
  documento_generado TEXT,
  estado VARCHAR(50) DEFAULT 'BORRADOR', -- BORRADOR, RADICADO_SECOP, ACEPTADO_ENTIDAD, RECHAZADO_ENTIDAD
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_impugnacion_proceso ON impugnaciones_evaluacion(proceso_id);
