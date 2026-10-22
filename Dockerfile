# ====================================================================
# RADAR SECOP - DOCKERFILE DE PRODUCCIÓN MULTI-STAGE
# Entorno: Node.js 22 LTS Slim en Linux Debian
# ====================================================================

FROM node:22-bookworm-slim AS base

WORKDIR /app

# Instalar dependencias de sistema mínimas si fueran requeridas
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalación limpia de producción
RUN npm ci --omit=dev

# Copiar el código fuente
COPY server/ ./server/
COPY public/ ./public/
COPY scripts/ ./scripts/

# Crear directorio de descargas y temporales con permisos de usuario node
RUN mkdir -p /app/downloads && chown -R node:node /app/downloads

# Configurar variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3000

# Usuario no privilegiado para seguridad en producción
USER node

EXPOSE 3000

# Healthcheck de monitoreo
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

CMD ["node", "server/app.js"]
