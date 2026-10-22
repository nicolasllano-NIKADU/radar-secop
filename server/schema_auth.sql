-- ====================================================================
-- RADAR SECOP - SCHEMA DE AUTENTICACIÓN SAAS Y MULTI-TENANCY
-- Modelo RBAC: ADMIN, LICITADOR, JURIDICO, FINANCIERO
-- ====================================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_activa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS usuario_empresas (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  rol_en_empresa VARCHAR(50) DEFAULT 'OPERADOR',
  es_principal BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuario_empresas_user ON usuario_empresas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_empresas_emp ON usuario_empresas(empresa_id);
