// Radar SECOP - Multi-Profile Controller (NIKADU IA & CERABELA)
// Impeccable Design System: Neo Kinpaku & Verdigris

let oportunidades = [];
let currentProfile = localStorage.getItem('radar_profile') || 'NIKADU_IA';
let activeFilter = 'all';
let searchDebounceTimeout = null;
let deferredPrompt = null;
let activeModalId = null;

// ==================== ICONS CATALOG (Authored SVG 1.75px) ====================
const SVG_ICONS = {
  robot: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>`,
  candle: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2c-.5 1.5-2 3-2 4.5a2 2 0 0 0 4 0c0-1.5-1.5-3-2-4.5z"/><path d="M7 10h10v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10z"/><line x1="7" y1="14" x2="17" y2="14"/></svg>`,
  layers: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  globe: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  zap: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  star: `<svg class="icon icon-sm star-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  starFilled: `<svg class="icon icon-sm star-icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  sprout: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 20h10"/><path d="M12 20v-8"/><path d="M12 12c-3.5 0-6-2.5-6-6 4 0 6 2.5 6 6z"/><path d="M12 10c3 0 5-2 5-5-3.5 0-5 2-5 5z"/></svg>`,
  target: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  gift: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  palette: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  file: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  send: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  info: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  external: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  briefcase: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  calendar: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clock: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
};

// ==================== FORMATTERS ====================
function formatCOP(num) {
  if (!num || isNaN(num) || num === 0) return '$0 COP';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(num);
}

function formatDateCO(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const clean = dateStr.slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {}
  return dateStr;
}

function formatCierre(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === '') return 'Abierta / En proceso';
  try {
    const clean = dateStr.slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      const cierreDate = new Date(`${clean}T23:59:59`);
      const today = new Date();
      const diffMs = cierreDate - today;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0 && diffDays <= 5) {
        return `<span class="cierre-urgent">${formatted} (${diffDays}d)</span>`;
      } else if (diffDays > 5) {
        return `${formatted} (${diffDays}d)`;
      } else if (diffDays === 0) {
        return `<span class="cierre-urgent">${formatted} (¡Cierra hoy!)</span>`;
      }
      return formatted;
    }
  } catch (e) {}
  return dateStr;
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

// ==================== PWA REGISTRATION & INSTALL ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registrado:', reg.scope))
      .catch((err) => console.log('Fallo al registrar Service Worker:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('btnInstallPwa');
  if (installBtn) {
    installBtn.style.display = 'flex';
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Resultado de instalación:', outcome);
        deferredPrompt = null;
        installBtn.style.display = 'none';
      }
    });
  }
});

// ==================== FILTERS CONFIGURATION ====================
const PROFILE_FILTERS = {
  NIKADU_IA: [
    { id: 'all', label: 'Todas', icon: SVG_ICONS.globe },
    { id: 'contratacion', label: 'Contrataciones (SECOP)', icon: SVG_ICONS.briefcase },
    { id: 'convocatoria', label: 'Convocatorias (Fondos)', icon: SVG_ICONS.sprout },
    { id: 'ia', label: 'IA & Agentes', icon: SVG_ICONS.robot },
    { id: 'auto', label: 'Automatizaciones', icon: SVG_ICONS.zap },
    { id: 'software', label: 'Software & Apps', icon: SVG_ICONS.file },
    { id: 'medida', label: 'A la Medida', icon: SVG_ICONS.target },
    { id: 'high', label: 'Score > 70%', icon: SVG_ICONS.target },
    { id: 'favs', label: 'Favoritos', icon: SVG_ICONS.star }
  ],
  CERABELA: [
    { id: 'all', label: 'Todas', icon: SVG_ICONS.globe },
    { id: 'contratacion', label: 'Contrataciones (SECOP)', icon: SVG_ICONS.briefcase },
    { id: 'convocatoria', label: 'Convocatorias (Fondos)', icon: SVG_ICONS.sprout },
    { id: 'velas', label: 'Velas & Ceras', icon: SVG_ICONS.candle },
    { id: 'artesanal', label: 'Artesanías & Ferias', icon: SVG_ICONS.palette },
    { id: 'obsequios', label: 'Obsequios & Regalos', icon: SVG_ICONS.gift },
    { id: 'high', label: 'Score > 70%', icon: SVG_ICONS.target },
    { id: 'favs', label: 'Favoritos', icon: SVG_ICONS.star }
  ],
  ALL: [
    { id: 'all', label: 'Todas', icon: SVG_ICONS.globe },
    { id: 'contratacion', label: 'Contrataciones', icon: SVG_ICONS.briefcase },
    { id: 'convocatoria', label: 'Convocatorias', icon: SVG_ICONS.sprout },
    { id: 'ia', label: 'IA & Software', icon: SVG_ICONS.robot },
    { id: 'velas', label: 'Velas & Artesanías', icon: SVG_ICONS.candle },
    { id: 'high', label: 'Score > 70%', icon: SVG_ICONS.target },
    { id: 'favs', label: 'Favoritos', icon: SVG_ICONS.star }
  ]
};

function renderFilterChips() {
  const container = document.getElementById('filtersScroll');
  const chips = PROFILE_FILTERS[currentProfile] || PROFILE_FILTERS.ALL;

  container.innerHTML = chips.map(c => `
    <button class="filter-chip ${activeFilter === c.id ? 'active' : ''}" data-filter="${c.id}">
      ${c.icon}
      <span>${c.label}</span>
    </button>
  `).join('');

  container.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      loadOportunidades();
    });
  });
}

function updateBrandUI() {
  const icon = document.getElementById('brandIcon');
  const title = document.getElementById('brandTitle');
  const subtitle = document.getElementById('brandSubtitle');
  document.body.setAttribute('data-theme', currentProfile);

  if (currentProfile === 'CERABELA') {
    icon.innerHTML = `<svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2c-.5 1.5-2 3-2 4.5a2 2 0 0 0 4 0c0-1.5-1.5-3-2-4.5z"/><path d="M7 10h10v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10z"/><line x1="7" y1="14" x2="17" y2="14"/></svg>`;
    title.textContent = 'CERABELA';
    subtitle.textContent = 'Velas Hechas a Mano & Artesanías';
  } else if (currentProfile === 'NIKADU_IA') {
    icon.innerHTML = `<svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>`;
    title.textContent = 'NIKADU IA';
    subtitle.textContent = 'Radar SECOP & Automatización';
  } else {
    icon.innerHTML = `<svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
    title.textContent = 'RADAR UNIFICADO';
    subtitle.textContent = 'NIKADU IA & CERABELA';
  }
}

// ==================== CARGA DE DATOS & API ====================
async function loadOportunidades() {
  const cardsList = document.getElementById('cardsList');
  try {
    const params = new URLSearchParams();
    const searchVal = document.getElementById('searchInput').value.trim();
    if (searchVal) params.append('search', searchVal);

    if (currentProfile && currentProfile !== 'ALL') {
      params.append('perfil', currentProfile);
    }

    if (activeFilter === 'contratacion') params.append('tipoProceso', 'CONTRATACION');
    if (activeFilter === 'convocatoria') params.append('tipoProceso', 'CONVOCATORIA');
    if (activeFilter === 'ia') params.append('keyword', 'inteligencia artificial');
    if (activeFilter === 'auto') params.append('keyword', 'automatiz');
    if (activeFilter === 'software') params.append('keyword', 'software');
    if (activeFilter === 'medida') params.append('keyword', 'medida');
    if (activeFilter === 'velas') params.append('keyword', 'vela');
    if (activeFilter === 'artesanal') params.append('keyword', 'artesani');
    if (activeFilter === 'obsequios') params.append('keyword', 'obsequios');
    if (activeFilter === 'high') params.append('minScore', '70');
    if (activeFilter === 'favs') params.append('onlyFavorites', 'true');

    const res = await fetch(`/api/oportunidades?${params.toString()}`);
    const json = await res.json();

    if (json.success) {
      oportunidades = json.data;
      renderCards(oportunidades);
    }
  } catch (err) {
    console.error('Error cargando oportunidades:', err);
    cardsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg class="icon icon-lg" style="width: 40px; height: 40px; color: var(--danger);" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <p>No se pudieron cargar las oportunidades. Verifica la conexión con el servidor.</p>
      </div>
    `;
  }
}

async function loadStats() {
  try {
    const param = currentProfile !== 'ALL' ? `?perfil=${currentProfile}` : '';
    const res = await fetch(`/api/stats${param}`);
    const json = await res.json();
    if (json.success) {
      const s = json.data;
      const elContrataciones = document.getElementById('statContrataciones');
      const elConvocatorias = document.getElementById('statConvocatorias');
      const elHigh = document.getElementById('statHighRel');
      const elBudget = document.getElementById('statBudget');

      if (elContrataciones) elContrataciones.textContent = s.contrataciones || 0;
      if (elConvocatorias) elConvocatorias.textContent = s.convocatorias || 0;
      if (elHigh) elHigh.textContent = s.altaRelevancia || 0;
      if (elBudget) elBudget.textContent = formatCOP(s.sumaPresupuesto);
    }
  } catch (err) {
    console.error('Error cargando estadísticas:', err);
  }
}

async function loadSources() {
  const container = document.getElementById('sourcesList');
  try {
    const param = currentProfile !== 'ALL' ? `?perfil=${currentProfile}` : '';
    const res = await fetch(`/api/sources${param}`);
    const json = await res.json();
    if (json.success) {
      container.innerHTML = json.data.map(src => {
        const isCerabela = src.perfil === 'CERABELA';
        return `
          <div class="source-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="source-cat-badge">${src.categoria}</span>
              <span class="profile-pill ${isCerabela ? 'profile-pill-cerabela' : 'profile-pill-nikadu'}">
                ${isCerabela ? SVG_ICONS.candle + ' CERABELA' : SVG_ICONS.robot + ' NIKADU IA'}
              </span>
            </div>
            <h3 class="source-title">${src.entidad}</h3>
            <div class="source-prog">${src.programa}</div>
            <p class="source-desc">${src.descripcion}</p>
            <div class="source-req">
              <span style="font-weight: 700; color: var(--champagne);">Requisitos clave:</span> ${src.requisitos}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px;">
              <span style="font-size: 0.72rem; color: var(--text-faint);">Modalidad: ${src.tipo_recurso}</span>
              <a href="${src.url}" target="_blank" class="btn-action btn-action-primary" style="padding: 6px 14px; font-size: 0.78rem; flex: initial;">
                ${SVG_ICONS.external}
                <span>Explorar Portal</span>
              </a>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error cargando fuentes:', err);
  }
}

async function loadTelegramConfig() {
  try {
    const res = await fetch('/api/telegram/config');
    const json = await res.json();
    if (json.configured) {
      document.getElementById('cfgBotToken').placeholder = `Token activo: ${json.maskedToken}`;
      document.getElementById('cfgChatId').value = json.chatId || '';
    }
  } catch (e) {
    console.error('Error cargando config telegram:', e);
  }
}

// ==================== RENDERIZADO DE TARJETAS ====================
function renderCards(items) {
  const cardsList = document.getElementById('cardsList');
  if (!items || items.length === 0) {
    cardsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg class="icon icon-lg" style="width: 40px; height: 40px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <p>No se encontraron procesos activos para <b>${currentProfile === 'CERABELA' ? 'CERABELA' : currentProfile === 'NIKADU_IA' ? 'NIKADU IA' : 'esta selección'}</b>.</p>
        <p style="font-size: 0.75rem; color: var(--text-faint); margin-top: 6px;">Pulsa <b>Escanear</b> para comprobar novedades en SECOP II y portales del Estado.</p>
      </div>
    `;
    return;
  }

  cardsList.innerHTML = items.map(item => {
    const isCerabela = item.perfil === 'CERABELA';
    const isConvocatoria = item.tipo_proceso === 'CONVOCATORIA';
    
    const profileTag = isCerabela ? 'profile-pill-cerabela' : (item.perfil === 'AMBOS' ? 'profile-pill-ambos' : 'profile-pill-nikadu');
    const profileIcon = isCerabela ? SVG_ICONS.candle : (item.perfil === 'AMBOS' ? SVG_ICONS.layers : SVG_ICONS.robot);
    const profileLabel = isCerabela ? 'CERABELA' : (item.perfil === 'AMBOS' ? 'AMBAS' : 'NIKADU IA');

    const tipoBadge = isConvocatoria
      ? `<span class="badge-tipo badge-convocatoria">${SVG_ICONS.sprout} CONVOCATORIA</span>`
      : `<span class="badge-tipo badge-contratacion">${SVG_ICONS.briefcase} CONTRATACIÓN</span>`;

    const kwBadges = (item.palabras_clave_match || [])
      .slice(0, 3)
      .map(kw => `<span class="kw-pill">${kw}</span>`)
      .join('');

    const formattedPub = formatDateCO(item.fecha_publicacion);
    const formattedCierre = formatCierre(item.fecha_cierre);

    return `
      <div class="opp-card" data-id="${item.id}">
        <div class="opp-top">
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px; max-width: 82%;">
            <div class="entity-badge" title="${item.entidad}">
              ${item.entidad || 'Entidad pública'}
            </div>
            ${tipoBadge}
            <span class="profile-pill ${profileTag}">${profileIcon} ${profileLabel}</span>
          </div>
          <button class="btn-star ${item.favorito ? 'favorited' : ''}" onclick="toggleStar('${item.id}', event)" aria-label="Guardar en favoritos">
            ${item.favorito ? SVG_ICONS.starFilled : SVG_ICONS.star}
          </button>
        </div>

        <h3 class="opp-title" onclick="openDetailModal('${item.id}')">${item.nombre || item.referencia}</h3>
        <p class="opp-desc">${item.descripcion || 'Sin descripción detallada disponible.'}</p>

        <!-- Barra de Metadatos de Fechas (Publicación y Cierre) -->
        <div class="opp-dates-bar">
          <div class="date-item">
            ${SVG_ICONS.calendar}
            <span class="date-label">Publicado:</span>
            <span class="date-value tabular-nums">${formattedPub}</span>
          </div>
          <div class="date-item">
            ${SVG_ICONS.clock}
            <span class="date-label">Cierre:</span>
            <span class="date-value tabular-nums">${formattedCierre}</span>
          </div>
        </div>

        <div class="keywords-tags">${kwBadges}</div>

        <div class="opp-meta">
          <div>
            <div class="opp-price-label">${isConvocatoria ? 'Recurso No Reembolsable / Presupuesto' : 'Presupuesto Oficial Base'}</div>
            <div class="opp-price tabular-nums">${formatCOP(item.precio_base)}</div>
          </div>
          <div class="score-badge">
            ${isConvocatoria ? SVG_ICONS.sprout : (isCerabela ? SVG_ICONS.candle : SVG_ICONS.target)}
            <span class="tabular-nums">${item.score_relevancia}%</span>
            <span>${isCerabela ? 'Afinidad' : (isConvocatoria ? 'Fondo' : 'Score')}</span>
          </div>
        </div>

        <div class="opp-actions">
          <a href="${item.url}" target="_blank" class="btn-action btn-action-primary">
            ${isConvocatoria ? SVG_ICONS.external : SVG_ICONS.file}
            <span>${isConvocatoria ? 'Ver Convocatoria' : 'Abrir en SECOP II'}</span>
          </a>
          <button class="btn-action btn-action-tele" onclick="notifyTelegramSingle('${item.id}', event)">
            ${SVG_ICONS.send}
            <span>Telegram</span>
          </button>
          <button class="btn-action btn-action-detail" onclick="openDetailModal('${item.id}')">
            ${SVG_ICONS.info}
            <span>Detalle</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== INTERACCIONES ====================
async function toggleStar(id, event) {
  if (event) event.stopPropagation();
  try {
    const res = await fetch(`/api/oportunidades/${id}/favorito`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      const item = oportunidades.find(o => o.id === id);
      if (item) item.favorito = json.favorito;
      loadStats();
      if (activeFilter === 'favs') {
        loadOportunidades();
      } else {
        const starBtn = document.querySelector(`.opp-card[data-id="${id}"] .btn-star`);
        if (starBtn) {
          starBtn.classList.toggle('favorited', json.favorito === 1);
          starBtn.innerHTML = json.favorito ? SVG_ICONS.starFilled : SVG_ICONS.star;
        }
      }
      showToast(json.favorito ? 'Añadido a Favoritos' : 'Eliminado de Favoritos');
    }
  } catch (err) {
    showToast('Error al actualizar favorito');
  }
}

async function notifyTelegramSingle(id, event) {
  if (event) event.stopPropagation();
  showToast('Enviando notificación al bot...');
  try {
    const res = await fetch(`/api/oportunidades/${id}/notificar`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast('Notificación enviada a Telegram');
    } else {
      showToast(`Error: ${json.error || 'Configura Telegram en Ajustes'}`);
    }
  } catch (e) {
    showToast('Error de conexión');
  }
}

function openDetailModal(id) {
  const item = oportunidades.find(o => o.id === id);
  if (!item) return;

  activeModalId = id;
  const isCerabela = item.perfil === 'CERABELA';
  const isConvocatoria = item.tipo_proceso === 'CONVOCATORIA';

  document.getElementById('modalBadge').textContent = `${item.entidad} (${item.departamento || 'Colombia'})`;
  
  const modalTipoBadge = document.getElementById('modalTipoBadge');
  if (modalTipoBadge) {
    modalTipoBadge.className = isConvocatoria ? 'badge-tipo badge-convocatoria' : 'badge-tipo badge-contratacion';
    modalTipoBadge.textContent = isConvocatoria ? 'CONVOCATORIA' : 'CONTRATACIÓN';
  }

  document.getElementById('modalTitle').textContent = item.nombre || item.referencia;
  document.getElementById('modalRef').textContent = `Proceso: ${item.referencia} | Modalidad: ${item.modalidad || 'N/A'}`;
  
  const modalFechaPub = document.getElementById('modalFechaPub');
  const modalFechaCierre = document.getElementById('modalFechaCierre');
  if (modalFechaPub) modalFechaPub.textContent = formatDateCO(item.fecha_publicacion);
  if (modalFechaCierre) modalFechaCierre.innerHTML = formatCierre(item.fecha_cierre);

  document.getElementById('modalPrice').textContent = formatCOP(item.precio_base);
  document.getElementById('modalDesc').textContent = item.descripcion || 'Sin descripción disponible';
  
  document.getElementById('modalSecopLink').href = item.url || '#';
  document.getElementById('modalSecopLinkText').textContent = isConvocatoria ? 'Ver Convocatoria Oficial' : 'Abrir en SECOP II';

  const modalPdfBtn = document.getElementById('modalPdfBtn');
  if (modalPdfBtn) {
    modalPdfBtn.href = `/api/reportes/oportunidad/${encodeURIComponent(id)}/pdf`;
  }

  const kwContainer = document.getElementById('modalKeywords');
  kwContainer.innerHTML = (item.palabras_clave_match || [])
    .map(kw => `<span class="kw-pill" style="font-size: 0.78rem; padding: 4px 10px;">${kw}</span>`)
    .join('');

  // Reset y preparación de la sección de documentos
  const docBadge = document.getElementById('modalDocCountBadge');
  const docsContainer = document.getElementById('modalDocsContainer');
  if (docBadge) docBadge.style.display = 'none';
  if (docsContainer) {
    docsContainer.innerHTML = `<span style="color: var(--text-faint);">Haz clic en "Consultar Pliegos" para traer los archivos oficiales vinculados.</span>`;
  }

  document.getElementById('detailModal').classList.add('open');
}

// Cargar documentos del pliego en el modal bajo demanda
document.getElementById('btnLoadModalDocs')?.addEventListener('click', async () => {
  const item = oportunidades.find(o => o.id === activeModalId);
  if (!item) return;

  const docsContainer = document.getElementById('modalDocsContainer');
  const docBadge = document.getElementById('modalDocCountBadge');
  if (!docsContainer) return;

  // Extraer el id_del_portafolio si existe en el objeto o en la URL
  let portafolioId = item.id_del_portafolio || item.referencia;
  if (item.url && item.url.includes('idProceso=')) {
    const match = item.url.match(/idProceso=([^&]+)/);
    if (match) portafolioId = match[1];
  }

  docsContainer.innerHTML = `<span style="color: var(--champagne); display: flex; align-items: center; gap: 6px;">⏳ Consultando catálogo de pliegos y anexos en SECOP II...</span>`;

  try {
    const res = await fetch(`/api/documentos/${encodeURIComponent(portafolioId)}`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      docsContainer.innerHTML = `<span style="color: var(--text-muted);">No se encontraron anexos directos en el repositorio Socrata para este portafolio (${portafolioId}). Puedes revisarlos directamente en el enlace de SECOP II.</span>`;
      return;
    }

    if (docBadge) {
      docBadge.textContent = `${json.data.length} docs`;
      docBadge.style.display = 'inline-block';
    }

    docsContainer.innerHTML = json.data.map(doc => {
      const ext = (doc.extension || 'pdf').toUpperCase();
      let iconColor = 'var(--tech-cyan)';
      if (ext === 'PDF') iconColor = '#ff6b6b';
      else if (ext === 'ZIP' || ext === 'RAR') iconColor = '#feca57';
      else if (ext === 'XLSX' || ext === 'XLS') iconColor = '#1dd1a1';

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 8px 12px; border-radius: var(--radius-sm); gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
            <span style="font-size: 0.7rem; font-weight: 800; background: ${iconColor}; color: #000; padding: 2px 5px; border-radius: 3px;">${ext}</span>
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <div style="font-weight: 600; color: var(--text-warm); font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis;" title="${doc.nombre_archivo}">${doc.nombre_archivo}</div>
              <div style="font-size: 0.7rem; color: var(--text-faint);">${doc.tamano_legible || 'N/A'} • ${doc.fecha_carga || 'Fecha N/A'}</div>
            </div>
          </div>
          <a href="${doc.url_descarga}" target="_blank" rel="noopener noreferrer" class="btn-action" style="padding: 4px 10px; font-size: 0.75rem; background: var(--lacquer-deep); border: 1px solid var(--gold); color: var(--champagne); text-decoration: none; white-space: nowrap;">
            ⬇️ Descargar
          </a>
        </div>
      `;
    }).join('');

    showToast(`Se encontraron ${json.data.length} pliegos y anexos`);
  } catch (err) {
    docsContainer.innerHTML = `<span style="color: #ff6b6b;">Error al consultar pliegos: ${err.message}</span>`;
  }
});

document.getElementById('btnCloseModal').addEventListener('click', () => {
  document.getElementById('detailModal').classList.remove('open');
});

document.getElementById('detailModal').addEventListener('click', (e) => {
  if (e.target.id === 'detailModal') {
    document.getElementById('detailModal').classList.remove('open');
  }
});

document.getElementById('modalNotifyBtn').addEventListener('click', () => {
  if (activeModalId) {
    notifyTelegramSingle(activeModalId);
  }
});

// Botón Escanear Ahora
document.getElementById('btnScanNow').addEventListener('click', async () => {
  const btn = document.getElementById('btnScanNow');
  btn.classList.add('scanning');
  btn.innerHTML = `${SVG_ICONS.zap}<span>Escaneando...</span>`;
  showToast('Escaneando SECOP II y Convocatorias Activas...');

  try {
    const res = await fetch('/api/scan', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(`Escaneo finalizado: ${json.nuevos} nuevas oportunidades encontradas`);
      await loadOportunidades();
      await loadStats();
    } else {
      showToast(`Aviso: ${json.message || json.error || 'Listo'}`);
    }
  } catch (err) {
    showToast('Error conectando con el escáner');
  } finally {
    btn.classList.remove('scanning');
    btn.innerHTML = `${SVG_ICONS.zap}<span>Escanear</span>`;
  }
});

// Búsqueda en tiempo real con debounce
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    loadOportunidades();
  }, 300);
});

// Switcher de Empresa (NIKADU IA vs CERABELA vs TODAS)
document.querySelectorAll('.company-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.company-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentProfile = btn.getAttribute('data-profile');
    localStorage.setItem('radar_profile', currentProfile);
    activeFilter = 'all';

    updateBrandUI();
    renderFilterChips();
    loadStats();
    loadOportunidades();
    loadSources();
  });
});

// Navegación Inferior Móvil (Bottom Nav)
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));

    btn.classList.add('active');
    const targetId = btn.getAttribute('data-target');
    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.add('active');

    if (targetId === 'view-sources') loadSources();
    if (targetId === 'view-config') loadTelegramConfig();
    if (targetId === 'view-competitors') initCompetitorsView();
    if (targetId === 'view-predictive') initPredictiveView();
  });
});

// Configuración de Telegram
document.getElementById('btnSaveTelegram').addEventListener('click', async () => {
  const botToken = document.getElementById('cfgBotToken').value.trim();
  const chatId = document.getElementById('cfgChatId').value.trim();

  if (!botToken && !chatId) {
    showToast('Ingresa los campos correspondientes');
    return;
  }

  try {
    const res = await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, chatId })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Credenciales guardadas exitosamente');
    }
  } catch (e) {
    showToast('Error al guardar configuración');
  }
});

const btnAutoDetect = document.getElementById('btnAutoDetectChatId');
if (btnAutoDetect) {
  btnAutoDetect.addEventListener('click', async () => {
    showToast('Consultando mensajes recibidos en Telegram...');
    try {
      const res = await fetch('/api/telegram/detect', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.chatId) {
        document.getElementById('cfgChatId').value = json.chatId;
        showToast(`¡Chat ID detectado con éxito! (${json.chatId})`);
      } else {
        showToast(json.error || 'Abre el bot en Telegram y pulsa Iniciar primero');
      }
    } catch (e) {
      showToast('Error de conexión');
    }
  });
}

document.getElementById('btnTestTelegram').addEventListener('click', async () => {
  showToast('Enviando mensaje de prueba al celular...');
  try {
    const res = await fetch('/api/telegram/test', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast('Mensaje de prueba recibido en Telegram');
    } else {
      showToast(`Error: ${json.error || 'Revisa tu Token y Chat ID'}`);
    }
  } catch (e) {
    showToast('Error enviando prueba');
  }
});

// ==================== MÓDULO 1: GESTIÓN DE EMPRESAS Y CONSORCIOS ====================
let userCompanies = [];

async function loadCompanies() {
  const grid = document.getElementById('companiesGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/empresas');
    const json = await res.json();
    if (json.ok && Array.isArray(json.data)) {
      userCompanies = json.data;
      renderCompanies(userCompanies);
      renderPluralMembersSelector(userCompanies);
      renderKEmpresaSelector(userCompanies);
    }
  } catch (err) {
    console.error('Error cargando empresas:', err);
    grid.innerHTML = '<div style="color: var(--danger); padding: 20px;">Error al cargar empresas.</div>';
  }
}

function renderCompanies(companies) {
  const grid = document.getElementById('companiesGrid');
  if (!grid) return;

  if (companies.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--lacquer-surface); border: 1px dashed var(--hairline); border-radius: var(--radius-md);">
        <p style="color: var(--text-warm); margin-bottom: 8px;">No tienes empresas registradas todavía.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Registra tu empresa o tus aliados para simular consorcios y monitorear pliegos.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = companies.map(c => {
    const liq = c.indice_liquidez !== null ? parseFloat(c.indice_liquidez).toFixed(2) : '--';
    const end = c.indice_endeudamiento !== null ? (parseFloat(c.indice_endeudamiento) * 100).toFixed(1) + '%' : '--';
    const ct = c.capital_trabajo !== null ? '$' + formatMonto(c.capital_trabajo) : '--';
    const cob = c.cobertura_intereses !== null ? parseFloat(c.cobertura_intereses).toFixed(1) + 'x' : '--';
    const esPropia = c.es_propia;
    const badgeType = esPropia 
      ? '<span style="background: rgba(0, 229, 255, 0.15); color: var(--tech-cyan); font-size: 0.68rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">PROPIA</span>'
      : '<span style="background: rgba(212, 175, 55, 0.15); color: var(--champagne); font-size: 0.68rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">ALIADO</span>';

    return `
      <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 16px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            ${badgeType}
            <span style="font-size: 0.72rem; color: var(--text-faint); font-family: monospace;">NIT: ${c.nit}${c.digito_verificacion ? '-' + c.digito_verificacion : ''}</span>
          </div>
          <h3 style="font-size: 1rem; font-weight: 800; color: var(--champagne); margin-bottom: 12px; line-height: 1.3;">${c.razon_social}</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 0.75rem;">
            <div style="background: var(--lacquer-deep); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
              <div style="color: var(--text-faint); font-size: 0.65rem;">Índice Liquidez</div>
              <div style="font-weight: 800; font-size: 0.95rem; color: var(--success);" class="tabular-nums">${liq}</div>
            </div>
            <div style="background: var(--lacquer-deep); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
              <div style="color: var(--text-faint); font-size: 0.65rem;">Endeudamiento</div>
              <div style="font-weight: 800; font-size: 0.95rem; color: var(--tech-cyan);" class="tabular-nums">${end}</div>
            </div>
            <div style="background: var(--lacquer-deep); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
              <div style="color: var(--text-faint); font-size: 0.65rem;">Capital de Trabajo</div>
              <div style="font-weight: 800; font-size: 0.85rem; color: var(--champagne);" class="tabular-nums">${ct}</div>
            </div>
            <div style="background: var(--lacquer-deep); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
              <div style="color: var(--text-faint); font-size: 0.65rem;">Cob. Intereses</div>
              <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-warm);" class="tabular-nums">${cob}</div>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 6px;">
          <button onclick="openEditFinancialModal(${c.id})" class="btn-action" style="flex: 1; font-size: 0.74rem; padding: 6px; background: var(--lacquer-deep); border: 1px solid var(--hairline); color: var(--text-warm);">
            Balance RUP
          </button>
          <button onclick="openExperienceModal(${c.id})" class="btn-action" style="flex: 1; font-size: 0.74rem; padding: 6px; background: rgba(212, 175, 55, 0.15); border: 1px solid var(--gold); color: var(--champagne); font-weight: 700;">
            📜 Experiencia & K
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Simulador de Consorcios
function renderPluralMembersSelector(companies) {
  const container = document.getElementById('pluralMembersList');
  if (!container) return;

  if (companies.length === 0) {
    container.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-faint);">Registra empresas primero.</div>';
    return;
  }

  container.innerHTML = companies.map((c, i) => {
    // Si hay 2 empresas, poner por defecto 60% y 40%
    const defaultPct = i === 0 ? 60 : (i === 1 ? 40 : 0);
    const checked = i < 2 ? 'checked' : '';

    return `
      <div style="background: var(--lacquer-deep); border: 1px solid var(--hairline); border-radius: var(--radius-sm); padding: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 700; color: var(--text-warm); cursor: pointer;">
            <input type="checkbox" class="plural-member-check" data-id="${c.id}" ${checked} onchange="updatePluralTotals()">
            <span>${c.razon_social}</span>
          </label>
          <span style="font-size: 0.75rem; color: var(--champagne); font-weight: 800;" id="lblPct_${c.id}">${defaultPct}%</span>
        </div>
        <input type="range" min="0" max="100" step="1" value="${defaultPct}" class="plural-member-slider" data-id="${c.id}" style="width: 100%; accent-color: var(--primary);" oninput="onPluralSliderChange(${c.id}, this.value)">
      </div>
    `;
  }).join('');

  updatePluralTotals();
}

function onPluralSliderChange(empresaId, val) {
  const lbl = document.getElementById(`lblPct_${empresaId}`);
  if (lbl) lbl.textContent = `${val}%`;
  updatePluralTotals();
}

function updatePluralTotals() {
  const checks = document.querySelectorAll('.plural-member-check');
  let total = 0;
  checks.forEach(chk => {
    if (chk.checked) {
      const id = chk.getAttribute('data-id');
      const slider = document.querySelector(`.plural-member-slider[data-id="${id}"]`);
      if (slider) total += parseFloat(slider.value) || 0;
    }
  });

  const lblTotal = document.getElementById('lblTotalPorcentaje');
  if (lblTotal) {
    lblTotal.textContent = `${total}%`;
    lblTotal.style.color = Math.abs(total - 100) < 0.01 ? 'var(--success)' : 'var(--danger)';
  }
}

async function calcularConsorcio() {
  const checks = document.querySelectorAll('.plural-member-check:checked');
  const miembros = [];
  checks.forEach(chk => {
    const id = parseInt(chk.getAttribute('data-id'), 10);
    const slider = document.querySelector(`.plural-member-slider[data-id="${id}"]`);
    const pct = slider ? parseFloat(slider.value) : 0;
    if (pct > 0) {
      miembros.push({ empresa_id: id, porcentaje: pct });
    }
  });

  if (miembros.length === 0) {
    showToast('Selecciona al menos un integrante');
    return;
  }

  const suma = miembros.reduce((acc, m) => acc + m.porcentaje, 0);
  if (Math.abs(suma - 100) > 0.01) {
    showToast(`La participación debe sumar 100%. Actual: ${suma}%`);
    return;
  }

  const reqLiquidez = parseFloat(document.getElementById('reqLiquidez').value);
  const reqEndeudamiento = parseFloat(document.getElementById('reqEndeudamiento').value);
  const reqCobertura = parseFloat(document.getElementById('reqCobertura').value);
  const reqCapTrabajo = parseFloat(document.getElementById('reqCapTrabajo').value);

  showToast('Calculando agregación contable plural...');

  try {
    const res = await fetch('/api/empresas/simular-plural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        miembros,
        requisitos_pliego: {
          min_liquidez: reqLiquidez,
          max_endeudamiento: reqEndeudamiento,
          min_cobertura_intereses: reqCobertura,
          min_capital_trabajo: reqCapTrabajo
        }
      })
    });

    const json = await res.json();
    if (json.ok && json.evaluacion) {
      renderPluralResult(json.simulacion, json.evaluacion);
    } else {
      showToast(json.error || 'Error en cálculo');
    }
  } catch (err) {
    showToast('Error de red al simular consorcio');
  }
}

function renderPluralResult(sim, ev) {
  const banner = document.getElementById('pluralStatusBanner');
  const details = document.getElementById('pluralDetailsTable');
  if (!banner || !details) return;

  const habilitado = ev.cumplimiento_general === 'HABILITADO';
  banner.textContent = habilitado ? '✅ ESTRUCTURA PLURAL HABILITADA' : '❌ NO CUMPLE CONDICIONES DEL PLIEGO';
  banner.style.background = habilitado ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)';
  banner.style.color = habilitado ? 'var(--success)' : 'var(--danger)';
  banner.style.borderColor = habilitado ? 'var(--success)' : 'var(--danger)';

  details.innerHTML = ev.detalles.map(d => {
    const badgeColor = d.cumple ? 'var(--success)' : 'var(--danger)';
    const icon = d.cumple ? '✓' : '✗';
    return `
      <div style="background: var(--lacquer-deep); border: 1px solid var(--hairline); padding: 10px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 700; color: var(--text-warm);">${d.indicador}</div>
          <div style="font-size: 0.72rem; color: var(--text-faint);">Exigido: <b>${d.exigido}</b> | Consolidado: <b style="color: var(--champagne);">${d.obtenido}</b></div>
        </div>
        <span style="font-weight: 800; font-size: 0.85rem; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; background: rgba(255,255,255,0.05);">${icon} ${d.estado_semaforo}</span>
      </div>
    `;
  }).join('');
}

function renderKEmpresaSelector(companies) {
  const select = document.getElementById('kEmpresaSelect');
  if (!select) return;
  if (!companies || companies.length === 0) {
    select.innerHTML = '<option value="">Sin empresas registradas</option>';
    return;
  }
  select.innerHTML = companies.map(c => `
    <option value="${c.id}">${c.razon_social} (NIT: ${c.nit || 'S/N'})</option>
  `).join('');
}

async function calcularKResidual() {
  const select = document.getElementById('kEmpresaSelect');
  const empresaId = select?.value;
  if (!empresaId) {
    showToast('Selecciona una empresa para calcular K Residual');
    return;
  }

  const personalTecnicoScore = parseFloat(document.getElementById('kPersonalTecnico')?.value) || 85;
  const saldosEjecucion = document.getElementById('kSaldosEjecucion')?.value ? parseFloat(document.getElementById('kSaldosEjecucion')?.value) : undefined;
  const kRequerido = parseFloat(document.getElementById('kRequeridoInput')?.value) || 0;

  const btn = document.getElementById('btnCalcularKResidual');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Calculando K<sub>R</sub>...</span>';
  }

  try {
    const res = await fetch(`/api/empresas/${empresaId}/k-residual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personal_tecnico_score: personalTecnicoScore,
        saldos_en_ejecucion: saldosEjecucion,
        k_requerido_cop: kRequerido
      })
    });
    const json = await res.json();
    if (!json.ok || !json.data) throw new Error(json.error || 'Error al calcular');

    const d = json.data;
    const container = document.getElementById('kResultsContainer');
    if (container) container.style.display = 'block';

    document.getElementById('kResultadoCop').textContent = `$ ${Math.round(d.capacidad_residual_cop).toLocaleString('es-CO')} COP`;
    document.getElementById('kResultadoSmmlv').textContent = `${d.capacidad_residual_smmlv.toLocaleString('es-CO')} SMMLV`;

    const badge = document.getElementById('kEstadoBadge');
    if (badge) {
      if (d.cumple) {
        badge.textContent = '🟢 HABILITADO PARA OBRA';
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#10b981';
        badge.style.border = '1px solid #10b981';
      } else {
        badge.textContent = `🔴 DÉFICIT DE K ($ ${Math.round(d.deficit_cop).toLocaleString('es-CO')})`;
        badge.style.background = 'rgba(239, 68, 68, 0.2)';
        badge.style.color = '#ef4444';
        badge.style.border = '1px solid #ef4444';
      }
    }

    const desg = d.desglose || {};
    document.getElementById('kDesgloseCo').textContent = `$ ${Math.round(desg.capacidad_operativa_co || 0).toLocaleString('es-CO')}`;
    document.getElementById('kDesgloseE').textContent = `$ ${Math.round(desg.experiencia_e || 0).toLocaleString('es-CO')}`;
    document.getElementById('kDesgloseCt').textContent = `$ ${Math.round(desg.capacidad_tecnica_ct || 0).toLocaleString('es-CO')}`;
    document.getElementById('kDesgloseCf').textContent = `$ ${Math.round(desg.capacidad_financiera_cf || 0).toLocaleString('es-CO')}`;
    document.getElementById('kDesgloseSce').textContent = `- $ ${Math.round(desg.saldos_en_ejecucion_sce || 0).toLocaleString('es-CO')}`;

    const rec = document.getElementById('kRecomendacionTexto');
    if (rec) rec.textContent = d.recomendacion || '';

    showToast('Capacidad Residual calculada exitosamente');
  } catch (err) {
    showToast(`Error calculando K: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>📐 Calcular Capacidad Residual K<sub>R</sub></span>';
    }
  }
}

document.getElementById('btnCalcularKResidual')?.addEventListener('click', calcularKResidual);

// Modal Nueva Empresa
const btnOpenNewCompany = document.getElementById('btnOpenNewCompanyModal');
const companyModal = document.getElementById('companyModal');
const btnCloseCompany = document.getElementById('btnCloseCompanyModal');
const btnCancelCompany = document.getElementById('btnCancelCompany');
const formCompany = document.getElementById('formCompany');

if (btnOpenNewCompany && companyModal) {
  btnOpenNewCompany.addEventListener('click', () => {
    document.getElementById('companyFormId').value = '';
    formCompany.reset();
    const spinner = document.getElementById('rupUploadSpinner');
    if (spinner) spinner.style.display = 'none';
    companyModal.classList.add('active');
  });
}

// Drag & Drop y Subida Asistida de PDF RUP
const dropzoneRup = document.getElementById('dropzoneRup');
const rupPdfInput = document.getElementById('rupPdfInput');
const rupUploadSpinner = document.getElementById('rupUploadSpinner');

if (dropzoneRup && rupPdfInput) {
  dropzoneRup.addEventListener('click', () => rupPdfInput.click());

  dropzoneRup.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneRup.style.background = 'rgba(212, 175, 55, 0.15)';
  });

  dropzoneRup.addEventListener('dragleave', () => {
    dropzoneRup.style.background = 'rgba(212, 175, 55, 0.05)';
  });

  dropzoneRup.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneRup.style.background = 'rgba(212, 175, 55, 0.05)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleRupPdfFile(e.dataTransfer.files[0]);
    }
  });

  rupPdfInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleRupPdfFile(e.target.files[0]);
    }
  });
}

async function handleRupPdfFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Por favor selecciona un archivo PDF válido');
    return;
  }

  if (rupUploadSpinner) rupUploadSpinner.style.display = 'block';
  showToast('Analizando PDF con IA y extrayendo balance...');

  const formData = new FormData();
  formData.append('rup_pdf', file);

  try {
    const res = await fetch('/api/empresas/upload-rup', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || 'Error al procesar el archivo');
    }

    const data = json.data;
    // Autocompletar campos del formulario
    if (data.nit) {
      const parts = data.nit.split('-');
      document.getElementById('compNit').value = parts[0] || '';
      if (parts[1]) document.getElementById('compDv').value = parts[1];
    }
    if (data.razon_social) document.getElementById('compRazon').value = data.razon_social;
    if (data.tamano_empresarial) {
      document.getElementById('compTamano').value = data.tamano_empresarial === 'GRANDE' ? 'GRANDE' : 'MIPYME';
    }

    // Partidas de balance
    if (data.activo_corriente) document.getElementById('compActivoCorriente').value = data.activo_corriente;
    if (data.pasivo_corriente) document.getElementById('compPasivoCorriente').value = data.pasivo_corriente;
    if (data.activo_total) document.getElementById('compActivoTotal').value = data.activo_total;
    if (data.pasivo_total) document.getElementById('compPasivoTotal').value = data.pasivo_total;
    if (data.utilidad_operacional) document.getElementById('compUtilidadOp').value = data.utilidad_operacional;
    if (data.gastos_intereses) document.getElementById('compGastosInt').value = data.gastos_intereses;

    showToast(`✨ Datos RUP extraídos: ${data.razon_social || 'Empresa'}`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (rupUploadSpinner) rupUploadSpinner.style.display = 'none';
  }
}

function closeCompanyModal() {
  if (companyModal) companyModal.classList.remove('active');
}
if (btnCloseCompany) btnCloseCompany.addEventListener('click', closeCompanyModal);
if (btnCancelCompany) btnCancelCompany.addEventListener('click', closeCompanyModal);

if (formCompany) {
  formCompany.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nit = document.getElementById('compNit').value.trim();
    const dv = document.getElementById('compDv').value.trim();
    const razon = document.getElementById('compRazon').value.trim();
    const esPropia = document.getElementById('compEsPropia').value === 'true';
    const tamano = document.getElementById('compTamano').value;

    const ac = parseFloat(document.getElementById('compActivoCorriente').value) || 0;
    const pc = parseFloat(document.getElementById('compPasivoCorriente').value) || 0;
    const at = parseFloat(document.getElementById('compActivoTotal').value) || 0;
    const pt = parseFloat(document.getElementById('compPasivoTotal').value) || 0;
    const uo = parseFloat(document.getElementById('compUtilidadOp').value) || 0;
    const gi = parseFloat(document.getElementById('compGastosInt').value) || 0;

    showToast('Guardando empresa...');

    try {
      // 1. Guardar Empresa
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit,
          digito_verificacion: dv,
          razon_social: razon,
          es_propia: esPropia,
          tamano_empresa: tamano
        })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error al guardar empresa');

      const empresaId = json.data.id;

      // 2. Si ingresó estados financieros, guardarlos
      if (ac > 0 || at > 0) {
        await fetch(`/api/empresas/${empresaId}/financiero`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anio_fiscal: 2025,
            activo_corriente: ac,
            pasivo_corriente: pc,
            activo_total: at,
            pasivo_total: pt,
            utilidad_operacional: uo,
            gastos_intereses: gi
          })
        });
      }

      showToast('Empresa guardada exitosamente');
      closeCompanyModal();
      loadCompanies();
    } catch (err) {
      showToast(err.message || 'Error guardando');
    }
  });
}

function openEditFinancialModal(empresaId) {
  const comp = userCompanies.find(c => c.id === empresaId);
  if (!comp) return;

  document.getElementById('companyFormId').value = comp.id;
  document.getElementById('compNit').value = comp.nit || '';
  document.getElementById('compDv').value = comp.digito_verificacion || '';
  document.getElementById('compRazon').value = comp.razon_social || '';
  document.getElementById('compEsPropia').value = String(comp.es_propia);
  document.getElementById('compTamano').value = comp.tamano_empresa || 'MIPYME';

  document.getElementById('compActivoCorriente').value = comp.activo_corriente || '';
  document.getElementById('compPasivoCorriente').value = comp.pasivo_corriente || '';
  document.getElementById('compActivoTotal').value = comp.activo_total || '';
  document.getElementById('compPasivoTotal').value = comp.pasivo_total || '';
  document.getElementById('compUtilidadOp').value = comp.utilidad_operacional || '';
  document.getElementById('compGastosInt').value = comp.gastos_intereses || '';

  if (companyModal) companyModal.classList.add('active');
}

const btnCalcularPlural = document.getElementById('btnCalcularPlural');
if (btnCalcularPlural) {
  btnCalcularPlural.addEventListener('click', () => {
    const badge = document.getElementById('badgePluralMode');
    if (badge) {
      badge.textContent = 'Manual';
      badge.style.color = 'var(--tech-cyan)';
    }
    calcularConsorcio();
  });
}

// Botón "Sugerir Aliados" con IA y Optimización de Estructura Plural
const btnSugerirAlianzas = document.getElementById('btnSugerirAlianzas');
if (btnSugerirAlianzas) {
  btnSugerirAlianzas.addEventListener('click', async () => {
    if (!userCompanies || userCompanies.length === 0) {
      showToast('No hay empresas registradas para evaluar');
      return;
    }

    const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];
    const reqLiquidez = parseFloat(document.getElementById('reqLiquidez').value) || 0;
    const reqEndeudamiento = parseFloat(document.getElementById('reqEndeudamiento').value) || 1;
    const reqCobertura = parseFloat(document.getElementById('reqCobertura').value) || 0;
    const reqCapTrabajo = parseFloat(document.getElementById('reqCapTrabajo').value) || 0;

    const badge = document.getElementById('badgePluralMode');
    if (badge) {
      badge.textContent = 'Optimización IA';
      badge.style.color = 'var(--champagne)';
    }

    showToast('Analizando sinergias financieras y buscando mejor alianza...');

    try {
      const res = await fetch('/api/empresas/sugerir-alianza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_lider_id: lider.id,
          requisitos_pliego: {
            min_liquidez: reqLiquidez,
            max_endeudamiento: reqEndeudamiento,
            min_cobertura_intereses: reqCobertura,
            min_capital_trabajo: reqCapTrabajo
          }
        })
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error al obtener recomendaciones');

      const data = json.data;
      const container = document.getElementById('aiSuggestionsContainer');
      const list = document.getElementById('aiSuggestionsList');

      if (!container || !list) return;

      container.style.display = 'block';

      if (!data.recomendaciones || data.recomendaciones.length === 0) {
        list.innerHTML = `
          <div style="background: rgba(255, 23, 68, 0.1); border: 1px solid var(--danger); padding: 10px; border-radius: var(--radius-sm); color: var(--danger);">
            ⚠️ Ninguna combinación entre las empresas actuales logra habilitar el 100% de los requisitos del pliego. Considera registrar un aliado con mayor capital de trabajo o menor pasivo.
          </div>
        `;
        return;
      }

      list.innerHTML = data.recomendaciones.map((rec, idx) => {
        const isIndividual = rec.tipo === 'INDIVIDUAL';
        const membersDesc = rec.miembros.map(m => `<b>${m.razon_social}</b> (${m.porcentaje}%)`).join(' + ');

        return `
          <div style="background: var(--lacquer-deep); border: 1px solid var(--gold); border-radius: var(--radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 800; color: var(--champagne); font-size: 0.85rem;">
                ${isIndividual ? '🏆 Presentación Individual' : `🤝 Opción #${idx + 1}: ${rec.tipo === 'ESTRUCTURA_PLURAL_2' ? 'Alianza Bipartita' : 'Consorcio Tripartito'}`}
              </span>
              <span style="background: rgba(0, 230, 118, 0.15); color: var(--success); font-weight: 700; font-size: 0.72rem; padding: 2px 8px; border-radius: 4px;">
                Viabilidad: ${rec.score_viabilidad}/100
              </span>
            </div>

            <p style="font-size: 0.76rem; color: var(--text-warm); margin: 0; line-height: 1.4;">
              ${rec.motivo}
            </p>

            <div style="font-size: 0.75rem; color: var(--text-faint); background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: 4px;">
              Configuración: ${membersDesc}
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
              <button class="btn-action" onclick='aplicarSugerenciaPlural(${JSON.stringify(rec.miembros)})' style="padding: 4px 10px; font-size: 0.72rem; background: var(--gold); color: #000; font-weight: 700;">
                ⚡ Aplicar a la Simulación
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Auto-aplicar la primera y mejor recomendación
      if (data.recomendaciones[0]) {
        aplicarSugerenciaPlural(data.recomendaciones[0].miembros);
      }

      showToast(`Se encontraron ${data.recomendaciones.length} configuraciones viables`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  });
}

// Aplicar sugerencia a los sliders y recalcular el semáforo
window.aplicarSugerenciaPlural = function(miembrosSugeridos) {
  // Desmarcar todos primero
  document.querySelectorAll('.plural-check').forEach(chk => {
    chk.checked = false;
  });

  // Marcar y asignar porcentajes sugeridos
  for (const m of miembrosSugeridos) {
    const chk = document.querySelector(`.plural-check[data-id="${m.empresa_id}"]`);
    const slider = document.querySelector(`.plural-slider[data-id="${m.empresa_id}"]`);
    const lbl = document.getElementById(`lblPerc_${m.empresa_id}`);

    if (chk) chk.checked = true;
    if (slider) {
      slider.disabled = false;
      slider.value = m.porcentaje;
    }
    if (lbl) lbl.textContent = `${m.porcentaje}%`;
  }

  // Deshabilitar sliders no seleccionados y poner en 0
  document.querySelectorAll('.plural-check').forEach(chk => {
    if (!chk.checked) {
      const id = chk.dataset.id;
      const slider = document.querySelector(`.plural-slider[data-id="${id}"]`);
      const lbl = document.getElementById(`lblPerc_${id}`);
      if (slider) {
        slider.disabled = true;
        slider.value = 0;
      }
      if (lbl) lbl.textContent = '0%';
    }
  });

  actualizarTotalPorcentaje();
  calcularConsorcio();
};

// ==================== MÓDULO PAA (INTELIGENCIA PREDICTIVA) ====================
let activePaaMonth = 'TODOS';

async function loadPAAOpportunities() {
  const grid = document.getElementById('paaGrid');
  if (!grid) return;

  const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = lider ? lider.id : 1;

  grid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-faint);">Consultando compras proyectadas en PAA...</div>';

  try {
    const res = await fetch(`/api/paa?empresa_id=${empresaId}&mes=${encodeURIComponent(activePaaMonth)}&minScore=30`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px; text-align: center;">
          <p style="color: var(--text-faint); margin-bottom: 12px;">No hay compras proyectadas en la base local para los filtros seleccionados.</p>
          <button id="btnEmptySyncPaa" class="btn-action btn-action-primary" style="margin: 0 auto;">
            ⚡ Sincronizar PAA Ahora con SECOP II
          </button>
        </div>
      `;
      document.getElementById('btnEmptySyncPaa')?.addEventListener('click', syncPAANow);
      return;
    }

    grid.innerHTML = json.data.map(item => {
      const valor = parseFloat(item.valor_total_esperado) || 0;
      const score = item.score_predictivo || 0;
      let scoreColor = 'var(--text-muted)';
      if (score >= 80) scoreColor = 'var(--success)';
      else if (score >= 60) scoreColor = 'var(--champagne)';
      else if (score >= 40) scoreColor = 'var(--tech-cyan)';

      const kwTags = (item.palabras_clave_match || [])
        .map(kw => `<span class="kw-pill" style="font-size: 0.72rem; padding: 2px 6px;">${kw}</span>`)
        .join('');

      return `
        <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); border-radius: var(--radius-sm); padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
            <div>
              <span class="entity-badge" style="font-size: 0.72rem;">${item.nombre_entidad}</span>
              <span style="font-size: 0.72rem; color: var(--text-faint); margin-left: 6px;">ID: ${item.identificador_unico || item.id}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-weight: 800; font-size: 0.95rem; color: ${scoreColor}; background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 4px;">
                ${score}% Match
              </span>
            </div>
          </div>

          <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-warm); margin: 0; line-height: 1.4;">
            ${item.descripcion}
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: var(--lacquer-deep); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.78rem;">
            <div>
              <span style="color: var(--text-faint); display: block;">Presupuesto Estimado:</span>
              <b style="color: var(--champagne); font-size: 0.95rem;">${formatCOP(valor)}</b>
            </div>
            <div>
              <span style="color: var(--text-faint); display: block;">Mes Estimado de Publicación:</span>
              <b style="color: var(--text-warm);">${item.fecha_esperada_inicio || 'Por definir'} (2026)</b>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-faint); margin-top: 4px;">
            <div>Modalidad: <b style="color: var(--text-warm);">${item.modalidad || 'N/A'}</b></div>
            <div>UNSPSC: <b style="color: var(--champagne);">${item.categorias_unspsc || 'N/A'}</b></div>
          </div>

          ${kwTags ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">${kwTags}</div>` : ''}

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
            ${item.url_proceso ? `
              <a href="${item.url_proceso}" target="_blank" rel="noopener noreferrer" class="btn-action" style="font-size: 0.72rem; padding: 4px 10px; text-decoration: none;">
                🔗 Abrir Ficha SECOP
              </a>
            ` : ''}
            <button class="btn-action btn-action-primary" onclick="simularParaPAA(${valor})" style="font-size: 0.72rem; padding: 4px 10px;">
              🤝 Simular Alianza para este PAA
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div style="color: var(--danger); padding: 20px; text-align: center;">Error cargando PAA: ${err.message}</div>`;
  }
}

async function syncPAANow() {
  const btn = document.getElementById('btnSyncPAA');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Sincronizando...</span>';
  }

  showToast('Conectando con Datos Abiertos de SECOP II (PAA 2026)...');

  try {
    const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];
    const res = await fetch('/api/paa/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresa_id: lider ? lider.id : 1,
        limit: 80
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`PAA Sincronizado: ${json.data.nuevos} nuevas compras proyectadas detectadas`);
      loadPAAOpportunities();
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (e) {
    showToast(`Error de conexión con Socrata PAA: ${e.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>⚡ Sincronizar PAA</span>';
    }
  }
}

// Conectar simulación con presupuesto estimado del PAA
window.simularParaPAA = function(valorPresupuesto) {
  // Cambiar a la vista de consorcios
  const navBtn = document.querySelector('.nav-item[data-target="view-consortium"]');
  if (navBtn) navBtn.click();

  // Asignar capital de trabajo estimado exigido (típicamente 20% a 30% del valor del proceso)
  const capTrabajoReq = Math.round(valorPresupuesto * 0.25);
  const inpCap = document.getElementById('reqCapTrabajo');
  if (inpCap) inpCap.value = capTrabajoReq;

  showToast(`Presupuesto PAA cargado: Exigencia Cap. Trabajo ~$${(capTrabajoReq).toLocaleString('es-CO')}`);

  // Disparar recomendador automático de alianzas
  const btnSugerir = document.getElementById('btnSugerirAlianzas');
  if (btnSugerir) btnSugerir.click();
};

document.getElementById('btnSyncPAA')?.addEventListener('click', syncPAANow);

// ==================== MÓDULO EXPERIENCIA RUP & K RESIDUAL ====================
let currentExpCompanyId = null;

async function openExperienceModal(empresaId) {
  currentExpCompanyId = empresaId;
  const comp = userCompanies.find(c => c.id === empresaId);
  if (!comp) return;

  const modal = document.getElementById('experienceModal');
  const lblTitle = document.getElementById('expModalCompanyName');
  if (lblTitle) lblTitle.textContent = `${comp.razon_social} - Matriz RUP`;

  // Cargar K Residual
  loadKResidual(empresaId);

  // Cargar Contratos Acreditados
  loadCompanyContracts(empresaId);

  if (modal) modal.classList.add('active');
}

async function loadKResidual(empresaId) {
  try {
    const res = await fetch(`/api/empresas/${empresaId}/k-residual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personal_tecnico_score: 85, saldos_en_ejecucion: 0 })
    });
    const json = await res.json();
    if (json.ok) {
      document.getElementById('lblKResidualCop').textContent = formatCOP(json.data.capacidad_residual_cop);
      document.getElementById('lblKResidualSmmlv').textContent = `${json.data.capacidad_residual_smmlv.toLocaleString('es-CO')} SMMLV`;
    }
  } catch (e) {
    console.warn('Error calculando K residual:', e.message);
  }
}

async function loadCompanyContracts(empresaId) {
  const container = document.getElementById('expContractsList');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; padding: 10px; color: var(--text-faint);">Cargando contratos...</div>';

  try {
    const res = await fetch(`/api/empresas/${empresaId}/experiencia`);
    const json = await res.json();

    if (!json.ok || !json.data || json.data.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 14px; color: var(--text-faint); font-size: 0.8rem;">No hay contratos registrados en la matriz RUP. Agrega uno arriba.</div>';
      return;
    }

    container.innerHTML = json.data.map(c => `
      <div style="background: var(--lacquer-deep); border: 1px solid var(--hairline); padding: 10px 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
        <div style="overflow: hidden;">
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-warm); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
            ${c.entidad_contratante} (Contrato: ${c.numero_contrato || 'S/N'})
          </div>
          <div style="font-size: 0.72rem; color: var(--text-faint); margin: 2px 0;">
            ${c.objeto_contrato}
          </div>
          <div style="font-size: 0.7rem; color: var(--tech-cyan);">
            UNSPSC: ${(c.codigos_unspsc || []).join(', ') || 'N/A'}
          </div>
        </div>
        <div style="text-align: right; white-space: nowrap;">
          <div style="font-weight: 800; font-size: 0.95rem; color: var(--champagne);">${parseFloat(c.valor_contrato_smmlv || 0).toLocaleString('es-CO')} SMMLV</div>
          <button onclick="eliminarContrato(${c.id})" style="background: none; border: none; color: var(--danger); font-size: 0.72rem; cursor: pointer; padding: 2px 4px; margin-top: 4px;">
            ✕ Eliminar
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger); font-size: 0.75rem;">Error: ${err.message}</div>`;
  }
}

// Guardar nuevo contrato de experiencia
document.getElementById('formAddExp')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentExpCompanyId) return;

  const entidad = document.getElementById('expEntidad').value.trim();
  const numero = document.getElementById('expNumero').value.trim();
  const objeto = document.getElementById('expObjeto').value.trim();
  const smmlv = parseFloat(document.getElementById('expSmmlv').value) || 0;
  const unspscRaw = document.getElementById('expUnspsc').value.trim();
  const codigos = unspscRaw ? unspscRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  showToast('Guardando contrato RUP...');

  try {
    const res = await fetch(`/api/empresas/${currentExpCompanyId}/experiencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entidad_contratante: entidad,
        numero_contrato: numero,
        objeto_contrato: objeto,
        valor_contrato_smmlv: smmlv,
        codigos_unspsc: codigos
      })
    });
    const json = await res.json();
    if (json.ok) {
      showToast('Contrato registrado');
      document.getElementById('formAddExp').reset();
      loadCompanyContracts(currentExpCompanyId);
      loadKResidual(currentExpCompanyId);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
});

window.eliminarContrato = async function(contratoId) {
  if (!confirm('¿Eliminar este contrato de la matriz de experiencia?')) return;
  try {
    const res = await fetch(`/api/empresas/${currentExpCompanyId}/experiencia/${contratoId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.ok) {
      showToast('Contrato eliminado');
      loadCompanyContracts(currentExpCompanyId);
      loadKResidual(currentExpCompanyId);
    }
  } catch (e) {
    showToast('Error eliminando contrato');
  }
};

document.getElementById('btnCloseExpModal')?.addEventListener('click', () => {
  document.getElementById('experienceModal')?.classList.remove('active');
});

// ==================== MÓDULO SUBSANABILIDAD & AUDITORÍA LEGAL ====================
document.getElementById('formComplianceCheck')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const reqType = document.getElementById('compReqType').value;
  const fechaCierre = document.getElementById('compFechaCierre').value;
  const fechaHecho = document.getElementById('compFechaHecho').value;
  const fechaDoc = document.getElementById('compFechaDoc').value;
  const desc = document.getElementById('compDescObservacion').value;

  const banner = document.getElementById('complianceResultBanner');
  const body = document.getElementById('complianceResultBody');

  if (banner) {
    banner.textContent = '⏳ Analizando precedentes doctrinales ANCP-CCE...';
    banner.style.color = 'var(--champagne)';
  }

  try {
    const res = await fetch('/api/subsanabilidad/diagnosticar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipoRequisito: reqType,
        afectaPuntaje: reqType === 'PUNTAJE',
        fechaCierreProceso: fechaCierre,
        fechaHecho: fechaHecho,
        fechaDocumento: fechaDoc,
        descripcion: desc
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const d = json.data;
    const esSub = d.esSubsanable;

    if (banner) {
      banner.textContent = esSub ? '✅ REQUISITO PLENAMENTE SUBSANABLE' : '❌ CAUSAL DE RECHAZO INSUBSANABLE';
      banner.style.background = esSub ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)';
      banner.style.color = esSub ? 'var(--success)' : 'var(--danger)';
      banner.style.borderColor = esSub ? 'var(--success)' : 'var(--danger)';
    }

    let doctrinasHtml = '';
    if (d.doctrinas && d.doctrinas.length > 0) {
      doctrinasHtml = d.doctrinas.map(doc => `
        <div style="background: rgba(0,229,255,0.08); border-left: 3px solid var(--tech-cyan); padding: 6px 10px; margin-top: 6px;">
          <b>${doc.principio}:</b> ${doc.regla} <br><span style="color: var(--text-faint);">Fuente: ${doc.doctrinaAplicable}</span>
        </div>
      `).join('');
    }

    body.innerHTML = `
      <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
        <div style="color: var(--text-warm); font-weight: 700; margin-bottom: 4px;">Motivo y Análisis Dogmático:</div>
        <div>${d.motivo}</div>
        <div style="font-size: 0.72rem; color: var(--text-faint); margin-top: 6px;"><b>Fundamento:</b> ${d.fundamentoLegal}</div>
        ${doctrinasHtml}
      </div>

      ${d.plantillaRespuesta ? `
        <div style="margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: var(--champagne);">Minuta de Respuesta Legal sugerida:</span>
            <button class="btn-action" onclick="navigator.clipboard.writeText(document.getElementById('txtMinutaLegal').innerText); showToast('Minuta copiada');" style="font-size: 0.7rem; padding: 2px 8px;">
              📋 Copiar Minuta
            </button>
          </div>
          <div id="txtMinutaLegal" style="background: rgba(0,0,0,0.3); border: 1px solid var(--hairline); padding: 8px 10px; border-radius: var(--radius-sm); font-family: monospace; font-size: 0.72rem; line-height: 1.45; white-space: pre-wrap; color: var(--text-warm);">
${d.plantillaRespuesta}
          </div>
        </div>
      ` : ''}
    `;

    showToast(esSub ? 'Dictamen: Subsanable' : 'Dictamen: Insubsanable');
  } catch (err) {
    if (banner) {
      banner.textContent = 'Error en diagnóstico';
      banner.style.color = 'var(--danger)';
    }
    showToast(`Error: ${err.message}`);
  }
});

// Filtros de mes para PAA
document.querySelectorAll('#paaMonthFilters .filter-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#paaMonthFilters .filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activePaaMonth = btn.dataset.month;
    loadPAAOpportunities();
  });
});

// ==================== MÓDULO GESTIÓN CONTRACTUAL & PÓLIZAS ====================
async function loadContracts() {
  const container = document.getElementById('contractsList');
  if (!container) return;

  const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = lider ? lider.id : 1;

  container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-faint);">Consultando contratos en ejecución...</div>';

  try {
    const res = await fetch(`/api/contratos?empresa_id=${empresaId}`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 40px; text-align: center;">
          <p style="color: var(--text-faint); margin-bottom: 12px;">No tienes contratos adjudicados en seguimiento.</p>
          <button onclick="document.getElementById('newContractModal').classList.add('active')" class="btn-action btn-action-primary" style="margin: 0 auto;">
            + Registrar Primer Contrato Adjudicado
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = json.data.map(c => {
      const valor = parseFloat(c.valor_adjudicado) || 0;
      const adicion = parseFloat(c.valor_adicionado) || 0;
      const topeAdicion = valor * 0.50;
      const pctAdicionado = topeAdicion > 0 ? (adicion / topeAdicion) * 100 : 0;

      let badgeRiesgo = '<span style="color: var(--success); font-weight: 700; font-size: 0.72rem;">✅ Pólizas al Día</span>';
      if (parseInt(c.polizas_en_riesgo, 10) > 0) {
        badgeRiesgo = '<span style="color: var(--danger); font-weight: 800; font-size: 0.72rem; background: rgba(255,23,68,0.15); padding: 2px 6px; border-radius: 4px;">⚠️ Póliza por Vencer (≤15d)</span>';
      }

      return `
        <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 16px; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span class="entity-badge" style="font-size: 0.72rem;">${c.entidad_contratante}</span>
              <span style="font-size: 0.72rem; color: var(--text-faint); margin-left: 6px;">Contrato: <b>${c.numero_contrato}</b></span>
            </div>
            <div>${badgeRiesgo}</div>
          </div>

          <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-warm); margin: 0; line-height: 1.4;">
            ${c.objeto_contractual}
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); font-size: 0.75rem;">
            <div>
              <span style="color: var(--text-faint); display: block;">Valor Adjudicado:</span>
              <b style="color: var(--champagne); font-size: 0.9rem;">${formatCOP(valor)}</b>
            </div>
            <div>
              <span style="color: var(--text-faint); display: block;">Tope Legal Adición (50%):</span>
              <b style="color: var(--text-warm);">${formatCOP(topeAdicion)}</b>
              <div style="font-size: 0.68rem; color: ${pctAdicionado > 80 ? 'var(--danger)' : 'var(--text-faint)'};">Usado: ${pctAdicionado.toFixed(1)}%</div>
            </div>
            <div>
              <span style="color: var(--text-faint); display: block;">Vencimiento Previsto:</span>
              <b style="color: var(--tech-cyan);">${c.fecha_terminacion_estimada || 'Por calcular'}</b>
              <div style="font-size: 0.68rem; color: var(--text-faint);">Plazo: ${c.plazo_dias} días</div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
            <button onclick="gestionarPolizasModal(${c.id})" class="btn-action" style="font-size: 0.75rem; padding: 6px 12px; background: var(--lacquer-deep); border: 1px solid var(--gold); color: var(--champagne);">
              🛡️ Ver Pólizas & Amparos (${c.total_polizas || 0})
            </button>
            <button onclick="adicionarContratoPrompt(${c.id}, ${valor}, ${topeAdicion - adicion})" class="btn-action btn-action-primary" style="font-size: 0.75rem; padding: 6px 12px;">
              + Adición / Prórroga
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger); padding: 20px; text-align: center;">Error: ${err.message}</div>`;
  }
}

// Modal nuevo contrato
document.getElementById('btnNewContractModal')?.addEventListener('click', () => {
  document.getElementById('newContractModal')?.classList.add('active');
});

document.getElementById('btnCloseNewContractModal')?.addEventListener('click', () => {
  document.getElementById('newContractModal')?.classList.remove('active');
});

document.getElementById('btnCancelNewContract')?.addEventListener('click', () => {
  document.getElementById('newContractModal')?.classList.remove('active');
});

document.getElementById('formNewContract')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = lider ? lider.id : 1;

  const data = {
    numero_contrato: document.getElementById('ctrNumero').value.trim(),
    referencia_proceso: document.getElementById('ctrRef').value.trim(),
    entidad_contratante: document.getElementById('ctrEntidad').value.trim(),
    objeto_contractual: document.getElementById('ctrObjeto').value.trim(),
    valor_adjudicado: parseFloat(document.getElementById('ctrValor').value) || 0,
    plazo_dias: parseInt(document.getElementById('ctrPlazo').value, 10) || 30,
    fecha_suscripcion: document.getElementById('ctrFechaSuscripcion').value || null,
    supervisor_nombre: document.getElementById('ctrSupervisor').value.trim()
  };

  showToast('Registrando contrato en ejecución...');

  try {
    const res = await fetch('/api/contratos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa_id: empresaId, ...data })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Contrato guardado exitosamente');
      document.getElementById('newContractModal')?.classList.remove('active');
      document.getElementById('formNewContract')?.reset();
      loadContracts();
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
});

window.adicionarContratoPrompt = async function(contratoId, valorBase, saldoAdicionDisponible) {
  const montoStr = prompt(`Ingresa el valor a adicionar en COP (Máximo disponible legal: $${saldoAdicionDisponible.toLocaleString('es-CO')}):`);
  if (!montoStr) return;

  const monto = parseFloat(montoStr.replace(/[^0-9]/g, ''));
  if (isNaN(monto) || monto <= 0) {
    showToast('Valor de adición inválido');
    return;
  }

  const justificacion = prompt('Justificación técnica de la adición contractual:') || 'Ampliación de metas físicas y financieras del objeto contractual';

  try {
    const res = await fetch(`/api/contratos/${contratoId}/modificaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_modificacion: 'ADICION_PRESUPUESTAL',
        valor_adicion: monto,
        poliza_modificada_aprobada: true,
        justificacion
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Adición contractual registrada conforme a Ley 80/1993');
      loadContracts();
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (e) {
    showToast(`Error: ${e.message}`);
  }
};

window.gestionarPolizasModal = async function(contratoId) {
  try {
    const res = await fetch(`/api/contratos/${contratoId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const polizas = json.data.polizas || [];
    if (polizas.length === 0) {
      const crear = confirm('Este contrato no tiene pólizas registradas aún. ¿Deseas agregar la Garantía Única de Cumplimiento ahora?');
      if (crear) {
        const aseguradora = prompt('Nombre de la Compañía Aseguradora (ej: Seguros del Estado, Suramericana):') || 'Seguros del Estado';
        const numPoliza = prompt('Número de Póliza:') || 'POL-2026-999';
        const valorAsegurado = json.data.contrato.valor_adjudicado * 0.10;

        await fetch(`/api/contratos/${contratoId}/polizas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aseguradora,
            numero_poliza: numPoliza,
            tipo_amparo: 'CUMPLIMIENTO',
            valor_asegurado: valorAsegurado,
            fecha_inicio_vigencia: json.data.contrato.fecha_suscripcion || new Date().toISOString().slice(0, 10),
            fecha_fin_vigencia: json.data.contrato.fecha_terminacion_estimada || new Date(Date.now() + 180*86400000).toISOString().slice(0, 10)
          })
        });
        showToast('Póliza de Cumplimiento agregada');
        loadContracts();
      }
      return;
    }

    const reporte = polizas.map(p => `• [${p.tipo_amparo}] No. ${p.numero_poliza} (${p.aseguradora}) - Vigencia hasta: ${p.fecha_fin_vigencia} -> Estado: ${p.semaforo_vencimiento.texto}`).join('\n');
    alert(`TABLERO DE VIGENCIAS DE PÓLIZAS:\n\n${reporte}`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
};

// ==================== MÓDULO COMPLIANCE, INHABILIDADES Y LAFT ====================
async function loadComplianceDashboard() {
  const container = document.getElementById('complianceDashboard');
  if (!container) return;

  const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];
  if (!lider) return;

  container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-faint);">Consultando historial de debida diligencia y compliance...</div>';

  try {
    const res = await fetch(`/api/compliance/${lider.id}/historial`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      container.innerHTML = `
        <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 24px; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🛡️</div>
          <h3 style="color: var(--champagne); margin-bottom: 6px;">Empresa: ${lider.razon_social}</h3>
          <p style="color: var(--text-faint); font-size: 0.8rem; margin-bottom: 16px;">
            Aún no se ha corrido una auditoría oficial de inhabilidades (Ley 80/1993 Art. 8), cruce CGR, PGN y listas restrictivas LAFT.
          </p>
          <button onclick="runComplianceCheckNow()" class="btn-action btn-action-primary" style="margin: 0 auto;">
            ⚡ Ejecutar Tamizaje Oficial Ahora
          </button>
        </div>
      `;
      return;
    }

    const latest = json.data[0];
    const esHabilitado = latest.estado_compliance === 'HABILITADO';
    const statusColor = esHabilitado ? 'var(--success)' : (latest.estado_compliance === 'ALERTA_PREVENTIVA' ? 'var(--champagne)' : 'var(--danger)');
    const statusIcon = esHabilitado ? '✅' : (latest.estado_compliance === 'ALERTA_PREVENTIVA' ? '⚠️' : '❌');

    container.innerHTML = `
      <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 18px; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--hairline); padding-bottom: 12px;">
          <div>
            <span class="entity-badge" style="font-size: 0.72rem;">INSPECCIÓN DE COMPLIANCE</span>
            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--champagne); margin: 4px 0 0 0;">${latest.nombre_consultado}</h3>
            <span style="font-size: 0.72rem; color: var(--text-faint);">NIT: ${latest.nit_consultado} | Hash Auditoría: <code>${latest.certificado_hash?.slice(0, 16)}...</code></span>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.1rem; font-weight: 800; color: ${statusColor};">${statusIcon} ${latest.estado_compliance.replace(/_/g, ' ')}</div>
            <div style="font-size: 0.72rem; color: var(--text-faint);">Índice de Riesgo: <b>${latest.score_riesgo}/100</b></div>
          </div>
        </div>

        <!-- Matriz de Chequeo de Fuentes Oficiales -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.78rem;">
          <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline); display: flex; justify-content: space-between;">
            <span>Contraloría (CGR - Fiscal):</span>
            <b style="color: ${latest.boletin_fiscal_cgr ? 'var(--danger)' : 'var(--success)'};">${latest.boletin_fiscal_cgr ? 'REPORTE ACTIVO' : 'SIN REPORTES'}</b>
          </div>
          <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline); display: flex; justify-content: space-between;">
            <span>Procuraduría (PGN - SIRI):</span>
            <b style="color: ${latest.disciplinarios_pgn ? 'var(--danger)' : 'var(--success)'};">${latest.disciplinarios_pgn ? 'SANCIÓN VIGENTE' : 'SIN REPORTES'}</b>
          </div>
          <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline); display: flex; justify-content: space-between;">
            <span>Policía Nacional (RNMC):</span>
            <b style="color: ${latest.medidas_correctivas_ponal ? 'var(--danger)' : 'var(--success)'};">${latest.medidas_correctivas_ponal ? 'MULTAS ACTIVAS' : 'PAZ Y SALVO'}</b>
          </div>
          <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline); display: flex; justify-content: space-between;">
            <span>Listas OFAC / ONU (LAFT):</span>
            <b style="color: ${latest.lista_ofac_clinton ? 'var(--danger)' : 'var(--success)'};">${latest.lista_ofac_clinton ? 'COINCIDENCIA' : 'NO REPORTADO'}</b>
          </div>
        </div>

        ${(latest.hallazgos && latest.hallazgos.length > 0) ? `
          <div style="background: rgba(255, 23, 68, 0.08); border-left: 3px solid var(--danger); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.78rem;">
            <b style="color: var(--danger); display: block; margin-bottom: 4px;">Hallazgos u Observaciones Relevantes:</b>
            <ul style="margin: 0; padding-left: 18px; color: var(--text-warm);">
              ${latest.hallazgos.map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>
        ` : `
          <div style="background: rgba(0, 230, 118, 0.08); border-left: 3px solid var(--success); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.78rem; color: var(--success);">
            ✓ Acreditación Conforme: Proponente plenamente facultado jurídicamente para contratar con el Estado colombiano bajo Ley 80 de 1993 y Ley 2195 de 2022.
          </div>
        `}

        <div style="display: flex; justify-content: flex-end; margin-top: 8px; border-top: 1px solid var(--hairline); padding-top: 10px;">
          <a href="/api/reportes/compliance/${latest.id}/pdf" target="_blank" class="btn-action" style="background: rgba(212, 175, 55, 0.15); border: 1px solid var(--gold); color: var(--champagne); text-decoration: none; padding: 6px 14px; font-size: 0.8rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 6px;">
            📄 Descargar Certificado Oficial PDF
          </a>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger); padding: 20px;">Error: ${err.message}</div>`;
  }
}

async function runComplianceCheckNow() {
  const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];
  if (!lider) return;

  showToast('Iniciando tamizaje contra antecedentes CGR, PGN, PONAL y listas restrictivas...');

  try {
    const res = await fetch('/api/compliance/auditar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresa_id: lider.id,
        nit: lider.nit,
        razon_social: lider.razon_social,
        representante_legal: 'Representante Legal Registrado'
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Auditoría finalizada: ${json.data.estado_compliance}`);
      loadComplianceDashboard();
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (e) {
    showToast(`Error de auditoría: ${e.message}`);
  }
}

document.getElementById('btnRunComplianceAudit')?.addEventListener('click', runComplianceCheckNow);

// ==================== MÓDULO DE PONDERACIÓN ECONÓMICA Y PLIEGOS TIPO (CCE) ====================
let lastSimulationResult = null;

async function runMonteCarloSimulation() {
  const container = document.getElementById('econResultsArea');
  if (!container) return;

  const po = parseFloat(document.getElementById('econPresupuesto')?.value || 0);
  const ref = document.getElementById('econProcesoRef')?.value || 'SIM-DIRECTA';
  const puntajeMax = parseFloat(document.getElementById('econPuntajeMax')?.value || 60);
  const competidores = parseInt(document.getElementById('econCompetidores')?.value || 6, 10);
  const perfil = document.getElementById('econPerfil')?.value || 'MODERADO';

  if (!po || po <= 0) {
    showToast('Ingresa un Presupuesto Oficial (PO) válido en COP');
    return;
  }

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--champagne); display: flex; flex-direction: column; align-items: center; gap: 12px;">
      <div style="font-size: 1.5rem;">🎲</div>
      <b>Ejecutando 5.000 iteraciones estocásticas de Monte Carlo...</b>
      <span style="font-size: 0.78rem; color: var(--text-faint);">Evaluando curvas de TRM, dispersión de competidores y 5 fórmulas oficiales de Pliegos Tipo ANCP-CCE</span>
    </div>
  `;

  try {
    const res = await fetch('/api/economico/montecarlo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presupuesto_oficial: po,
        competidores_estimados: competidores,
        puntaje_maximo: puntajeMax,
        iteraciones: 5000,
        perfil_competencia: perfil
      })
    });

    const json = await res.json();
    if (!json.success || !json.data) {
      container.innerHTML = `<div style="color: var(--danger); padding: 20px;">Error: ${json.error || 'No se pudo completar la simulación'}</div>`;
      return;
    }

    const data = json.data;
    lastSimulationResult = data;
    const rec = data.recomendacion_estrategica;
    const desglose = rec.desglose_metodos_en_optimo || {};

    container.innerHTML = `
      <!-- Tarjeta Hero del Precio Óptimo -->
      <div class="card-glass" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(15, 23, 42, 0.95)); border: 1px solid var(--gold); padding: 20px; border-radius: var(--radius-md);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--hairline); padding-bottom: 14px;">
          <div>
            <span class="entity-badge" style="background: var(--gold); color: #000; font-size: 0.72rem; font-weight: 800;">OFERTA ECONÓMICA ÓPTIMA (P_opt)</span>
            <div style="font-size: 1.85rem; font-weight: 900; color: var(--champagne); margin-top: 6px;" class="tabular-nums">
              ${formatCOP(rec.precio_optimo_cop)} COP
            </div>
            <div style="font-size: 0.8rem; color: var(--text-warm);">
              Equivale al <b>${rec.porcentaje_optimo}%</b> del Presupuesto Oficial ($ ${po.toLocaleString('es-CO')} COP)
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--success);" class="tabular-nums">
              ${rec.esperanza_puntaje_max} / ${data.puntaje_maximo} pts
            </div>
            <span style="font-size: 0.75rem; color: var(--text-faint);">Esperanza Matemática E[Puntaje] (${rec.eficiencia_esperada}% de efectividad)</span>
            <div style="margin-top: 6px;">
              <button id="btnSaveEconStrategy" class="btn-action" style="background: rgba(0, 230, 118, 0.15); border: 1px solid var(--success); color: var(--success); padding: 4px 12px; font-size: 0.75rem;">
                💾 Guardar Estrategia
              </button>
            </div>
          </div>
        </div>

        <!-- Rango Seguro y Alertas -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 14px;">
          <div style="background: var(--lacquer-deep); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
            <div style="font-size: 0.7rem; color: var(--text-faint); text-transform: uppercase;">Rango Seguro Recomendado (≥ 96% Eficiencia)</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--champagne); margin-top: 2px;">
              ${rec.rango_seguro_recomendado.min_pct}% a ${rec.rango_seguro_recomendado.max_pct}% PO
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              ${formatCOP(rec.rango_seguro_recomendado.min_cop)} - ${formatCOP(rec.rango_seguro_recomendado.max_cop)}
            </div>
          </div>

          <div style="background: var(--lacquer-deep); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
            <div style="font-size: 0.7rem; color: var(--text-faint); text-transform: uppercase;">Umbral Precio Artificialmente Bajo</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--danger); margin-top: 2px;">
              &lt; 88.0% PO ($ ${Math.round(po * 0.88).toLocaleString('es-CO')})
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              Protección automática bajo Decreto 1082/2015
            </div>
          </div>

          <div style="background: var(--lacquer-deep); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
            <div style="font-size: 0.7rem; color: var(--text-faint); text-transform: uppercase;">Aleatoriedad Normativa CCE</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--tech-cyan); margin-top: 2px;">
              Concepto C-382 de 2020
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              Mapeo de decimales de TRM oficial al cierre
            </div>
          </div>
        </div>
      </div>

      <!-- Desempeño del Precio Óptimo en los 5 Métodos Oficiales -->
      <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 16px; border-radius: var(--radius-md);">
        <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--champagne); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <span>⚖️ Desempeño en cada Método de Pliegos Tipo (si saliera seleccionado por TRM)</span>
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; font-size: 0.78rem;">
          <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
            <div style="color: var(--text-faint);">1. Media Aritmética:</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--champagne);">${desglose.media_aritmetica || '--'} pts</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">TRM .00 a .19</div>
          </div>
          <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
            <div style="color: var(--text-faint);">2. Media con Presupuesto:</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--champagne);">${desglose.media_modificada || '--'} pts</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">TRM .20 a .39</div>
          </div>
          <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
            <div style="color: var(--text-faint);">3. Media Geométrica:</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--champagne);">${desglose.media_geometrica || '--'} pts</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">TRM .40 a .59</div>
          </div>
          <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
            <div style="color: var(--text-faint);">4. Mediana:</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--champagne);">${desglose.mediana || '--'} pts</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">TRM .60 a .79</div>
          </div>
          <div style="background: var(--lacquer-deep); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
            <div style="color: var(--text-faint);">5. Menor Valor Hábil:</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--champagne);">${desglose.menor_valor || '--'} pts</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">TRM .80 a .99</div>
          </div>
        </div>
      </div>

      <!-- Curva de Sensibilidad Estocástica (Barrido de Precios) -->
      <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 16px; border-radius: var(--radius-md);">
        <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--champagne); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          <span>📈 Curva de Sensibilidad del Puntaje Esperado</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.76rem;">
          ${data.curva_rendimiento.filter((_, idx) => idx % 2 === 0).map(c => {
            const isOpt = c.porcentaje_po === rec.porcentaje_optimo;
            const pctBar = Math.min(100, (c.esperanza_puntaje / data.puntaje_maximo) * 100);
            const barColor = isOpt ? 'var(--gold)' : (c.alerta_riesgo_precio_bajo ? 'var(--danger)' : 'var(--tech-cyan)');

            return `
              <div style="display: flex; align-items: center; gap: 10px; padding: 4px 6px; border-radius: 4px; background: ${isOpt ? 'rgba(212, 175, 55, 0.15)' : 'transparent'};">
                <span style="width: 50px; font-weight: ${isOpt ? '800' : '400'}; color: ${isOpt ? 'var(--champagne)' : 'var(--text-warm)'};">${c.porcentaje_po}%</span>
                <span style="width: 130px; font-size: 0.72rem; color: var(--text-faint);">${formatCOP(c.precio_cop)}</span>
                <div style="flex: 1; background: var(--lacquer-deep); height: 10px; border-radius: 5px; overflow: hidden; position: relative;">
                  <div style="background: ${barColor}; width: ${pctBar}%; height: 100%;"></div>
                </div>
                <span style="width: 60px; text-align: right; font-weight: 700; color: ${isOpt ? 'var(--champagne)' : 'var(--text-primary)'};">${c.esperanza_puntaje} pts</span>
                ${isOpt ? '<span style="color: var(--gold); font-size: 0.7rem; font-weight: 800;">⭐ ÓPTIMO</span>' : ''}
                ${c.alerta_riesgo_precio_bajo ? '<span style="color: var(--danger); font-size: 0.65rem;">⚠️ RIESGO</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Conectar botón de guardado
    document.getElementById('btnSaveEconStrategy')?.addEventListener('click', async () => {
      try {
        const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];
        const resSave = await fetch('/api/economico/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: lider ? lider.id : null,
            proceso_referencia: ref,
            entidad: 'Proceso Licitatorio',
            presupuesto_oficial: po,
            puntaje_maximo: puntajeMax,
            competidores_estimados: competidores,
            precio_optimo_sugerido: rec.precio_optimo_cop,
            porcentaje_optimo_po: rec.porcentaje_optimo,
            esperanza_puntaje: rec.esperanza_puntaje_max,
            desglose_metodos: desglose,
            distribucion_simulada: rec.rango_seguro_recomendado
          })
        });
        const jsonSave = await resSave.json();
        if (jsonSave.success) {
          showToast('Estrategia económica guardada en base de datos');
        } else {
          showToast(`Error al guardar: ${jsonSave.error}`);
        }
      } catch (e) {
        showToast('Error de conexión al guardar');
      }
    });

  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger); padding: 20px;">Error al ejecutar simulación: ${err.message}</div>`;
  }
}

// Botón de ejecución en el panel
document.getElementById('btnRunMontecarlo')?.addEventListener('click', runMonteCarloSimulation);

// Botón de simulación desde el modal de detalle de oportunidad
document.getElementById('modalBtnSimulateEconomic')?.addEventListener('click', () => {
  const item = oportunidades.find(o => o.id === activeModalId);
  if (!item) return;

  const econPresupuesto = document.getElementById('econPresupuesto');
  const econProcesoRef = document.getElementById('econProcesoRef');
  if (econPresupuesto) econPresupuesto.value = item.precio_base || item.cuantia || 0;
  if (econProcesoRef) econProcesoRef.value = item.referencia || item.id;

  // Cerrar modal
  document.getElementById('detailModal')?.classList.remove('open');

  // Activar pestaña Pliegos Tipo
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.querySelector('.nav-item[data-target="view-economic"]')?.classList.add('active');
  document.getElementById('view-economic')?.classList.add('active');

  // Ejecutar simulación estocástica automáticamente
  runMonteCarloSimulation();
});

// ==================== MÓDULO DE PIPELINE KANBAN Y GESTIÓN COMERCIAL (MÓDULO 6) ====================
let cachedPipelineData = null;
let activePipelineItemId = null;

async function loadPipeline() {
  const container = document.getElementById('kanbanBoardContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/pipeline');
    const json = await res.json();
    if (!json.success || !json.data) {
      container.innerHTML = `<div style="color: var(--danger); padding: 20px;">Error al cargar el pipeline: ${json.error}</div>`;
      return;
    }

    cachedPipelineData = json.data;
    renderPipeline(json.data);
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger); padding: 20px;">Error de conexión: ${err.message}</div>`;
  }
}

function renderPipeline(data) {
  const container = document.getElementById('kanbanBoardContainer');
  if (!container) return;

  // Actualizar métricas del Header
  const m = data.metricas;
  const elTotal = document.getElementById('pipeTotalVal');
  const elWeighted = document.getElementById('pipeWeightedVal');
  const elCount = document.getElementById('pipeCountProcs');
  const elWin = document.getElementById('pipeWinRate');
  const elAdj = document.getElementById('pipeAdjudicadosCount');

  if (elTotal) elTotal.textContent = `${formatCOP(m.valor_total_pipeline)} COP`;
  if (elWeighted) elWeighted.textContent = `${formatCOP(m.valor_ponderado_riesgo)} COP`;
  if (elCount) elCount.textContent = `${m.total_procesos} procesos activos`;
  if (elWin) elWin.textContent = `${m.win_rate}%`;
  if (elAdj) elAdj.textContent = `${m.procesos_adjudicados} adjudicados`;

  if (!data.columnas || data.columnas.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-faint); width: 100%;">No hay columnas configuradas</div>`;
    return;
  }

  const fasesKeys = data.columnas.map(c => c.id);

  container.innerHTML = data.columnas.map((col, colIdx) => {
    const subtotal = col.items.reduce((acc, it) => acc + (parseFloat(it.presupuesto) || 0), 0);

    return `
      <div class="kanban-col" style="flex: 0 0 280px; background: var(--lacquer-surface); border: 1px solid var(--hairline); border-radius: var(--radius-md); display: flex; flex-direction: column; max-height: 75vh; overflow: hidden;">
        <!-- Header de Columna -->
        <div style="padding: 12px 14px; border-bottom: 1px solid var(--hairline); background: var(--lacquer-deep); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>${col.icon || '📁'}</span>
            <span style="font-size: 0.82rem; font-weight: 800; color: ${col.color || 'var(--champagne)'};">${col.label}</span>
            <span style="background: rgba(255,255,255,0.08); font-size: 0.7rem; padding: 1px 6px; border-radius: 10px; color: var(--text-warm);">${col.items.length}</span>
          </div>
          <span style="font-size: 0.7rem; color: var(--text-faint);" class="tabular-nums">${formatCOP(subtotal)}</span>
        </div>

        <!-- Tarjetas de la Columna -->
        <div style="padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; flex: 1;">
          ${col.items.length === 0 ? `
            <div style="text-align: center; padding: 25px 10px; color: var(--text-faint); font-size: 0.74rem; border: 1px dashed rgba(255,255,255,0.08); border-radius: 6px;">
              Sin licitaciones en esta fase
            </div>
          ` : col.items.map(it => {
            let goBadgeStyle = 'background: rgba(254, 202, 87, 0.15); color: #feca57;';
            let goText = '⏳ PENDIENTE';
            if (it.decision_go_nogo === 'GO') {
              goBadgeStyle = 'background: rgba(29, 209, 161, 0.15); color: #1dd1a1;';
              goText = '✅ GO';
            } else if (it.decision_go_nogo === 'NO_GO') {
              goBadgeStyle = 'background: rgba(255, 107, 107, 0.15); color: #ff6b6b;';
              goText = '❌ NO-GO';
            }

            return `
              <div class="kanban-card" style="background: var(--lacquer-deep); border: 1px solid var(--hairline); border-radius: var(--radius-sm); padding: 10px; cursor: pointer; transition: transform 0.15s, border-color 0.15s;" onclick="openPipelineItemModal(${it.id})">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                  <span class="entity-badge" style="font-size: 0.65rem; padding: 2px 5px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${it.entidad}</span>
                  <span style="font-size: 0.65rem; font-weight: 800; padding: 1px 5px; border-radius: 3px; ${goBadgeStyle}">${goText}</span>
                </div>

                <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-warm); margin-bottom: 4px; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${it.objeto || it.proceso_referencia}
                </div>

                <div style="font-size: 0.85rem; font-weight: 800; color: var(--champagne); margin-bottom: 8px;" class="tabular-nums">
                  ${formatCOP(it.presupuesto)}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px; font-size: 0.7rem; color: var(--text-faint);">
                  <span>📋 ${it.tareas_completadas}/${it.tareas_totales} tareas</span>
                  <div style="display: flex; gap: 4px;" onclick="event.stopPropagation();">
                    ${colIdx > 0 ? `
                      <button onclick="movePipelineStage(${it.id}, '${fasesKeys[colIdx - 1]}')" class="btn-action" style="padding: 2px 6px; font-size: 0.7rem; background: var(--lacquer-surface);" title="Retroceder fase">◀</button>
                    ` : ''}
                    ${colIdx < fasesKeys.length - 1 ? `
                      <button onclick="movePipelineStage(${it.id}, '${fasesKeys[colIdx + 1]}')" class="btn-action" style="padding: 2px 6px; font-size: 0.7rem; background: var(--lacquer-surface);" title="Avanzar fase">▶</button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

async function movePipelineStage(id, nuevaFase) {
  try {
    const res = await fetch(`/api/pipeline/${id}/fase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fase: nuevaFase, autor: 'Tablero' })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Proceso movido a: ${nuevaFase}`);
      loadPipeline();
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (e) {
    showToast('Error de conexión al mover tarjeta');
  }
}

function openPipelineItemModal(id) {
  if (!cachedPipelineData) return;

  let item = null;
  for (const col of cachedPipelineData.columnas) {
    const found = col.items.find(it => it.id === id);
    if (found) { item = found; break; }
  }

  if (!item) return;
  activePipelineItemId = id;

  document.getElementById('pipeModalTitle').textContent = item.proceso_referencia;
  document.getElementById('pipeModalSubtitle').textContent = `${item.entidad} • ${formatCOP(item.presupuesto)} • Responsable: ${item.responsable}`;
  document.getElementById('pipeSelectStage').value = item.fase;
  document.getElementById('pipeSelectGoNoGo').value = item.decision_go_nogo;

  renderPipelineTasks(item.tareas || []);
  renderPipelineBitacora(item.bitacora || []);

  document.getElementById('pipelineItemModal')?.classList.add('open');
}

function renderPipelineTasks(tareas) {
  const container = document.getElementById('pipeTasksList');
  const progress = document.getElementById('pipeTasksProgress');
  if (!container) return;

  const total = tareas.length;
  const completadas = tareas.filter(t => t.completada).length;
  if (progress) progress.textContent = `${completadas} / ${total} completadas`;

  if (total === 0) {
    container.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-faint);">No hay tareas registradas</span>`;
    return;
  }

  container.innerHTML = tareas.map(t => {
    let pColor = 'var(--text-muted)';
    if (t.perfil === 'JURIDICO') pColor = '#a855f7';
    else if (t.perfil === 'FINANCIERO') pColor = 'var(--gold)';
    else if (t.perfil === 'TECNICO') pColor = 'var(--tech-cyan)';

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; background: var(--lacquer-deep); padding: 6px 10px; border-radius: 4px; border: 1px solid var(--hairline); font-size: 0.78rem;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1;">
          <input type="checkbox" ${t.completada ? 'checked' : ''} onchange="togglePipelineTask(${t.id}, this.checked)" />
          <span style="font-size: 0.68rem; font-weight: 800; color: ${pColor}; padding: 1px 4px; border-radius: 2px; border: 1px solid ${pColor};">[${t.perfil}]</span>
          <span style="text-decoration: ${t.completada ? 'line-through' : 'none'}; color: ${t.completada ? 'var(--text-faint)' : 'var(--text-primary)'};">${t.titulo}</span>
        </label>
      </div>
    `;
  }).join('');
}

function renderPipelineBitacora(bitacora) {
  const container = document.getElementById('pipeBitacoraList');
  if (!container) return;

  if (bitacora.length === 0) {
    container.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-faint);">Sin notas registradas</span>`;
    return;
  }

  container.innerHTML = bitacora.map(b => `
    <div style="background: var(--lacquer-deep); padding: 6px 8px; border-radius: 4px; border-left: 2px solid var(--champagne);">
      <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-faint); margin-bottom: 2px;">
        <b>${b.autor}</b>
        <span>${new Date(b.creado_en).toLocaleString('es-CO')}</span>
      </div>
      <div style="color: var(--text-warm);">${b.comentario}</div>
    </div>
  `).join('');
}

async function togglePipelineTask(taskId, completada) {
  try {
    await fetch(`/api/pipeline/tareas/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completada })
    });
    loadPipeline();
  } catch (e) {
    showToast('Error al actualizar tarea');
  }
}

// Event Listeners del Modal Pipeline
document.getElementById('btnClosePipeModal')?.addEventListener('click', () => {
  document.getElementById('pipelineItemModal')?.classList.remove('open');
});
document.getElementById('btnClosePipeModalBtn')?.addEventListener('click', () => {
  document.getElementById('pipelineItemModal')?.classList.remove('open');
});

document.getElementById('pipeSelectStage')?.addEventListener('change', async (e) => {
  if (!activePipelineItemId) return;
  await movePipelineStage(activePipelineItemId, e.target.value);
});

document.getElementById('pipeSelectGoNoGo')?.addEventListener('change', async (e) => {
  if (!activePipelineItemId) return;
  try {
    const res = await fetch(`/api/pipeline/${activePipelineItemId}/go-nogo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: e.target.value, autor: 'Comité' })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Decisión Go/No-Go: ${e.target.value}`);
      loadPipeline();
    }
  } catch (err) {
    showToast('Error al actualizar decisión');
  }
});

document.getElementById('btnPipeAddTask')?.addEventListener('click', async () => {
  if (!activePipelineItemId) return;
  const input = document.getElementById('pipeNewTaskInput');
  const perfil = document.getElementById('pipeNewTaskProfile')?.value || 'GENERAL';
  const titulo = input?.value.trim();
  if (!titulo) return;

  try {
    const res = await fetch(`/api/pipeline/${activePipelineItemId}/tareas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfil, titulo })
    });
    const json = await res.json();
    if (json.success) {
      input.value = '';
      loadPipeline();
      // Reabrir modal actualizado
      setTimeout(() => openPipelineItemModal(activePipelineItemId), 300);
    }
  } catch (err) {
    showToast('Error agregando tarea');
  }
});

document.getElementById('btnPipeAddBitacora')?.addEventListener('click', async () => {
  if (!activePipelineItemId) return;
  const input = document.getElementById('pipeNewBitacoraInput');
  const comentario = input?.value.trim();
  if (!comentario) return;

  try {
    const res = await fetch(`/api/pipeline/${activePipelineItemId}/bitacora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autor: 'Licitador', comentario })
    });
    const json = await res.json();
    if (json.success) {
      input.value = '';
      loadPipeline();
      setTimeout(() => openPipelineItemModal(activePipelineItemId), 300);
    }
  } catch (err) {
    showToast('Error agregando nota');
  }
});

document.getElementById('btnDeletePipeProceso')?.addEventListener('click', async () => {
  if (!activePipelineItemId) return;
  if (!confirm('¿Estás seguro de retirar este proceso del Pipeline?')) return;

  try {
    const res = await fetch(`/api/pipeline/${activePipelineItemId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Proceso eliminado del Pipeline');
      document.getElementById('pipelineItemModal')?.classList.remove('open');
      loadPipeline();
    }
  } catch (err) {
    showToast('Error al eliminar');
  }
});

// Botón "Al Pipeline" desde el Modal de Detalle de Oportunidad
document.getElementById('modalBtnAddToPipeline')?.addEventListener('click', async () => {
  const item = oportunidades.find(o => o.id === activeModalId);
  if (!item) return;

  const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];

  try {
    const res = await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresa_id: lider ? lider.id : null,
        proceso_referencia: item.referencia || item.id,
        entidad: item.entidad,
        objeto: item.descripcion || item.nombre,
        presupuesto: parseFloat(item.precio_base || item.cuantia || 0),
        fecha_cierre: item.fecha_cierre,
        departamento: item.departamento || 'Colombia',
        url_secop: item.url
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast('¡Oportunidad incorporada al Pipeline Kanban!');
      document.getElementById('detailModal')?.classList.remove('open');
      loadPipeline();

      // Cambiar a la vista Pipeline
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
      document.querySelector('.nav-item[data-target="view-pipeline"]')?.classList.add('active');
      document.getElementById('view-pipeline')?.classList.add('active');
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (err) {
    showToast('Error incorporando al Pipeline');
  }
});

// Modal Nueva Licitación Manual
document.getElementById('btnNewPipelineProceso')?.addEventListener('click', () => {
  document.getElementById('newPipelineModal')?.classList.add('open');
});
document.getElementById('btnCloseNewPipeModal')?.addEventListener('click', () => {
  document.getElementById('newPipelineModal')?.classList.remove('open');
});
document.getElementById('btnCancelNewPipe')?.addEventListener('click', () => {
  document.getElementById('newPipelineModal')?.classList.remove('open');
});

document.getElementById('newPipelineForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const lider = userCompanies.find(c => c.es_propia) || userCompanies[0];

  const body = {
    empresa_id: lider ? lider.id : null,
    proceso_referencia: document.getElementById('newPipeRef').value.trim(),
    entidad: document.getElementById('newPipeEntidad').value.trim(),
    presupuesto: parseFloat(document.getElementById('newPipePresupuesto').value || 0),
    objeto: document.getElementById('newPipeObjeto').value.trim(),
    fase: document.getElementById('newPipeFase').value
  };

  try {
    const res = await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (json.success) {
      showToast('Licitación agregada al Pipeline');
      document.getElementById('newPipelineModal')?.classList.remove('open');
      document.getElementById('newPipelineForm').reset();
      loadPipeline();
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (err) {
    showToast('Error de conexión');
  }
});

// ==================== MÓDULO DE AUTENTICACIÓN SAAS Y MULTI-TENANCY ====================
// Interceptor global para inyectar token JWT automáticamente
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  options.headers = options.headers || {};
  const token = localStorage.getItem('radar_secop_token');
  if (token) {
    if (options.headers instanceof Headers) {
      if (!options.headers.has('Authorization')) options.headers.set('Authorization', `Bearer ${token}`);
    } else {
      if (!options.headers['Authorization'] && !options.headers['authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  return originalFetch(url, options);
};

let currentUser = null;

function renderUserAuthUI() {
  const container = document.getElementById('userAuthBadgeContainer');
  if (!container) return;

  if (currentUser) {
    let roleBadgeColor = '#38bdf8';
    if (currentUser.rol === 'ADMIN') roleBadgeColor = 'var(--gold)';
    else if (currentUser.rol === 'JURIDICO') roleBadgeColor = '#a855f7';
    else if (currentUser.rol === 'FINANCIERO') roleBadgeColor = 'var(--success)';

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 3px 10px; border-radius: var(--radius-sm); font-size: 0.75rem;">
        <span style="font-weight: 700; color: var(--champagne);">👤 ${currentUser.nombre.split(' ')[0]}</span>
        <span style="font-size: 0.65rem; font-weight: 800; background: rgba(255,255,255,0.08); color: ${roleBadgeColor}; padding: 1px 5px; border-radius: 3px;">${currentUser.rol}</span>
        <button id="btnLogout" style="background: none; border: none; color: var(--text-faint); cursor: pointer; padding: 0 4px; font-size: 0.85rem;" title="Cerrar sesión">✕</button>
      </div>
    `;

    document.getElementById('btnLogout')?.addEventListener('click', () => {
      localStorage.removeItem('radar_secop_token');
      currentUser = null;
      renderUserAuthUI();
      showToast('Sesión cerrada correctamente');
    });
  } else {
    container.innerHTML = `
      <button id="btnOpenAuthModal" class="btn-action" style="padding: 4px 10px; font-size: 0.75rem; background: rgba(0, 229, 255, 0.12); border: 1px solid var(--tech-cyan); color: var(--tech-cyan); border-radius: var(--radius-sm); gap: 5px;">
        <span>🔐 Iniciar Sesión</span>
      </button>
    `;

    document.getElementById('btnOpenAuthModal')?.addEventListener('click', () => {
      document.getElementById('authModal')?.classList.add('open');
    });
  }
}

async function checkUserSession() {
  const token = localStorage.getItem('radar_secop_token');
  if (!token) {
    currentUser = null;
    renderUserAuthUI();
    return;
  }

  try {
    const res = await fetch('/api/auth/me');
    const json = await res.json();
    if (json.success && json.data) {
      currentUser = json.data.usuario;
      renderUserAuthUI();
    } else {
      localStorage.removeItem('radar_secop_token');
      currentUser = null;
      renderUserAuthUI();
    }
  } catch (err) {
    currentUser = null;
    renderUserAuthUI();
  }
}

// Tabs dentro del modal Auth
document.getElementById('authTabLogin')?.addEventListener('click', () => {
  document.getElementById('authTabLogin').classList.add('active');
  document.getElementById('authTabLogin').style.color = 'var(--champagne)';
  document.getElementById('authTabLogin').style.borderBottom = '2px solid var(--champagne)';
  document.getElementById('authTabRegister').classList.remove('active');
  document.getElementById('authTabRegister').style.color = 'var(--text-faint)';
  document.getElementById('authTabRegister').style.borderBottom = 'none';
  document.getElementById('formLogin').style.display = 'flex';
  document.getElementById('formRegister').style.display = 'none';
});

document.getElementById('authTabRegister')?.addEventListener('click', () => {
  document.getElementById('authTabRegister').classList.add('active');
  document.getElementById('authTabRegister').style.color = 'var(--champagne)';
  document.getElementById('authTabRegister').style.borderBottom = '2px solid var(--champagne)';
  document.getElementById('authTabLogin').classList.remove('active');
  document.getElementById('authTabLogin').style.color = 'var(--text-faint)';
  document.getElementById('authTabLogin').style.borderBottom = 'none';
  document.getElementById('formRegister').style.display = 'flex';
  document.getElementById('formLogin').style.display = 'none';
});

document.getElementById('btnCloseAuthModal')?.addEventListener('click', () => {
  document.getElementById('authModal')?.classList.remove('open');
});

// Submit Formulario Login
document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const json = await res.json();
    if (json.success && json.data) {
      localStorage.setItem('radar_secop_token', json.data.token);
      currentUser = json.data.usuario;
      document.getElementById('authModal')?.classList.remove('open');
      renderUserAuthUI();
      showToast(`¡Bienvenido de nuevo, ${currentUser.nombre.split(' ')[0]}!`);
      loadCompanies();
      loadPipeline();
    } else {
      showToast(`Error: ${json.error || 'Credenciales incorrectas'}`);
    }
  } catch (err) {
    showToast('Error de conexión');
  }
});

// Submit Formulario Registro
document.getElementById('formRegister')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('regNombre')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPassword')?.value;
  const rol = document.getElementById('regRol')?.value;
  const razon_social = document.getElementById('regEmpresa')?.value.trim();
  const nit = document.getElementById('regNit')?.value.trim();

  try {
    const res = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, rol, razon_social, nit })
    });

    const json = await res.json();
    if (json.success && json.data) {
      localStorage.setItem('radar_secop_token', json.data.token);
      currentUser = json.data.usuario;
      document.getElementById('authModal')?.classList.remove('open');
      renderUserAuthUI();
      showToast(`¡Cuenta SaaS y empresa creadas exitosamente!`);
      loadCompanies();
      loadPipeline();
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (err) {
    showToast('Error de conexión');
  }
});

// ==================== MÓDULO: INTELIGENCIA COMPETITIVA Y CONTRATISTAS (SOCRATA JBJY-VK9H) ====================
let lastCompetitiveData = null;
let lastMonteCarloCalibration = null;

function initCompetitorsView() {
  if (!lastCompetitiveData) {
    const compPalabraInput = document.getElementById('compPalabraInput');
    if (compPalabraInput && !compPalabraInput.value) {
      compPalabraInput.value = currentProfile === 'CERABELA' ? 'ARTESANIAS' : 'SOFTWARE';
    }
  }
}

async function ejecutarAnalisisCompetencia(forceRefresh = false) {
  const entidad = document.getElementById('compEntidadInput')?.value.trim() || '';
  const palabraClave = document.getElementById('compPalabraInput')?.value.trim() || '';
  const unspsc = document.getElementById('compUnspscInput')?.value.trim() || '';
  const limit = document.getElementById('compLimitSelect')?.value || '100';

  const container = document.getElementById('compContentArea');
  const kpisContainer = document.getElementById('compKpisContainer');
  const montecarloBanner = document.getElementById('compMontecarloBanner');

  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 50px; background: var(--lacquer-surface); border: 1px solid var(--hairline); border-radius: var(--radius-md);">
        <div style="font-size: 1.8rem; margin-bottom: 8px;">📡 ⏳</div>
        <div style="font-size: 0.95rem; font-weight: 700; color: var(--tech-cyan);">Consultando base de datos oficial SECOP II (jbjy-vk9h)...</div>
        <div style="font-size: 0.78rem; color: var(--text-faint); margin-top: 4px;">Analizando precios adjudicados, cuotas de mercado y concentración de contratistas.</div>
      </div>
    `;
  }

  try {
    const params = new URLSearchParams({
      entidad,
      palabra_clave: palabraClave,
      unspsc,
      limit,
      force_refresh: forceRefresh ? 'true' : 'false'
    });

    const res = await fetch(`/api/competencia/analizar?${params.toString()}`);
    const json = await res.json();

    if (!json.success || !json.data) {
      throw new Error(json.error || 'Error al obtener datos');
    }

    const data = json.data;
    lastCompetitiveData = data;
    lastMonteCarloCalibration = data.monteCarloParams;

    // Renderizar KPIs
    if (kpisContainer) {
      kpisContainer.style.display = 'grid';
      document.getElementById('compKpiTotal').textContent = data.totalContratos;
      document.getElementById('compKpiOrigen').textContent = data.source === 'CACHE_POSTGRES' ? '⚡ Caché Local (Instantáneo)' : '🌐 Socrata SECOP II en vivo';
      document.getElementById('compKpiMonto').textContent = `$ ${Math.round(data.montoTotal).toLocaleString('es-CO')} COP`;
      document.getElementById('compKpiTicket').textContent = `$ ${Math.round(data.ticketMediana).toLocaleString('es-CO')} COP`;
      document.getElementById('compKpiTicketProm').textContent = `Prom: $ ${Math.round(data.ticketPromedio).toLocaleString('es-CO')} COP`;
      
      const kpiHhi = document.getElementById('compKpiHhi');
      const hhiBadge = document.getElementById('compHhiBadge');
      const hhiDesc = document.getElementById('compHhiDesc');

      if (kpiHhi) kpiHhi.textContent = data.indiceHerfindahl;
      if (hhiBadge) {
        hhiBadge.textContent = data.nivelConcentracion?.etiqueta || 'NORMAL';
        hhiBadge.style.background = data.nivelConcentracion?.color || '#38bdf8';
        hhiBadge.style.color = '#000';
      }
      if (hhiDesc) hhiDesc.textContent = data.nivelConcentracion?.descripcion || '';
    }

    // Renderizar Banner Monte Carlo
    if (montecarloBanner && data.monteCarloParams) {
      montecarloBanner.style.display = 'flex';
      const advice = document.getElementById('compMontecarloAdvice');
      if (advice) {
        advice.innerHTML = `
          <b>${data.monteCarloParams.recomendacionEstrategica}</b><br>
          <span style="color: var(--champagne);">Rango de descuento sugerido: <b>${data.monteCarloParams.suggestedMinPct}% a ${data.monteCarloParams.suggestedMaxPct}%</b> | Competidores estimados: <b>${data.monteCarloParams.competidoresSugeridos}</b></span>
        `;
      }
    }

    // Renderizar Tablas y Top Contratistas
    renderResultadosCompetencia(data);
  } catch (err) {
    console.error('Error analizando competencia:', err);
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--danger); background: var(--lacquer-surface); border: 1px solid var(--hairline); border-radius: var(--radius-md);">
          ❌ Error al consultar SECOP II: ${err.message}. Verifica los criterios de búsqueda e intenta de nuevo.
        </div>
      `;
    }
  }
}

function renderResultadosCompetencia(data) {
  const container = document.getElementById('compContentArea');
  if (!container) return;

  const topContratistas = data.topContratistas || [];
  const muestra = data.contratosMuestra || [];

  let html = `
    <!-- Leaderboard de Contratistas -->
    <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 18px; border-radius: var(--radius-md);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--champagne); display: flex; align-items: center; gap: 8px;">
          <span>🏆 Top Contratistas Adjudicatarios</span>
          <span style="font-size: 0.72rem; color: var(--text-faint); font-weight: 400;">(${topContratistas.length} actores con mayores montos ganados)</span>
        </div>
      </div>
  `;

  if (topContratistas.length === 0) {
    html += `<div style="text-align: center; padding: 20px; color: var(--text-faint);">No se encontraron contratos para los criterios especificados.</div>`;
  } else {
    html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
    topContratistas.forEach((c, idx) => {
      const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx+1}`));
      const barWidth = Math.min(Math.max(c.cuotaMercadoPct, 2), 100);

      html += `
        <div style="background: var(--lacquer-deep); border: 1px solid var(--hairline); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.1rem; font-weight: 800; width: 28px; text-align: center;">${medal}</span>
              <div>
                <div style="font-size: 0.88rem; font-weight: 800; color: var(--champagne); display: flex; align-items: center; gap: 6px;">
                  <span>${c.nombre}</span>
                  ${c.esPyme ? '<span style="font-size: 0.65rem; background: rgba(16, 185, 129, 0.2); color: var(--success); padding: 1px 5px; border-radius: 4px;">PYME</span>' : ''}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-faint);">NIT: <b style="color: var(--text-warm);">${c.nit}</b> | Contratos ganados: <b style="color: var(--text-warm);">${c.contratosGanados}</b> | Ticket prom: $ ${Math.round(c.ticketPromedio).toLocaleString('es-CO')} COP</div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="text-align: right;">
                <div style="font-size: 0.95rem; font-weight: 800; color: var(--tech-cyan);" class="tabular-nums">$ ${Math.round(c.montoTotal).toLocaleString('es-CO')} COP</div>
                <div style="font-size: 0.72rem; color: var(--text-faint);">${c.cuotaMercadoPct}% del total analizado</div>
              </div>
              <button onclick="abrirHistorialContratista('${c.nit}')" class="btn-action" style="padding: 5px 10px; font-size: 0.75rem; background: rgba(0, 229, 255, 0.1); border: 1px solid var(--tech-cyan); color: var(--tech-cyan);">
                🔍 Historial
              </button>
              <button onclick="seguirCompetidor('${c.nit}', '${encodeURIComponent(c.nombre)}')" class="btn-action" style="padding: 5px 10px; font-size: 0.75rem; background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; color: #fbbf24;">
                ⭐ Seguir
              </button>
            </div>
          </div>

          <!-- Barra de Progreso de Cuota de Mercado -->
          <div style="width: 100%; height: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 3px; overflow: hidden;">
            <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, var(--tech-cyan), #10b981); border-radius: 3px;"></div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }
  html += `</div>`;

  // Muestra de Contratos Adjudicados
  html += `
    <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 18px; border-radius: var(--radius-md);">
      <div style="font-size: 0.95rem; font-weight: 800; color: var(--champagne); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <span>📋 Contratos Adjudicados Recientes (Muestra Oficial SECOP II)</span>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--hairline); color: var(--text-faint);">
              <th style="padding: 8px 10px;">Entidad</th>
              <th style="padding: 8px 10px;">Proveedor Adjudicado</th>
              <th style="padding: 8px 10px;">Objeto Contractual</th>
              <th style="padding: 8px 10px;">Modalidad</th>
              <th style="padding: 8px 10px; text-align: right;">Valor Adjudicado</th>
              <th style="padding: 8px 10px; text-align: center;">Firma</th>
              <th style="padding: 8px 10px; text-align: center;">SECOP II</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (muestra.length === 0) {
    html += `<tr><td colspan="7" style="padding: 20px; text-align: center; color: var(--text-faint);">No hay muestra de contratos disponible.</td></tr>`;
  } else {
    muestra.forEach(m => {
      const fecha = m.fechaFirma ? m.fechaFirma.slice(0, 10) : '--';
      const secopLink = m.url ? `<a href="${m.url}" target="_blank" style="color: var(--tech-cyan); text-decoration: underline;">Abrir ↗</a>` : '--';

      html += `
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.04); transition: background 0.15s ease;">
          <td style="padding: 8px 10px; font-weight: 600; color: var(--champagne); max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.entidad}">${m.entidad}</td>
          <td style="padding: 8px 10px; color: var(--text-warm); max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.proveedor}">${m.proveedor}</td>
          <td style="padding: 8px 10px; color: var(--text-muted); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.objeto}">${m.objeto}</td>
          <td style="padding: 8px 10px; color: var(--text-faint); font-size: 0.72rem;">${m.modalidad}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: var(--tech-cyan);" class="tabular-nums">$ ${Math.round(m.valor).toLocaleString('es-CO')}</td>
          <td style="padding: 8px 10px; text-align: center; color: var(--text-faint);">${fecha}</td>
          <td style="padding: 8px 10px; text-align: center;">${secopLink}</td>
        </tr>
      `;
    });
  }

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// Historial detallado de un contratista
async function abrirHistorialContratista(nit) {
  const modal = document.getElementById('contractorDetailModal');
  const body = document.getElementById('contractorModalBody');
  const subtitle = document.getElementById('contractorModalSubtitle');
  if (!modal || !body) return;

  modal.classList.add('open');
  body.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--tech-cyan);">⏳ Consultando historial completo en SECOP II...</div>`;

  try {
    const res = await fetch(`/api/competencia/contratista/${encodeURIComponent(nit)}`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'No se pudo obtener el historial');

    const d = json.data;
    if (subtitle) subtitle.textContent = `${d.nombre} (NIT: ${d.nit})`;

    let html = `
      <div style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 14px; border-radius: var(--radius-sm); display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <div style="font-size: 0.7rem; color: var(--text-faint); text-transform: uppercase;">Total Contratos Ganados</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--champagne);">${d.totalContratos}</div>
        </div>
        <div>
          <div style="font-size: 0.7rem; color: var(--text-faint); text-transform: uppercase;">Monto Total Adjudicado</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--tech-cyan);">$ ${Math.round(d.montoTotalAdjudicado).toLocaleString('es-CO')} COP</div>
        </div>
      </div>

      <div style="font-size: 0.8rem; font-weight: 700; color: var(--champagne); margin-top: 6px;">Entidades Contratantes Recurrentes:</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${d.entidadesContratantes.map(e => `<span style="font-size: 0.72rem; background: var(--lacquer-deep); border: 1px solid var(--hairline); color: var(--text-warm); padding: 3px 8px; border-radius: 4px;">${e}</span>`).join('')}
      </div>

      <div style="font-size: 0.8rem; font-weight: 700; color: var(--champagne); margin-top: 10px;">Adjudicaciones Recientes (${d.contratos.length}):</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${d.contratos.slice(0, 15).map(c => `
          <div style="background: var(--lacquer-deep); border: 1px solid var(--hairline); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 700; color: var(--champagne);">${c.entidad}</span>
              <span style="font-weight: 800; color: var(--tech-cyan);">$ ${Math.round(c.valor).toLocaleString('es-CO')} COP</span>
            </div>
            <div style="color: var(--text-muted); line-height: 1.3;">${c.objeto}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 0.7rem; color: var(--text-faint);">
              <span>${c.modalidad} | Fecha: ${c.fechaFirma ? c.fechaFirma.slice(0, 10) : '--'}</span>
              ${c.url ? `<a href="${c.url}" target="_blank" style="color: var(--tech-cyan); text-decoration: underline;">Ver Proceso SECOP ↗</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--danger);">Error: ${err.message}</div>`;
  }
}

// Seguir competidor
async function seguirCompetidor(nit, nombreEncoded) {
  const nombre = decodeURIComponent(nombreEncoded);
  try {
    const res = await fetch('/api/competencia/seguimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nit,
        nombre,
        sector: 'Contratista SECOP II',
        notas: 'Agregado desde análisis de competencia'
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`⭐ Ahora sigues a: ${nombre}`);
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (err) {
    showToast('Error de red al guardar seguimiento');
  }
}

// Abrir Radar de Competidores en Seguimiento
async function abrirModalWatchlist() {
  const modal = document.getElementById('watchlistModal');
  const body = document.getElementById('watchlistModalBody');
  if (!modal || !body) return;

  modal.classList.add('open');
  body.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--tech-cyan);">⏳ Cargando competidores en seguimiento...</div>`;

  try {
    const res = await fetch('/api/competencia/seguimiento');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al listar seguimiento');

    const list = json.data || [];
    if (list.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-faint);">
          Aún no sigues a ningún competidor. Haz clic en "⭐ Seguir" en el ranking de contratistas para monitorear a tus rivales clave.
        </div>
      `;
      return;
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
    list.forEach(c => {
      html += `
        <div style="background: var(--lacquer-deep); border: 1px solid var(--hairline); padding: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--champagne);">${c.nombre_competidor}</div>
            <div style="font-size: 0.72rem; color: var(--text-faint);">NIT: <b style="color: var(--text-warm);">${c.nit_competidor}</b> | Sector: ${c.sector_principal || 'General'}</div>
            ${c.notas ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">📝 ${c.notas}</div>` : ''}
          </div>
          <div style="display: flex; gap: 6px;">
            <button onclick="abrirHistorialContratista('${c.nit_competidor}')" class="btn-action" style="padding: 4px 8px; font-size: 0.72rem; background: rgba(0, 229, 255, 0.1); border: 1px solid var(--tech-cyan); color: var(--tech-cyan);">
              🔍 Historial
            </button>
            <button onclick="eliminarCompetidorSeguimiento('${c.id}')" class="btn-action" style="padding: 4px 8px; font-size: 0.72rem; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #f87171;">
              🗑️
            </button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--danger);">Error: ${err.message}</div>`;
  }
}

// Eliminar competidor de seguimiento
async function eliminarCompetidorSeguimiento(id) {
  try {
    const res = await fetch(`/api/competencia/seguimiento/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success && json.deleted) {
      showToast('Competidor removido del radar');
      abrirModalWatchlist();
    }
  } catch (err) {
    showToast('Error al eliminar');
  }
}

// Transferir calibración a Simulador Monte Carlo (Pliegos Tipo)
document.getElementById('btnTransferToMontecarlo')?.addEventListener('click', () => {
  if (!lastMonteCarloCalibration) return;

  const econCompetidores = document.getElementById('econCompetidores');
  const econPerfil = document.getElementById('econPerfil');
  const econPresupuesto = document.getElementById('econPresupuesto');

  if (econCompetidores) {
    const sug = lastMonteCarloCalibration.competidoresSugeridos;
    if (sug <= 4) econCompetidores.value = '3';
    else if (sug <= 7) econCompetidores.value = '6';
    else if (sug <= 12) econCompetidores.value = '10';
    else econCompetidores.value = '16';
  }

  if (econPerfil) {
    if (lastMonteCarloCalibration.suggestedBias === 'down') econPerfil.value = 'AGRESIVO';
    else if (lastMonteCarloCalibration.suggestedBias === 'up') econPerfil.value = 'CONSERVADOR';
    else econPerfil.value = 'MODERADO';
  }

  if (econPresupuesto && (!econPresupuesto.value || econPresupuesto.value === '0') && lastMonteCarloCalibration.ticketMedianaRef) {
    econPresupuesto.value = Math.round(lastMonteCarloCalibration.ticketMedianaRef);
  }

  // Activar pestaña Pliegos Tipo
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.querySelector('.nav-item[data-target="view-economic"]')?.classList.add('active');
  document.getElementById('view-economic')?.classList.add('active');

  runMonteCarloSimulation();
  showToast('🎯 ¡Parámetros de mercado transferidos al Simulador Monte Carlo!');
});

// Event Listeners para Inteligencia Competitiva
document.getElementById('btnEjecutarAnalisisComp')?.addEventListener('click', () => ejecutarAnalisisCompetencia(true));
document.getElementById('btnVerSeguimientoCompetidores')?.addEventListener('click', abrirModalWatchlist);
document.getElementById('btnCloseWatchlistModal')?.addEventListener('click', () => {
  document.getElementById('watchlistModal')?.classList.remove('open');
});
document.getElementById('btnCloseContractorModal')?.addEventListener('click', () => {
  document.getElementById('contractorDetailModal')?.classList.remove('open');
});

// Botón de detalle de oportunidad para ver ganadores
document.getElementById('modalBtnAnalyzeCompetitors')?.addEventListener('click', () => {
  const item = oportunidades.find(o => o.id === activeModalId);
  if (!item) return;

  document.getElementById('detailModal')?.classList.remove('open');

  const compEntidadInput = document.getElementById('compEntidadInput');
  const compPalabraInput = document.getElementById('compPalabraInput');
  if (compEntidadInput) compEntidadInput.value = item.entidad || '';
  if (compPalabraInput) compPalabraInput.value = '';

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.querySelector('.nav-item[data-target="view-competitors"]')?.classList.add('active');
  document.getElementById('view-competitors')?.classList.add('active');

  ejecutarAnalisisCompetencia(true);
});

// ==================== MÓDULO: ALERTAS PREDICTIVAS DE PRÓRROGAS Y VENCIMIENTOS ====================
let lastPredictiveData = null;

function initPredictiveView() {
  if (!lastPredictiveData) {
    ejecutarEscaneoPredictivo(false);
  }
}

async function ejecutarEscaneoPredictivo(forceRefresh = false) {
  const dias = document.getElementById('predDiasSelect')?.value || '90';
  const entidad = document.getElementById('predEntidadInput')?.value.trim() || '';
  const palabraClave = document.getElementById('predPalabraInput')?.value.trim() || '';
  const minValor = document.getElementById('predMinValorSelect')?.value || '50000000';

  const container = document.getElementById('predContentArea');
  const kpisContainer = document.getElementById('predKpisContainer');

  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 50px; background: var(--lacquer-surface); border: 1px solid var(--hairline); border-radius: var(--radius-md);">
        <div style="font-size: 1.8rem; margin-bottom: 8px;">⏳ 📡</div>
        <div style="font-size: 0.95rem; font-weight: 700; color: var(--tech-cyan);">Escanenado contratos en ejecución próximos a vencer...</div>
        <div style="font-size: 0.78rem; color: var(--text-faint); margin-top: 4px;">Identificando oportunidades tempranas y contratos no prorrogables en SECOP II.</div>
      </div>
    `;
  }

  try {
    const params = new URLSearchParams({
      perfil: currentProfile || 'NIKADU_IA',
      entidad,
      palabra_clave: palabraClave,
      dias,
      min_valor: minValor,
      force_refresh: forceRefresh ? 'true' : 'false'
    });

    const res = await fetch(`/api/predictivo/vencimientos?${params.toString()}`);
    const json = await res.json();

    if (!json.success || !json.data) {
      throw new Error(json.error || 'Error al obtener datos');
    }

    const data = json.data;
    lastPredictiveData = data;

    // Renderizar KPIs
    if (kpisContainer) {
      kpisContainer.style.display = 'grid';
      document.getElementById('predKpiTotal').textContent = data.totalContratos;
      document.getElementById('predKpiHorizonte').textContent = `Próximos ${dias} días (${data.source === 'CACHE_POSTGRES' ? '⚡ Caché' : '🌐 SECOP II'})`;
      document.getElementById('predKpiMonto').textContent = `$ ${Math.round(data.montoTotal).toLocaleString('es-CO')} COP`;

      const noProrrogablesCount = data.contratos.filter(c => !c.esProrrogable || c.diasAdicionados >= 120).length;
      document.getElementById('predKpiNoProrrogables').textContent = noProrrogablesCount;
      document.getElementById('predKpiEntidadesCount').textContent = data.resumenEntidades?.length || 0;
    }

    renderResultadosPredictivo(data);
  } catch (err) {
    console.error('Error en escaneo predictivo:', err);
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--danger); background: var(--lacquer-surface); border: 1px solid var(--hairline); border-radius: var(--radius-md);">
          ❌ Error al escanear vencimientos: ${err.message}. Verifica los criterios de búsqueda e intenta de nuevo.
        </div>
      `;
    }
  }
}

function renderResultadosPredictivo(data) {
  const container = document.getElementById('predContentArea');
  if (!container) return;

  const contratos = data.contratos || [];
  if (contratos.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-faint); background: var(--lacquer-surface); border: 1px dashed var(--hairline); border-radius: var(--radius-md);">
        No se detectaron contratos por vencer con los filtros aplicados. Prueba ampliando el horizonte temporal a 180 días o reduciendo la cuantía mínima.
      </div>
    `;
    return;
  }

  let html = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
  `;

  contratos.forEach((c, idx) => {
    const urg = c.urgencia;
    const cert = c.certezaNuevaLicitacion;
    const diasBadge = c.diasRestantes <= 0 ?
      `<span style="background: rgba(244, 63, 94, 0.2); color: #f43f5e; border: 1px solid #f43f5e; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">🚨 VENCIDO (${Math.abs(c.diasRestantes)}d)</span>` :
      `<span style="background: ${urg.color}20; color: ${urg.color}; border: 1px solid ${urg.color}; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">⏳ VENCE EN ${c.diasRestantes} DÍAS</span>`;

    const prorrogableBadge = c.esProrrogable ?
      `<span style="font-size: 0.7rem; color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 1px 6px; border-radius: 4px;">Prorrogable (Adic: ${c.diasAdicionados}d)</span>` :
      `<span style="font-size: 0.7rem; color: var(--danger); background: rgba(239, 68, 68, 0.15); padding: 1px 6px; border-radius: 4px; font-weight: 700;">🚫 NO PRORROGABLE (Nueva Licitación)</span>`;

    html += `
      <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); padding: 16px; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 10px; transition: transform 0.15s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
          <div style="flex: 1; min-width: 280px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              ${diasBadge}
              ${prorrogableBadge}
              <span style="font-size: 0.7rem; color: var(--text-faint);">${c.departamento}</span>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 800; color: var(--champagne); line-height: 1.3;">${c.entidad}</h3>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--tech-cyan);" class="tabular-nums">$ ${Math.round(c.valor).toLocaleString('es-CO')} COP</div>
            <div style="font-size: 0.72rem; color: var(--text-faint);">Vencimiento: <b style="color: var(--text-warm);">${c.fechaFin}</b></div>
          </div>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-warm); line-height: 1.4; background: var(--lacquer-deep); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--hairline);">
          <b>Objeto:</b> ${c.objeto}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--text-faint);">Titular actual:</span>
            <span style="color: var(--champagne); font-weight: 700;">${c.proveedorActual}</span>
            <span style="color: var(--text-faint);">(NIT: ${c.nitProveedor})</span>
          </div>

          <div style="color: var(--text-muted); font-size: 0.72rem;">
            💡 <i>${cert.razon}</i>
          </div>
        </div>

        <!-- Acciones Estratégicas -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid var(--hairline); padding-top: 10px; margin-top: 2px;">
          <button onclick="incorporarVencimientoAlPipeline('${c.idContrato}', '${encodeURIComponent(c.entidad)}', '${encodeURIComponent(c.objeto)}', ${c.valor}, '${c.fechaFin}', '${encodeURIComponent(c.proveedorActual)}', '${c.nitProveedor}')" class="btn-action" style="padding: 6px 12px; font-size: 0.76rem; background: rgba(168, 85, 247, 0.15); border: 1px solid #a855f7; color: #d8b4fe; font-weight: 700;">
            📌 Incorporar al Pipeline
          </button>
          <button onclick="analizarTitularDesdeVencimiento('${encodeURIComponent(c.entidad)}', '${c.nitProveedor}')" class="btn-action" style="padding: 6px 12px; font-size: 0.76rem; background: rgba(16, 185, 129, 0.12); border: 1px solid #10b981; color: #6ee7b7;">
            👥 Analizar Titular / Entidad
          </button>
          <button onclick="seguirVencimiento('${c.idContrato}', '${encodeURIComponent(c.entidad)}', '${encodeURIComponent(c.objeto)}', ${c.valor}, '${c.fechaFin}', '${encodeURIComponent(c.proveedorActual)}', '${c.nitProveedor}', ${c.esProrrogable}, ${c.diasAdicionados}, '${c.url || ''}')" class="btn-action" style="padding: 6px 12px; font-size: 0.76rem; background: rgba(56, 189, 248, 0.12); border: 1px solid #38bdf8; color: #38bdf8;">
            ⭐ Seguir Vencimiento
          </button>
          ${c.url ? `<a href="${c.url}" target="_blank" class="btn-action" style="padding: 6px 12px; font-size: 0.76rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--hairline); color: var(--text-warm); text-decoration: none;">🔗 Ver Contrato SECOP II ↗</a>` : ''}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// Incorporar un contrato por vencer al Pipeline Kanban
async function incorporarVencimientoAlPipeline(idContrato, entidadEncoded, objetoEncoded, valor, fechaFin, provActualEncoded, nitProv) {
  const entidad = decodeURIComponent(entidadEncoded);
  const objeto = decodeURIComponent(objetoEncoded);
  const proveedorActual = decodeURIComponent(provActualEncoded);

  try {
    const res = await fetch('/api/predictivo/incorporar-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idContrato,
        entidad,
        objeto,
        valor,
        fechaFin,
        proveedorActual,
        nitProveedor: nitProv
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast('📌 ¡Oportunidad temprana incorporada exitosamente al Pipeline Kanban!');
      loadPipeline();
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (err) {
    showToast('Error de red al incorporar al pipeline');
  }
}

// Analizar titular y entidad en Inteligencia Competitiva
function analizarTitularDesdeVencimiento(entidadEncoded, nitProveedor) {
  const entidad = decodeURIComponent(entidadEncoded);
  const compEntidadInput = document.getElementById('compEntidadInput');
  const compPalabraInput = document.getElementById('compPalabraInput');

  if (compEntidadInput) compEntidadInput.value = entidad;
  if (compPalabraInput) compPalabraInput.value = '';

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.querySelector('.nav-item[data-target="view-competitors"]')?.classList.add('active');
  document.getElementById('view-competitors')?.classList.add('active');

  ejecutarAnalisisCompetencia(true);
}

// Guardar vencimiento en seguimiento
async function seguirVencimiento(idContrato, entidadEncoded, objetoEncoded, valor, fechaFin, provActualEncoded, nitProv, esProrrogable, diasAdicionados, urlSecop) {
  const entidad = decodeURIComponent(entidadEncoded);
  const objeto = decodeURIComponent(objetoEncoded);
  const proveedorActual = decodeURIComponent(provActualEncoded);

  try {
    const res = await fetch('/api/predictivo/seguimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idContrato,
        entidad,
        objeto,
        valorContrato: valor,
        fechaFin,
        proveedorActual,
        nitProveedor: nitProv,
        esProrrogable,
        diasAdicionados,
        urlSecop,
        notas: 'Guardado desde Radar Predictivo'
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast('⭐ Vencimiento agregado al radar de seguimiento');
    } else {
      showToast(`Error: ${json.error}`);
    }
  } catch (err) {
    showToast('Error de red al guardar seguimiento');
  }
}

// Modal de Vencimientos en Seguimiento
async function abrirModalPredWatchlist() {
  const modal = document.getElementById('predWatchlistModal');
  const body = document.getElementById('predWatchlistModalBody');
  if (!modal || !body) return;

  modal.classList.add('open');
  body.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--tech-cyan);">⏳ Cargando vencimientos en seguimiento...</div>`;

  try {
    const res = await fetch('/api/predictivo/seguimiento');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al listar seguimiento');

    const list = json.data || [];
    if (list.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-faint);">
          Aún no tienes vencimientos en seguimiento. Haz clic en "⭐ Seguir Vencimiento" en cualquier tarjeta para monitorear contratos por expirar.
        </div>
      `;
      return;
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
    list.forEach(c => {
      html += `
        <div style="background: var(--lacquer-deep); border: 1px solid var(--hairline); padding: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--champagne);">${c.entidad}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.3;">${c.objeto.slice(0, 100)}...</div>
            <div style="font-size: 0.72rem; color: var(--text-faint); margin-top: 4px;">
              Vence: <b style="color: var(--tech-cyan);">${c.fecha_fin.slice(0, 10)}</b> | Valor: <b style="color: var(--text-warm);">$ ${Math.round(c.valor_contrato).toLocaleString('es-CO')} COP</b> | Titular: ${c.proveedor_actual}
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button onclick="eliminarSeguimientoVencimiento('${c.id}')" class="btn-action" style="padding: 4px 8px; font-size: 0.72rem; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #f87171;">
              🗑️
            </button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--danger);">Error: ${err.message}</div>`;
  }
}

async function eliminarSeguimientoVencimiento(id) {
  try {
    const res = await fetch(`/api/predictivo/seguimiento/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success && json.deleted) {
      showToast('Vencimiento removido del radar');
      abrirModalPredWatchlist();
    }
  } catch (err) {
    showToast('Error al eliminar');
  }
}

// Event Listeners para Predictivo
document.getElementById('btnEjecutarPredictivo')?.addEventListener('click', () => ejecutarEscaneoPredictivo(true));
document.getElementById('btnVerSeguimientoVencimientos')?.addEventListener('click', abrirModalPredWatchlist);
document.getElementById('btnClosePredWatchlistModal')?.addEventListener('click', () => {
  document.getElementById('predWatchlistModal')?.classList.remove('open');
});

// ==================== MÓDULO 2 & 3: AUDITORÍA DE PLIEGOS (GAP ANALYSIS) Y GENERADOR DE DOCUMENTOS LICITATORIOS ====================

let currentAuditProcesoId = null;
let currentBidDocsData = null;
let currentActiveBidTab = 'form1';

// Abrir modal de auditoría de pliego desde el modal de detalle
document.getElementById('modalBtnAuditPliego')?.addEventListener('click', () => {
  if (!activeModalId) return;
  abrirModalAuditoriaPliego(activeModalId);
});

// Abrir modal de generación de oferta desde el modal de detalle
document.getElementById('modalBtnGenerateBidDocs')?.addEventListener('click', () => {
  if (!activeModalId) return;
  abrirModalGeneracionOferta(activeModalId);
});

function abrirModalAuditoriaPliego(procesoId) {
  const opp = oportunidades.find(o => o.id === procesoId);
  if (!opp) return;

  currentAuditProcesoId = procesoId;

  // Actualizar textos del header
  const refEl = document.getElementById('auditProcessRef');
  const metaEl = document.getElementById('auditProcessMeta');
  if (refEl) refEl.textContent = `Proceso: ${opp.referencia || opp.id} | ${opp.modalidad || 'Licitación'}`;
  if (metaEl) metaEl.textContent = `${opp.entidad} • Presupuesto Oficial: ${formatCOP(opp.precio_base)}`;

  // Poblar selector de proponentes
  const compSelect = document.getElementById('auditCompanySelect');
  if (compSelect) {
    if (userCompanies.length > 0) {
      compSelect.innerHTML = userCompanies.map(c => `
        <option value="${c.id}" ${c.es_propia ? 'selected' : ''}>
          ${c.razon_social} (NIT: ${c.nit})
        </option>
      `).join('');
    } else {
      compSelect.innerHTML = `<option value="">Empresa Evaluada por Defecto</option>`;
    }
  }

  // Abrir modal
  document.getElementById('pliegoAuditModal')?.classList.add('open');

  // Ejecutar auditoría
  const selectedEmpresaId = compSelect ? compSelect.value : null;
  ejecutarAuditoriaPliego(procesoId, selectedEmpresaId);
}

async function ejecutarAuditoriaPliego(procesoId, empresaId) {
  const badgeEl = document.getElementById('auditDecisionBadge');
  const scoreEl = document.getElementById('auditScoreText');
  const dictamenEl = document.getElementById('auditDictamenText');
  const tbodyEl = document.getElementById('auditMatrizTbody');
  const countEl = document.getElementById('auditMatrizCount');
  const docsEl = document.getElementById('auditSecopDocsContainer');

  if (badgeEl) {
    badgeEl.textContent = 'AUDITANDO PLIEGO...';
    badgeEl.style.background = '#eab308';
    badgeEl.style.color = '#000';
  }
  if (scoreEl) scoreEl.textContent = 'Score de Viabilidad: Calculando...';
  if (dictamenEl) dictamenEl.textContent = 'Extrayendo condiciones habilitantes del pliego, matrices financieras y experiencia RUP...';
  if (tbodyEl) tbodyEl.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 25px; color: var(--champagne);">⏳ Realizando cotejo normativo con Pliegos Tipo ANCP-CCE...</td></tr>';
  if (docsEl) docsEl.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-faint);">Consultando documentos oficiales en SECOP II...</span>';

  try {
    const res = await fetch('/api/pliego/auditar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procesoId, empresaId })
    });
    const json = await res.json();

    if (!json.success || !json.data) {
      throw new Error(json.error || 'No se pudo obtener el análisis de pliego');
    }

    const { proceso, diagnostico, matrizBrechas, documentosOficialesSecop } = json.data;

    // 1. Dictamen Go / No-Go
    if (badgeEl) {
      badgeEl.textContent = diagnostico.decisionBadge;
      badgeEl.style.background = diagnostico.decisionColor;
      badgeEl.style.color = '#fff';
    }
    if (scoreEl) {
      scoreEl.textContent = `Score de Viabilidad: ${diagnostico.scoreViabilidad}%`;
    }
    if (dictamenEl) {
      dictamenEl.innerHTML = `<b>Dictamen Jurídico-Técnico:</b> ${diagnostico.dictamen}`;
    }

    // 2. Matriz Semáforo de Brechas
    if (countEl) {
      countEl.textContent = `${matrizBrechas.length} requisitos auditados (${diagnostico.cumpleCount} Cumple, ${diagnostico.subsanableCount} Subsanable, ${diagnostico.noCumpleCount} Brechas)`;
    }

    if (tbodyEl) {
      tbodyEl.innerHTML = matrizBrechas.map((r, idx) => {
        const bgRow = idx % 2 === 0 ? 'background: rgba(255, 255, 255, 0.02);' : '';
        return `
          <tr style="border-bottom: 1px solid var(--hairline); ${bgRow}">
            <td style="padding: 10px; font-weight: 700; color: var(--champagne); vertical-align: top;">
              ${r.requisito}
            </td>
            <td style="padding: 10px; color: var(--text-warm); vertical-align: top;">
              ${r.criterioExigido}
            </td>
            <td style="padding: 10px; color: var(--text-warm); font-weight: 600; vertical-align: top;">
              ${r.valorOferente}
            </td>
            <td style="padding: 10px; text-align: center; vertical-align: top;">
              <span style="background: ${r.color}; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: 800; font-size: 0.72rem; display: inline-block; min-width: 85px;">
                ${r.resultado}
              </span>
            </td>
            <td style="padding: 10px; vertical-align: top;">
              <div style="font-size: 0.73rem; color: var(--tech-cyan); font-weight: 600; margin-bottom: 2px;">
                ⚖️ ${r.sustentoLegal}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-faint); line-height: 1.35;">
                💡 ${r.observacion}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 3. Documentos Oficiales de SECOP II
    if (docsEl) {
      if (documentosOficialesSecop && documentosOficialesSecop.length > 0) {
        docsEl.innerHTML = documentosOficialesSecop.map(doc => `
          <a href="${doc.url || '#'}" target="_blank" class="btn-action" style="font-size: 0.74rem; padding: 4px 10px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--hairline); color: var(--champagne); text-decoration: none;">
            📄 ${doc.nombre || 'Documento Oficial'} ${doc.tamano ? `(${doc.tamano})` : ''}
          </a>
        `).join('');
      } else {
        docsEl.innerHTML = `
          <div style="font-size: 0.75rem; color: var(--text-faint); display: flex; align-items: center; gap: 6px;">
            <span>ℹ️ Pliegos y anexos disponibles para consulta directa en SECOP II.</span>
            <a href="${proceso.url || '#'}" target="_blank" style="color: var(--gold); text-decoration: underline;">Abrir Expediente Electrónico</a>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Error auditando pliego:', err);
    if (tbodyEl) tbodyEl.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--danger);">Error: ${err.message}</td></tr>`;
    showToast('Error al auditar pliego: ' + err.message);
  }
}

// Re-auditar al cambiar de empresa en el selector
document.getElementById('btnReauditProceso')?.addEventListener('click', () => {
  if (!currentAuditProcesoId) return;
  const compId = document.getElementById('auditCompanySelect')?.value;
  ejecutarAuditoriaPliego(currentAuditProcesoId, compId);
});

// Botón de auditoría -> Ir al generador de oferta
document.getElementById('btnAuditToBidDocs')?.addEventListener('click', () => {
  if (!currentAuditProcesoId) return;
  const compId = document.getElementById('auditCompanySelect')?.value;
  document.getElementById('pliegoAuditModal')?.classList.remove('open');
  abrirModalGeneracionOferta(currentAuditProcesoId, compId);
});

// Botón de auditoría -> Ir al simulador de consorcio
document.getElementById('btnAuditToConsortium')?.addEventListener('click', () => {
  document.getElementById('pliegoAuditModal')?.classList.remove('open');
  document.getElementById('detailModal')?.classList.remove('open');
  const navBtn = document.querySelector('.nav-item[data-target="view-consortium"]');
  if (navBtn) navBtn.click();
  showToast('🤝 Estructura tu Consorcio para subsanar los requisitos de pliego');
});

// Cerrar modal auditoría
document.getElementById('btnCloseAuditModal')?.addEventListener('click', () => {
  document.getElementById('pliegoAuditModal')?.classList.remove('open');
});
document.getElementById('btnCloseAuditModalBtn')?.addEventListener('click', () => {
  document.getElementById('pliegoAuditModal')?.classList.remove('open');
});
document.getElementById('pliegoAuditModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'pliegoAuditModal') {
    document.getElementById('pliegoAuditModal')?.classList.remove('open');
  }
});

// ==================== GENERADOR DE DOCUMENTOS LICITATORIOS (PASO 3) ====================

function abrirModalGeneracionOferta(procesoId, empresaId = null) {
  const opp = oportunidades.find(o => o.id === procesoId);
  if (!opp) return;

  const targetEmpresaId = empresaId || document.getElementById('auditCompanySelect')?.value || (userCompanies.find(c => c.es_propia) || userCompanies[0])?.id;
  const company = userCompanies.find(c => c.id == targetEmpresaId) || userCompanies[0];

  const refEl = document.getElementById('bidDocProcesoRef');
  const metaEl = document.getElementById('bidDocProcesoMeta');
  if (refEl) refEl.textContent = `Proceso: ${opp.referencia || opp.id} — ${opp.nombre || opp.objeto}`;
  if (metaEl) metaEl.textContent = `${opp.entidad} • Oferente: ${company ? company.razon_social : 'Proponente Registrado'}`;

  // Reset tab activo a Formulario 1
  switchBidTab('form1');

  // Abrir modal
  document.getElementById('bidDocsModal')?.classList.add('open');

  // Cargar documentos
  cargarDocumentosLicitatorios(procesoId, targetEmpresaId);
}

async function cargarDocumentosLicitatorios(procesoId, empresaId) {
  const previewContainer = document.getElementById('bidDocPreviewContainer');
  if (previewContainer) {
    previewContainer.innerHTML = '<div style="text-align: center; color: #64748b; padding: 40px;">⏳ Redactando formularios oficiales bajo Pliegos Tipo ANCP-CCE y Ley 2069/2020...</div>';
  }

  const banco = {
    nombre: document.getElementById('bidDocBancoNombre')?.value || 'Bancolombia S.A.',
    numero: document.getElementById('bidDocBancoNumero')?.value || '001-234567-89',
    tipo: 'Cuenta Corriente'
  };

  const contador = {
    nombre: document.getElementById('bidDocContadorNombre')?.value || 'Dora Inés Morales Gómez',
    tp: document.getElementById('bidDocContadorTp')?.value || 'TP-98765-T',
    cedula: '52.987.654'
  };

  try {
    const res = await fetch('/api/licitacion/generar-documentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procesoId, empresaId, banco, contador })
    });
    const json = await res.json();

    if (!json.success || !json.data) {
      throw new Error(json.error || 'No se pudieron generar los documentos licitatorios');
    }

    currentBidDocsData = {
      ...json.data,
      procesoId,
      empresaId
    };

    renderActiveBidDoc();
    showToast('✅ Formularios oficiales CCE listos para firma y radicación');
  } catch (err) {
    console.error('Error generando documentos licitatorios:', err);
    if (previewContainer) {
      previewContainer.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 30px;">Error generando documentos: ${err.message}</div>`;
    }
    showToast('Error al generar documentos: ' + err.message);
  }
}

function switchBidTab(tabName) {
  currentActiveBidTab = tabName;
  const btnF1 = document.getElementById('tabBtnForm1');
  const btnF2 = document.getElementById('tabBtnForm2');
  const btnMip = document.getElementById('tabBtnMipyme');

  const defaultStyle = 'font-size: 0.78rem; padding: 6px 12px; background: var(--lacquer-surface); border: 1px solid var(--hairline); color: var(--text-warm);';
  const activeStyle = 'font-size: 0.78rem; padding: 6px 12px; background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #93c5fd; font-weight: 700;';

  if (btnF1) btnF1.style.cssText = tabName === 'form1' ? activeStyle : defaultStyle;
  if (btnF2) btnF2.style.cssText = tabName === 'form2' ? activeStyle : defaultStyle;
  if (btnMip) btnMip.style.cssText = tabName === 'mipyme' ? activeStyle : defaultStyle;

  renderActiveBidDoc();
}

function renderActiveBidDoc() {
  const container = document.getElementById('bidDocPreviewContainer');
  if (!container || !currentBidDocsData) return;

  if (currentActiveBidTab === 'form1') {
    container.innerHTML = currentBidDocsData.formulario1Html;
  } else if (currentActiveBidTab === 'form2') {
    container.innerHTML = currentBidDocsData.formulario2Html;
  } else if (currentActiveBidTab === 'mipyme') {
    container.innerHTML = currentBidDocsData.mipymeHtml;
  }
}

// Tab listeners
document.getElementById('tabBtnForm1')?.addEventListener('click', () => switchBidTab('form1'));
document.getElementById('tabBtnForm2')?.addEventListener('click', () => switchBidTab('form2'));
document.getElementById('tabBtnMipyme')?.addEventListener('click', () => switchBidTab('mipyme'));

// Re-generar si el usuario edita datos bancarios o contador al presionar Enter o perder foco
['bidDocBancoNombre', 'bidDocBancoNumero', 'bidDocContadorNombre', 'bidDocContadorTp'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => {
    if (currentBidDocsData && currentBidDocsData.procesoId) {
      cargarDocumentosLicitatorios(currentBidDocsData.procesoId, currentBidDocsData.empresaId);
    }
  });
});

// Copiar documento activo al portapapeles
document.getElementById('btnCopyActiveDoc')?.addEventListener('click', () => {
  const container = document.getElementById('bidDocPreviewContainer');
  if (!container) return;
  const text = container.innerText || container.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 Texto del formulario copiado al portapapeles');
  }).catch(() => {
    showToast('No se pudo copiar automáticamente');
  });
});

// Descargar Paquete Completo PDF
document.getElementById('btnDownloadFullPdf')?.addEventListener('click', async () => {
  if (!currentBidDocsData) {
    showToast('Generando documentos previamente...');
    return;
  }

  const btn = document.getElementById('btnDownloadFullPdf');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '⏳ Compilando PDF...';

  try {
    const res = await fetch('/api/licitacion/descargar-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procesoId: currentBidDocsData.procesoId,
        empresaId: currentBidDocsData.empresaId
      })
    });

    if (!res.ok) throw new Error('Error en el servidor compilando PDF');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ref = (currentBidDocsData.proceso?.referencia || 'Oferta').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `Propuesta_${ref}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast('🎉 Paquete PDF oficial descargado exitosamente');
  } catch (err) {
    console.error('Error descargando PDF:', err);
    showToast('Error descargando PDF: ' + err.message);
  } finally {
    if (btn) btn.innerHTML = originalText;
  }
});

// Cerrar modal de documentos
document.getElementById('btnCloseBidDocsModal')?.addEventListener('click', () => {
  document.getElementById('bidDocsModal')?.classList.remove('open');
});
document.getElementById('btnCloseBidDocsModalBtn')?.addEventListener('click', () => {
  document.getElementById('bidDocsModal')?.classList.remove('open');
});
document.getElementById('bidDocsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'bidDocsModal') {
    document.getElementById('bidDocsModal')?.classList.remove('open');
  }
});

// ==================== MÓDULO 10: SIMULADOR DE 100 PUNTOS, DESEMPATES Y OBSERVACIONES AL PLIEGO ====================

let currentScoringProcesoId = null;
let currentScoringData = null;
let currentObsProcesoId = null;
let currentObsDetectedList = [];

// 1. Conexión de botones desde detailModal
document.getElementById('modalBtnScoringStrategy')?.addEventListener('click', () => {
  if (!activeModalId) return;
  abrirModalScoring(activeModalId);
});

document.getElementById('modalBtnObservations')?.addEventListener('click', () => {
  if (!activeModalId) return;
  abrirModalObservaciones(activeModalId);
});

// Conexión de botones desde pliegoAuditModal
document.getElementById('btnAuditToScoring')?.addEventListener('click', () => {
  if (!currentAuditProcesoId) return;
  document.getElementById('pliegoAuditModal')?.classList.remove('open');
  abrirModalScoring(currentAuditProcesoId);
});

document.getElementById('btnAuditToObservations')?.addEventListener('click', () => {
  if (!currentAuditProcesoId) return;
  document.getElementById('pliegoAuditModal')?.classList.remove('open');
  abrirModalObservaciones(currentAuditProcesoId);
});

// ==================== SIMULADOR DE PONDERACIÓN (100 PUNTOS) ====================

function abrirModalScoring(procesoId) {
  const opp = oportunidades.find(o => o.id === procesoId);
  if (!opp) return;

  currentScoringProcesoId = procesoId;

  const refEl = document.getElementById('scoringProcesoRef');
  const metaEl = document.getElementById('scoringProcesoMeta');
  if (refEl) refEl.textContent = `Proceso: ${opp.referencia || opp.id} — ${opp.nombre || opp.objeto}`;
  if (metaEl) metaEl.textContent = `${opp.entidad} • Presupuesto Oficial: ${formatCOP(opp.precio_base)}`;

  // Valor por defecto de la oferta: 98% del presupuesto oficial
  const inputOferta = document.getElementById('scoringOfertaPrecio');
  if (inputOferta) {
    const po = parseFloat(opp.precio_base || 500000000);
    inputOferta.value = Math.round(po * 0.98);
  }

  // Abrir modal
  document.getElementById('scoringModal')?.classList.add('open');

  // Ejecutar primera simulación
  ejecutarSimulacionScoring();
}

async function ejecutarSimulacionScoring() {
  if (!currentScoringProcesoId) return;
  const opp = oportunidades.find(o => o.id === currentScoringProcesoId);
  const po = parseFloat(opp?.precio_base || 1000000000);

  const precioOferta = parseFloat(document.getElementById('scoringOfertaPrecio')?.value) || (po * 0.98);
  const acreditaIndustriaNacional = document.getElementById('scoringCheckIndNac')?.checked !== false;
  const acreditaPersonalDiscapacidad = !!document.getElementById('scoringCheckDiscapacidad')?.checked;
  const esEmpresaMujeres = !!document.getElementById('scoringCheckMujeres')?.checked;
  const calidadTecnicaPuntos = parseFloat(document.getElementById('scoringCalidadRange')?.value) || 15;

  const targetEmpresa = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = targetEmpresa?.id || null;

  try {
    const res = await fetch('/api/estrategia/puntaje/simular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procesoId: currentScoringProcesoId,
        empresaId,
        precioOferta,
        acreditaIndustriaNacional,
        esServicio: false,
        acreditaPersonalDiscapacidad,
        esEmpresaMujeres,
        calidadTecnicaPuntos,
        ponderacionConfig: { presupuestoOficial: po }
      })
    });

    const json = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Error al calcular ponderación');

    currentScoringData = json.data;
    renderResultadoScoring(json.data);
  } catch (err) {
    console.error('Error calculando scoring:', err);
    showToast('Error en cálculo de ponderación: ' + err.message);
  }
}

function renderResultadoScoring(data) {
  const { calificacion, desgloseCriterios, desempate } = data;

  const puntajeEl = document.getElementById('scoringPuntajeBig');
  const badgeEl = document.getElementById('scoringNivelBadge');
  if (puntajeEl) puntajeEl.textContent = calificacion.puntajeTotal;
  if (badgeEl) {
    badgeEl.textContent = calificacion.nivelBadge;
    badgeEl.style.background = calificacion.color;
  }

  // Desglose de Criterios
  const tbody = document.getElementById('scoringDesgloseTbody');
  if (tbody) {
    tbody.innerHTML = desgloseCriterios.map(c => `
      <tr style="border-bottom: 1px solid var(--hairline);">
        <td style="padding: 6px 0; color: var(--champagne); font-weight: 700;">${c.criterio}</td>
        <td style="padding: 6px 4px; color: var(--text-warm);">${c.detalle}</td>
        <td style="padding: 6px 0; text-align: right; font-weight: 800; color: var(--tech-cyan); white-space: nowrap;">
          ${c.puntosAsignados} / ${c.puntosMaximos} pts
        </td>
      </tr>
    `).join('');
  }

  // Árbol de Desempates
  const blindajeBadge = document.getElementById('scoringBlindajeBadge');
  const dictamenEl = document.getElementById('scoringDesempateDictamen');
  const stepsEl = document.getElementById('scoringDesempateSteps');

  if (blindajeBadge) blindajeBadge.textContent = `Blindaje ante Empates: ${desempate.blindajeDesempateScore}%`;
  if (dictamenEl) dictamenEl.textContent = desempate.diagnostico;

  if (stepsEl) {
    stepsEl.innerHTML = desempate.arbolDesempate.map(s => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; background: rgba(255,255,255,0.02); border-radius: 3px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="background: ${s.aplica ? '#10b981' : 'var(--hairline)'}; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 1px 6px; border-radius: 3px;">
            ${s.aplica ? 'APLICA' : 'NO APLICA'}
          </span>
          <span style="color: var(--text-warm);">Regla ${s.orden}: ${s.criterio}</span>
        </div>
        <span style="font-size: 0.68rem; color: var(--text-faint);">${s.fundamento}</span>
      </div>
    `).join('');
  }
}

// Event Listeners Scoring
document.getElementById('scoringCalidadRange')?.addEventListener('input', (e) => {
  const lbl = document.getElementById('scoringCalidadLabel');
  if (lbl) lbl.textContent = `${e.target.value} pts`;
});

document.getElementById('btnRecalcularScoring')?.addEventListener('click', ejecutarSimulacionScoring);

document.getElementById('btnGuardarEstrategiaScoring')?.addEventListener('click', async () => {
  if (!currentScoringData) return;
  try {
    const res = await fetch('/api/estrategia/puntaje/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proceso_id: currentScoringProcesoId,
        empresa_id: currentScoringData.oferente.id,
        puntaje_economico: currentScoringData.calificacion.puntajeEconomico,
        puntaje_industria_nacional: currentScoringData.calificacion.puntajeIndustriaNacional,
        puntaje_discapacidad: currentScoringData.calificacion.puntajeDiscapacidad,
        puntaje_mipyme_mujeres: currentScoringData.calificacion.puntajeMujeres,
        puntaje_calidad_tecnica: currentScoringData.calificacion.puntajeCalidad,
        puntaje_total: currentScoringData.calificacion.puntajeTotal,
        criterios_desempate: currentScoringData.desempate
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast('💾 Estrategia de ponderación guardada en base de datos');
    }
  } catch (err) {
    showToast('Error al guardar estrategia: ' + err.message);
  }
});

// Cerrar modal scoring
document.getElementById('btnCloseScoringModal')?.addEventListener('click', () => {
  document.getElementById('scoringModal')?.classList.remove('open');
});
document.getElementById('btnCloseScoringModalBtn')?.addEventListener('click', () => {
  document.getElementById('scoringModal')?.classList.remove('open');
});
document.getElementById('scoringModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'scoringModal') {
    document.getElementById('scoringModal')?.classList.remove('open');
  }
});

// ==================== OBSERVACIONES AL PLIEGO DE CONDICIONES ====================

async function abrirModalObservaciones(procesoId) {
  const opp = oportunidades.find(o => o.id === procesoId);
  if (!opp) return;

  currentObsProcesoId = procesoId;

  const refEl = document.getElementById('obsProcesoRef');
  const metaEl = document.getElementById('obsProcesoMeta');
  if (refEl) refEl.textContent = `Proceso: ${opp.referencia || opp.id} — ${opp.nombre || opp.objeto}`;
  if (metaEl) metaEl.textContent = `${opp.entidad} • Objeto Contractual`;

  // Abrir modal
  document.getElementById('observationsModal')?.classList.add('open');

  // Consultar cláusulas detectadas
  const selectEl = document.getElementById('obsClausulasSelect');
  if (selectEl) selectEl.innerHTML = '<option value="">Analizando requisitos y pliego...</option>';

  try {
    const res = await fetch('/api/pliego/observaciones/analizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procesoId })
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      currentObsDetectedList = json.data;
      if (selectEl) {
        selectEl.innerHTML = `
          <option value="">-- Selecciona una cláusula detectada para autocompletar --</option>
          ${json.data.map((c, idx) => `
            <option value="${idx}">⚡ [${c.tipo}] ${c.titulo}</option>
          `).join('')}
          <option value="CUSTOM">✏️ Redactar Observación Personalizada</option>
        `;
      }
      if (json.data.length > 0) {
        seleccionarClausulaObs(0);
      }
    }
  } catch (err) {
    console.error('Error analizando observaciones:', err);
    if (selectEl) selectEl.innerHTML = '<option value="CUSTOM">✏️ Redactar Observación Personalizada</option>';
  }
}

function seleccionarClausulaObs(index) {
  if (index === 'CUSTOM' || index === '' || !currentObsDetectedList[index]) {
    document.getElementById('obsInputTitulo').value = 'Observación al Pliego de Condiciones';
    document.getElementById('obsTextareaClausula').value = '';
    document.getElementById('obsTextareaArgumento').value = 'De conformidad con los principios de transparencia y selección objetiva (Ley 80/1993)...';
    document.getElementById('obsTextareaPeticion').value = 'Solicitamos respetuosamente modificar la exigencia observada.';
  } else {
    const item = currentObsDetectedList[index];
    document.getElementById('obsInputTitulo').value = item.titulo || '';
    document.getElementById('obsTextareaClausula').value = item.clausula || '';
    document.getElementById('obsTextareaArgumento').value = item.argumento || '';
    document.getElementById('obsTextareaPeticion').value = item.peticion || '';
  }
  actualizarPreviewObservacion();
}

document.getElementById('obsClausulasSelect')?.addEventListener('change', (e) => {
  seleccionarClausulaObs(e.target.value);
});

async function actualizarPreviewObservacion() {
  const container = document.getElementById('obsDocPreviewContainer');
  const titulo = document.getElementById('obsInputTitulo')?.value;
  const clausulaImpugnada = document.getElementById('obsTextareaClausula')?.value;
  const argumentoJuridico = document.getElementById('obsTextareaArgumento')?.value;
  const peticionConcreta = document.getElementById('obsTextareaPeticion')?.value;

  const targetEmpresa = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = targetEmpresa?.id || null;

  try {
    const res = await fetch('/api/pliego/observaciones/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procesoId: currentObsProcesoId,
        empresaId,
        titulo,
        clausulaImpugnada,
        argumentoJuridico,
        peticionConcreta
      })
    });
    const json = await res.json();
    if (json.success && json.data?.documentoHtml) {
      if (container) container.innerHTML = json.data.documentoHtml;
    }
  } catch (err) {
    console.error('Error generando preview de observación:', err);
  }
}

// Regenerar preview al cambiar los textos
['obsInputTitulo', 'obsTextareaClausula', 'obsTextareaArgumento', 'obsTextareaPeticion'].forEach(id => {
  document.getElementById(id)?.addEventListener('blur', actualizarPreviewObservacion);
});

// Copiar texto del memorial
document.getElementById('btnCopyObsDoc')?.addEventListener('click', () => {
  const container = document.getElementById('obsDocPreviewContainer');
  if (!container) return;
  const text = container.innerText || container.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 Escrito formal copiado al portapapeles');
  }).catch(() => {
    showToast('No se pudo copiar');
  });
});

// Descargar Memorial en PDF
document.getElementById('btnDownloadObsPdf')?.addEventListener('click', async () => {
  const titulo = document.getElementById('obsInputTitulo')?.value || 'Observaciones';
  const clausulaImpugnada = document.getElementById('obsTextareaClausula')?.value;
  const argumentoJuridico = document.getElementById('obsTextareaArgumento')?.value;
  const peticionConcreta = document.getElementById('obsTextareaPeticion')?.value;

  const targetEmpresa = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = targetEmpresa?.id || null;

  const btn = document.getElementById('btnDownloadObsPdf');
  const orig = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '⏳ Generando PDF...';

  try {
    const res = await fetch('/api/pliego/observaciones/descargar-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procesoId: currentObsProcesoId,
        empresaId,
        titulo,
        clausulaImpugnada,
        argumentoJuridico,
        peticionConcreta
      })
    });

    if (!res.ok) throw new Error('Error compilando memorial PDF');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Observacion_${(currentObsProcesoId || 'Pliego').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast('⚖️ Memorial formal de observaciones descargado exitosamente');
  } catch (err) {
    showToast('Error al descargar PDF: ' + err.message);
  } finally {
    if (btn) btn.innerHTML = orig;
  }
});

// Guardar observación en base de datos
document.getElementById('btnGuardarObsDb')?.addEventListener('click', async () => {
  const titulo = document.getElementById('obsInputTitulo')?.value || 'Observación al Pliego';
  const clausulaImpugnada = document.getElementById('obsTextareaClausula')?.value;
  const argumentoJuridico = document.getElementById('obsTextareaArgumento')?.value;
  const peticionConcreta = document.getElementById('obsTextareaPeticion')?.value;
  const docHtml = document.getElementById('obsDocPreviewContainer')?.innerHTML || '';

  const targetEmpresa = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = targetEmpresa?.id || null;

  try {
    const res = await fetch('/api/pliego/observaciones/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procesoId: currentObsProcesoId,
        empresaId,
        tipoObservacion: 'BORRADOR',
        titulo,
        clausulaImpugnada,
        argumentoJuridico,
        peticionConcreta,
        documentoGenerado: docHtml
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast('💾 Observación guardada en el historial del proceso');
    }
  } catch (err) {
    showToast('Error guardando observación: ' + err.message);
  }
});

// Cerrar modal observaciones
document.getElementById('btnCloseObservationsModal')?.addEventListener('click', () => {
  document.getElementById('observationsModal')?.classList.remove('open');
});
document.getElementById('btnCloseObsModalBtn')?.addEventListener('click', () => {
  document.getElementById('observationsModal')?.classList.remove('open');
});
document.getElementById('observationsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'observationsModal') {
    document.getElementById('observationsModal')?.classList.remove('open');
  }
});

// ==================== MÓDULO 11: TRASLADO DEL INFORME DE EVALUACIÓN Y SUBSANACIONES CRUZADAS ====================

let currentEvalProcesoId = null;
let currentEvalCausalesList = [];
let currentEvalActiveTab = 'impugnar'; // 'impugnar', 'subsanar', 'historial'

// Abrir modal desde detailModal
document.getElementById('modalBtnEvaluationChallenge')?.addEventListener('click', () => {
  if (!activeModalId) return;
  abrirModalEvaluacion(activeModalId);
});

async function abrirModalEvaluacion(procesoId) {
  const opp = oportunidades.find(o => o.id === procesoId);
  if (!opp) return;

  currentEvalProcesoId = procesoId;

  const refEl = document.getElementById('evalProcesoRef');
  const metaEl = document.getElementById('evalProcesoMeta');
  if (refEl) refEl.textContent = `Proceso: ${opp.referencia || opp.id} — ${opp.nombre || opp.objeto}`;
  if (metaEl) metaEl.textContent = `${opp.entidad} • Término Legal de Traslado (Ley 1882/2018)`;

  // Abrir modal
  document.getElementById('evaluationChallengeModal')?.classList.add('open');

  // Cargar catálogo de causales legales si no existe
  if (currentEvalCausalesList.length === 0) {
    try {
      const res = await fetch('/api/evaluacion/causales-catalogo');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        currentEvalCausalesList = json.data;
      }
    } catch (err) {
      console.error('Error cargando catálogo de causales:', err);
    }
  }

  // Poblar selectores
  poblarSelectoresEvaluacion();

  // Reset tab a impugnar
  switchEvalTab('impugnar');
}

function poblarSelectoresEvaluacion() {
  const selectImpugnar = document.getElementById('evalCausalSelect');
  const selectSubsanar = document.getElementById('evalSubsanarCausalSelect');

  const impugnaciones = currentEvalCausalesList.filter(c => c.tipoAccion === 'IMPUGNACION_COMPETIDOR');
  const subsanaciones = currentEvalCausalesList.filter(c => c.tipoAccion === 'DEFENSA_SUBSANACION');

  if (selectImpugnar) {
    selectImpugnar.innerHTML = impugnaciones.map(c => `
      <option value="${c.codigo}">${c.causalRechazo ? '⛔ [RECHAZO OBLIGATORIO] ' : '📉 '}${c.titulo}</option>
    `).join('') + `<option value="CUSTOM">✏️ Causal de Rechazo Personalizada</option>`;
  }

  if (selectSubsanar) {
    selectSubsanar.innerHTML = subsanaciones.map(c => `
      <option value="${c.codigo}">🛡️ ${c.titulo}</option>
    `).join('') + `<option value="CUSTOM">✏️ Subsanación General Personalizada</option>`;
  }

  // Cargar datos de la primera causal en inputs
  seleccionarCausalImpugnar(impugnaciones[0]?.codigo);
  seleccionarCausalSubsanar(subsanaciones[0]?.codigo);
}

function switchEvalTab(tabName) {
  currentEvalActiveTab = tabName;

  const btnImpugnar = document.getElementById('tabEvalBtnImpugnar');
  const btnSubsanar = document.getElementById('tabEvalBtnSubsanar');
  const btnHistorial = document.getElementById('tabEvalBtnHistorial');

  const containerImpugnar = document.getElementById('evalTabContainerImpugnar');
  const containerSubsanar = document.getElementById('evalTabContainerSubsanar');
  const containerHistorial = document.getElementById('evalTabContainerHistorial');
  const previewWrapper = document.getElementById('evalPreviewWrapper');

  const defaultStyle = 'font-size: 0.78rem; padding: 6px 14px; background: var(--lacquer-surface); border: 1px solid var(--hairline); color: var(--text-warm);';
  const activeStyleImpugnar = 'font-size: 0.78rem; padding: 6px 14px; background: rgba(225, 29, 72, 0.2); border: 1px solid #e11d48; color: #fda4af; font-weight: 700;';
  const activeStyleSubsanar = 'font-size: 0.78rem; padding: 6px 14px; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #7dd3fc; font-weight: 700;';
  const activeStyleHistorial = 'font-size: 0.78rem; padding: 6px 14px; background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #d8b4fe; font-weight: 700;';

  if (btnImpugnar) btnImpugnar.style.cssText = tabName === 'impugnar' ? activeStyleImpugnar : defaultStyle;
  if (btnSubsanar) btnSubsanar.style.cssText = tabName === 'subsanar' ? activeStyleSubsanar : defaultStyle;
  if (btnHistorial) btnHistorial.style.cssText = tabName === 'historial' ? activeStyleHistorial : defaultStyle;

  if (containerImpugnar) containerImpugnar.style.display = tabName === 'impugnar' ? 'flex' : 'none';
  if (containerSubsanar) containerSubsanar.style.display = tabName === 'subsanar' ? 'flex' : 'none';
  if (containerHistorial) containerHistorial.style.display = tabName === 'historial' ? 'block' : 'none';

  if (previewWrapper) previewWrapper.style.display = tabName === 'historial' ? 'none' : 'block';

  if (tabName === 'historial') {
    cargarHistorialEvaluacion(currentEvalProcesoId);
  } else {
    actualizarPreviewEvaluacion();
  }
}

// Tab listeners
document.getElementById('tabEvalBtnImpugnar')?.addEventListener('click', () => switchEvalTab('impugnar'));
document.getElementById('tabEvalBtnSubsanar')?.addEventListener('click', () => switchEvalTab('subsanar'));
document.getElementById('tabEvalBtnHistorial')?.addEventListener('click', () => switchEvalTab('historial'));

function seleccionarCausalImpugnar(codigo) {
  const item = currentEvalCausalesList.find(c => c.codigo === codigo);
  if (!item || codigo === 'CUSTOM') {
    document.getElementById('evalHechosTextarea').value = '1. En la evaluación preliminar publicada por la entidad, se identificó la siguiente causal de descalificación...';
    document.getElementById('evalFundamentoTextarea').value = 'Conforme a los principios de selección objetiva e igualdad (Ley 80 de 1993 y Ley 1150 de 2007)...';
    document.getElementById('evalPeticionTextarea').value = 'Solicitamos rechazar la oferta del competidor.';
  } else {
    document.getElementById('evalHechosTextarea').value = `1. Constatada la propuesta radicada en SECOP II por el oferente objeto de impugnación, se evidenció que: ${item.resumen}\n2. Dicha situación vulnera de manera frontal los requisitos no subsanables de los pliegos de condiciones y de la ley de contratación pública.`;
    document.getElementById('evalFundamentoTextarea').value = item.argumentoEstandar;
    document.getElementById('evalPeticionTextarea').value = item.peticionEstandar;
  }
  actualizarPreviewEvaluacion();
}

function seleccionarCausalSubsanar(codigo) {
  const item = currentEvalCausalesList.find(c => c.codigo === codigo);
  if (!item || codigo === 'CUSTOM') {
    document.getElementById('evalSubsanarHechosTextarea').value = '1. En respuesta al requerimiento de subsanación formulado en el informe de evaluación...';
    document.getElementById('evalSubsanarFundamentoTextarea').value = 'El principio de prevalencia del derecho sustancial sobre el formal (Art. 228 C.P. y Ley 1882 de 2018)...';
    document.getElementById('evalSubsanarPeticionTextarea').value = 'Tener por subsanado el requerimiento y habilitar nuestra propuesta.';
  } else {
    document.getElementById('evalSubsanarHechosTextarea').value = `1. En el informe preliminar de evaluación se requirió la aclaración del siguiente componente: ${item.resumen}\n2. En los términos del artículo 5 de la Ley 1882 de 2018, procedemos a allegar la subsanación correspondiente sin modificar ni mejorar la oferta económica.`;
    document.getElementById('evalSubsanarFundamentoTextarea').value = item.argumentoEstandar;
    document.getElementById('evalSubsanarPeticionTextarea').value = item.peticionEstandar;
  }
  actualizarPreviewEvaluacion();
}

document.getElementById('evalCausalSelect')?.addEventListener('change', (e) => seleccionarCausalImpugnar(e.target.value));
document.getElementById('evalSubsanarCausalSelect')?.addEventListener('change', (e) => seleccionarCausalSubsanar(e.target.value));

async function actualizarPreviewEvaluacion() {
  const container = document.getElementById('evalDocPreviewContainer');
  if (!currentEvalProcesoId) return;

  const targetEmpresa = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = targetEmpresa?.id || null;

  let payload = {
    procesoId: currentEvalProcesoId,
    empresaId,
    tipoAccion: currentEvalActiveTab === 'impugnar' ? 'IMPUGNACION_COMPETIDOR' : 'DEFENSA_SUBSANACION'
  };

  if (currentEvalActiveTab === 'impugnar') {
    const causalCod = document.getElementById('evalCausalSelect')?.value;
    const causalItem = currentEvalCausalesList.find(c => c.codigo === causalCod);
    payload.competidor = {
      nombre: document.getElementById('evalCompetidorNombre')?.value || 'CONSORCIO COMPETIDOR',
      nit: document.getElementById('evalCompetidorNit')?.value || ''
    };
    payload.causalCodigo = causalCod;
    payload.titulo = causalItem?.titulo || 'Impugnación al Informe de Evaluación';
    payload.descripcionHechos = document.getElementById('evalHechosTextarea')?.value;
    payload.fundamentoJuridico = document.getElementById('evalFundamentoTextarea')?.value;
    payload.peticionConcreta = document.getElementById('evalPeticionTextarea')?.value;
  } else {
    const causalCod = document.getElementById('evalSubsanarCausalSelect')?.value;
    const causalItem = currentEvalCausalesList.find(c => c.codigo === causalCod);
    payload.competidor = null;
    payload.causalCodigo = causalCod;
    payload.titulo = causalItem?.titulo || 'Subsanación Documental';
    payload.descripcionHechos = document.getElementById('evalSubsanarHechosTextarea')?.value;
    payload.fundamentoJuridico = document.getElementById('evalSubsanarFundamentoTextarea')?.value;
    payload.peticionConcreta = document.getElementById('evalSubsanarPeticionTextarea')?.value;
  }

  try {
    const res = await fetch('/api/evaluacion/generar-memorial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success && json.data?.documentoHtml) {
      if (container) container.innerHTML = json.data.documentoHtml;
    }
  } catch (err) {
    console.error('Error generando preview de evaluación:', err);
  }
}

// Botón refrescar preview
document.getElementById('btnActualizarEvalPreview')?.addEventListener('click', actualizarPreviewEvaluacion);

// Event listeners de blur para auto-refrescar memorial
['evalCompetidorNombre', 'evalCompetidorNit', 'evalHechosTextarea', 'evalFundamentoTextarea', 'evalPeticionTextarea',
 'evalSubsanarHechosTextarea', 'evalSubsanarFundamentoTextarea', 'evalSubsanarPeticionTextarea'].forEach(id => {
  document.getElementById(id)?.addEventListener('blur', actualizarPreviewEvaluacion);
});

// Copiar memorial
document.getElementById('btnCopyEvalDoc')?.addEventListener('click', () => {
  const container = document.getElementById('evalDocPreviewContainer');
  if (!container) return;
  const text = container.innerText || container.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 Escrito formal copiado al portapapeles');
  }).catch(() => {
    showToast('No se pudo copiar');
  });
});

// Descargar memorial en PDF
document.getElementById('btnDownloadEvalPdf')?.addEventListener('click', async () => {
  const btn = document.getElementById('btnDownloadEvalPdf');
  const orig = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '⏳ Compilando PDF...';

  const targetEmpresa = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = targetEmpresa?.id || null;
  const esImpugnacion = currentEvalActiveTab === 'impugnar';

  const payload = {
    procesoId: currentEvalProcesoId,
    empresaId,
    tipoAccion: esImpugnacion ? 'IMPUGNACION_COMPETIDOR' : 'DEFENSA_SUBSANACION'
  };

  if (esImpugnacion) {
    const causalCod = document.getElementById('evalCausalSelect')?.value;
    const causalItem = currentEvalCausalesList.find(c => c.codigo === causalCod);
    payload.competidor = {
      nombre: document.getElementById('evalCompetidorNombre')?.value || 'CONSORCIO COMPETIDOR',
      nit: document.getElementById('evalCompetidorNit')?.value || ''
    };
    payload.titulo = causalItem?.titulo || 'Impugnación de Competidor';
    payload.descripcionHechos = document.getElementById('evalHechosTextarea')?.value;
    payload.fundamentoJuridico = document.getElementById('evalFundamentoTextarea')?.value;
    payload.peticionConcreta = document.getElementById('evalPeticionTextarea')?.value;
  } else {
    const causalCod = document.getElementById('evalSubsanarCausalSelect')?.value;
    const causalItem = currentEvalCausalesList.find(c => c.codigo === causalCod);
    payload.competidor = null;
    payload.titulo = causalItem?.titulo || 'Subsanación Documental';
    payload.descripcionHechos = document.getElementById('evalSubsanarHechosTextarea')?.value;
    payload.fundamentoJuridico = document.getElementById('evalSubsanarFundamentoTextarea')?.value;
    payload.peticionConcreta = document.getElementById('evalSubsanarPeticionTextarea')?.value;
  }

  try {
    const res = await fetch('/api/evaluacion/descargar-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Error al compilar PDF');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = esImpugnacion ? 'Impugnacion' : 'Subsanacion';
    a.download = `${prefix}_${(currentEvalProcesoId || 'Evaluacion').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast(`⚖️ Memorial de ${prefix} descargado exitosamente`);
  } catch (err) {
    showToast('Error al descargar PDF: ' + err.message);
  } finally {
    if (btn) btn.innerHTML = orig;
  }
});

// Guardar en base de datos
document.getElementById('btnGuardarEvalDb')?.addEventListener('click', async () => {
  const targetEmpresa = userCompanies.find(c => c.es_propia) || userCompanies[0];
  const empresaId = targetEmpresa?.id || null;
  const esImpugnacion = currentEvalActiveTab === 'impugnar';
  const docHtml = document.getElementById('evalDocPreviewContainer')?.innerHTML || '';

  let payload = {
    procesoId: currentEvalProcesoId,
    empresaId,
    tipoAccion: esImpugnacion ? 'IMPUGNACION_COMPETIDOR' : 'DEFENSA_SUBSANACION',
    documentoGenerado: docHtml
  };

  if (esImpugnacion) {
    const causalCod = document.getElementById('evalCausalSelect')?.value;
    const causalItem = currentEvalCausalesList.find(c => c.codigo === causalCod);
    payload.competidorNombre = document.getElementById('evalCompetidorNombre')?.value || 'CONSORCIO COMPETIDOR';
    payload.competidorNit = document.getElementById('evalCompetidorNit')?.value || '';
    payload.causalCodigo = causalCod;
    payload.titulo = causalItem?.titulo || 'Impugnación';
    payload.descripcionHechos = document.getElementById('evalHechosTextarea')?.value;
    payload.fundamentoJuridico = document.getElementById('evalFundamentoTextarea')?.value;
    payload.peticionConcreta = document.getElementById('evalPeticionTextarea')?.value;
  } else {
    const causalCod = document.getElementById('evalSubsanarCausalSelect')?.value;
    const causalItem = currentEvalCausalesList.find(c => c.codigo === causalCod);
    payload.competidorNombre = null;
    payload.competidorNit = null;
    payload.causalCodigo = causalCod;
    payload.titulo = causalItem?.titulo || 'Subsanación';
    payload.descripcionHechos = document.getElementById('evalSubsanarHechosTextarea')?.value;
    payload.fundamentoJuridico = document.getElementById('evalSubsanarFundamentoTextarea')?.value;
    payload.peticionConcreta = document.getElementById('evalSubsanarPeticionTextarea')?.value;
  }

  try {
    const res = await fetch('/api/evaluacion/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast('💾 Memorial guardado en el expediente de evaluación');
    }
  } catch (err) {
    showToast('Error al guardar memorial: ' + err.message);
  }
});

async function cargarHistorialEvaluacion(procesoId) {
  const tbody = document.getElementById('evalHistorialTbody');
  if (!tbody || !procesoId) return;

  try {
    const res = await fetch(`/api/evaluacion/historial/${encodeURIComponent(procesoId)}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      tbody.innerHTML = json.data.map(m => {
        const esImpug = m.tipo_accion === 'IMPUGNACION_COMPETIDOR';
        return `
          <tr style="border-bottom: 1px solid var(--hairline);">
            <td style="padding: 8px;">
              <span style="background: ${esImpug ? '#e11d48' : '#0284c7'}; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: 700; font-size: 0.68rem;">
                ${esImpug ? '⚔️ IMPUGNACIÓN' : '🛡️ SUBSANACIÓN'}
              </span>
            </td>
            <td style="padding: 8px; color: var(--champagne); font-weight: 600;">${m.titulo}</td>
            <td style="padding: 8px; color: var(--text-warm);">${m.competidor_nombre || 'Nuestra Empresa'}</td>
            <td style="padding: 8px; color: var(--text-faint);">${new Date(m.creado_en).toLocaleDateString('es-CO')}</td>
            <td style="padding: 8px; text-align: center;">
              <span style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; color: var(--text-warm);">
                ${m.estado}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 25px; color: var(--text-faint);">No se han radicado memoriales aún para este proceso.</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--danger);">Error cargando historial: ${err.message}</td></tr>`;
  }
}

// Cerrar modal
document.getElementById('btnCloseEvalChallengeModal')?.addEventListener('click', () => {
  document.getElementById('evaluationChallengeModal')?.classList.remove('open');
});
document.getElementById('btnCloseEvalChallengeModalBtn')?.addEventListener('click', () => {
  document.getElementById('evaluationChallengeModal')?.classList.remove('open');
});
document.getElementById('evaluationChallengeModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'evaluationChallengeModal') {
    document.getElementById('evaluationChallengeModal')?.classList.remove('open');
  }
});

// ==================== MÓDULO 12: TABLERO EJECUTIVO DE WIN RATE & ROI ANALYTICS ====================

let currentAnalyticsPeriodo = 'ALL';

// Sub-navegación dentro de Pipeline (Kanban vs Analytics)
document.getElementById('tabPipeKanbanBtn')?.addEventListener('click', () => {
  const kanbanWrapper = document.getElementById('pipelineKanbanViewWrapper');
  const analyticsContainer = document.getElementById('pipelineAnalyticsContainer');
  const btnK = document.getElementById('tabPipeKanbanBtn');
  const btnA = document.getElementById('tabPipeAnalyticsBtn');

  if (kanbanWrapper) kanbanWrapper.style.display = 'block';
  if (analyticsContainer) analyticsContainer.style.display = 'none';

  if (btnK) btnK.style.cssText = 'font-size: 0.8rem; padding: 6px 14px; background: rgba(0, 229, 255, 0.15); border: 1px solid var(--tech-cyan); color: var(--tech-cyan); font-weight: 700;';
  if (btnA) btnA.style.cssText = 'font-size: 0.8rem; padding: 6px 14px; background: var(--lacquer-surface); border: 1px solid var(--hairline); color: var(--text-warm);';
});

document.getElementById('tabPipeAnalyticsBtn')?.addEventListener('click', () => {
  const kanbanWrapper = document.getElementById('pipelineKanbanViewWrapper');
  const analyticsContainer = document.getElementById('pipelineAnalyticsContainer');
  const btnK = document.getElementById('tabPipeKanbanBtn');
  const btnA = document.getElementById('tabPipeAnalyticsBtn');

  if (kanbanWrapper) kanbanWrapper.style.display = 'none';
  if (analyticsContainer) analyticsContainer.style.display = 'flex';

  if (btnA) btnA.style.cssText = 'font-size: 0.8rem; padding: 6px 14px; background: rgba(0, 229, 255, 0.15); border: 1px solid var(--tech-cyan); color: var(--tech-cyan); font-weight: 700;';
  if (btnK) btnK.style.cssText = 'font-size: 0.8rem; padding: 6px 14px; background: var(--lacquer-surface); border: 1px solid var(--hairline); color: var(--text-warm);';

  cargarWinRateAnalytics();
});

// Filtros de período analytics
document.querySelectorAll('.btn-periodo-analytics').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn-periodo-analytics').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'var(--lacquer-surface)';
      b.style.borderColor = 'var(--hairline)';
      b.style.color = 'var(--text-warm)';
    });
    btn.classList.add('active');
    btn.style.background = 'rgba(0, 229, 255, 0.15)';
    btn.style.borderColor = 'var(--tech-cyan)';
    btn.style.color = 'var(--tech-cyan)';

    currentAnalyticsPeriodo = btn.dataset.periodo || 'ALL';
    cargarWinRateAnalytics(currentAnalyticsPeriodo);
  });
});

async function cargarWinRateAnalytics(periodo = currentAnalyticsPeriodo) {
  try {
    const res = await fetch(`/api/analytics/win-rate?periodo=${periodo}`);
    const json = await res.json();
    if (!json.success || !json.data) return;

    renderWinRateAnalytics(json.data);
  } catch (err) {
    console.error('Error cargando analytics de win rate:', err);
    showToast('Error cargando métricas ejecutivas: ' + err.message);
  }
}

function renderWinRateAnalytics(data) {
  const { kpis, funnel, segmentacionModalidad, segmentacionProponente, motivosPerdida, runRateProyeccion, recomendaciones } = data;

  // 1. KPIs
  const elOpp = document.getElementById('analyticsWinRateOpp');
  const elOppSub = document.getElementById('analyticsWinRateOppSub');
  const elFin = document.getElementById('analyticsWinRateFin');
  const elAdj = document.getElementById('analyticsMontoAdj');
  const elUtil = document.getElementById('analyticsUtilidadEst');
  const elRoi = document.getElementById('analyticsRoiNeto');
  const elCost = document.getElementById('analyticsCostosSub');

  if (elOpp) elOpp.textContent = `${kpis.winRateOportunidades}%`;
  if (elOppSub) elOppSub.textContent = `${kpis.adjudicados} ganados / ${kpis.adjudicados + kpis.perdidos} cerrados (${kpis.enCurso} en curso)`;
  if (elFin) elFin.textContent = `${kpis.winRateFinanciero}%`;
  if (elAdj) elAdj.textContent = formatCOP(kpis.montoAdjudicado);
  if (elUtil) elUtil.textContent = `Utilidad Operativa Est. (8%): ${formatCOP(kpis.utilidadOperativaEstimada)}`;
  if (elRoi) {
    elRoi.textContent = `${kpis.roiLicitatorioNeto > 0 ? '+' : ''}${kpis.roiLicitatorioNeto}% ROI`;
    elRoi.style.color = kpis.roiLicitatorioNeto >= 0 ? '#10b981' : '#ef4444';
  }
  if (elCost) elCost.textContent = `Costo est. estructuración: ${formatCOP(kpis.costoTotalEstructuracion)}`;

  // 2. Embudo Funnel
  const funnelContainer = document.getElementById('analyticsFunnelContainer');
  if (funnelContainer) {
    funnelContainer.innerHTML = funnel.map((f, idx) => `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--hairline); padding: 8px 12px; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; margin-bottom: 4px;">
          <span><b>${f.icono} Paso ${idx + 1}: ${f.etapa}</b> (${f.cantidad} procesos)</span>
          <span style="font-weight: 700; color: var(--champagne);">${formatCOP(f.volumenCOP)} <span style="color: var(--tech-cyan);">[${f.porcentajeRetencion}% retención]</span></span>
        </div>
        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;">
          <div style="width: ${Math.max(4, Math.min(100, f.porcentajeRetencion))}%; height: 100%; background: #38bdf8; border-radius: 3px; transition: width 0.5s ease;"></div>
        </div>
      </div>
    `).join('');
  }

  // 3. Segmentación por Modalidad
  const tbodyModalidades = document.getElementById('analyticsModalidadesTbody');
  if (tbodyModalidades) {
    if (segmentacionModalidad.length > 0) {
      tbodyModalidades.innerHTML = segmentacionModalidad.map(m => `
        <tr style="border-bottom: 1px solid var(--hairline);">
          <td style="padding: 6px 8px; color: var(--champagne); font-weight: 600;">${m.modalidad.replace(/_/g, ' ')}</td>
          <td style="padding: 6px 8px; text-align: center; color: var(--text-warm);">${m.total}</td>
          <td style="padding: 6px 8px; text-align: center; color: #10b981; font-weight: 700;">${m.adjudicados}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: ${m.winRate >= 30 ? '#10b981' : '#f59e0b'};">
            ${m.winRate}%
          </td>
        </tr>
      `).join('');
    } else {
      tbodyModalidades.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 15px; color: var(--text-faint);">Sin registros de modalidades en el período.</td></tr>';
    }
  }

  // 4. Segmentación por Tipo Proponente
  const propContainer = document.getElementById('analyticsProponenteContainer');
  if (propContainer) {
    propContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--hairline); border-radius: 4px;">
        <div>
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--champagne);">🏢 Oferta Individual</div>
          <div style="font-size: 0.72rem; color: var(--text-faint);">${segmentacionProponente.individual.total} licitaciones | ${segmentacionProponente.individual.adjudicados} ganadas</div>
        </div>
        <div style="font-size: 1.2rem; font-weight: 800; color: #38bdf8;">${segmentacionProponente.individual.winRate}%</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--hairline); border-radius: 4px;">
        <div>
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--champagne);">🤝 Estructura Plural (Consorcio / UT)</div>
          <div style="font-size: 0.72rem; color: var(--text-faint);">${segmentacionProponente.consorcio.total} licitaciones | ${segmentacionProponente.consorcio.adjudicados} ganadas</div>
        </div>
        <div style="font-size: 1.2rem; font-weight: 800; color: #a855f7;">${segmentacionProponente.consorcio.winRate}%</div>
      </div>
    `;
  }

  // 5. Motivos de Pérdida
  const motivosContainer = document.getElementById('analyticsMotivosContainer');
  if (motivosContainer) {
    motivosContainer.innerHTML = motivosPerdida.map(m => `
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; padding: 4px 6px; background: rgba(255,255,255,0.02); border-radius: 3px;">
        <span style="color: var(--text-warm);">${m.motivo.replace(/_/g, ' ')}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; color: var(--champagne);">${m.count}</span>
          <span style="font-size: 0.68rem; color: var(--text-faint); min-width: 35px; text-align: right;">${m.porcentaje}%</span>
        </div>
      </div>
    `).join('');
  }

  // 6. Proyecciones Run-Rate
  const runRateContainer = document.getElementById('analyticsRunRateContainer');
  if (runRateContainer) {
    runRateContainer.innerHTML = `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--hairline); padding: 8px; border-radius: 4px;">
        <div style="font-size: 0.68rem; color: var(--text-faint); text-transform: uppercase;">Horizonte 30 Días</div>
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--champagne); margin-top: 2px;">${formatCOP(runRateProyeccion.d30)}</div>
      </div>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--hairline); padding: 8px; border-radius: 4px;">
        <div style="font-size: 0.68rem; color: var(--text-faint); text-transform: uppercase;">Horizonte 60 Días</div>
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--champagne); margin-top: 2px;">${formatCOP(runRateProyeccion.d60)}</div>
      </div>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--hairline); padding: 8px; border-radius: 4px;">
        <div style="font-size: 0.68rem; color: var(--text-faint); text-transform: uppercase;">Horizonte 90 Días</div>
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--champagne); margin-top: 2px;">${formatCOP(runRateProyeccion.d90)}</div>
      </div>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--hairline); padding: 8px; border-radius: 4px;">
        <div style="font-size: 0.68rem; color: var(--text-faint); text-transform: uppercase;">Horizonte 180 Días</div>
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--tech-cyan); margin-top: 2px;">${formatCOP(runRateProyeccion.d180)}</div>
      </div>
    `;
  }

  // 7. Recomendaciones
  const recContainer = document.getElementById('analyticsRecomendacionesContainer');
  if (recContainer) {
    recContainer.innerHTML = recomendaciones.map(r => `
      <div style="display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; background: rgba(0,0,0,0.25); border-left: 2px solid ${r.tipo === 'POSITIVO' ? '#10b981' : r.tipo === 'ALERTA' ? '#f59e0b' : '#38bdf8'}; border-radius: 3px;">
        <div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--champagne);">${r.titulo}</div>
          <div style="font-size: 0.73rem; color: var(--text-warm); line-height: 1.35; margin-top: 2px;">${r.mensaje}</div>
        </div>
      </div>
    `).join('');
  }
}

// ==================== MÓDULO: MATRIZ DE RIESGOS CONTRACTUALES (ANCP-CCE) ====================

let currentRiskMatriz = null;
let currentRiskItems = [];
let currentRiskProcesoId = null;

// Abrir modal desde detailModal
document.getElementById('modalBtnRiskMatrix')?.addEventListener('click', () => {
  if (!activeModalId) return;
  abrirModalMatrizRiesgos(activeModalId);
});

async function abrirModalMatrizRiesgos(procesoId) {
  const opp = oportunidades.find(o => o.id === procesoId);
  if (!opp) return;

  currentRiskProcesoId = procesoId;

  const refEl = document.getElementById('riskProcesoRef');
  const metaEl = document.getElementById('riskProcesoMeta');
  if (refEl) refEl.textContent = `Proceso: ${opp.referencia || opp.id} — ${opp.nombre || opp.objeto}`;
  if (metaEl) {
    const valFmt = formatCOP(opp.valor_estimado || opp.cuantia || 0);
    metaEl.textContent = `${opp.entidad} • Modalidad: ${opp.modalidad || opp.tipo_proceso || 'Servicios'} • Cuantía: ${valFmt}`;
  }

  // Abrir modal
  document.getElementById('riskMatrixModal')?.classList.add('open');

  const tbody = document.getElementById('riskTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 25px; color: var(--text-faint);">Cargando y estructurando matriz de riesgos oficial ANCP-CCE...</td></tr>';
  }

  try {
    const targetEmpresa = userCompanies.find(c => c.es_propia) || userCompanies[0] || {
      nit: '901.458.912-3',
      razon_social: 'CONSORCIO / EMPRESA PROPONENTE S.A.S.'
    };

    const res = await fetch('/api/riesgos/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proceso: opp,
        oferente: targetEmpresa,
        tipoContrato: opp.modalidad || opp.tipo_proceso || 'Prestación de Servicios'
      })
    });

    const json = await res.json();
    if (json.success && json.matriz && Array.isArray(json.items)) {
      currentRiskMatriz = json.matriz;
      currentRiskItems = json.items;

      actualizarKpisRiesgos();
      renderRiskTable();

      const resumenEl = document.getElementById('riskResumenTextarea');
      if (resumenEl) {
        resumenEl.value = currentRiskMatriz.resumen_ejecutivo || '';
      }
    } else {
      if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 20px; color: var(--danger);">Error cargando riesgos: ${json.error || 'Respuesta inválida'}</td></tr>`;
    }
  } catch (err) {
    console.error('Error generando matriz de riesgos:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 20px; color: var(--danger);">Error de conexión: ${err.message}</td></tr>`;
  }
}

function calcularNivelRiesgoClient(probabilidad, impacto) {
  const p = Math.max(1, Math.min(5, parseInt(probabilidad, 10) || 1));
  const i = Math.max(1, Math.min(5, parseInt(impacto, 10) || 1));
  const calificacion = p * i;

  if (calificacion <= 4) {
    return { calificacion, categoria: 'BAJO', color: '#10b981', badgeBg: 'rgba(16, 185, 129, 0.2)' };
  } else if (calificacion <= 8) {
    return { calificacion, categoria: 'MEDIO', color: '#f59e0b', badgeBg: 'rgba(245, 158, 11, 0.2)' };
  } else if (calificacion <= 15) {
    return { calificacion, categoria: 'ALTO', color: '#f97316', badgeBg: 'rgba(249, 115, 22, 0.2)' };
  } else {
    return { calificacion, categoria: 'EXTREMO', color: '#ef4444', badgeBg: 'rgba(239, 68, 68, 0.2)' };
  }
}

function actualizarKpisRiesgos() {
  if (!currentRiskMatriz || !currentRiskItems) return;

  let ext = 0, alt = 0, med = 0, baj = 0;
  let contr = 0, ent = 0, comp = 0;

  currentRiskItems.forEach(it => {
    const calc = calcularNivelRiesgoClient(it.probabilidad, it.impacto);
    it.nivel_riesgo_calificacion = calc.calificacion;
    it.nivel_riesgo_categoria = calc.categoria;
    it.color = calc.color;
    it.badgeBg = calc.badgeBg;

    if (calc.categoria === 'EXTREMO') ext++;
    else if (calc.categoria === 'ALTO') alt++;
    else if (calc.categoria === 'MEDIO') med++;
    else baj++;

    if (it.a_quien_se_asigna === 'CONTRATISTA') contr++;
    else if (it.a_quien_se_asigna === 'ENTIDAD') ent++;
    else comp++;
  });

  currentRiskMatriz.total_riesgos = currentRiskItems.length;
  currentRiskMatriz.riesgos_extremos = ext;
  currentRiskMatriz.riesgos_altos = alt;
  currentRiskMatriz.riesgos_medios = med;
  currentRiskMatriz.riesgos_bajos = baj;
  currentRiskMatriz.distribucion_asignacion = {
    contratista: contr,
    entidad: ent,
    compartido: comp
  };

  const totalEl = document.getElementById('riskKpiTotal');
  const extEl = document.getElementById('riskKpiExtremos');
  const altEl = document.getElementById('riskKpiAltos');
  const medEl = document.getElementById('riskKpiMedios');
  const bajEl = document.getElementById('riskKpiBajos');
  const asigEl = document.getElementById('riskKpiAsignacion');

  if (totalEl) totalEl.textContent = currentRiskItems.length;
  if (extEl) extEl.textContent = ext;
  if (altEl) altEl.textContent = alt;
  if (medEl) medEl.textContent = med;
  if (bajEl) bajEl.textContent = baj;
  if (asigEl) asigEl.textContent = `${contr} / ${ent} / ${comp}`;
}

function renderRiskTable() {
  const tbody = document.getElementById('riskTableBody');
  if (!tbody) return;

  const filterEtapa = document.getElementById('riskFilterEtapa')?.value || 'ALL';
  const filterAsignado = document.getElementById('riskFilterAsignado')?.value || 'ALL';

  const itemsFiltrados = currentRiskItems.filter(it => {
    if (filterEtapa !== 'ALL' && it.etapa !== filterEtapa) return false;
    if (filterAsignado !== 'ALL' && it.a_quien_se_asigna !== filterAsignado) return false;
    return true;
  });

  if (itemsFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 25px; color: var(--text-faint);">No hay riesgos que coincidan con los filtros seleccionados.</td></tr>';
    return;
  }

  tbody.innerHTML = itemsFiltrados.map((it, idx) => {
    const realIdx = currentRiskItems.indexOf(it);
    const calc = calcularNivelRiesgoClient(it.probabilidad, it.impacto);

    return `
      <tr style="border-bottom: 1px solid var(--hairline); background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'};">
        <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: var(--champagne); font-size: 0.72rem;">${it.codigo_riesgo}</td>
        <td style="padding: 6px 8px; font-size: 0.72rem; color: var(--text-muted);">${it.etapa}</td>
        <td style="padding: 6px 8px; font-size: 0.72rem; color: var(--text-warm); font-weight: 600;">${it.tipo}</td>
        <td style="padding: 6px 8px; font-size: 0.72rem; max-width: 250px;">
          <div style="color: var(--text-primary); font-weight: 500; line-height: 1.3;">${it.descripcion_riesgo}</div>
          <div style="font-size: 0.68rem; color: var(--text-faint); margin-top: 2px;"><b>Efecto:</b> ${it.consecuencia_evento}</div>
        </td>
        <td style="padding: 6px 4px; text-align: center;">
          <select class="risk-prob-select" data-index="${realIdx}" style="padding: 2px 4px; font-size: 0.72rem; background: var(--lacquer-surface); border: 1px solid var(--hairline); color: var(--text-primary); border-radius: 3px;">
            <option value="1" ${it.probabilidad == 1 ? 'selected' : ''}>1</option>
            <option value="2" ${it.probabilidad == 2 ? 'selected' : ''}>2</option>
            <option value="3" ${it.probabilidad == 3 ? 'selected' : ''}>3</option>
            <option value="4" ${it.probabilidad == 4 ? 'selected' : ''}>4</option>
            <option value="5" ${it.probabilidad == 5 ? 'selected' : ''}>5</option>
          </select>
        </td>
        <td style="padding: 6px 4px; text-align: center;">
          <select class="risk-impacto-select" data-index="${realIdx}" style="padding: 2px 4px; font-size: 0.72rem; background: var(--lacquer-surface); border: 1px solid var(--hairline); color: var(--text-primary); border-radius: 3px;">
            <option value="1" ${it.impacto == 1 ? 'selected' : ''}>1</option>
            <option value="2" ${it.impacto == 2 ? 'selected' : ''}>2</option>
            <option value="3" ${it.impacto == 3 ? 'selected' : ''}>3</option>
            <option value="4" ${it.impacto == 4 ? 'selected' : ''}>4</option>
            <option value="5" ${it.impacto == 5 ? 'selected' : ''}>5</option>
          </select>
        </td>
        <td style="padding: 6px 8px; text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; font-size: 0.68rem; font-weight: 800; border-radius: 3px; background: ${calc.badgeBg}; color: ${calc.color}; border: 1px solid ${calc.color};">
            ${calc.calificacion} - ${calc.categoria}
          </span>
        </td>
        <td style="padding: 6px 4px; text-align: center;">
          <select class="risk-asignado-select" data-index="${realIdx}" style="padding: 2px 4px; font-size: 0.7rem; background: var(--lacquer-surface); border: 1px solid var(--hairline); color: var(--text-primary); border-radius: 3px;">
            <option value="CONTRATISTA" ${it.a_quien_se_asigna === 'CONTRATISTA' ? 'selected' : ''}>Contratista</option>
            <option value="ENTIDAD" ${it.a_quien_se_asigna === 'ENTIDAD' ? 'selected' : ''}>Entidad</option>
            <option value="COMPARTIDO" ${it.a_quien_se_asigna === 'COMPARTIDO' ? 'selected' : ''}>Compartido</option>
          </select>
        </td>
        <td style="padding: 6px 4px; text-align: center;">
          <select class="risk-tratamiento-select" data-index="${realIdx}" style="padding: 2px 4px; font-size: 0.7rem; background: var(--lacquer-surface); border: 1px solid var(--hairline); color: var(--text-primary); border-radius: 3px;">
            <option value="MITIGAR" ${it.tratamiento === 'MITIGAR' ? 'selected' : ''}>Mitigar</option>
            <option value="TRANSFERIR" ${it.tratamiento === 'TRANSFERIR' ? 'selected' : ''}>Transferir</option>
            <option value="EVITAR" ${it.tratamiento === 'EVITAR' ? 'selected' : ''}>Evitar</option>
            <option value="ACEPTAR" ${it.tratamiento === 'ACEPTAR' ? 'selected' : ''}>Aceptar</option>
          </select>
        </td>
        <td style="padding: 6px 8px; font-size: 0.7rem; max-width: 230px;">
          <div style="color: var(--text-warm); line-height: 1.25;">${it.acciones_mitigacion}</div>
          <div style="font-size: 0.65rem; color: #38bdf8; margin-top: 2px;">🛡️ <b>Mecanismo:</b> ${it.mecanismo_transferencia || 'Póliza de Cumplimiento'}</div>
        </td>
        <td style="padding: 6px 4px; text-align: center;">
          <button class="btn-delete-risk" data-index="${realIdx}" style="background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 0.8rem; padding: 2px 4px;" title="Eliminar riesgo">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  // Event Listeners dinámicos de inputs
  tbody.querySelectorAll('.risk-prob-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentRiskItems[idx].probabilidad = parseInt(e.target.value, 10);
      actualizarKpisRiesgos();
      renderRiskTable();
    });
  });

  tbody.querySelectorAll('.risk-impacto-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentRiskItems[idx].impacto = parseInt(e.target.value, 10);
      actualizarKpisRiesgos();
      renderRiskTable();
    });
  });

  tbody.querySelectorAll('.risk-asignado-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentRiskItems[idx].a_quien_se_asigna = e.target.value;
      actualizarKpisRiesgos();
    });
  });

  tbody.querySelectorAll('.risk-tratamiento-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentRiskItems[idx].tratamiento = e.target.value;
    });
  });

  tbody.querySelectorAll('.btn-delete-risk').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      currentRiskItems.splice(idx, 1);
      actualizarKpisRiesgos();
      renderRiskTable();
    });
  });
}

// Filtros de tabla
document.getElementById('riskFilterEtapa')?.addEventListener('change', renderRiskTable);
document.getElementById('riskFilterAsignado')?.addEventListener('change', renderRiskTable);

// Formulario nuevo riesgo
document.getElementById('btnOpenAddRiskItemForm')?.addEventListener('click', () => {
  const container = document.getElementById('riskNewItemContainer');
  if (container) {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  }
});

document.getElementById('btnCancelAddRisk')?.addEventListener('click', () => {
  const container = document.getElementById('riskNewItemContainer');
  if (container) container.style.display = 'none';
});

document.getElementById('btnConfirmAddRisk')?.addEventListener('click', () => {
  const codigo = document.getElementById('newRiskCodigo')?.value.trim() || `RSK-CUSTOM-${currentRiskItems.length + 1}`;
  const etapa = document.getElementById('newRiskEtapa')?.value || 'Ejecución';
  const tipo = document.getElementById('newRiskTipo')?.value || 'Operacional';
  const prob = parseInt(document.getElementById('newRiskProb')?.value || '2', 10);
  const impacto = parseInt(document.getElementById('newRiskImpacto')?.value || '3', 10);
  const asignado = document.getElementById('newRiskAsignado')?.value || 'CONTRATISTA';
  const desc = document.getElementById('newRiskDesc')?.value.trim();
  const consecuencia = document.getElementById('newRiskConsecuencia')?.value.trim();
  const mitigacion = document.getElementById('newRiskMitigacion')?.value.trim();
  const garantia = document.getElementById('newRiskGarantia')?.value.trim() || 'Póliza de Cumplimiento Decreto 1082/2015';
  const resp = document.getElementById('newRiskResp')?.value.trim() || 'Director de Proyecto';

  if (!desc) {
    alert('Por favor describe el evento del riesgo.');
    return;
  }

  const calc = calcularNivelRiesgoClient(prob, impacto);

  const nuevoItem = {
    codigo_riesgo: codigo,
    etapa,
    tipo,
    descripcion_riesgo: desc,
    consecuencia_evento: consecuencia || 'Afectación a la ejecución contractual.',
    probabilidad: prob,
    impacto: impacto,
    nivel_riesgo_calificacion: calc.calificacion,
    nivel_riesgo_categoria: calc.categoria,
    color: calc.color,
    badgeBg: calc.badgeBg,
    a_quien_se_asigna: asignado,
    tratamiento: 'MITIGAR',
    acciones_mitigacion: mitigacion || 'Monitoreo y plan de contingencia.',
    mecanismo_transferencia: garantia,
    periodicidad_monitoreo: 'Mensual',
    responsable_monitoreo: resp
  };

  currentRiskItems.unshift(nuevoItem);

  // Limpiar campos
  document.getElementById('newRiskCodigo').value = '';
  document.getElementById('newRiskDesc').value = '';
  document.getElementById('newRiskConsecuencia').value = '';
  document.getElementById('newRiskMitigacion').value = '';

  document.getElementById('riskNewItemContainer').style.display = 'none';

  actualizarKpisRiesgos();
  renderRiskTable();
});

// Guardar en Base de Datos PostgreSQL
document.getElementById('btnGuardarRiskDb')?.addEventListener('click', async () => {
  if (!currentRiskMatriz || currentRiskItems.length === 0) {
    alert('No hay matriz de riesgos activa para guardar.');
    return;
  }

  const btn = document.getElementById('btnGuardarRiskDb');
  const oldText = btn.innerHTML;
  btn.innerHTML = '⏳ Guardando...';
  btn.disabled = true;

  try {
    currentRiskMatriz.resumen_ejecutivo = document.getElementById('riskResumenTextarea')?.value || currentRiskMatriz.resumen_ejecutivo;

    const res = await fetch('/api/riesgos/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matriz: currentRiskMatriz,
        items: currentRiskItems
      })
    });

    const json = await res.json();
    if (json.success) {
      alert('✅ Matriz de Riesgos Contractuales guardada exitosamente en PostgreSQL.');
    } else {
      alert(`❌ Error al guardar: ${json.error}`);
    }
  } catch (err) {
    console.error('Error guardando matriz:', err);
    alert(`❌ Error de conexión: ${err.message}`);
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
});

// Copiar tabla / texto a portapapeles
document.getElementById('btnCopyRiskMatrix')?.addEventListener('click', () => {
  if (!currentRiskItems || currentRiskItems.length === 0) return;

  const header = "CÓDIGO\tETAPA\tTIPO\tDESCRIPCIÓN\tCONSECUENCIA\tPROBABILIDAD\tIMPACTO\tNIVEL\tCATEGORÍA\tASIGNADO A\tTRATAMIENTO\tMITIGACIÓN\tGARANTÍA\tRESPONSABLE\n";
  const rows = currentRiskItems.map(it => 
    `${it.codigo_riesgo}\t${it.etapa}\t${it.tipo}\t${it.descripcion_riesgo}\t${it.consecuencia_evento}\t${it.probabilidad}\t${it.impacto}\t${it.nivel_riesgo_calificacion}\t${it.nivel_riesgo_categoria}\t${it.a_quien_se_asigna}\t${it.tratamiento}\t${it.acciones_mitigacion}\t${it.mecanismo_transferencia || 'N/A'}\t${it.responsable_monitoreo || 'Director de Proyecto'}`
  ).join('\n');

  navigator.clipboard.writeText(header + rows)
    .then(() => alert('📋 Matriz de Riesgos copiada al portapapeles (compatible con Excel / SECOP II).'))
    .catch(() => alert('Error al copiar al portapapeles.'));
});

// Descargar PDF Oficial
document.getElementById('btnDownloadRiskPdf')?.addEventListener('click', async () => {
  if (!currentRiskMatriz || currentRiskItems.length === 0) {
    alert('No hay matriz de riesgos para descargar.');
    return;
  }

  const btn = document.getElementById('btnDownloadRiskPdf');
  const oldText = btn.innerHTML;
  btn.innerHTML = '⏳ Generando PDF CCE...';
  btn.disabled = true;

  try {
    currentRiskMatriz.resumen_ejecutivo = document.getElementById('riskResumenTextarea')?.value || currentRiskMatriz.resumen_ejecutivo;

    const res = await fetch('/api/riesgos/descargar-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matriz: currentRiskMatriz,
        items: currentRiskItems
      })
    });

    if (!res.ok) throw new Error('Error en el servidor al generar PDF');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matriz_Riesgos_CCE_${(currentRiskMatriz.numero_proceso || 'PROCESO').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error descargando PDF:', err);
    alert(`❌ Error descargando PDF: ${err.message}`);
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
});

// Cerrar modal
document.getElementById('btnCloseRiskMatrixModal')?.addEventListener('click', () => {
  document.getElementById('riskMatrixModal')?.classList.remove('open');
});
document.getElementById('btnCloseRiskMatrixModalBtn')?.addEventListener('click', () => {
  document.getElementById('riskMatrixModal')?.classList.remove('open');
});
document.getElementById('riskMatrixModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'riskMatrixModal') {
    document.getElementById('riskMatrixModal')?.classList.remove('open');
  }
});

// ==================== MÓDULO: ACUERDOS DE CONSTITUCIÓN PLURAL (FORMULARIO 3 CCE) ====================

let currentPluralProcesoId = null;
let currentPluralMembers = [];
let currentPluralAcuerdo = null;

// Abrir modal desde detailModal
document.getElementById('modalBtnPluralAgreement')?.addEventListener('click', () => {
  if (!activeModalId) return;
  abrirModalAcuerdoPlural(activeModalId);
});

async function abrirModalAcuerdoPlural(procesoId) {
  const opp = oportunidades.find(o => o.id === procesoId);
  if (!opp) return;

  currentPluralProcesoId = procesoId;

  const refEl = document.getElementById('pluralProcesoRef');
  const metaEl = document.getElementById('pluralProcesoMeta');
  if (refEl) refEl.textContent = `Proceso: ${opp.referencia || opp.id} — ${opp.nombre || opp.objeto}`;
  if (metaEl) {
    const valFmt = formatCOP(opp.valor_estimado || opp.cuantia || 0);
    metaEl.textContent = `${opp.entidad} • Valor Oficial: ${valFmt} • Pliegos Tipo ANCP-CCE`;
  }

  // Prellenar miembros por defecto con empresas registradas
  const lider = userCompanies.find(c => c.es_propia) || userCompanies[0] || {
    id: 1,
    razon_social: 'EMPRESA LÍDER DE INGENIERÍA S.A.S.',
    nit: '901.458.912-3',
    representante_legal: 'Carlos Andrés Mendoza',
    cedula_representante: '79.845.120',
    financiero: { indice_liquidez: 2.1, indice_endeudamiento: 48, cobertura_interes: 6.2, rentabilidad_patrimonio: 12.5, rentabilidad_activo: 9.1, patrimonio: 2500000000, activo_corriente: 1200000000, pasivo_corriente: 450000000 }
  };

  const aliado = userCompanies.find(c => c.id !== lider.id) || {
    id: 2,
    razon_social: 'SOCIEDAD ALIADA ESTRATÉGICA S.A.S.',
    nit: '900.789.456-1',
    representante_legal: 'Mariana Gómez Silva',
    cedula_representante: '52.341.980',
    financiero: { indice_liquidez: 1.8, indice_endeudamiento: 52, cobertura_interes: 4.8, rentabilidad_patrimonio: 10.2, rentabilidad_activo: 7.5, patrimonio: 1800000000, activo_corriente: 900000000, pasivo_corriente: 380000000 }
  };

  currentPluralMembers = [
    {
      empresa_id: lider.id,
      razon_social: lider.razon_social,
      nit: lider.nit,
      representante_legal: lider.representante_legal || 'Representante Legal Líder',
      cedula_representante: lider.cedula_representante || '79.845.120',
      porcentaje: 60,
      alcance_actividades: 'Dirección general, gestión contractual, aportes de experiencia habilitante principal y ejecución operativa mayoritaria.',
      indicadores_financieros: lider.financiero || {}
    },
    {
      empresa_id: aliado.id,
      razon_social: aliado.razon_social,
      nit: aliado.nit,
      representante_legal: aliado.representante_legal || 'Representante Legal Aliado',
      cedula_representante: aliado.cedula_representante || '52.341.980',
      porcentaje: 40,
      alcance_actividades: 'Aporte de capacidad financiera consolidada, suministro de insumos técnicos especializados y aseguramiento de calidad.',
      indicadores_financieros: aliado.financiero || {}
    }
  ];

  // Prellenar inputs de la estructura
  const cleanEntidad = (opp.entidad || 'CONSORCIO').replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase();
  const inputNombre = document.getElementById('pluralNombreEstructura');
  if (inputNombre) inputNombre.value = `UNION TEMPORAL ${cleanEntidad} ${new Date().getFullYear()}`;

  const inputRepNom = document.getElementById('pluralRepNombre');
  const inputRepCed = document.getElementById('pluralRepCedula');
  if (inputRepNom) inputRepNom.value = lider.representante_legal || 'Carlos Andrés Mendoza';
  if (inputRepCed) inputRepCed.value = lider.cedula_representante || '79.845.120';

  const inputSuplenteNom = document.getElementById('pluralRepSuplenteNombre');
  const inputSuplenteCed = document.getElementById('pluralRepSuplenteCedula');
  if (inputSuplenteNom) inputSuplenteNom.value = aliado.representante_legal || 'Mariana Gómez Silva';
  if (inputSuplenteCed) inputSuplenteCed.value = aliado.cedula_representante || '52.341.980';

  const inputMiembroFact = document.getElementById('pluralMiembroFact');
  if (inputMiembroFact) inputMiembroFact.value = lider.razon_social;

  // Abrir modal
  document.getElementById('pluralAgreementModal')?.classList.add('open');

  renderPluralMembers();
  generarYPrevisualizarAcuerdo();
}

function renderPluralMembers() {
  const container = document.getElementById('pluralMembersContainer');
  if (!container) return;

  const suma = currentPluralMembers.reduce((acc, it) => acc + (parseFloat(it.porcentaje) || 0), 0);
  const badge = document.getElementById('pluralSumaBadge');
  if (badge) {
    if (Math.abs(suma - 100) < 0.01) {
      badge.textContent = 'SUMA: 100% ✅';
      badge.style.background = 'rgba(16, 185, 129, 0.2)';
      badge.style.color = '#10b981';
      badge.style.borderColor = '#10b981';
    } else {
      badge.textContent = `SUMA: ${suma.toFixed(1)}% ❌ (Debe ser 100%)`;
      badge.style.background = 'rgba(239, 68, 68, 0.2)';
      badge.style.color = '#ef4444';
      badge.style.borderColor = '#ef4444';
    }
  }

  container.innerHTML = currentPluralMembers.map((m, idx) => `
    <div class="card-glass" style="background: var(--lacquer-surface); border: 1px solid var(--hairline); border-radius: 4px; padding: 10px; display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 800; font-size: 0.75rem; color: #38bdf8;">#${idx + 1}</span>
          <input type="text" class="plural-member-razon" data-index="${idx}" value="${m.razon_social}" placeholder="Razón Social" style="background: transparent; border: 1px solid var(--hairline); color: var(--champagne); font-weight: 700; font-size: 0.78rem; padding: 2px 6px; border-radius: 3px; min-width: 260px;">
          <input type="text" class="plural-member-nit" data-index="${idx}" value="${m.nit}" placeholder="NIT" style="background: transparent; border: 1px solid var(--hairline); color: var(--text-warm); font-size: 0.74rem; padding: 2px 6px; border-radius: 3px; width: 110px;">
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <label style="font-size: 0.7rem; color: var(--text-faint);">Participación:</label>
            <input type="number" class="plural-member-pct" data-index="${idx}" value="${m.porcentaje}" min="1" max="99" style="width: 55px; padding: 2px 4px; font-size: 0.78rem; font-weight: 800; text-align: center; background: var(--lacquer-deep); border: 1px solid var(--hairline); color: #38bdf8; border-radius: 3px;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--champagne);">%</span>
          </div>
          ${currentPluralMembers.length > 2 ? `
            <button class="btn-delete-plural-member" data-index="${idx}" style="background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 0.85rem;" title="Eliminar miembro">🗑️</button>
          ` : ''}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px;">
        <div style="display: flex; gap: 4px;">
          <input type="text" class="plural-member-rep" data-index="${idx}" value="${m.representante_legal}" placeholder="Rep. Legal" style="flex: 1; background: transparent; border: 1px solid var(--hairline); color: var(--text-primary); font-size: 0.72rem; padding: 2px 6px; border-radius: 3px;">
          <input type="text" class="plural-member-cedula" data-index="${idx}" value="${m.cedula_representante}" placeholder="C.C." style="width: 85px; background: transparent; border: 1px solid var(--hairline); color: var(--text-primary); font-size: 0.72rem; padding: 2px 6px; border-radius: 3px;">
        </div>
        <input type="text" class="plural-member-alcance" data-index="${idx}" value="${m.alcance_actividades}" placeholder="Actividades y compromisos de ejecución (crítico para UT)..." style="background: transparent; border: 1px solid var(--hairline); color: var(--text-primary); font-size: 0.72rem; padding: 2px 6px; border-radius: 3px;">
      </div>
    </div>
  `).join('');

  // Event Listeners dinámicos
  container.querySelectorAll('.plural-member-pct').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentPluralMembers[idx].porcentaje = parseFloat(e.target.value) || 0;
      renderPluralMembers();
      generarYPrevisualizarAcuerdo();
    });
  });

  container.querySelectorAll('.plural-member-razon').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentPluralMembers[idx].razon_social = e.target.value;
    });
  });

  container.querySelectorAll('.plural-member-nit').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentPluralMembers[idx].nit = e.target.value;
    });
  });

  container.querySelectorAll('.plural-member-rep').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentPluralMembers[idx].representante_legal = e.target.value;
    });
  });

  container.querySelectorAll('.plural-member-cedula').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentPluralMembers[idx].cedula_representante = e.target.value;
    });
  });

  container.querySelectorAll('.plural-member-alcance').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentPluralMembers[idx].alcance_actividades = e.target.value;
    });
  });

  container.querySelectorAll('.btn-delete-plural-member').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      currentPluralMembers.splice(idx, 1);
      renderPluralMembers();
      generarYPrevisualizarAcuerdo();
    });
  });

  recalcularIndicadoresPluralesClient();
}

function recalcularIndicadoresPluralesClient() {
  let liquidezPond = 0, endeudamientoPond = 0, rciPond = 0, roePond = 0, roaPond = 0, capitalConsolidado = 0;

  currentPluralMembers.forEach(m => {
    const p = (parseFloat(m.porcentaje) || 0) / 100;
    const fin = m.indicadores_financieros || {};
    liquidezPond += (parseFloat(fin.indice_liquidez || 1.8) * p);
    endeudamientoPond += (parseFloat(fin.indice_endeudamiento || 50) * p);
    rciPond += (parseFloat(fin.cobertura_interes || 5.0) * p);
    roePond += (parseFloat(fin.rentabilidad_patrimonio || 11.0) * p);
    roaPond += (parseFloat(fin.rentabilidad_activo || 8.0) * p);

    const actC = parseFloat(fin.activo_corriente || 800000000);
    const pasC = parseFloat(fin.pasivo_corriente || 300000000);
    capitalConsolidado += ((actC - pasC) * p);
  });

  const liqEl = document.getElementById('pluralPondLiquidez');
  const endEl = document.getElementById('pluralPondEndeuda');
  const rciEl = document.getElementById('pluralPondRci');
  const roeEl = document.getElementById('pluralPondRoe');
  const roaEl = document.getElementById('pluralPondRoa');
  const capEl = document.getElementById('pluralPondCapital');

  if (liqEl) liqEl.textContent = liquidezPond.toFixed(2);
  if (endEl) endEl.textContent = `${endeudamientoPond.toFixed(1)}%`;
  if (rciEl) rciEl.textContent = rciPond.toFixed(2);
  if (roeEl) roeEl.textContent = `${roePond.toFixed(1)}%`;
  if (roaEl) roaEl.textContent = `${roaPond.toFixed(1)}%`;
  if (capEl) capEl.textContent = formatCOP(capitalConsolidado);
}

async function generarYPrevisualizarAcuerdo() {
  const opp = oportunidades.find(o => o.id === currentPluralProcesoId);
  if (!opp) return;

  const previewContainer = document.getElementById('pluralDocPreviewContainer');
  if (previewContainer) {
    previewContainer.innerHTML = '<div style="text-align: center; color: #64748b; padding: 25px;">Generando minuta legal de acuerdo plural CCE...</div>';
  }

  const datosEstructura = {
    nombre_estructura: document.getElementById('pluralNombreEstructura')?.value || 'UNION TEMPORAL',
    tipo_estructura: document.getElementById('pluralTipoEstructura')?.value || 'UNION_TEMPORAL',
    duracion_meses: parseInt(document.getElementById('pluralDuracionMeses')?.value || '24', 10),
    domicilio_contractual: document.getElementById('pluralDomicilio')?.value || 'Bogotá D.C.',
    rep_legal_nombre: document.getElementById('pluralRepNombre')?.value || 'Representante Legal Principal',
    rep_legal_cedula: document.getElementById('pluralRepCedula')?.value || '79.845.120',
    rep_legal_ciudad_exp: document.getElementById('pluralRepCiudad')?.value || 'Bogotá D.C.',
    rep_suplente_nombre: document.getElementById('pluralRepSuplenteNombre')?.value || '',
    rep_suplente_cedula: document.getElementById('pluralRepSuplenteCedula')?.value || '',
    modalidad_facturacion: document.getElementById('pluralModalidadFact')?.value || 'NIT_PROPIO',
    miembro_facturador: document.getElementById('pluralMiembroFact')?.value || currentPluralMembers[0]?.razon_social,
    integrantes: currentPluralMembers
  };

  try {
    const res = await fetch('/api/plural/generar-formulario3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proceso: opp,
        datosEstructura
      })
    });

    const json = await res.json();
    if (json.success && json.acuerdo) {
      currentPluralAcuerdo = json.acuerdo;
      if (previewContainer) {
        previewContainer.innerHTML = json.acuerdo.documento_html;
      }
    } else {
      if (previewContainer) {
        previewContainer.innerHTML = `<div style="padding: 20px; color: #ef4444; font-family: sans-serif;"><b>Aviso:</b> ${json.error}</div>`;
      }
    }
  } catch (err) {
    console.error('Error generando acuerdo plural:', err);
    if (previewContainer) {
      previewContainer.innerHTML = `<div style="padding: 20px; color: #ef4444; font-family: sans-serif;">Error de comunicación: ${err.message}</div>`;
    }
  }
}

// Botón refrescar vista previa
document.getElementById('btnRefreshPluralPreview')?.addEventListener('click', generarYPrevisualizarAcuerdo);

// Botón añadir integrante
document.getElementById('btnAddPluralMember')?.addEventListener('click', () => {
  const newIdx = currentPluralMembers.length + 1;
  currentPluralMembers.push({
    empresa_id: 100 + newIdx,
    razon_social: `CONSORCIADO ALIADO ${newIdx} S.A.S.`,
    nit: `901.${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}-${Math.floor(1 + Math.random() * 9)}`,
    representante_legal: `Representante Legal Aliado ${newIdx}`,
    cedula_representante: `${Math.floor(10000000 + Math.random() * 89999999)}`,
    porcentaje: 0,
    alcance_actividades: 'Aportes operativos, técnicos y ejecución de actividades asignadas en el plan de trabajo.',
    indicadores_financieros: { indice_liquidez: 1.6, indice_endeudamiento: 45, cobertura_interes: 5.5, rentabilidad_patrimonio: 11, rentabilidad_activo: 8 }
  });

  renderPluralMembers();
});

// Guardar acuerdo en DB
document.getElementById('btnGuardarPluralDb')?.addEventListener('click', async () => {
  if (!currentPluralAcuerdo) {
    alert('Primero genera y cuadra la estructura plural.');
    return;
  }

  const btn = document.getElementById('btnGuardarPluralDb');
  const oldText = btn.innerHTML;
  btn.innerHTML = '⏳ Guardando...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/plural/guardar-formulario3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acuerdo: currentPluralAcuerdo })
    });

    const json = await res.json();
    if (json.success) {
      alert(`✅ Acuerdo de Constitución Plural guardado exitosamente en expediente PostgreSQL (ID: ${json.id}).`);
    } else {
      alert(`❌ Error al guardar: ${json.error}`);
    }
  } catch (err) {
    console.error('Error guardando acuerdo plural:', err);
    alert(`❌ Error de conexión: ${err.message}`);
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
});

// Copiar texto minuta
document.getElementById('btnCopyPluralDoc')?.addEventListener('click', () => {
  const preview = document.getElementById('pluralDocPreviewContainer');
  if (!preview) return;

  const plainText = preview.innerText;
  navigator.clipboard.writeText(plainText)
    .then(() => alert('📋 Minuta del Formulario 3 copiada al portapapeles (lista para Word / Notaría).'))
    .catch(() => alert('Error copiando texto al portapapeles.'));
});

// Descargar PDF oficial
document.getElementById('btnDownloadPluralPdf')?.addEventListener('click', async () => {
  if (!currentPluralAcuerdo) {
    alert('No hay acuerdo disponible para descargar.');
    return;
  }

  const btn = document.getElementById('btnDownloadPluralPdf');
  const oldText = btn.innerHTML;
  btn.innerHTML = '⏳ Generando PDF CCE...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/plural/descargar-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acuerdo: currentPluralAcuerdo })
    });

    if (!res.ok) throw new Error('Error en el servidor al generar PDF');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Formulario_3_Constitucion_${(currentPluralAcuerdo.nombre_estructura || 'ESTRUCTURA_PLURAL').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error descargando PDF:', err);
    alert(`❌ Error descargando PDF: ${err.message}`);
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
});

// Cerrar modal
document.getElementById('btnClosePluralAgreementModal')?.addEventListener('click', () => {
  document.getElementById('pluralAgreementModal')?.classList.remove('open');
});
document.getElementById('btnClosePluralAgreementModalBtn')?.addEventListener('click', () => {
  document.getElementById('pluralAgreementModal')?.classList.remove('open');
});
document.getElementById('pluralAgreementModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'pluralAgreementModal') {
    document.getElementById('pluralAgreementModal')?.classList.remove('open');
  }
});

// ==================== MÓDULO: AUDITORÍA PRE-FLIGHT Y CHECKLIST DE CIERRE (SECOP II) ====================

let currentPreflightProcesoId = null;
let currentPreflightAuditoria = null;
let currentPreflightUserAnswers = {};
let currentPreflightAreaFilter = 'ALL';

// Abrir modal desde detailModal
document.getElementById('modalBtnPreflightAudit')?.addEventListener('click', () => {
  if (!activeModalId) return;
  abrirModalPreflight(activeModalId);
});

async function abrirModalPreflight(procesoId) {
  const opp = oportunidades.find(o => o.id === procesoId);
  if (!opp) return;

  currentPreflightProcesoId = procesoId;
  currentPreflightUserAnswers = {};
  currentPreflightAreaFilter = 'ALL';

  const refEl = document.getElementById('preflightProcesoRef');
  const metaEl = document.getElementById('preflightProcesoMeta');
  if (refEl) refEl.textContent = `Proceso: ${opp.referencia || opp.id} — ${opp.nombre || opp.objeto}`;
  if (metaEl) {
    const valFmt = formatCOP(opp.valor_estimado || opp.cuantia || 0);
    metaEl.textContent = `${opp.entidad} • Valor Oficial: ${valFmt} • Auditoría Preventiva de Subsanabilidad`;
  }

  // Abrir modal
  document.getElementById('preflightAuditModal')?.classList.add('open');

  // Intentar cargar auditoría guardada previa
  try {
    const res = await fetch(`/api/preflight/${procesoId}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.auditoria) {
        currentPreflightAuditoria = json.auditoria;
        actualizarCockpitUI(json.auditoria);
        renderPreflightControls();
        return;
      }
    }
  } catch (err) {
    console.warn('Sin auditoría previa guardada, ejecutando auditoría fresca:', err);
  }

  // Si no hay previa, ejecutar evaluación automática fresca
  ejecutarAuditoriaPreflightClient();
}

async function ejecutarAuditoriaPreflightClient() {
  const opp = oportunidades.find(o => o.id === currentPreflightProcesoId);
  if (!opp) return;

  const targetEmpresa = userCompanies.find(c => c.es_propia) || userCompanies[0] || {
    nit: '901.458.912-3',
    razon_social: 'EMPRESA PROPONENTE S.A.S.'
  };

  try {
    const res = await fetch('/api/preflight/ejecutar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proceso: opp,
        oferente: targetEmpresa,
        respuestasUsuario: currentPreflightUserAnswers
      })
    });

    const json = await res.json();
    if (json.success && json.auditoria) {
      currentPreflightAuditoria = json.auditoria;
      actualizarCockpitUI(json.auditoria);
      renderPreflightControls();
    }
  } catch (err) {
    console.error('Error ejecutando preflight client:', err);
  }
}

function actualizarCockpitUI(auditoria) {
  const badgeEl = document.getElementById('preflightStatusBadge');
  const scoreEl = document.getElementById('preflightScoreText');
  const statsEl = document.getElementById('preflightStatsCounts');
  const diagEl = document.getElementById('preflightDiagnosticoText');
  const cockpitEl = document.getElementById('preflightCockpitBanner');

  if (scoreEl) scoreEl.textContent = `${auditoria.puntaje_cumplimiento}% CUMPLIMIENTO`;
  if (statsEl) {
    statsEl.textContent = `${auditoria.total_controles} Controles Totales • ${auditoria.controles_aprobados} Aprobados • ${auditoria.controles_advertencia} Advertencias • ${auditoria.controles_rechazo} Rechazos`;
  }
  if (diagEl) diagEl.textContent = auditoria.diagnostico_ejecutivo;

  if (badgeEl && cockpitEl) {
    if (auditoria.estado_global === 'APTO_PARA_RADICAR') {
      badgeEl.textContent = '🟢 APTO PARA RADICAR (GO)';
      badgeEl.style.background = '#10b981';
      cockpitEl.style.background = 'rgba(16, 185, 129, 0.1)';
      cockpitEl.style.borderColor = '#10b981';
      diagEl.style.borderLeftColor = '#10b981';
    } else if (auditoria.estado_global === 'RIESGO_RECHAZO') {
      badgeEl.textContent = '🔴 RIESGO DE RECHAZO (NO-GO)';
      badgeEl.style.background = '#ef4444';
      cockpitEl.style.background = 'rgba(239, 68, 68, 0.12)';
      cockpitEl.style.borderColor = '#ef4444';
      diagEl.style.borderLeftColor = '#ef4444';
    } else {
      badgeEl.textContent = '🟡 SUBSANACIÓN PENDIENTE';
      badgeEl.style.background = '#f59e0b';
      cockpitEl.style.background = 'rgba(245, 158, 11, 0.1)';
      cockpitEl.style.borderColor = '#f59e0b';
      diagEl.style.borderLeftColor = '#f59e0b';
    }
  }
}

function renderPreflightControls() {
  const container = document.getElementById('preflightControlsListContainer');
  if (!container || !currentPreflightAuditoria) return;

  const items = currentPreflightAuditoria.controles_items || [];
  const filtrados = items.filter(it => currentPreflightAreaFilter === 'ALL' || it.area === currentPreflightAreaFilter);

  if (filtrados.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-faint); padding: 25px;">No hay controles en esta área.</div>';
    return;
  }

  container.innerHTML = filtrados.map(it => {
    const isAprobado = it.estado === 'APROBADO';
    const isAdvertencia = it.estado === 'ADVERTENCIA';
    const isRechazo = it.estado === 'RECHAZO';

    const cardBg = isRechazo ? 'rgba(239, 68, 68, 0.08)' : isAdvertencia ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)';
    const cardBorder = isRechazo ? '#ef4444' : isAdvertencia ? '#f59e0b' : 'var(--hairline)';

    return `
      <div class="card-glass" style="background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 4px; padding: 10px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-weight: 800; font-size: 0.72rem; color: var(--champagne);">${it.codigo}</span>
              <span class="badge" style="font-size: 0.65rem; padding: 1px 6px;">${it.area}</span>
              <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-primary);">${it.nombre}</span>
              <span style="font-size: 0.65rem; padding: 1px 6px; border-radius: 3px; font-weight: 700; ${it.tipoEfecto === 'CAUSAL_RECHAZO' ? 'background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid #ef4444;' : 'background: rgba(16,185,129,0.2); color: #6ee7b7; border: 1px solid #10b981;'}">
                ${it.tipoEfecto === 'CAUSAL_RECHAZO' ? '🔴 Causal de Rechazo de Plano' : '🟢 Subsanable Art. 5'}
              </span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-warm); margin-top: 3px; line-height: 1.35;">
              <b>Pregunta de Chequeo:</b> ${it.preguntaChequeo}
            </div>
            <div style="font-size: 0.66rem; color: var(--text-faint); margin-top: 2px;">
              <b>Fundamento Legal:</b> ${it.fundamentoLegal}
            </div>
          </div>

          <!-- Selector de Estado del Control -->
          <div style="display: flex; gap: 4px; align-items: center;">
            <button class="btn-ctrl-status ${isAprobado ? 'active' : ''}" data-codigo="${it.codigo}" data-status="APROBADO" style="padding: 3px 8px; font-size: 0.7rem; border-radius: 3px; border: 1px solid #10b981; background: ${isAprobado ? '#10b981' : 'transparent'}; color: ${isAprobado ? '#fff' : '#6ee7b7'}; cursor: pointer;">
              ✓ Cumple
            </button>
            <button class="btn-ctrl-status ${isAdvertencia ? 'active' : ''}" data-codigo="${it.codigo}" data-status="ADVERTENCIA" style="padding: 3px 8px; font-size: 0.7rem; border-radius: 3px; border: 1px solid #f59e0b; background: ${isAdvertencia ? '#f59e0b' : 'transparent'}; color: ${isAdvertencia ? '#000' : '#fde68a'}; cursor: pointer;">
              ⚠️ Subsanar
            </button>
            <button class="btn-ctrl-status ${isRechazo ? 'active' : ''}" data-codigo="${it.codigo}" data-status="RECHAZO" style="padding: 3px 8px; font-size: 0.7rem; border-radius: 3px; border: 1px solid #ef4444; background: ${isRechazo ? '#ef4444' : 'transparent'}; color: ${isRechazo ? '#fff' : '#fca5a5'}; cursor: pointer;">
              ✕ No Cumple
            </button>
          </div>
        </div>

        <div style="font-size: 0.7rem; color: ${isRechazo ? '#fca5a5' : isAdvertencia ? '#fde68a' : 'var(--text-muted)'}; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 3px;">
          <b>Diagnóstico de Control:</b> ${it.observacion}
        </div>
      </div>
    `;
  }).join('');

  // Event Listeners para botones de estado de controles
  container.querySelectorAll('.btn-ctrl-status').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const codigo = e.currentTarget.dataset.codigo;
      const status = e.currentTarget.dataset.status;
      currentPreflightUserAnswers[codigo] = status;
      ejecutarAuditoriaPreflightClient();
    });
  });
}

// Filtros por área
document.querySelectorAll('.preflight-tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.preflight-tab-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = 'var(--text-warm)';
    });
    e.currentTarget.classList.add('active');
    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
    e.currentTarget.style.color = 'var(--champagne)';

    currentPreflightAreaFilter = e.currentTarget.dataset.area;
    renderPreflightControls();
  });
});

// Botón marcar todos aprobados (All Clear)
document.getElementById('btnPreflightAllClear')?.addEventListener('click', () => {
  currentPreflightUserAnswers = {};
  ejecutarAuditoriaPreflightClient();
});

// Guardar auditoría en DB
document.getElementById('btnGuardarPreflightDb')?.addEventListener('click', async () => {
  if (!currentPreflightAuditoria) return;

  const btn = document.getElementById('btnGuardarPreflightDb');
  const oldText = btn.innerHTML;
  btn.innerHTML = '⏳ Guardando...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/preflight/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditoria: currentPreflightAuditoria })
    });

    const json = await res.json();
    if (json.success) {
      alert(`✅ Auditoría Pre-Flight guardada exitosamente en PostgreSQL (ID: ${json.id}).`);
    } else {
      alert(`❌ Error al guardar: ${json.error}`);
    }
  } catch (err) {
    console.error('Error guardando auditoría pre-flight:', err);
    alert(`❌ Error de conexión: ${err.message}`);
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
});

// Descargar certificado PDF oficial
document.getElementById('btnDownloadPreflightPdf')?.addEventListener('click', async () => {
  if (!currentPreflightAuditoria) {
    alert('No hay auditoría activa para exportar.');
    return;
  }

  const btn = document.getElementById('btnDownloadPreflightPdf');
  const oldText = btn.innerHTML;
  btn.innerHTML = '⏳ Generando Certificado...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/preflight/descargar-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditoria: currentPreflightAuditoria })
    });

    if (!res.ok) throw new Error('Error al generar PDF en el servidor');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificado_PreFlight_SECOP_${(currentPreflightAuditoria.numero_proceso || 'PROCESO').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error descargando certificado pre-flight:', err);
    alert(`❌ Error descargando PDF: ${err.message}`);
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
});

// Cerrar modal
document.getElementById('btnClosePreflightModal')?.addEventListener('click', () => {
  document.getElementById('preflightAuditModal')?.classList.remove('open');
});
document.getElementById('btnClosePreflightModalBtn')?.addEventListener('click', () => {
  document.getElementById('preflightAuditModal')?.classList.remove('open');
});
document.getElementById('preflightAuditModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'preflightAuditModal') {
    document.getElementById('preflightAuditModal')?.classList.remove('open');
  }
});

// ==================== INICIALIZACIÓN ====================
window.addEventListener('DOMContentLoaded', () => {
  checkUserSession();
  const savedProfileBtn = document.querySelector(`.company-btn[data-profile="${currentProfile}"]`);
  if (savedProfileBtn) {
    document.querySelectorAll('.company-btn').forEach(b => b.classList.remove('active'));
    savedProfileBtn.classList.add('active');
  }
  updateBrandUI();
  renderFilterChips();
  loadStats();
  loadOportunidades();
  loadCompanies();
  loadPAAOpportunities();
  loadContracts();
  loadComplianceDashboard();
  loadPipeline();
});
