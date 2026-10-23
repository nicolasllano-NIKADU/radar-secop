-- ====================================================================
-- RADAR SECOP - SCHEMA DE PROCEDIMIENTOS SANCIONATORIOS Y DEBIDO PROCESO
-- Marco Normativo:
-- - Ley 1474 de 2011, Art. 86 (Procedimiento administrativo sancionatorio)
-- - Ley 80 de 1993, Art. 17 (Caducidad) y Art. 18 (Cláusula Penal Pecuniaria)
-- - Decreto 1082 de 2015 (Garantías de cumplimiento y vinculación de aseguradoras)
-- - Consejo de Estado Sección Tercera (Sentencias de Unificación Rad. 41719 y Rad. 24900)
-- ====================================================================

CREATE TABLE IF NOT EXISTS sancionatorio_expedientes (
    id SERIAL PRIMARY KEY,
    proceso_numero VARCHAR(100),
    contrato_numero VARCHAR(100) NOT NULL,
    entidad_nombre TEXT NOT NULL,
    contratista_nombre TEXT NOT NULL,
    contratista_nit VARCHAR(50) NOT NULL,
    aseguradora_nombre VARCHAR(150),
    numero_poliza_cumplimiento VARCHAR(100),
    tipologia_sancion VARCHAR(60) NOT NULL,
    -- 'MULTA_DIARIA_MORA', 'MULTA_INCUMPLIMIENTO_PARCIAL', 'CLAUSULA_PENAL_PECUNIARIA', 'DECLARATORIA_CADUCIDAD'
    fecha_citacion_audiencia DATE NOT NULL,
    fecha_hechos_informe DATE,
    hechos_imputados_interventoria TEXT NOT NULL,
    valor_contrato_base NUMERIC(18, 2) NOT NULL CHECK (valor_contrato_base > 0),
    dias_mora_imputados INTEGER DEFAULT 0 CHECK (dias_mora_imputados >= 0),
    porcentaje_multa_diario NUMERIC(5, 3) DEFAULT 0.100 CHECK (porcentaje_multa_diario >= 0),
    tope_maximo_multa_pct NUMERIC(5, 2) DEFAULT 10.00 CHECK (tope_maximo_multa_pct > 0 AND tope_maximo_multa_pct <= 100),
    monto_multa_tasada NUMERIC(18, 2) NOT NULL DEFAULT 0.0 CHECK (monto_multa_tasada >= 0),
    argumentos_defensa_contratista TEXT,
    eximentes_responsabilidad JSONB DEFAULT '[]'::jsonb,
    estado_proceso VARCHAR(50) DEFAULT 'AUDIENCIA_CITADA',
    -- 'AUDIENCIA_CITADA', 'DESCARGOS_PRESENTADOS', 'SANCION_IMPUESTA', 'PROCESO_ARCHIVADO_EXONERADO', 'RECURSO_REPOSICION'
    resolucion_numero VARCHAR(100),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sancionatorio_actuaciones (
    id SERIAL PRIMARY KEY,
    expediente_id INTEGER NOT NULL REFERENCES sancionatorio_expedientes(id) ON DELETE CASCADE,
    fecha_actuacion DATE NOT NULL,
    tipo_actuacion VARCHAR(80) NOT NULL,
    -- 'INFORME_INTERVENTORIA', 'AUTO_CITACION_AUDIENCIA', 'MEMORIAL_DESCARGOS', 'PRUEBAS_APORTADAS', 'RESOLUCION_SANCION'
    descripcion_actuacion TEXT NOT NULL,
    documento_soporte_nombre VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sancion_contrato ON sancionatorio_expedientes(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_sancion_proceso ON sancionatorio_expedientes(proceso_numero);
CREATE INDEX IF NOT EXISTS idx_sancion_estado ON sancionatorio_expedientes(estado_proceso);
CREATE INDEX IF NOT EXISTS idx_actuaciones_exp ON sancionatorio_actuaciones(expediente_id);
