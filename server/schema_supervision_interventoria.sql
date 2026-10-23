-- ====================================================================
-- RADAR SECOP - SCHEMA DE SUPERVISIÓN E INTERVENTORÍA CONTRACTUAL
-- Marco Normativo:
-- - Ley 1474 de 2011, Arts. 82 - 85 (Estatuto Anticorrupción)
-- - Ley 80 de 1993 (Seguimiento y control de la ejecución)
-- - Decreto 1082 de 2015 (Reglamentación de interventoría en obra pública)
-- - Norma NSR-10 e INVIAS (Control de calidad y ensayos de laboratorio)
-- ====================================================================

CREATE TABLE IF NOT EXISTS interventoria_contratos_supervision (
    id SERIAL PRIMARY KEY,
    proceso_numero VARCHAR(100),
    contrato_numero VARCHAR(100) NOT NULL UNIQUE,
    entidad_nombre TEXT NOT NULL,
    contratista_nombre TEXT NOT NULL,
    interventor_nombre TEXT NOT NULL,
    interventor_tipo VARCHAR(60) DEFAULT 'EXTERNO_PERSONA_JURIDICA',
    -- 'SUPERVISOR_INTERNO', 'EXTERNO_PERSONA_JURIDICA', 'EXTERNO_PERSONA_NATURAL'
    fecha_inicio_supervision DATE NOT NULL,
    avance_fisico_programado_pct NUMERIC(5, 2) DEFAULT 0.0,
    avance_fisico_real_pct NUMERIC(5, 2) DEFAULT 0.0,
    estado_supervision VARCHAR(50) DEFAULT 'EN_EJECUCION',
    -- 'EN_EJECUCION', 'SUSPENDIDO', 'FINALIZADO_CON_RECIBO', 'EN_LIQUIDACION'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interventoria_bitacora_diaria (
    id SERIAL PRIMARY KEY,
    contrato_numero VARCHAR(100) NOT NULL,
    fecha_registro DATE NOT NULL,
    condicion_climatica VARCHAR(50) DEFAULT 'SOLEADO',
    -- 'SOLEADO', 'LLUVIA_LEVE', 'LLUVIA_FUERTE_SUSPENSION'
    personal_total INTEGER DEFAULT 0 CHECK (personal_total >= 0),
    maquinaria_activa INTEGER DEFAULT 0 CHECK (maquinaria_activa >= 0),
    frente_obra TEXT NOT NULL,
    actividades_ejecutadas TEXT NOT NULL,
    instrucciones_interventor TEXT,
    estado_orden VARCHAR(50) DEFAULT 'CUMPLIDA',
    -- 'CUMPLIDA', 'EN_SEGUIMIENTO', 'REQUERIMIENTO_URGENTE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interventoria_control_calidad_ensayos (
    id SERIAL PRIMARY KEY,
    contrato_numero VARCHAR(100) NOT NULL,
    tipo_ensayo VARCHAR(80) NOT NULL,
    -- 'COMPRESION_CONCRETO_28D', 'DENSIDAD_SUELOS_PROCTOR', 'ASENTAMIENTO_SLUMP', 'ACERO_TRACCION'
    localizacion_muestra TEXT NOT NULL,
    fecha_toma_muestra DATE NOT NULL,
    fecha_resultado DATE NOT NULL,
    valor_diseno_exigido NUMERIC(10, 2) NOT NULL CHECK (valor_diseno_exigido > 0),
    valor_obtenido_laboratorio NUMERIC(10, 2) NOT NULL CHECK (valor_obtenido_laboratorio >= 0),
    unidad_medida VARCHAR(30) NOT NULL,
    -- 'PSI', 'MPa', '%', 'Pulgadas'
    porcentaje_conformidad NUMERIC(6, 2) NOT NULL,
    resultado_tecnico VARCHAR(50) NOT NULL,
    -- 'CONFORME', 'OBSERVADO', 'NO_CONFORME'
    laboratorio_nombre VARCHAR(150) NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bitacora_cto ON interventoria_bitacora_diaria(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON interventoria_bitacora_diaria(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_ensayos_cto ON interventoria_control_calidad_ensayos(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_ensayos_resultado ON interventoria_control_calidad_ensayos(resultado_tecnico);
