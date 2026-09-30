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

  const kwContainer = document.getElementById('modalKeywords');
  kwContainer.innerHTML = (item.palabras_clave_match || [])
    .map(kw => `<span class="kw-pill" style="font-size: 0.78rem; padding: 4px 10px;">${kw}</span>`)
    .join('');

  document.getElementById('detailModal').classList.add('open');
}

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

// ==================== INICIALIZACIÓN ====================
window.addEventListener('DOMContentLoaded', () => {
  const savedProfileBtn = document.querySelector(`.company-btn[data-profile="${currentProfile}"]`);
  if (savedProfileBtn) {
    document.querySelectorAll('.company-btn').forEach(b => b.classList.remove('active'));
    savedProfileBtn.classList.add('active');
  }
  updateBrandUI();
  renderFilterChips();
  loadStats();
  loadOportunidades();
});
