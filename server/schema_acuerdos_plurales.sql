-- ============================================================================
-- RADAR SECOP - SCHEMA: ACUERDOS DE CONSTITUCIÓN PLURAL (FORMULARIO 3 CCE)
-- Cumplimiento: Ley 80 de 1993 (Art. 7), Ley 1150 de 2007, Ley 1882 de 2018,
-- Estatuto Tributario (Art. 18) y Pliegos Tipo de Colombia Compra Eficiente (ANCP-CCE).
-- ============================================================================

CREATE TABLE IF NOT EXISTS acuerdos_plurales_cce (
    id SERIAL PRIMARY KEY,
    proceso_id VARCHAR(100),
    numero_proceso VARCHAR(100),
    entidad_nombre VARCHAR(255),
    objeto_proceso TEXT,
    nombre_estructura VARCHAR(255) NOT NULL,
    tipo_estructura VARCHAR(50) NOT NULL DEFAULT 'UNION_TEMPORAL', -- CONSORCIO, UNION_TEMPORAL
    duracion_meses INT DEFAULT 24,
    domicilio_contractual VARCHAR(100) DEFAULT 'Bogotá D.C.',
    rep_legal_nombre VARCHAR(255) NOT NULL,
    rep_legal_cedula VARCHAR(50) NOT NULL,
    rep_legal_ciudad_exp VARCHAR(100) DEFAULT 'Bogotá D.C.',
    rep_suplente_nombre VARCHAR(255),
    rep_suplente_cedula VARCHAR(50),
    modalidad_facturacion VARCHAR(50) DEFAULT 'NIT_PROPIO', -- NIT_PROPIO, FACTURACION_INDIVIDUAL, MIEMBRO_LIDER
    miembro_facturador VARCHAR(255),
    integrantes JSONB NOT NULL DEFAULT '[]'::jsonb,
    indicadores_ponderados JSONB DEFAULT '{}'::jsonb,
    documento_html TEXT,
    estado VARCHAR(50) DEFAULT 'BORRADOR', -- BORRADOR, APROBADO_SOCIOS, PROTOCOLIZADO, RADICADO_SECOP
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_acuerdos_proceso_id ON acuerdos_plurales_cce(proceso_id);
CREATE INDEX IF NOT EXISTS idx_acuerdos_tipo ON acuerdos_plurales_cce(tipo_estructura);
