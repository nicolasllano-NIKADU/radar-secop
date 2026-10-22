-- 15. TABLA DE EVALUACIONES DE COMPLIANCE, INHABILIDADES Y LAFT
CREATE TABLE IF NOT EXISTS compliance_evaluaciones (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nit_consultado VARCHAR(30) NOT NULL,
    nombre_consultado VARCHAR(255) NOT NULL,
    representante_legal VARCHAR(255),
    documento_representante VARCHAR(30),
    es_estructura_plural BOOLEAN DEFAULT FALSE,
    consorcio_nombre VARCHAR(150),
    miembros_consorcio JSONB DEFAULT '[]',
    
    -- Resultados de cruces oficiales
    boletin_fiscal_cgr BOOLEAN DEFAULT FALSE, -- True = Tiene reporte inhabilitante
    disciplinarios_pgn BOOLEAN DEFAULT FALSE,
    medidas_correctivas_ponal BOOLEAN DEFAULT FALSE,
    multas_secop_activas BOOLEAN DEFAULT FALSE,
    sanciones_rup_activas BOOLEAN DEFAULT FALSE,
    lista_ofac_clinton BOOLEAN DEFAULT FALSE,
    lista_onu_pep BOOLEAN DEFAULT FALSE,
    
    -- Diagnóstico semáforo
    estado_compliance VARCHAR(20) DEFAULT 'HABILITADO', -- 'HABILITADO', 'ALERTA_PREVENTIVA', 'INHABILITADO_BLOQUEANTE'
    score_riesgo INTEGER DEFAULT 0, -- 0 a 100
    hallazgos TEXT[] DEFAULT '{}',
    detalles_auditoria JSONB DEFAULT '{}',
    certificado_hash VARCHAR(64),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compliance_empresa ON compliance_evaluaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compliance_nit ON compliance_evaluaciones(nit_consultado);
