-- ====================================================================
-- RADAR SECOP - SCHEMA DE ALERTAS PREDICTIVAS DE PRÓRROGAS Y VENCIMIENTOS
-- Origen de Datos: Socrata SECOP II - Contratos Electrónicos (jbjy-vk9h)
-- ====================================================================

CREATE TABLE IF NOT EXISTS alertas_vencimientos_cache (
  id SERIAL PRIMARY KEY,
  criterio_tipo VARCHAR(50) NOT NULL, -- 'PERFIL', 'ENTIDAD', 'PALABRA_CLAVE', 'UNSPSC', 'GENERAL'
  criterio_valor VARCHAR(255) NOT NULL,
  dias_horizonte INT NOT NULL DEFAULT 90,
  total_contratos INT NOT NULL DEFAULT 0,
  monto_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
  contratos JSONB NOT NULL DEFAULT '[]'::jsonb,
  resumen_entidades JSONB NOT NULL DEFAULT '{}'::jsonb,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_pred_cache_criterio UNIQUE (criterio_tipo, criterio_valor, dias_horizonte)
);

CREATE INDEX IF NOT EXISTS idx_pred_cache_tipo_val ON alertas_vencimientos_cache(criterio_tipo, criterio_valor, dias_horizonte);

CREATE TABLE IF NOT EXISTS vencimientos_seguimiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  id_contrato VARCHAR(120) NOT NULL,
  entidad VARCHAR(255) NOT NULL,
  objeto TEXT NOT NULL,
  valor_contrato NUMERIC(18, 2) NOT NULL DEFAULT 0,
  fecha_fin DATE NOT NULL,
  proveedor_actual VARCHAR(255),
  nit_proveedor VARCHAR(50),
  es_prorrogable BOOLEAN DEFAULT false,
  dias_adicionados INT DEFAULT 0,
  url_secop TEXT,
  notas TEXT,
  alerta_activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_vencimiento UNIQUE (usuario_id, id_contrato)
);

CREATE INDEX IF NOT EXISTS idx_venc_seg_user ON vencimientos_seguimiento(usuario_id);
CREATE INDEX IF NOT EXISTS idx_venc_seg_fecha ON vencimientos_seguimiento(fecha_fin);
