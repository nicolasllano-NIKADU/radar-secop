-- ====================================================================
-- RADAR SECOP - SCHEMA DE NOTIFICACIONES PUSH TELEGRAM & MONITOREO EN TIEMPO REAL
-- ====================================================================

-- 1. Canales y Destinatarios de Alertas (Soporta múltiples canales/grupos por empresa)
CREATE TABLE IF NOT EXISTS telegram_canales_config (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  alias VARCHAR(100) NOT NULL DEFAULT 'Canal Principal Licitaciones',
  chat_id VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT true,
  alertar_oportunidades_fit BOOLEAN DEFAULT true,
  score_minimo_fit NUMERIC(5, 2) DEFAULT 75.0,
  alertar_adendas_cronograma BOOLEAN DEFAULT true,
  alertar_evaluacion_traslado BOOLEAN DEFAULT true,
  alertar_polizas_vencimiento BOOLEAN DEFAULT true,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tg_canales_empresa ON telegram_canales_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tg_canales_chat ON telegram_canales_config(chat_id);

-- 2. Suscripciones de Procesos Licitatorios Específicos
CREATE TABLE IF NOT EXISTS telegram_suscripciones_proceso (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  proceso_id VARCHAR(150) NOT NULL,
  numero_proceso VARCHAR(150) NOT NULL,
  entidad VARCHAR(255),
  objeto TEXT,
  chat_id VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT true,
  alertar_adendas BOOLEAN DEFAULT true,
  alertar_cronograma BOOLEAN DEFAULT true,
  alertar_evaluacion BOOLEAN DEFAULT true,
  ultimo_estado VARCHAR(100) DEFAULT 'MONITOREANDO',
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tg_suscrip_proceso ON telegram_suscripciones_proceso(proceso_id);
CREATE INDEX IF NOT EXISTS idx_tg_suscrip_empresa ON telegram_suscripciones_proceso(empresa_id);

-- 3. Bitácora Histórica y Auditoría de Notificaciones Enviadas
CREATE TABLE IF NOT EXISTS telegram_notificaciones_log (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  proceso_referencia VARCHAR(150),
  chat_id VARCHAR(100) NOT NULL,
  tipo_alerta VARCHAR(50) NOT NULL, -- ALTA_AFINIDAD, ADENDA_CRONOGRAMA, INFORME_EVALUACION, POLIZA_VENCIMIENTO, TEST, COMANDO
  titulo VARCHAR(255) NOT NULL,
  mensaje_texto TEXT,
  mensaje_id VARCHAR(100),
  estado VARCHAR(50) DEFAULT 'ENVIADO', -- ENVIADO, FALLIDO, SIMULADO
  error_detalle TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tg_log_proceso ON telegram_notificaciones_log(proceso_referencia);
CREATE INDEX IF NOT EXISTS idx_tg_log_tipo ON telegram_notificaciones_log(tipo_alerta);
CREATE INDEX IF NOT EXISTS idx_tg_log_fecha ON telegram_notificaciones_log(creado_en DESC);
