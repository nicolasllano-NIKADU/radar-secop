#!/usr/bin/env bash
# ====================================================================
# RADAR SECOP - SCRIPT DE DESPLIEGUE DESATENDIDO EN VPS LINUX
# Compatible con: Ubuntu 22.04 LTS / 24.04 LTS / Debian 12
# ====================================================================

set -e

COLOR_CYAN='\033[0;36m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_CYAN}"
echo "======================================================="
echo "   🚀 RADAR SECOP B2B SAAS - INSTALADOR PARA VPS LINUX"
echo "======================================================="
echo -e "${COLOR_RESET}"

# 1. Comprobar permisos de root
if [ "$EUID" -ne 0 ]; then
  echo -e "${COLOR_YELLOW}⚠️ Este script requiere privilegios de superusuario. Ejecutando con sudo...${COLOR_RESET}"
  exec sudo bash "$0" "$@"
fi

# 2. Actualización de paquetes base
echo -e "${COLOR_CYAN}[1/6] Actualizando lista de paquetes del sistema...${COLOR_RESET}"
apt-get update -y > /dev/null
apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release ufw git

# 3. Instalación de Docker y Docker Compose si no están instalados
if ! command -v docker &> /dev/null; then
  echo -e "${COLOR_CYAN}[2/6] Instalando Docker CE y Docker Compose Plugin...${COLOR_RESET}"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y > /dev/null
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  echo -e "${COLOR_GREEN}✓ Docker instalado correctamente.${COLOR_RESET}"
else
  echo -e "${COLOR_GREEN}✓ Docker ya se encuentra instalado.${COLOR_RESET}"
fi

# 4. Configurar variables de entorno
echo -e "${COLOR_CYAN}[3/6] Verificando variables de entorno...${COLOR_RESET}"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    # Generar secreto aleatorio seguro para JWT
    RANDOM_SECRET=$(openssl rand -hex 32)
    sed -i "s/genera_un_secreto_aleatorio_muy_largo_para_jwt_seguridad_2026/${RANDOM_SECRET}/g" .env
    echo -e "${COLOR_YELLOW}⚠️ Se creó el archivo .env a partir de .env.example con un JWT_SECRET aleatorio.${COLOR_RESET}"
  else
    echo -e "${COLOR_RED}❌ Error: No se encontró .env ni .env.example${COLOR_RESET}"
    exit 1
  fi
fi

# 5. Configurar Firewall básico (UFW)
echo -e "${COLOR_CYAN}[4/6] Configurando reglas de firewall (UFW)...${COLOR_RESET}"
ufw allow 22/tcp > /dev/null 2>&1 || true
ufw allow 80/tcp > /dev/null 2>&1 || true
ufw allow 443/tcp > /dev/null 2>&1 || true
ufw allow 443/udp > /dev/null 2>&1 || true
ufw --force enable > /dev/null 2>&1 || true
echo -e "${COLOR_GREEN}✓ Puertos 22, 80 y 443 habilitados.${COLOR_RESET}"

# 6. Levantar contenedores con Docker Compose
echo -e "${COLOR_CYAN}[5/6] Construyendo e iniciando contenedores...${COLOR_RESET}"
docker compose down || true
docker compose up -d --build

# 7. Esperar a que la base de datos esté lista y ejecutar migraciones
echo -e "${COLOR_CYAN}[6/6] Verificando estado de salud e inicializando esquemas...${COLOR_RESET}"
sleep 10

# Correr migraciones en el contenedor app
docker compose exec -T app node server/initDb.js || true

echo -e "\n${COLOR_GREEN}======================================================="
echo "   🎉 RADAR SECOP HA SIDO DESPLEGADO EXITOSAMENTE"
echo "=======================================================${COLOR_RESET}"
echo -e "🌐 Acceso Web: http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')"
echo -e "📊 Monitoreo logs: docker compose logs -f"
echo -e "🔄 Reiniciar:      docker compose restart"
echo -e "🛑 Detener:        docker compose down"
echo "======================================================="
