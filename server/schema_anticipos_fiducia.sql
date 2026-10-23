-- ====================================================================
-- RADAR SECOP - SCHEMA DE TRAZABILIDAD DE ANTICIPOS Y CUENTA FIDUCIA
-- Marco Normativo:
-- - Ley 80 de 1993, Art. 40 (Límite máximo del 50% del valor contractual)
-- - Ley 1474 de 2011, Art. 91 (Estatuto Anticorrupción: Fiducia o Patrimonio Autónomo)
-- - Decreto 1082 de 2015 (Garantías de Buen Manejo y Régimen Fiduciario)
-- - Jurisprudencia Consejo de Estado (Diferencia jurídica Anticipo vs Pago Anticipado)
-- ====================================================================

CREATE TABLE IF NOT EXISTS anticipos_planes_inversion (
    id SERIAL PRIMARY KEY,
    proceso_numero VARCHAR(100),
    contrato_numero VARCHAR(100) NOT NULL,
    entidad_nombre TEXT NOT NULL,
    contratista_nombre TEXT NOT NULL,
    contratista_nit VARCHAR(50) NOT NULL,
    valor_contrato NUMERIC(18, 2) NOT NULL CHECK (valor_contrato > 0),
    anticipo_porcentaje NUMERIC(5, 2) NOT NULL CHECK (anticipo_porcentaje > 0 AND anticipo_porcentaje <= 50.00),
    anticipo_monto NUMERIC(18, 2) NOT NULL CHECK (anticipo_monto > 0),
    fiduciaria_nombre VARCHAR(150) NOT NULL,
    numero_encargo_patrimonio VARCHAR(100) NOT NULL,
    tipo_instrumento VARCHAR(50) DEFAULT 'PATRIMONIO_AUTONOMO',
    fecha_constitucion DATE,
    fecha_desembolso DATE,
    plazo_meses INTEGER DEFAULT 6 CHECK (plazo_meses > 0),
    tasa_rendimiento_anual NUMERIC(6, 3) DEFAULT 9.50,
    rubros_inversion JSONB DEFAULT '[]'::jsonb,
    estado VARCHAR(50) DEFAULT 'ACTIVO', -- ACTIVO, EN_EJECUCION, AMORTIZADO, LIQUIDADO
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anticipos_amortizaciones_mensuales (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES anticipos_planes_inversion(id) ON DELETE CASCADE,
    numero_acta INTEGER NOT NULL,
    fecha_acta DATE NOT NULL,
    valor_bruto_acta NUMERIC(18, 2) NOT NULL CHECK (valor_bruto_acta >= 0),
    porcentaje_amortizacion NUMERIC(5, 2) NOT NULL CHECK (porcentaje_amortizacion >= 0),
    valor_amortizado NUMERIC(18, 2) NOT NULL CHECK (valor_amortizado >= 0),
    saldo_anticipo_previo NUMERIC(18, 2) NOT NULL CHECK (saldo_anticipo_previo >= 0),
    saldo_anticipo_restante NUMERIC(18, 2) NOT NULL CHECK (saldo_anticipo_restante >= 0),
    porcentaje_ejecucion_acumulada NUMERIC(5, 2) DEFAULT 0.0,
    rendimientos_generados_mes NUMERIC(18, 2) DEFAULT 0.0,
    rendimientos_reintegrados_tesoro NUMERIC(18, 2) DEFAULT 0.0,
    reintegro_soporte_num VARCHAR(100),
    estado_acta VARCHAR(50) DEFAULT 'APROBADA', -- PROYECTADA, APROBADA, LIQUIDADA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anticipos_proceso ON anticipos_planes_inversion(proceso_numero);
CREATE INDEX IF NOT EXISTS idx_anticipos_contrato ON anticipos_planes_inversion(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_amortizaciones_plan ON anticipos_amortizaciones_mensuales(plan_id);
