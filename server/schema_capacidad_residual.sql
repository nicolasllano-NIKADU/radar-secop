-- ============================================================================
-- RADAR SECOP - SCHEMA: CAPACIDAD RESIDUAL (K RESIDUAL) Y FORMULARIO 5 CCE
-- Normativa: Ley 80 de 1993, Ley 1150 de 2007, Decreto 1082 de 2015 (Art. 2.2.1.1.1.6.4)
-- y Guía Oficial de Capacidad Residual ANCP - Colombia Compra Eficiente (CCE).
-- ============================================================================

CREATE TABLE IF NOT EXISTS capacidad_residual_perfiles (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre_perfil VARCHAR(150) NOT NULL,
    año_fiscal INTEGER NOT NULL DEFAULT 2025,
    smmlv_vigente NUMERIC(18,2) NOT NULL DEFAULT 1423500,
    activo_corriente NUMERIC(18,2) NOT NULL DEFAULT 0,
    pasivo_corriente NUMERIC(18,2) NOT NULL DEFAULT 0,
    activo_total NUMERIC(18,2) NOT NULL DEFAULT 0,
    pasivo_total NUMERIC(18,2) NOT NULL DEFAULT 0,
    patrimonio NUMERIC(18,2) NOT NULL DEFAULT 0,
    utilidad_operacional NUMERIC(18,2) NOT NULL DEFAULT 0,
    gastos_intereses NUMERIC(18,2) NOT NULL DEFAULT 0,
    ingresos_operacionales NUMERIC(18,2) NOT NULL DEFAULT 0,
    experiencia_obras_smmlv NUMERIC(18,2) NOT NULL DEFAULT 0,
    numero_ingenieros_arquitectos INTEGER NOT NULL DEFAULT 0,
    numero_tecnicos_tecnologos INTEGER NOT NULL DEFAULT 0,
    capacidad_operativa_co NUMERIC(18,2) NOT NULL DEFAULT 0,
    experiencia_e NUMERIC(18,2) NOT NULL DEFAULT 0,
    capacidad_tecnica_ct NUMERIC(18,2) NOT NULL DEFAULT 0,
    capacidad_financiera_cf NUMERIC(18,2) NOT NULL DEFAULT 0,
    k_bruto_cop NUMERIC(18,2) NOT NULL DEFAULT 0, -- CO + E + CT + CF
    k_bruto_smmlv NUMERIC(18,2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_k_perfiles_empresa ON capacidad_residual_perfiles(empresa_id);

CREATE TABLE IF NOT EXISTS capacidad_residual_contratos_sce (
    id SERIAL PRIMARY KEY,
    perfil_id INTEGER NOT NULL REFERENCES capacidad_residual_perfiles(id) ON DELETE CASCADE,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    entidad_contratante VARCHAR(255) NOT NULL,
    numero_contrato VARCHAR(100) NOT NULL,
    objeto_contrato TEXT NOT NULL,
    es_estructura_plural BOOLEAN DEFAULT FALSE,
    nombre_estructura_plural VARCHAR(255),
    porcentaje_participacion NUMERIC(5,2) DEFAULT 100.00,
    valor_total_contrato NUMERIC(18,2) NOT NULL,
    valor_facturado_actas NUMERIC(18,2) NOT NULL DEFAULT 0,
    saldo_pendiente_ejecutar NUMERIC(18,2) NOT NULL,
    saldo_imputable_proponente NUMERIC(18,2) NOT NULL,
    fecha_inicio DATE,
    fecha_terminacion_prevista DATE,
    estado_contrato VARCHAR(50) DEFAULT 'EN_EJECUCION', -- 'EN_EJECUCION', 'SUSPENDIDO', 'TERMINADO_SIN_LIQUIDAR'
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_k_sce_perfil ON capacidad_residual_contratos_sce(perfil_id);
CREATE INDEX IF NOT EXISTS idx_k_sce_empresa ON capacidad_residual_contratos_sce(empresa_id);

CREATE TABLE IF NOT EXISTS capacidad_residual_simulaciones (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    perfil_id INTEGER NOT NULL REFERENCES capacidad_residual_perfiles(id) ON DELETE CASCADE,
    nombre_simulacion VARCHAR(255) NOT NULL,
    k_residual_inicial_cop NUMERIC(18,2) NOT NULL,
    k_residual_inicial_smmlv NUMERIC(18,2) NOT NULL,
    procesos_concurrentes JSONB NOT NULL DEFAULT '[]'::jsonb,
    resultados_analisis JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_k_simulaciones_empresa ON capacidad_residual_simulaciones(empresa_id);
