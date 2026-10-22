-- ====================================================================
-- RADAR SECOP - SCHEMA DE INTELIGENCIA COMPETITIVA Y PRECIOS HISTÓRICOS
-- Origen de Datos: Socrata SECOP II - Contratos Electrónicos (jbjy-vk9h)
-- ====================================================================

CREATE TABLE IF NOT EXISTS inteligencia_competidores_cache (
  id SERIAL PRIMARY KEY,
  criterio_tipo VARCHAR(50) NOT NULL, -- 'ENTIDAD', 'PALABRA_CLAVE', 'UNSPSC', 'GENERAL'
  criterio_valor VARCHAR(255) NOT NULL,
  total_contratos INT NOT NULL DEFAULT 0,
  monto_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ticket_promedio NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ticket_mediana NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ticket_min NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ticket_max NUMERIC(18, 2) NOT NULL DEFAULT 0,
  indice_herfindahl NUMERIC(8, 2) NOT NULL DEFAULT 0, -- HHI: 0 a 10,000 (concentración de mercado)
  top_contratistas JSONB NOT NULL DEFAULT '[]'::jsonb,
  distribucion_modalidades JSONB NOT NULL DEFAULT '{}'::jsonb,
  contratos_muestra JSONB NOT NULL DEFAULT '[]'::jsonb,
  monte_carlo_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_competencia_criterio UNIQUE (criterio_tipo, criterio_valor)
);

CREATE INDEX IF NOT EXISTS idx_comp_cache_tipo_val ON inteligencia_competidores_cache(criterio_tipo, criterio_valor);
CREATE INDEX IF NOT EXISTS idx_comp_cache_actualizado ON inteligencia_competidores_cache(actualizado_en);

CREATE TABLE IF NOT EXISTS competidores_seguimiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  nit_competidor VARCHAR(50) NOT NULL,
  nombre_competidor VARCHAR(255) NOT NULL,
  sector_principal VARCHAR(150),
  notas TEXT,
  alerta_activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuario_competidor UNIQUE (usuario_id, nit_competidor)
);

CREATE INDEX IF NOT EXISTS idx_comp_seg_usuario ON competidores_seguimiento(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comp_seg_nit ON competidores_seguimiento(nit_competidor);
