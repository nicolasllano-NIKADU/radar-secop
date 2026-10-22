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

// Filtros de mes para PAA
document.querySelectorAll('#paaMonthFilters .filter-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#paaMonthFilters .filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activePaaMonth = btn.dataset.month;
    loadPAAOpportunities();
  });
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
  loadCompanies();
  loadPAAOpportunities();
});
