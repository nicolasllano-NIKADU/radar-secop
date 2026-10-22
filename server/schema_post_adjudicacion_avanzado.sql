-- ============================================================================
-- RADAR SECOP - SCHEMA: GESTIÓN CONTRACTUAL AVANZADA, ACTAS Y PAGOS PAC
-- Normativa: Ley 80 de 1993 (Art. 40, 60), Ley 1150 de 2007 (Art. 11),
-- Decreto 1082 de 2015 (Garantías Definitivas) y Estatuto Tributario.
-- ============================================================================

CREATE TABLE IF NOT EXISTS contrato_actas (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER NOT NULL REFERENCES contratos_gestion(id) ON DELETE CASCADE,
    tipo_acta VARCHAR(50) NOT NULL, -- 'INICIO', 'PARCIAL_RECIBO', 'SUSPENSION', 'REINICIO', 'ENTREGA_FINAL', 'LIQUIDACION'
    numero_acta VARCHAR(50) NOT NULL,
    fecha_acta DATE NOT NULL,
    porcentaje_avance_fisico NUMERIC(5,2) DEFAULT 0,
    porcentaje_avance_financiero NUMERIC(5,2) DEFAULT 0,
    valor_acta NUMERIC(18,2) DEFAULT 0,
    observaciones TEXT,
    firmada_supervisor BOOLEAN DEFAULT TRUE,
    firmada_contratista BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_actas_contrato_id ON contrato_actas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_actas_tipo ON contrato_actas(tipo_acta);

CREATE TABLE IF NOT EXISTS contrato_facturacion_pagos (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER NOT NULL REFERENCES contratos_gestion(id) ON DELETE CASCADE,
    numero_factura VARCHAR(50) NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_radicacion DATE NOT NULL,
    concepto TEXT NOT NULL,
    valor_bruto NUMERIC(18,2) NOT NULL,
    valor_iva NUMERIC(18,2) DEFAULT 0,
    valor_retenciones NUMERIC(18,2) DEFAULT 0,
    valor_neto_girar NUMERIC(18,2) NOT NULL,
    estado_pago VARCHAR(50) DEFAULT 'RADICADA', -- 'RADICADA', 'EN_SUPERVISION', 'EN_TESORERIA_PAC', 'PAGADA', 'GLOSADA'
    fecha_pago DATE,
    comprobante_egreso_no VARCHAR(100),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pagos_contrato_id ON contrato_facturacion_pagos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON contrato_facturacion_pagos(estado_pago);
