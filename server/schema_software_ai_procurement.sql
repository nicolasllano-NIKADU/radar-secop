-- ====================================================================
-- RADAR SECOP - SCHEMA DE LICITACIONES Y CONTRATACIÓN DE SOFTWARE & IA
-- Marco Normativo:
-- - Ley 1150 de 2007, Art. 2 Numeral 3 (Concurso de Méritos para Consultoría y TI)
-- - Decreto 1082 de 2015 (Guía de CCE para Estimación por Factor Multiplicador)
-- - Estatuto Tributario: Art. 476 Num 23 y 24 (Exclusión de IVA para Cloud y Software)
-- - Ley 23 de 1982 y Ley 1450 de 2011, Art. 20 (Cesión de Derechos Patrimoniales de Autor)
-- - Marco de Calidad de Software: SLAs (ISO 25010 / ITIL) y Métricas de IA (Accuracy, F1, Hallucination Rate)
-- ====================================================================

-- 1. Proyectos y Estimación Económica de Software e IA (Factor Multiplicador CCE)
CREATE TABLE IF NOT EXISTS tech_ai_proyectos_estimacion (
    id SERIAL PRIMARY KEY,
    contrato_numero VARCHAR(100) NOT NULL,
    proceso_numero VARCHAR(100),
    entidad_nombre TEXT NOT NULL,
    contratista_nombre TEXT NOT NULL,
    contratista_nit VARCHAR(50) NOT NULL,
    nombre_proyecto_software TEXT NOT NULL,
    descripcion_alcance TEXT,
    modalidad_estimacion VARCHAR(60) NOT NULL DEFAULT 'FACTOR_MULTIPLICADOR_CCE',
    -- 'FACTOR_MULTIPLICADOR_CCE', 'SPRINTS_STORY_POINTS', 'TOKEN_CLOUD_CONSUMPTION'
    roles_equipo JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array de roles: [{ rol, nivel, salario_base, horas_mes, dedicacion_pct, costo_directo }]
    factor_prestacional_pct NUMERIC(5, 2) DEFAULT 52.00 CHECK (factor_prestacional_pct >= 0),
    factor_costos_indirectos_pct NUMERIC(5, 2) DEFAULT 25.00 CHECK (factor_costos_indirectos_pct >= 0),
    factor_utilidad_honorarios_pct NUMERIC(5, 2) DEFAULT 15.00 CHECK (factor_utilidad_honorarios_pct >= 0),
    factor_multiplicador_calculado NUMERIC(5, 3) NOT NULL DEFAULT 1.920,
    costo_total_personal_mes NUMERIC(18, 2) NOT NULL DEFAULT 0.0 CHECK (costo_total_personal_mes >= 0),
    costo_total_personal_proyecto NUMERIC(18, 2) NOT NULL DEFAULT 0.0 CHECK (costo_total_personal_proyecto >= 0),
    duracion_meses INTEGER DEFAULT 6 CHECK (duracion_meses > 0),
    sprints_totales INTEGER DEFAULT 12 CHECK (sprints_totales >= 0),
    consumo_cloud_tokens JSONB DEFAULT '{}'::jsonb,
    -- { provider: 'AWS_BEDROCK_GEMINI', tokens_llm_millon: 150, costo_tokens_cop: 25000000, infraestructura_cloud_mes: 8000000 }
    costo_total_cloud_tokens NUMERIC(18, 2) DEFAULT 0.00 CHECK (costo_total_cloud_tokens >= 0),
    presupuesto_total_estimado NUMERIC(18, 2) NOT NULL DEFAULT 0.0 CHECK (presupuesto_total_estimado >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Supervisión Técnica, SLAs & Calidad de Modelos de Inteligencia Artificial
CREATE TABLE IF NOT EXISTS tech_ai_metricas_sla_calidad (
    id SERIAL PRIMARY KEY,
    contrato_numero VARCHAR(100) NOT NULL,
    proyecto_id INTEGER REFERENCES tech_ai_proyectos_estimacion(id) ON DELETE SET NULL,
    periodo_evaluacion VARCHAR(60) NOT NULL, -- e.g. 'Mes 01 - Fase Inferencia'
    uptime_disponibilidad_pct NUMERIC(5, 2) DEFAULT 99.95 CHECK (uptime_disponibilidad_pct >= 0 AND uptime_disponibilidad_pct <= 100),
    uptime_meta_sla_pct NUMERIC(5, 2) DEFAULT 99.90,
    latencia_promedio_ms INTEGER DEFAULT 145 CHECK (latencia_promedio_ms >= 0),
    latencia_meta_sla_ms INTEGER DEFAULT 200,
    mttr_tiempo_recuperacion_horas NUMERIC(5, 2) DEFAULT 1.20 CHECK (mttr_tiempo_recuperacion_horas >= 0),
    mttr_meta_sla_horas NUMERIC(5, 2) DEFAULT 2.00,
    code_coverage_pct NUMERIC(5, 2) DEFAULT 88.50 CHECK (code_coverage_pct >= 0 AND code_coverage_pct <= 100),
    vulnerabilidades_owasp_criticas INTEGER DEFAULT 0 CHECK (vulnerabilidades_owasp_criticas >= 0),
    precision_modelo_ia_pct NUMERIC(5, 2) DEFAULT 94.20 CHECK (precision_modelo_ia_pct >= 0 AND precision_modelo_ia_pct <= 100),
    f1_score_ia_pct NUMERIC(5, 2) DEFAULT 93.80 CHECK (f1_score_ia_pct >= 0 AND f1_score_ia_pct <= 100),
    tasa_alucinacion_ia_pct NUMERIC(5, 2) DEFAULT 1.20 CHECK (tasa_alucinacion_ia_pct >= 0 AND tasa_alucinacion_ia_pct <= 100),
    cumplimiento_global_sla VARCHAR(50) DEFAULT 'CONFORME_OPTIMO',
    -- 'CONFORME_OPTIMO', 'CONFORME_ACEPTABLE', 'PENALIZABLE_SLA_INCUMPLIDO'
    observaciones_supervision TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Propiedad Intelectual, Entregables de Software & Licencias Open Source
CREATE TABLE IF NOT EXISTS tech_ai_propiedad_intelectual (
    id SERIAL PRIMARY KEY,
    contrato_numero VARCHAR(100) NOT NULL,
    proyecto_id INTEGER REFERENCES tech_ai_proyectos_estimacion(id) ON DELETE SET NULL,
    tipo_cesion VARCHAR(80) NOT NULL DEFAULT 'CESION_PATRIMONIAL_TOTAL_LEY_1450',
    reserva_derechos_morales BOOLEAN DEFAULT TRUE,
    licencias_open_source JSONB DEFAULT '[]'::jsonb,
    -- Array de librerías: [{ nombre: 'React', version: '18.x', licencia: 'MIT', riesgo_contaminacion: 'BAJO' }]
    repositorio_git_url VARCHAR(255),
    entregables_arquitectura JSONB DEFAULT '[]'::jsonb,
    -- Array de entregables: ['Diagramas C4', 'Dockerfiles', 'Terraform IaC', 'Manual Despliegue', 'Swagger OpenAPI']
    estado_certificacion VARCHAR(50) DEFAULT 'CERTIFICADO_Y_ENTREGADO',
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Matriz de Equipo de Trabajo y Calificación para Concurso de Méritos (Ley 1150)
CREATE TABLE IF NOT EXISTS tech_ai_equipo_concurso_meritos (
    id SERIAL PRIMARY KEY,
    contrato_numero VARCHAR(100) NOT NULL,
    proceso_numero VARCHAR(100),
    perfiles_calificados JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- [{ rol: 'Arquitecto Cloud & IA', profesional: 'Ingeniero de Sistemas', posgrado: 'Maestría IA', certificaciones: ['AWS SAP', 'Azure AI'], meses_experiencia: 72, puntaje_asignado: 35.0 }]
    puntaje_formacion_obtenido NUMERIC(5, 2) DEFAULT 0.00,
    puntaje_experiencia_obtenido NUMERIC(5, 2) DEFAULT 0.00,
    puntaje_certificaciones_obtenido NUMERIC(5, 2) DEFAULT 0.00,
    puntaje_total_concurso NUMERIC(5, 2) DEFAULT 0.00,
    dictamen_habilitacion VARCHAR(50) DEFAULT 'HABILITADO_PUNTAJE_MAXIMO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tech_contrato ON tech_ai_proyectos_estimacion(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_tech_sla_contrato ON tech_ai_metricas_sla_calidad(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_tech_pi_contrato ON tech_ai_propiedad_intelectual(contrato_numero);
CREATE INDEX IF NOT EXISTS idx_tech_concurso_proc ON tech_ai_equipo_concurso_meritos(proceso_numero);
