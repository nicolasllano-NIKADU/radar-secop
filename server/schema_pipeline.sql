-- ====================================================================
-- RADAR SECOP - SCHEMA PIPELINE KANBAN Y GESTIÓN COMERCIAL EN EQUIPO
-- Módulo 6: Ciclo de vida de la licitación y colaboración interdisciplinaria
-- ====================================================================

CREATE TABLE IF NOT EXISTS pipeline_procesos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  proceso_referencia VARCHAR(150) NOT NULL,
  entidad VARCHAR(255) NOT NULL,
  objeto TEXT,
  presupuesto NUMERIC(16, 2) DEFAULT 0,
  fecha_cierre TIMESTAMP WITH TIME ZONE,
  fase VARCHAR(50) DEFAULT 'IDENTIFICADO', -- IDENTIFICADO, EVALUADO, EN_PREPARACION, PRESENTADO, SUBSANACION, ADJUDICADO, DESIERTO, PERDIDO
  decision_go_nogo VARCHAR(20) DEFAULT 'PENDIENTE', -- GO, NO_GO, PENDIENTE
  probabilidad_exito INTEGER DEFAULT 50, -- 0 a 100%
  responsable VARCHAR(150) DEFAULT 'Por Asignar',
  departamento VARCHAR(100),
  url_secop TEXT,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_tareas (
  id SERIAL PRIMARY KEY,
  pipeline_id INTEGER REFERENCES pipeline_procesos(id) ON DELETE CASCADE,
  perfil VARCHAR(50) DEFAULT 'GENERAL', -- JURIDICO, FINANCIERO, TECNICO, GENERAL
  titulo VARCHAR(255) NOT NULL,
  completada BOOLEAN DEFAULT FALSE,
  fecha_limite TIMESTAMP WITH TIME ZONE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_bitacora (
  id SERIAL PRIMARY KEY,
  pipeline_id INTEGER REFERENCES pipeline_procesos(id) ON DELETE CASCADE,
  autor VARCHAR(100) DEFAULT 'Equipo',
  comentario TEXT NOT NULL,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipeline_empresa ON pipeline_procesos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_fase ON pipeline_procesos(fase);
CREATE INDEX IF NOT EXISTS idx_pipeline_tareas_proc ON pipeline_tareas(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_bitacora_proc ON pipeline_bitacora(pipeline_id);
