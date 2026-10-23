-- ====================================================================
-- RADAR SECOP - SCHEMA DE LIQUIDACIÓN FINAL DE CONTRATOS Y CIERRE DE BALANCES
-- Marco Normativo:
-- - Ley 80 de 1993, Art. 60 (Liquidación de contratos estatales)
-- - Ley 1150 de 2007, Art. 11 (Plazos para la liquidación bilateral y unilateral)
-- - Decreto Ley 019 de 2012, Art. 217 (Términos legales y caducidad)
-- - Decreto 1082 de 2015 (Amparos de la garantía poscontractual)
-- - Código Civil Colombiano, Art. 2060 (Responsabilidad decenal/quinquenal de obra)
-- ====================================================================

CREATE TABLE IF NOT EXISTS contratos_liquidaciones_finales (
    id SERIAL PRIMARY KEY,
    proceso_numero VARCHAR(100),
    contrato_numero VARCHAR(100) NOT NULL,
    entidad_nombre TEXT NOT NULL,
    contratista_nombre TEXT NOT NULL,
    contratista_nit VARCHAR(50) NOT NULL,
    tipo_liquidacion VARCHAR(60) DEFAULT 'MUTUO_ACUERDO_BILATERAL',
    -- 'MUTUO_ACUERDO_BILATERAL', 'UNILATERAL_ADMINISTRATIVA', 'JUDICIAL'
    fecha_terminacion_contrato DATE NOT NULL,
    fecha_acta_liquidacion DATE NOT NULL,
    valor_contrato_inicial NUMERIC(18, 2) NOT NULL CHECK (valor_contrato_inicial > 0),
    valor_adiciones NUMERIC(18, 2) DEFAULT 0.0 CHECK (valor_adiciones >= 0),
    valor_contrato_final NUMERIC(18, 2) NOT NULL CHECK (valor_contrato_final > 0),
    valor_total_ejecutado NUMERIC(18, 2) NOT NULL CHECK (valor_total_ejecutado >= 0),
    valor_total_pagado NUMERIC(18, 2) NOT NULL CHECK (valor_total_pagado >= 0),
    valor_anticipo_concedido NUMERIC(18, 2) DEFAULT 0.0 CHECK (valor_anticipo_concedido >= 0),
    valor_anticipo_amortizado NUMERIC(18, 2) DEFAULT 0.0 CHECK (valor_anticipo_amortizado >= 0),
    valor_anticipo_pendiente NUMERIC(18, 2) DEFAULT 0.0 CHECK (valor_anticipo_pendiente >= 0),
    valor_retenciones_garantia NUMERIC(18, 2) DEFAULT 0.0 CHECK (valor_retenciones_garantia >= 0),
    valor_descuentos_sanciones NUMERIC(18, 2) DEFAULT 0.0 CHECK (valor_descuentos_sanciones >= 0),
    saldo_neto_final NUMERIC(18, 2) NOT NULL,
    direccion_saldo VARCHAR(50) NOT NULL,
    -- 'A_FAVOR_CONTRATISTA', 'A_FAVOR_ENTIDAD', 'A_PAZ_Y_SALVO_CERO'
    amparos_poscontractuales JSONB DEFAULT '[]'::jsonb,
    salvedades_contratista TEXT,
    estado VARCHAR(50) DEFAULT 'FIRMADA',
    -- 'BORRADOR', 'APROBADA_INTERVENTOR', 'FIRMADA', 'NOTIFICADA'
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_liq_contrato ON contratos_liquidaciones_finales(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_liq_proceso ON contratos_liquidaciones_finales(proceso_numero);
CREATE INDEX IF NOT EXISTS idx_liq_direccion ON contratos_liquidaciones_finales(direccion_saldo);
