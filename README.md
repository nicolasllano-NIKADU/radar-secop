# 🛰️ RADAR CONVOCATORIAS & SECOP - NIKADU IA & CERABELA 🤖🕯️
### Sistema Autónomo de Inteligencia de Licitaciones, Escáner Horario y App Móvil Multi-Empresa con Notificaciones Push

Aplicación móvil instalable (PWA) y servicio de escaneo horario autónomo desarrollado para dos empresas hermanas:
1. **🤖 NIKADU IA:** Agentes de IA, Inteligencia Artificial, Automatización de Procesos (RPA), Software y Analítica de Datos.
2. **🕯️ CERABELA:** Fabricación de velas hechas a mano de forma artesanal, velas aromáticas, recordatorios, regalos corporativos, artesanías y programas de fomento artesanal.

Permite alternar entre ambas empresas con 1 toque en la aplicación, sincronizando estadísticas, filtros especializados y alertas push directas al celular.

---

## 📱 Cómo Instalar la App en tu Celular

La aplicación está construida con arquitectura **PWA (Progressive Web App)** con Service Worker y Web App Manifest, lo que permite instalarla directamente en tu teléfono sin pagar membresías de App Store o Play Store.

### Opción 1: En la misma red Wi-Fi (o mediante túnel ngrok / Cloudflare / VPS)
1. Inicia el servidor en tu computadora:
   ```bash
   npm start
   ```
2. Obtén la IP local de tu PC (ej. `http://192.168.1.15:3000`) o despliégalo gratis en **Render**, **Railway**, **Hostinger VPS** o usa **Cloudflare Tunnels**.
3. Abre el enlace en el navegador de tu celular:
   - **En Android (Google Chrome):**
     1. Toca el menú de los 3 puntos (⋮) en la esquina superior derecha.
     2. Selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
     3. ¡Listo! Se creará el icono de **Radar NIKADU** con acceso directo y modo pantalla completa independiente.
   - **En iPhone / iPad (Safari):**
     1. Toca el botón de Compartir (el ícono del cuadro con flecha hacia arriba ⎋).
     2. Desplázate hacia abajo y presiona **"Añadir a la pantalla de inicio"**.
     3. Presiona **"Añadir"**.

---

## ✈️ Configuración de Alertas Instantáneas a tu Celular (Telegram Bot)

Para recibir una notificación push en tu celular en el momento exacto en que aparezca una nueva convocatoria relevante:

1. **Crear tu Bot en Telegram (tarda 1 minuto):**
   - Abre Telegram y busca `@BotFather`.
   - Envía el comando `/newbot` y asígnale un nombre (ej. `Radar NIKADU Bot`).
   - Copia el **HTTP API Token** proporcionado (ej. `7123456789:AAH...`).
2. **Obtener tu Chat ID personal:**
   - En Telegram, busca `@userinfobot` y dale `/start`.
   - Te responderá con tu `Id` numérico (ej. `123456789`).
3. **Vincular en la App:**
   - Abre la pestaña **⚙️ Config & Móvil** en la app.
   - Pega tu **Bot Token** y tu **Chat ID**.
   - Haz clic en **"💾 Guardar Credenciales"** y luego en **"🧪 Probar Envío"**.
   - Recibirás un mensaje de prueba inmediato en tu celular.

---

## ⏰ Escáner Automático Horario

El backend cuenta con un daemon programado con `node-cron` que se dispara **cada hora**:
- **Expresión Cron:** `0 * * * *` (minuto 0 de cada hora).
- **Proceso Dual Integrado:**
  1. **Motor SECOP II (Socrata SODA):** Consulta en tiempo real `datos.gov.co` buscando licitaciones públicas y procesos con palabras clave de IA, RPA, modelos de lenguaje y automatización.
  2. **Motor Fondo Emprender (SENA):** Extrae directamente desde el portal oficial de Fondo Emprender las convocatorias vigentes de capital semilla no reembolsable (hasta $100.000.000 COP por plan de negocio).
  3. **Scoring de Relevancia:** Evalúa idoneidad para NIKADU IA (0% a 100%) filtrando falsos positivos.
  4. **Prevención de Duplicados:** Registra en SQLite local (`radar_secop.db`).
  5. **Notificación Push Instantánea:** Si la oportunidad es nueva, dispara una alerta con resumen, presupuesto y botón directo al pliego vía Telegram y Web Push al celular.

---

## 📊 Fuentes de Datos Integradas y Analizadas

### 1. Datos Abiertos Colombia (`datos.gov.co`)
- **`p6dx-8zbt` (SECOP II - Procesos de Contratación):** Núcleo central del radar. Muestra convocatorias en fase de borrador, convocatoria y presentación de ofertas con pliegos de condiciones y presupuestos.
- **`jbjy-vk9h` (SECOP II - Contratos Electrónicos):** Contratos firmados y adjudicados, ideal para inteligencia de precios y análisis de competidores.
- **`f789-7hwg` (SECOP I - Procesos de Compra Pública):** Entidades territoriales o de régimen especial que aún publican en SECOP I.
- **`rgxm-mmea` (Tienda Virtual del Estado Colombiano):** Catálogos de Acuerdos Marco de Precios (Nube, Software, Fábricas de Software).

### 2. Portales Estatales para Recursos No Reembolsables
*(Accesibles desde la pestaña "🏛️ Fondos & Portales" de la aplicación)*
- **MinTIC (Colombia PotencIA Digital):** Convocatorias públicas de cofinanciación y capital semilla para empresas con agentes de IA y analítica predictiva.
- **MinCiencias:** Convocatorias de I+D+i y Beneficios Tributarios (deducción del 100% en renta + 50% de crédito fiscal por desarrollo en IA).
- **iNNpulsa Colombia (ALDEA):** Vouchers no reembolsables de hasta $150M COP para escalamiento tecnológico.
- **SENA (SENNOVA):** Cofinanciación no reembolsable del 50% al 80% para proyectos de I+D+i en IA aplicados a la productividad.
- **DNP (Regalías SGR - OCAD CTeI):** Proyectos departamentales de transformación digital y analítica territorial de alta cuantía.

### 3. Licitaciones Multilaterales y Sector Privado
- **PNUD Colombia & UNGM:** Licitaciones internacionales de consultoría y desarrollo de software/IA pagadas en USD.
- **BID (Banco Interamericano de Desarrollo):** Adquisiciones para proyectos financiados en Colombia.
- **Ecopetrol / Cenit (SAP Ariba Discovery):** Contrataciones privadas de gran escala en automatización de procesos (RPA) y gemelos digitales.
- **Ruta N Medellín & Connect Bogotá:** Retos de innovación abierta corporativa.

---

## 🧰 MCP Servers y APIs Públicas Recomendadas

### Del catálogo `awesome-mcp-servers`:
- **`firecrawl-mcp-server` / `agentfetch-mcp`:** Para extraer pliegos en formato Markdown de portales gubernamentales sin API pública (MinCiencias, iNNpulsa).
- **`brave-search` / `tavily` / `perplexity` MCP:** Para monitoreo inteligente de prensa, decretos y anuncios de nuevas convocatorias en la web colombiana.
- **`mcp-sqlite` / `supabase-mcp`:** Para sincronización híbrida entre la base local y la nube.

### Del catálogo `public-apis`:
- **Socrata Open Data API (SODA):** Motor oficial de datos.gov.co con consultas SoQL.
- **Telegram Bot API:** Notificaciones móviles nativas instantáneas sin costo de infraestructura.
- **OneSignal / Firebase Cloud Messaging (FCM):** Push notifications para PWA.
- **TheNewsAPI / Currents API:** Rastreo de licitaciones y adjudicaciones en medios de comunicación.

---

## 🚀 Comandos Rápidos

```bash
# Iniciar el servidor y escáner automático
npm start

# Ejecutar un escaneo puntual en terminal
npm run scan

# Modo desarrollo con auto-recarga
npm run dev
```
