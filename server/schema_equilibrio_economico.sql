-- ====================================================================
-- RADAR SECOP - SCHEMA DE RECLAMACIONES ECONÓMICAS Y EQUILIBRIO CONTRACTUAL
-- Marco Normativo:
-- - Ley 80 de 1993, Art. 4 num. 8, Art. 5 num. 1 y Art. 27
-- - Ley 1150 de 2007 (Ecuación contractual y riesgos previsibles)
-- - Código de Comercio, Art. 868 (Teoría de la Imprevisión)
-- - Código Civil Colombiano, Art. 1613 y 1614 (Daño emergente y lucro cesante)
-- - Jurisprudencia Consejo de Estado Sección Tercera (Rad. 18080 / 14577)
-- ====================================================================

CREATE TABLE IF NOT EXISTS reclamaciones_equilibrio_economico (
    id SERIAL PRIMARY KEY,
    proceso_numero VARCHAR(100),
    contrato_numero VARCHAR(100) NOT NULL,
    entidad_nombre TEXT NOT NULL,
    contratista_nombre TEXT NOT NULL,
    contratista_nit VARCHAR(50) NOT NULL,
    tipologia_reclamacion VARCHAR(60) NOT NULL, 
    -- 'TEORIA_IMPREVISION', 'HECHO_DEL_PRINCIPE', 'IUS_VARIANDI', 'MAYOR_PERMANENCIA_OBRA', 'INCUMPLIMIENTO_ENTIDAD'
    fundamento_juridico TEXT,
    hechos_generadores TEXT NOT NULL,
    valor_contrato_inicial NUMERIC(18, 2) NOT NULL CHECK (valor_contrato_inicial > 0),
    plazo_inicial_dias INTEGER NOT NULL CHECK (plazo_inicial_dias > 0),
    plazo_adicional_suspension_dias INTEGER DEFAULT 0 CHECK (plazo_adicional_suspension_dias >= 0),
    fecha_ocurrencia_hechos DATE,
    items_reclamacion JSONB DEFAULT '[]'::jsonb,
    monto_dano_emergente NUMERIC(18, 2) NOT NULL DEFAULT 0.0 CHECK (monto_dano_emergente >= 0),
    monto_lucro_cesante NUMERIC(18, 2) NOT NULL DEFAULT 0.0 CHECK (monto_lucro_cesante >= 0),
    monto_indexacion_ipc NUMERIC(18, 2) NOT NULL DEFAULT 0.0 CHECK (monto_indexacion_ipc >= 0),
    monto_total_reclamado NUMERIC(18, 2) NOT NULL CHECK (monto_total_reclamado >= 0),
    porcentaje_impacto_contrato NUMERIC(6, 2) DEFAULT 0.0,
    estado VARCHAR(50) DEFAULT 'BORRADOR', 
    -- 'BORRADOR', 'SOLICITADA_CONCILIACION', 'EN_TRAMITE', 'CONCILIADA', 'RECHAZADA'
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reclamaciones_anexos_soporte (
    id SERIAL PRIMARY KEY,
    reclamacion_id INTEGER NOT NULL REFERENCES reclamaciones_equilibrio_economico(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(80) NOT NULL, 
    -- 'BITACORA_OBRA', 'CERTIFICADO_DANE_IPP', 'ACTA_SUSPENSION', 'FACTURAS_EQUIPO', 'PLANILLA_PILA', 'PERITAJE_TECNICO'
    nombre_archivo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_anexo DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reclamaciones_contrato ON reclamaciones_equilibrio_economico(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_reclamaciones_proceso ON reclamaciones_equilibrio_economico(proceso_numero);
CREATE INDEX IF NOT EXISTS idx_reclamaciones_anexos_rec ON reclamaciones_anexos_soporte(reclamacion_id);
