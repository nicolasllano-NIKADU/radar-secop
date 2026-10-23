-- ====================================================================
-- RADAR SECOP - SCHEMA DE FACTURACIÓN ELECTRÓNICA DIAN & CUENTAS DE COBRO
-- Marco Legal y Tributario:
-- - Estatuto Tributario Nacional (E.T.): Retención en la fuente (Art. 392), IVA y ReteIVA (Art. 437-1)
-- - Ley 1106 de 2006, Art. 6 (Contribución especial del 5% de contratos de obra pública)
-- - Acuerdos Municipales y Distritales de Retención de ICA (ReteICA) y Avisos y Tableros
-- - Ley 1276 de 2009 (Estampilla Pro-Adulto Mayor) y Ley 397 de 1997 (Estampilla Pro-Cultura)
-- - Ley 789 de 2002, Art. 50 (Control de aportes al Sistema de Seguridad Social y Planilla PILA)
-- ====================================================================

CREATE TABLE IF NOT EXISTS facturacion_cuentas_cobro (
    id SERIAL PRIMARY KEY,
    contrato_numero VARCHAR(100) NOT NULL,
    proceso_numero VARCHAR(100),
    entidad_nombre TEXT NOT NULL,
    contratista_nombre TEXT NOT NULL,
    contratista_nit VARCHAR(50) NOT NULL,
    numero_factura_cuenta VARCHAR(100) NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_radicacion DATE NOT NULL,
    cufe_dian VARCHAR(150),
    tipo_documento VARCHAR(60) NOT NULL DEFAULT 'FACTURA_ELECTRONICA_DIAN',
    -- 'FACTURA_ELECTRONICA_DIAN', 'CUENTA_DE_COBRO_PARCIAL', 'ACTA_FINAL_LIQUIDACION'
    modalidad_tributaria VARCHAR(60) NOT NULL DEFAULT 'OBRA_PUBLICA_AIU',
    -- 'OBRA_PUBLICA_AIU', 'GENERAL_IVA_19', 'EXENTO_IVA', 'SERVICIOS_PROFESIONALES'
    valor_bruto_facturado NUMERIC(18, 2) NOT NULL CHECK (valor_bruto_facturado > 0),
    porcentaje_aiu NUMERIC(5, 2) DEFAULT 0.00 CHECK (porcentaje_aiu >= 0 AND porcentaje_aiu <= 100),
    base_gravable_iva NUMERIC(18, 2) DEFAULT 0.00 CHECK (base_gravable_iva >= 0),
    iva_liquidado NUMERIC(18, 2) DEFAULT 0.00 CHECK (iva_liquidado >= 0),
    amortizacion_anticipo_monto NUMERIC(18, 2) DEFAULT 0.00 CHECK (amortizacion_anticipo_monto >= 0),
    subtotal_amortizado NUMERIC(18, 2) NOT NULL CHECK (subtotal_amortizado >= 0),
    contribucion_obra_publica_5pct NUMERIC(18, 2) DEFAULT 0.00 CHECK (contribucion_obra_publica_5pct >= 0),
    retencion_fuente_renta_pct NUMERIC(5, 2) DEFAULT 2.00 CHECK (retencion_fuente_renta_pct >= 0),
    retencion_fuente_renta_monto NUMERIC(18, 2) DEFAULT 0.00 CHECK (retencion_fuente_renta_monto >= 0),
    rete_ica_tarifa_por_mil NUMERIC(5, 2) DEFAULT 9.66 CHECK (rete_ica_tarifa_por_mil >= 0),
    rete_ica_monto NUMERIC(18, 2) DEFAULT 0.00 CHECK (rete_ica_monto >= 0),
    rete_iva_pct NUMERIC(5, 2) DEFAULT 15.00 CHECK (rete_iva_pct >= 0),
    rete_iva_monto NUMERIC(18, 2) DEFAULT 0.00 CHECK (rete_iva_monto >= 0),
    estampilla_pro_ancianos_pct NUMERIC(5, 2) DEFAULT 2.00 CHECK (estampilla_pro_ancianos_pct >= 0),
    estampilla_pro_ancianos_monto NUMERIC(18, 2) DEFAULT 0.00 CHECK (estampilla_pro_ancianos_monto >= 0),
    estampilla_pro_cultura_pct NUMERIC(5, 2) DEFAULT 1.00 CHECK (estampilla_pro_cultura_pct >= 0),
    estampilla_pro_cultura_monto NUMERIC(18, 2) DEFAULT 0.00 CHECK (estampilla_pro_cultura_monto >= 0),
    estampilla_pro_desarrollo_pct NUMERIC(5, 2) DEFAULT 1.00 CHECK (estampilla_pro_desarrollo_pct >= 0),
    estampilla_pro_desarrollo_monto NUMERIC(18, 2) DEFAULT 0.00 CHECK (estampilla_pro_desarrollo_monto >= 0),
    total_deducciones_tributarias NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (total_deducciones_tributarias >= 0),
    neto_a_girar_contratista NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (neto_a_girar_contratista >= 0),
    verificacion_pila_seguridad_social BOOLEAN DEFAULT TRUE,
    numero_planilla_pila VARCHAR(100),
    estado_pago VARCHAR(50) DEFAULT 'RADICADA',
    -- 'RADICADA', 'AUDITADA_SUPERVISION', 'ORDEN_PAGO_EMITIDA', 'PAGADA_TESORERIA'
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_factura_contrato ON facturacion_cuentas_cobro(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_factura_numero ON facturacion_cuentas_cobro(numero_factura_cuenta);
CREATE INDEX IF NOT EXISTS idx_factura_cufe ON facturacion_cuentas_cobro(cufe_dian);
CREATE INDEX IF NOT EXISTS idx_factura_estado ON facturacion_cuentas_cobro(estado_pago);
