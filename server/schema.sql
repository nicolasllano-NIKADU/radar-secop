-- 1. EXTENSIÓN PARA UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE USUARIOS (SaaS Multi-tenant)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'CLIENTE_ADMIN',
    plan_saas VARCHAR(50) DEFAULT 'PRO',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE EMPRESAS (Propias y Aliadas para Consorcios)
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nit VARCHAR(30) NOT NULL,
    digito_verificacion VARCHAR(2),
    razon_social VARCHAR(255) NOT NULL,
    sigla VARCHAR(100),
    es_propia BOOLEAN DEFAULT TRUE,
    tipo_organizacion VARCHAR(100) DEFAULT 'SOCIEDAD_COMERCIAL',
    tamano_empresa VARCHAR(50) DEFAULT 'MIPYME',
    camara_comercio VARCHAR(100),
    numero_matricula VARCHAR(50),
    numero_rup VARCHAR(50),
    fecha_renovacion_rup DATE,
    rup_en_firme BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_nit UNIQUE (usuario_id, nit)
);

-- 4. TABLA DE ESTADOS FINANCIEROS Y RUP (Último Año Fiscal - Decreto 1082/2015)
CREATE TABLE IF NOT EXISTS empresa_financiero (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    anio_fiscal INTEGER NOT NULL,
    fecha_corte DATE NOT NULL,
    activo_corriente NUMERIC(18,2) DEFAULT 0,
    pasivo_corriente NUMERIC(18,2) DEFAULT 0,
    activo_total NUMERIC(18,2) DEFAULT 0,
    pasivo_total NUMERIC(18,2) DEFAULT 0,
    patrimonio NUMERIC(18,2) DEFAULT 0,
    utilidad_operacional NUMERIC(18,2) DEFAULT 0,
    gastos_intereses NUMERIC(18,2) DEFAULT 0,
    capital_trabajo NUMERIC(18,2) GENERATED ALWAYS AS (activo_corriente - pasivo_corriente) STORED,
    indice_liquidez NUMERIC(8,4),
    indice_endeudamiento NUMERIC(8,4),
    cobertura_intereses NUMERIC(8,4),
    rentabilidad_patrimonio_roe NUMERIC(8,4),
    rentabilidad_activo_roa NUMERIC(8,4),
    capacidad_residual_k NUMERIC(18,2) DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_empresa_anio UNIQUE (empresa_id, anio_fiscal)
);

-- 5. TABLA DE MATRIZ DE EXPERIENCIA Y CÓDIGOS UNSPSC
CREATE TABLE IF NOT EXISTS empresa_experiencia (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    consecutivo_contrato INTEGER,
    numero_contrato VARCHAR(100),
    entidad_contratante VARCHAR(255),
    objeto_contrato TEXT,
    valor_contrato_smmlv NUMERIC(12,2) DEFAULT 0,
    valor_contrato_cop NUMERIC(18,2) DEFAULT 0,
    fecha_terminacion DATE,
    codigos_unspsc TEXT[] NOT NULL DEFAULT '{}',
    es_obra_publica BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE PERFILES DE BÚSQUEDA Y CRITERIOS PERSONALIZADOS
CREATE TABLE IF NOT EXISTS perfil_busqueda (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre_perfil VARCHAR(100) DEFAULT 'Búsqueda Principal',
    palabras_clave_incluir TEXT[] DEFAULT '{}',
    palabras_clave_excluir TEXT[] DEFAULT '{}',
    codigos_unspsc TEXT[] DEFAULT '{}',
    departamentos TEXT[] DEFAULT '{}',
    presupuesto_min NUMERIC(18,2) DEFAULT 0,
    presupuesto_max NUMERIC(18,2),
    modalidades TEXT[] DEFAULT '{}',
    notificar_telegram BOOLEAN DEFAULT TRUE,
    telegram_chat_id VARCHAR(100),
    umbral_score_minimo INTEGER DEFAULT 40,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE OPORTUNIDADES (Procesos SECOP II y PAA)
CREATE TABLE IF NOT EXISTS oportunidades (
    id VARCHAR(100) PRIMARY KEY,
    fuente VARCHAR(50) DEFAULT 'SECOP_II',
    tipo_proceso VARCHAR(50) DEFAULT 'CONTRATACION',
    entidad VARCHAR(255) NOT NULL,
    nit_entidad VARCHAR(50),
    departamento VARCHAR(100),
    ciudad VARCHAR(100),
    referencia VARCHAR(100),
    id_del_portafolio VARCHAR(100),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    fase VARCHAR(100),
    estado VARCHAR(100),
    modalidad VARCHAR(150),
    tipo_contrato VARCHAR(100),
    precio_base NUMERIC(18,2) DEFAULT 0,
    fecha_publicacion DATE,
    fecha_cierre DATE,
    url_proceso TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA DE MATCHING ENTRE OPORTUNIDADES Y EMPRESAS
CREATE TABLE IF NOT EXISTS oportunidad_empresa_match (
    id SERIAL PRIMARY KEY,
    oportunidad_id VARCHAR(100) NOT NULL REFERENCES oportunidades(id) ON DELETE CASCADE,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    score_relevancia INTEGER NOT NULL,
    palabras_clave_match TEXT[] DEFAULT '{}',
    estado_pipeline VARCHAR(50) DEFAULT 'IDENTIFICADO',
    cumple_habilitante_semaforo VARCHAR(20) DEFAULT 'PENDIENTE',
    notificado_telegram BOOLEAN DEFAULT FALSE,
    fecha_match TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_oportunidad_empresa UNIQUE (oportunidad_id, empresa_id)
);

-- 9. TABLA DE SIMULACIONES DE ESTRUCTURAS PLURALES (Consorcios / Uniones Temporales)
CREATE TABLE IF NOT EXISTS simulaciones_plurales (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    oportunidad_id VARCHAR(100) REFERENCES oportunidades(id) ON DELETE SET NULL,
    nombre_estructura VARCHAR(150) NOT NULL,
    tipo_estructura VARCHAR(50) DEFAULT 'UNION_TEMPORAL',
    participantes_config JSONB NOT NULL,
    resultados_financieros JSONB NOT NULL,
    matriz_cumplimiento JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES DE ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_oportunidades_pub ON oportunidades(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_oportunidades_portafolio ON oportunidades(id_del_portafolio);
CREATE INDEX IF NOT EXISTS idx_match_score ON oportunidad_empresa_match(score_relevancia DESC);
CREATE INDEX IF NOT EXISTS idx_empresa_nit ON empresas(nit);
CREATE INDEX IF NOT EXISTS idx_experiencia_unspsc ON empresa_experiencia USING GIN(codigos_unspsc);
