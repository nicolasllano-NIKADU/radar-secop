-- ============================================================================
-- RADAR SECOP - SCHEMA: ADENDAS Y CONTROL DE CRONOGRAMA DINÁMICO (SECOP II)
-- Normativa: Ley 80 de 1993, Ley 1150 de 2007, Ley 1882 de 2018 (Art. 4)
-- y Decreto 1082 de 2015 (Art. 2.2.1.1.2.2.1).
-- ============================================================================

CREATE TABLE IF NOT EXISTS adendas_proceso (
    id SERIAL PRIMARY KEY,
    proceso_id VARCHAR(100) NOT NULL,
    numero_proceso VARCHAR(100),
    entidad_nombre VARCHAR(255),
    numero_adenda VARCHAR(50) NOT NULL, -- Ej: 'Adenda No. 1', 'Adenda No. 2'
    fecha_expedicion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tipo_modificacion VARCHAR(100) NOT NULL DEFAULT 'CRONOGRAMA', -- CRONOGRAMA, REQUISITOS_HABILITANTES, FORMULARIO_ECONOMICO, ESPECIFICACIONES_TECNICAS, MATRIZ_RIESGOS, MULTIPLE
    fecha_cierre_anterior TIMESTAMP WITH TIME ZONE,
    fecha_cierre_nueva TIMESTAMP WITH TIME ZONE,
    dias_prorroga INT DEFAULT 0,
    descripcion_cambios TEXT NOT NULL,
    impacto_poliza_seriedad BOOLEAN DEFAULT FALSE,
    nueva_vigencia_poliza_requerida DATE,
    impacto_oferta_economica BOOLEAN DEFAULT FALSE,
    impacto_habilitantes BOOLEAN DEFAULT FALSE,
    nivel_criticidad VARCHAR(20) DEFAULT 'MEDIO', -- ALTO, MEDIO, BAJO, INFORMATIVO
    accion_requerida TEXT,
    cumplimiento_ley_1882 BOOLEAN DEFAULT TRUE, -- Regla de los 3 días hábiles pre-cierre
    estado_gestion VARCHAR(50) DEFAULT 'PENDIENTE_REVISION', -- PENDIENTE_REVISION, ACCION_APLICADA, ARCHIVADA
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_adendas_proceso_id ON adendas_proceso(proceso_id);
CREATE INDEX IF NOT EXISTS idx_adendas_tipo ON adendas_proceso(tipo_modificacion);
CREATE INDEX IF NOT EXISTS idx_adendas_criticidad ON adendas_proceso(nivel_criticidad);
