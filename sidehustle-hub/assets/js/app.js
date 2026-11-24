/**
 * SideHustle Hub — Core Application JS
 * Handles: data fetching, rendering, filtering, search, sort, auto-update
 */

// ─── Database / State ─────────────────────────────────────────────────────────
let db = { hustles: [], meta: {} };
let filtered = [];
let activeCategory = 'All';
let activeDifficulty = 'All';
let activeSort = 'featured';
let searchQuery = '';
let updateInterval = null;

// ─── Fetch DB ─────────────────────────────────────────────────────────────────
async function loadDatabase() {
  try {
    const res = await fetch('../data/hustles.json');
    db = await res.json();
    filtered = [...db.hustles];
    renderAll();
    startAutoUpdate();
    updateTicker(`Database loaded — ${db.hustles.length} side hustles · Last updated: ${db.meta.lastUpdated}`);
  } catch (err) {
    // Fallback: try same-directory path (for pages/)
    try {
      const res2 = await fetch('./data/hustles.json');
      db = await res2.json();
      filtered = [...db.hustles];
      renderAll();
      startAutoUpdate();
      updateTicker(`Database loaded — ${db.hustles.length} side hustles · Last updated: ${db.meta.lastUpdated}`);
    } catch (e) {
      console.error('Failed to load database:', e);
    }
  }
}

// ─── Auto-Update Mechanism ────────────────────────────────────────────────────
function startAutoUpdate() {
  // Check for updates every 30 seconds (simulates live refresh)
  updateInterval = setInterval(async () => {
    try {
      const res = await fetch('../data/hustles.json?v=' + Date.now());
      const freshDb = await res.json();
      if (freshDb.meta.version !== db.meta.version) {
        db = freshDb;
        filtered = applyFilters([...db.hustles]);
        renderAll();
        updateTicker(`🔄 Database updated to v${db.meta.version} — ${db.hustles.length} side hustles`);
      }
    } catch (_) {}
  }, 30000);
}

function updateTicker(msg) {
  const el = document.getElementById('ticker-text');
  if (el) {
    el.textContent = msg;
    el.style.animation = 'none';
    requestAnimationFrame(() => { el.style.animation = ''; });
  }
}

// ─── Filtering & Sorting ──────────────────────────────────────────────────────
function applyFilters(hustles) {
  let result = hustles;

  if (activeCategory !== 'All') {
    result = result.filter(h => h.category === activeCategory);
  }
  if (activeDifficulty !== 'All') {
    result = result.filter(h => h.difficulty === activeDifficulty);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(h =>
      h.title.toLowerCase().includes(q) ||
      h.category.toLowerCase().includes(q) ||
      h.skills.some(s => s.toLowerCase().includes(q)) ||
      h.platforms.some(p => p.toLowerCase().includes(q))
    );
  }

  // Sort
  result = [...result].sort((a, b) => {
    switch (activeSort) {
      case 'revenue':     return b.scopeScore - a.scopeScore;
      case 'difficulty':  return a.difficultyScore - b.difficultyScore;
      case 'time':        return a.timeScore - b.timeScore;
      case 'featured':
      default:
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return b.scopeScore - a.scopeScore;
    }
  });

  return result;
}

function refresh() {
  filtered = applyFilters([...db.hustles]);
  renderGrid();
}

// ─── Render Grid ──────────────────────────────────────────────────────────────
function renderAll() {
  renderFilters();
  renderGrid();
  renderStats();
}

function renderStats() {
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('stat-count', db.hustles.length);
  setEl('stat-categories', [...new Set(db.hustles.map(h => h.category))].length);
  setEl('stat-avg-rev', '$2K+');
  setEl('stat-updated', db.meta.lastUpdated);
}

function renderFilters() {
  const catContainer = document.getElementById('cat-filters');
  const diffContainer = document.getElementById('diff-filters');
  if (!catContainer || !diffContainer) return;

  const categories = ['All', ...new Set(db.hustles.map(h => h.category))];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  catContainer.innerHTML = categories.map(c =>
    `<button class="filter-btn ${c === activeCategory ? 'active' : ''}"
      onclick="setCategoryFilter('${c}')">${c}</button>`
  ).join('');

  diffContainer.innerHTML = difficulties.map(d =>
    `<button class="filter-btn ${d === activeDifficulty ? 'active' : ''}"
      onclick="setDifficultyFilter('${d}')">${d}</button>`
  ).join('');
}

function renderGrid() {
  const grid = document.getElementById('hustles-grid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-results">
      <h3>No side hustles found</h3>
      <p>Try adjusting your filters or search query.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(h => createCard(h)).join('');
}

function createCard(h) {
  const diffClass = { Easy: 'diff-easy', Medium: 'diff-medium', Hard: 'diff-hard' }[h.difficulty] || '';
  const skillsHtml = h.skills.slice(0, 3).map(s => `<span class="skill-tag">${s}</span>`).join('');

  return `
  <div class="hustle-card" onclick="goToPage('${h.id}')">
    ${h.featured ? '<span class="featured-badge">★ Featured</span>' : ''}
    <div class="card-header">
      <div class="card-badge">${h.badge}</div>
      <div>
        <div class="card-title">${h.title}</div>
        <div class="card-category">${h.category}</div>
      </div>
    </div>

    <div class="card-meta">
      <span class="meta-chip ${diffClass}">
        ${difficultyIcon(h.difficulty)} ${h.difficulty}
      </span>
      <span class="meta-chip">⏱ ${h.timePerWeek}/wk</span>
      <span class="meta-chip">💸 ${h.startupCost}</span>
    </div>

    <div>
      <div class="card-revenue">${h.avgMonthlyRevenue}</div>
      <div class="card-revenue-label">avg. monthly revenue</div>
    </div>

    <div class="card-skills">${skillsHtml}</div>

    <div class="card-cta">View Full Guide →</div>
  </div>`;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function goToPage(id) {
  window.location.href = `pages/${id}.html`;
}

// ─── Filter Handlers ──────────────────────────────────────────────────────────
function setCategoryFilter(cat) {
  activeCategory = cat;
  renderFilters();
  refresh();
}

function setDifficultyFilter(diff) {
  activeDifficulty = diff;
  renderFilters();
  refresh();
}

function setSort(val) {
  activeSort = val;
  refresh();
}

function handleSearch(e) {
  searchQuery = e.target.value.trim();
  refresh();
}

// ─── Detail Page ──────────────────────────────────────────────────────────────
async function loadDetailPage(hustle_id) {
  await loadDatabaseDirect();
  const h = db.hustles.find(x => x.id === hustle_id);
  if (!h) { document.getElementById('detail-root').innerHTML = '<p>Hustle not found.</p>'; return; }
  renderDetailPage(h);
}

async function loadDatabaseDirect() {
  const paths = ['../data/hustles.json', './data/hustles.json'];
  for (const path of paths) {
    try {
      const res = await fetch(path);
      db = await res.json();
      return;
    } catch (_) {}
  }
}

function renderDetailPage(h) {
  const root = document.getElementById('detail-root');
  if (!root) return;

  const scopePct = (h.scopeScore / 5) * 100;
  const diffColor = { Easy: 'var(--green)', Medium: 'var(--yellow)', Hard: 'var(--red)' }[h.difficulty];

  const roadmapItems = h.roadmap.map((step, i) =>
    `<li><span class="step-num">${i + 1}</span><span class="step-text">${step}</span></li>`
  ).join('');

  const toolPills = h.tools.map(t => `<span class="tool-pill">${t}</span>`).join('');
  const platformPills = h.platforms.map(p => `<span class="tool-pill">${p}</span>`).join('');
  const skillTags = h.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');

  const resourceItems = h.resources.map(r =>
    `<li><a href="${r.url}" target="_blank" rel="noopener">🔗 ${r.name}</a></li>`
  ).join('');

  const prosItems = h.pros.map(p => `<li><span>✓</span> ${p}</li>`).join('');
  const consItems = h.cons.map(c => `<li><span>✗</span> ${c}</li>`).join('');

  root.innerHTML = `
  <div class="detail-wrapper">
    <a href="../index.html" class="back-btn">← Back to All Hustles</a>

    <div class="detail-hero">
      <div class="detail-icon">${h.badge}</div>
      <div>
        <div class="card-category">${h.category}</div>
        <h1 class="detail-title">${h.title}</h1>
        <div class="detail-meta-row">
          <span class="detail-chip" style="color:${diffColor}">${difficultyIcon(h.difficulty)} ${h.difficulty}</span>
          <span class="detail-chip">⏱ ${h.timePerWeek}/week</span>
          <span class="detail-chip">💸 Startup: ${h.startupCost}</span>
          <span class="detail-chip text-green">💰 ${h.avgMonthlyRevenue}/mo</span>
          <span class="detail-chip">📈 Scope: ${h.scope}</span>
        </div>
      </div>
    </div>

    <!-- Scope Bar -->
    <div class="section-card" style="margin-bottom:20px">
      <div class="section-title">🎯 Revenue Potential Scope</div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="scope-bar" style="flex:1"><div class="scope-fill" style="width:${scopePct}%"></div></div>
        <span class="fw-700" style="color:var(--accent)">${h.scope}</span>
      </div>
      <div style="font-size:13px;color:var(--muted);margin-top:8px">Based on market size, scalability, and earning ceiling</div>
    </div>

    <!-- Revenue Model -->
    <div class="section-card" style="margin-bottom:20px">
      <div class="section-title">💼 Revenue Model</div>
      <div class="revenue-model-block">
        <h4>Primary Income</h4>
        <p>${h.revenueModel.primary}</p>
      </div>
      <div class="revenue-model-block">
        <h4>Secondary Income</h4>
        <p>${h.revenueModel.secondary}</p>
      </div>
      <div class="revenue-model-block">
        <h4>Upsells & Add-ons</h4>
        <p>${h.revenueModel.upsells.join(' · ')}</p>
      </div>
    </div>

    <!-- Roadmap -->
    <div class="section-card" style="margin-bottom:20px">
      <div class="section-title">🗺 Step-by-Step Roadmap</div>
      <ul class="roadmap-list">${roadmapItems}</ul>
    </div>

    <!-- Skills & Tools -->
    <div class="detail-grid">
      <div class="section-card">
        <div class="section-title">🛠 Skills Needed</div>
        <div class="card-skills" style="gap:8px">${skillTags}</div>
      </div>
      <div class="section-card">
        <div class="section-title">⚙ Tools & Software</div>
        <div class="tools-grid">${toolPills}</div>
      </div>
    </div>

    <!-- Platforms -->
    <div class="section-card" style="margin-bottom:20px">
      <div class="section-title">🌐 Platforms to Use</div>
      <div class="tools-grid">${platformPills}</div>
    </div>

    <!-- Pros & Cons -->
    <div class="section-card" style="margin-bottom:20px">
      <div class="section-title">⚖ Pros & Cons</div>
      <div class="pros-cons-grid">
        <div>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:10px">Advantages</div>
          <ul class="pros-list">${prosItems}</ul>
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--red);margin-bottom:10px">Challenges</div>
          <ul class="cons-list">${consItems}</ul>
        </div>
      </div>
    </div>

    <!-- Resources -->
    <div class="section-card" style="margin-bottom:20px">
      <div class="section-title">📖 Learning Resources</div>
      <ul class="resource-list">${resourceItems}</ul>
    </div>

    <div style="text-align:center;margin-top:40px">
      <a href="../index.html" class="btn-primary">← Explore More Side Hustles</a>
    </div>
  </div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function difficultyIcon(d) {
  return { Easy: '🟢', Medium: '🟡', Hard: '🔴' }[d] || '⚪';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'home') {
    loadDatabase();
  } else if (page === 'detail') {
    const id = document.body.dataset.hustle;
    loadDetailPage(id);
  }
});
