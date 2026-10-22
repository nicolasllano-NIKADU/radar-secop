-- 10. TABLA DE PLAN ANUAL DE ADQUISICIONES (PAA - Dataset Socrata 9sue-ezhx)
CREATE TABLE IF NOT EXISTS paa_adquisiciones (
    id VARCHAR(100) PRIMARY KEY,
    identificador_unico VARCHAR(100),
    descripcion TEXT NOT NULL,
    nombre_entidad VARCHAR(255),
    nit_entidad VARCHAR(50),
    codigo_entidad VARCHAR(50),
    modalidad VARCHAR(150),
    categorias_unspsc TEXT,
    fecha_esperada_inicio VARCHAR(50),
    fecha_esperada_recepcion VARCHAR(50),
    duracion_esperada VARCHAR(50),
    unidad_duracion VARCHAR(50),
    valor_total_esperado NUMERIC(18,2) DEFAULT 0,
    origen_recursos VARCHAR(150),
    url_proceso TEXT,
    annio VARCHAR(10),
    version_paa VARCHAR(50),
    fecha_version VARCHAR(50),
    fecha_carga_paa VARCHAR(50),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLA DE MATCHING PREDICTIVO PAA vs EMPRESAS
CREATE TABLE IF NOT EXISTS paa_empresa_match (
    id SERIAL PRIMARY KEY,
    paa_id VARCHAR(100) NOT NULL REFERENCES paa_adquisiciones(id) ON DELETE CASCADE,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    score_predictivo INTEGER NOT NULL,
    similitud_unspsc NUMERIC(5,2) DEFAULT 0,
    fit_financiero NUMERIC(5,2) DEFAULT 0,
    proximidad_geo NUMERIC(5,2) DEFAULT 0,
    mes_estimado VARCHAR(50),
    palabras_clave_match TEXT[] DEFAULT '{}',
    estado_alerta VARCHAR(50) DEFAULT 'ANTICIPADO',
    notificado_telegram BOOLEAN DEFAULT FALSE,
    fecha_match TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_paa_empresa UNIQUE (paa_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_paa_annio ON paa_adquisiciones(annio);
CREATE INDEX IF NOT EXISTS idx_paa_entidad ON paa_adquisiciones(nombre_entidad);
CREATE INDEX IF NOT EXISTS idx_paa_match_score ON paa_empresa_match(score_predictivo DESC);
