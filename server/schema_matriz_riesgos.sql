-- ============================================================================
-- RADAR SECOP - SCHEMA: MATRIZ DE RIESGOS CONTRACTUALES (ANCP-CCE)
-- Cumplimiento: Ley 1150 de 2007 (Art. 4), Decreto 1082 de 2015 (Art. 2.2.1.1.1.6.1 a 2.2.1.1.1.6.3),
-- y Manual M-ICR-01 de la Agencia Nacional de Contratación Pública - Colombia Compra Eficiente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS matriz_riesgos_proceso (
    id SERIAL PRIMARY KEY,
    proceso_id VARCHAR(100) NOT NULL,
    numero_proceso VARCHAR(100),
    entidad_nombre VARCHAR(255),
    objeto_proceso TEXT,
    tipo_contrato VARCHAR(100) DEFAULT 'Servicios / Suministro',
    valor_estimado NUMERIC(18, 2) DEFAULT 0,
    proponente_nit VARCHAR(50),
    proponente_razon_social VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'BORRADOR', -- BORRADOR, APROBADA, PRESENTADA_CON_OFERTA, OBSERVADA
    resumen_ejecutivo TEXT,
    total_riesgos INT DEFAULT 0,
    riesgos_extremos INT DEFAULT 0,
    riesgos_altos INT DEFAULT 0,
    riesgos_medios INT DEFAULT 0,
    riesgos_bajos INT DEFAULT 0,
    distribucion_asignacion JSONB DEFAULT '{"contratista": 0, "entidad": 0, "compartido": 0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matriz_riesgos_proceso_id ON matriz_riesgos_proceso (proceso_id);
CREATE INDEX IF NOT EXISTS idx_matriz_riesgos_nit ON matriz_riesgos_proceso (proponente_nit);

CREATE TABLE IF NOT EXISTS matriz_riesgos_items (
    id SERIAL PRIMARY KEY,
    matriz_id INT NOT NULL REFERENCES matriz_riesgos_proceso(id) ON DELETE CASCADE,
    codigo_riesgo VARCHAR(50) NOT NULL,
    etapa VARCHAR(50) NOT NULL DEFAULT 'Ejecución', -- Planeación, Selección, Ejecución, Liquidación
    tipo VARCHAR(100) NOT NULL, -- Operacional, Financiero, Regulatorio, Social/Ambiental, Tecnológico/Ciberseguridad, Fuerza Mayor
    descripcion_riesgo TEXT NOT NULL,
    consecuencia_evento TEXT NOT NULL,
    probabilidad INT NOT NULL CHECK (probabilidad BETWEEN 1 AND 5),
    impacto INT NOT NULL CHECK (impacto BETWEEN 1 AND 5),
    nivel_riesgo_calificacion INT NOT NULL,
    nivel_riesgo_categoria VARCHAR(20) NOT NULL, -- BAJO, MEDIO, ALTO, EXTREMO
    a_quien_se_asigna VARCHAR(50) NOT NULL, -- CONTRATISTA, ENTIDAD, COMPARTIDO
    tratamiento VARCHAR(50) NOT NULL DEFAULT 'MITIGAR', -- MITIGAR, TRANSFERIR, EVITAR, ACEPTAR
    acciones_mitigacion TEXT NOT NULL,
    mecanismo_transferencia VARCHAR(255), -- Póliza de Seguro, Indexación, Acuerdos
    periodicidad_monitoreo VARCHAR(50) DEFAULT 'Mensual',
    responsable_monitoreo VARCHAR(100) DEFAULT 'Director de Proyecto / Interventoría',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matriz_items_matriz_id ON matriz_riesgos_items (matriz_id);
CREATE INDEX IF NOT EXISTS idx_matriz_items_categoria ON matriz_riesgos_items (nivel_riesgo_categoria);
CREATE INDEX IF NOT EXISTS idx_matriz_items_asignado ON matriz_riesgos_items (a_quien_se_asigna);
