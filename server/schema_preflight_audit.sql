-- ============================================================================
-- RADAR SECOP - SCHEMA: AUDITORÍA PRE-FLIGHT Y CHECKLIST DE CIERRE (SECOP II)
-- Normativa: Ley 80 de 1993, Ley 1150 de 2007 (Art. 5), Ley 1882 de 2018 (Art. 5),
-- Decreto 1082 de 2015, Pliegos Tipo ANCP-CCE y Conceptos Vinculantes C-057/2026, C-525/2026.
-- ============================================================================

CREATE TABLE IF NOT EXISTS preflight_audits (
    id SERIAL PRIMARY KEY,
    proceso_id VARCHAR(100) NOT NULL,
    numero_proceso VARCHAR(100),
    entidad_nombre VARCHAR(255),
    objeto_proceso TEXT,
    proponente_nit VARCHAR(50),
    proponente_razon_social VARCHAR(255),
    estado_global VARCHAR(50) DEFAULT 'NO_APTO', -- APTO_PARA_RADICAR, SUBSANACION_PENDIENTE, RIESGO_RECHAZO
    puntaje_cumplimiento NUMERIC(5, 2) DEFAULT 0.00,
    total_controles INT DEFAULT 20,
    controles_aprobados INT DEFAULT 0,
    controles_advertencia INT DEFAULT 0,
    controles_rechazo INT DEFAULT 0,
    diagnostico_ejecutivo TEXT,
    controles_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_preflight_proceso ON preflight_audits(proceso_id);
CREATE INDEX IF NOT EXISTS idx_preflight_estado ON preflight_audits(estado_global);
