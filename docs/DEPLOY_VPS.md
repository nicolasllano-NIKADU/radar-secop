# Guía de Despliegue en VPS Linux (Producción) - Radar SECOP B2B SaaS

Este documento detalla el procedimiento estándar para desplegar **Radar SECOP** en un servidor privado virtual (VPS) con sistema operativo **Ubuntu 22.04 LTS o 24.04 LTS**, utilizando **Docker**, **PostgreSQL 17** y **Caddy Server** (con certificados SSL automáticos Let's Encrypt).

---

## 1. Requisitos Mínimos del Servidor VPS

| Recurso | Mínimo Recomendado | Proveedores Sugeridos |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU | Hetzner Cloud (CPX11 o CPX21) |
| **Memoria RAM** | 2 GB a 4 GB RAM | DigitalOcean Droplet Basic (2GB+) |
| **Disco SSD** | 25 GB NVMe / SSD | Hostinger KVM VPS |
| **Sistema Operativo** | Ubuntu 22.04 / 24.04 LTS | Linode / Vultr / AWS EC2 |
| **Puertos Abiertos** | 22 (SSH), 80 (HTTP), 443 (HTTPS) | UFW Firewall incluido en script |

---

## 2. Configuración Previa de DNS (Dominio Oficial)

Antes de ejecutar el despliegue, apunta el registro DNS de tu dominio hacia la dirección IP pública del VPS:

* **Tipo:** `A`
* **Nombre (Host):** `radar` (o `@` para dominio raíz)
* **Destino (Valor):** `IP_PUBLICA_DE_TU_VPS` (Ejemplo: `195.201.x.x`)
* **TTL:** `300` o automático

---

## 3. Despliegue Automatizado en 1 Solo Comando

Conéctate a tu VPS vía SSH:

```bash
ssh root@IP_PUBLICA_DE_TU_VPS
```

Ejecuta el script desatendido:

```bash
git clone https://github.com/nicolasllano-NIKADU/radar-secop.git
cd radar-secop
chmod +x scripts/deploy_vps.sh
./scripts/deploy_vps.sh
```

El script se encargará automáticamente de:
1. Actualizar el sistema base e instalar dependencias.
2. Instalar Docker CE y Docker Compose Plugin oficial.
3. Generar el archivo `.env` con un `JWT_SECRET` criptográfico de 64 caracteres.
4. Configurar el cortafuegos `ufw` permitiendo tráfico web y SSH.
5. Construir y levantar los 3 contenedores (`app`, `db`, `caddy`).
6. Ejecutar todas las migraciones de esquemas en PostgreSQL.

---

## 4. Configuración del Dominio y Certificados SSL

Edita el archivo `.env` en el servidor:

```bash
nano .env
```

Configura tu dominio y correo electrónico para Let's Encrypt:

```env
DOMAIN=radar.tudominio.com
ACME_EMAIL=tu-correo@empresa.com
```

Reinicia Caddy para emitir el certificado SSL HTTPS automáticamente:

```bash
docker compose up -d --force-recreate caddy
```

---

## 5. Mantenimiento y Comandos Útiles

### Ver Registros en Tiempo Real
```bash
docker compose logs -f app
```

### Reiniciar el Sistema
```bash
docker compose restart
```

### Actualizar a la Última Versión de Código
```bash
git pull origin main
docker compose up -d --build
```

### Backup de Base de Datos PostgreSQL
```bash
docker compose exec db pg_dump -U postgres radar_secop > backup_$(date +%F).sql
```

### Restaurar Backup
```bash
cat backup_archivo.sql | docker compose exec -T db psql -U postgres -d radar_secop
```
