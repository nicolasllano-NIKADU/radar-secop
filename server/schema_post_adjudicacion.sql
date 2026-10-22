-- 12. TABLA DE CONTRATOS EN EJECUCIÓN (Post-Adjudicación)
CREATE TABLE IF NOT EXISTS contratos_gestion (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    numero_contrato VARCHAR(100) NOT NULL,
    referencia_proceso VARCHAR(100),
    entidad_contratante VARCHAR(255) NOT NULL,
    objeto_contractual TEXT NOT NULL,
    valor_adjudicado NUMERIC(18,2) NOT NULL,
    valor_adicionado NUMERIC(18,2) DEFAULT 0,
    tope_adicion_50 NUMERIC(18,2) GENERATED ALWAYS AS ((valor_adjudicado * 0.50)) STORED,
    fecha_suscripcion DATE,
    fecha_acta_inicio DATE,
    plazo_dias INTEGER DEFAULT 30,
    tipo_plazo VARCHAR(20) DEFAULT 'CALENDARIO',
    fecha_terminacion_estimada DATE,
    estado_ejecucion VARCHAR(50) DEFAULT 'LEGALIZACION', -- 'LEGALIZACION', 'EN_EJECUCION', 'SUSPENDIDO', 'TERMINADO', 'LIQUIDADO'
    supervisor_nombre VARCHAR(150),
    supervisor_email VARCHAR(150),
    interventoria_nombre VARCHAR(150),
    tiene_registro_presupuestal BOOLEAN DEFAULT FALSE,
    numero_rp VARCHAR(100),
    fecha_rp DATE,
    tiene_acta_inicio BOOLEAN DEFAULT FALSE,
    pago_seguridad_social_al_dia BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. TABLA DE PÓLIZAS Y GARANTÍAS CONTRACTUALES
CREATE TABLE IF NOT EXISTS contrato_polizas (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER NOT NULL REFERENCES contratos_gestion(id) ON DELETE CASCADE,
    aseguradora VARCHAR(150) NOT NULL,
    numero_poliza VARCHAR(100) NOT NULL,
    tipo_amparo VARCHAR(100) NOT NULL, -- 'CUMPLIMIENTO', 'BUEN_MANEJO_ANTICIPO', 'SALARIOS_PRESTACIONES', 'RESPONSABILIDAD_CIVIL', 'CALIDAD_SERVICIO'
    porcentaje_amparado NUMERIC(5,2) DEFAULT 10.0,
    valor_asegurado NUMERIC(18,2) NOT NULL,
    fecha_inicio_vigencia DATE NOT NULL,
    fecha_fin_vigencia DATE NOT NULL,
    estado_aprobacion VARCHAR(50) DEFAULT 'APROBADA', -- 'PENDIENTE', 'APROBADA', 'REQUERIMIENTO_AJUSTE', 'VENCIDA'
    dias_para_vencer INTEGER,
    anexo_modificatorio_url TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. TABLA DE MODIFICACIONES CONTRACTUALES (Adiciones, Prórrogas, Suspensiones)
CREATE TABLE IF NOT EXISTS contrato_modificaciones (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER NOT NULL REFERENCES contratos_gestion(id) ON DELETE CASCADE,
    tipo_modificacion VARCHAR(50) NOT NULL, -- 'ADICION_PRESUPUESTAL', 'PRORROGA_TIEMPO', 'SUSPENSION', 'REINICIO'
    valor_adicion NUMERIC(18,2) DEFAULT 0,
    dias_prorroga INTEGER DEFAULT 0,
    fecha_suspension_inicio DATE,
    fecha_suspension_fin DATE,
    poliza_modificada_aprobada BOOLEAN DEFAULT FALSE,
    justificacion TEXT NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contratos_empresa ON contratos_gestion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_polizas_vencimiento ON contrato_polizas(fecha_fin_vigencia ASC);
