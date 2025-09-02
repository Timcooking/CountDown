// 数据结构
// Task: { id: string, title: string, due: number, detail?: string }

const STORAGE_KEY = 'countdown.tasks.v1';
const FOCUS_KEY = 'countdown.focusTaskId';
const BG_KEY = 'countdown.bg.v1'; // { mode: 'default' | 'flow-dark' | 'custom' | 'preset', dataUrl?: string, preset?: string }

// 工具
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function fmtRemain(ms) {
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const sec = Math.floor(abs / 1000) % 60;
  const min = Math.floor(abs / (60 * 1000)) % 60;
  const hr = Math.floor(abs / (3600 * 1000)) % 24;
  const day = Math.floor(abs / (24 * 3600 * 1000));
  const pad = (n) => String(n).padStart(2, '0');
  let s = day > 0 ? `${day}天 ${pad(hr)}:${pad(min)}:${pad(sec)}` : `${pad(hr)}:${pad(min)}:${pad(sec)}`;
  if (neg) s = '-' + s;
  return s;
}

function fmtDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

// 日期分组显示：分隔标题使用“YYYY年M月D日”（不补零）
function fmtDateDayHeader(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
}
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; // 本地年月日键
}

function toLocalDateTimeValue(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function parseLocalDateTimeValue(value) {
  // 解析 yyyy-MM-ddTHH:mm 为本地时间戳
  if (!value || typeof value !== 'string') return NaN;
  const [date, time] = value.split('T');
  if (!date || !time) return NaN;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return NaN;
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  return dt.getTime();
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveTasks(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

function loadFocusId() { return localStorage.getItem(FOCUS_KEY) || ''; }
function saveFocusId(id) { if (id) localStorage.setItem(FOCUS_KEY, id); else localStorage.removeItem(FOCUS_KEY); }

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// 状态
let state = { tasks: [], focusId: '' };

// DOM
const mainTitle = $('#mainTitle');
const mainTime = $('#mainTime');
const mainDue = $('#mainDue');
const toggleAddFormBtn = $('#toggleAddFormBtn');
const toggleBgFormBtn = $('#toggleBgFormBtn');
const form = $('#taskForm');
const titleInput = $('#titleInput');
const dueInput = $('#dueInput');
const detailInput = $('#detailInput');
const cancelAddBtn = $('#cancelAddBtn');
const taskListEl = $('#taskList');
const emptyStateEl = $('#emptyState');
// 背景设置 DOM
const heroEl = document.querySelector('.hero');
const heroImgEl = document.querySelector('.hero-img');
const heroVideoEl = document.querySelector('.hero-video');
const bgForm = $('#bgForm');
const bgModeInputs = () => Array.from(bgForm?.querySelectorAll('input[name="bgMode"]') || []);
// 生机模式不再需要子选项
const bgFileInput = $('#bgFile');

// 初始化
function init() {
  state.tasks = loadTasks();
  state.focusId = loadFocusId();
  sortTasks();
  renderAll();
  setInterval(tick, 1000);
  // 背景初始化
  initBackground();
}

function sortTasks() { state.tasks.sort((a, b) => a.due - b.due); }

function getNearestActiveTask(now = Date.now()) {
  if (state.tasks.length === 0) return null;
  const future = state.tasks.filter((t) => t.due >= now);
  if (future.length > 0) return future[0];
  // 全部过期则显示最早的（作为轮转的起点）
  return state.tasks[0];
}

function getMainTask() {
  if (state.focusId) return state.tasks.find((t) => t.id === state.focusId) || getNearestActiveTask();
  return getNearestActiveTask();
}

function tick() {
  updateMainView();
  updateListTimes();
}

function updateMainView() {
  const task = getMainTask();
  if (!task) {
    mainTitle.textContent = '距离 最近任务 还有';
    mainTime.textContent = '--:--:--';
    mainDue.textContent = '暂无任务';
  // 主区“返回最近”按钮已移除
    return;
  }
  const now = Date.now();
  const remain = task.due - now;
  mainTitle.textContent = `距离 ${task.title} 还有`;
  mainTime.textContent = fmtRemain(remain);
  mainDue.textContent = `截止：${fmtDate(task.due)}`;
  // 主区“返回最近”按钮已移除
}

function updateListTimes() {
  const now = Date.now();
  $$('.timeline-item').forEach((li) => {
    const ts = Number(li.getAttribute('data-due'));
    const title = li.querySelector('.task-title');
    const badge = li.querySelector('.countdown-badge');
    const expired = now > ts;
    if (badge) badge.textContent = fmtRemain(ts - now);
    if (title) title.classList.toggle('expired', expired);
  });
}

function renderAll() {
  taskListEl.innerHTML = '';
  if (state.tasks.length === 0) {
    emptyStateEl.hidden = false;
  } else {
    emptyStateEl.hidden = true;
    let lastKey = '';
    for (const t of state.tasks) {
      const k = dayKey(t.due);
      if (k !== lastKey) {
        const sep = document.createElement('li');
        sep.className = 'timeline-sep';
        sep.innerHTML = `
          <div class="t-line" aria-hidden="true"></div>
          <div class="date-label">${fmtDateDayHeader(t.due)}</div>
        `;
        taskListEl.appendChild(sep);
        lastKey = k;
      }
      const li = document.createElement('li');
      li.className = 'timeline-item';
      li.setAttribute('data-id', t.id);
      li.setAttribute('data-due', String(t.due));
      li.innerHTML = `
        <div class="t-line" aria-hidden="true"></div>
        <div class="timeline-dot" aria-hidden="true"></div>
        <div class="task-head">
          <p class="task-title serif">${escapeHtml(t.title)}</p>
        </div>
        <div class="task-body">
          ${t.detail ? `<div class="task-detail">${escapeHtml(t.detail)}</div>` : ''}
          <div class="task-due">截止：${fmtDate(t.due)}</div>
        </div>
        <div class="task-right">
          <span class="countdown-badge">--:--:--</span>
          <button class="icon-btn" data-action="focus" title="设为主倒计时">设为主</button>
          <button class="icon-btn" data-action="edit" title="编辑">编辑</button>
          <button class="icon-btn danger-btn" data-action="delete" title="删除">删除</button>
        </div>
      `;
      taskListEl.appendChild(li);
    }
  }
  updateMainView();
  updateListTimes();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 事件

toggleAddFormBtn.addEventListener('click', () => {
  const isOpen = form.classList.toggle('open');
  form.classList.toggle('collapsible', true);
  toggleAddFormBtn.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) {
    // 延迟以确保过渡运行时高度计算正确
    requestAnimationFrame(() => {
      dueInput.value = toLocalDateTimeValue(new Date());
      titleInput.focus();
    });
  }
});

cancelAddBtn.addEventListener('click', () => {
  form.classList.remove('open');
  toggleAddFormBtn.setAttribute('aria-expanded', 'false');
  form.hidden = false; // 使用折叠，不再用 hidden
  form.reset();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const dueStr = dueInput.value;
  const detail = (detailInput?.value || '').trim();
  if (!title || !dueStr) return;
  const due = parseLocalDateTimeValue(dueStr);
  if (!Number.isFinite(due)) {
    try {
      dueInput.setCustomValidity('请填写有效的时间');
      dueInput.reportValidity();
    } finally {
      setTimeout(() => dueInput.setCustomValidity(''), 1500);
    }
    return;
  }
  const task = { id: genId(), title, due, detail };
  state.tasks.push(task);
  sortTasks();
  saveTasks(state.tasks);
  form.reset();
  form.hidden = true;
  renderAll();
});

// 列表交互

taskListEl.addEventListener('click', (e) => {
  const li = e.target.closest('.timeline-item');
  if (!li) return;
  const id = li.getAttribute('data-id');
  const btn = e.target.closest('button');
  if (!btn) {
    if (id) {
      state.focusId = id;
      saveFocusId(id);
      updateMainView();
    }
    return;
  }
  const action = btn.getAttribute('data-action');
  if (action === 'focus') {
    state.focusId = id;
    saveFocusId(id);
    updateMainView();
  } else if (action === 'delete') {
    const idx = state.tasks.findIndex((t) => t.id === id);
    if (idx >= 0) {
      state.tasks.splice(idx, 1);
      if (state.focusId === id) {
        state.focusId = '';
        saveFocusId('');
      }
      saveTasks(state.tasks);
      renderAll();
    }
  } else if (action === 'edit') {
    openEditInline(li, id);
  }
});

// 已移除“返回最近”按钮

function openEditInline(li, id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  const head = li.querySelector('.task-head');
  const body = li.querySelector('.task-body');
  const titleEl = head?.querySelector('.task-title');
  const dueEl = body?.querySelector('.task-due');
  let detailEl = body?.querySelector('.task-detail');
  const right = li.querySelector('.task-right');

  const titleInputEl = document.createElement('input');
  titleInputEl.type = 'text';
  titleInputEl.value = t.title;
  titleInputEl.style.width = '100%';
  titleInputEl.className = 'serif';

  const dueInputEl = document.createElement('input');
  dueInputEl.type = 'datetime-local';
  dueInputEl.value = toLocalDateTimeValue(new Date(t.due));

  const detailInputEl = document.createElement('textarea');
  detailInputEl.rows = 2;
  detailInputEl.value = t.detail || '';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'icon-btn';
  saveBtn.textContent = '保存';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'icon-btn ghost-btn';
  cancelBtn.textContent = '取消';

  if (titleEl) titleEl.replaceWith(titleInputEl);
  // 顺序保持：标题(head) -> 详情(body) -> 截止(body)
  if (detailEl) {
    detailEl.replaceWith(detailInputEl);
  } else if (body && dueEl) {
    body.insertBefore(detailInputEl, dueEl);
  }
  if (dueEl) dueEl.replaceWith(dueInputEl);

  const oldRight = right.cloneNode(true);
  right.innerHTML = '';
  right.appendChild(saveBtn);
  right.appendChild(cancelBtn);

  const cleanup = () => { renderAll(); };

  cancelBtn.addEventListener('click', cleanup);
  saveBtn.addEventListener('click', () => {
    const newTitle = titleInputEl.value.trim();
    const newDueStr = dueInputEl.value;
    const newDue = parseLocalDateTimeValue(newDueStr);
    if (!newTitle || !Number.isFinite(newDue)) return;
    t.title = newTitle;
    t.due = newDue;
    t.detail = detailInputEl.value.trim();
    sortTasks();
    saveTasks(state.tasks);
    cleanup();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // 初始设置为折叠但可动画
  form.classList.add('collapsible');
  form.classList.remove('open');
  // 启动应用逻辑（修复倒计时不动）
  init();
  // 玻璃滑动交互
  if (heroEl) {
    heroEl.addEventListener('click', () => {
      heroEl.classList.toggle('glass-up');
    });
    window.addEventListener('resize', () => {
      heroEl.classList.remove('glass-up');
    });
  }
});

// 背景：存取与应用
function loadBg() {
  try { return JSON.parse(localStorage.getItem(BG_KEY) || 'null') || { mode: 'default' }; } catch { return { mode: 'default' }; }
}
function saveBg(cfg) { localStorage.setItem(BG_KEY, JSON.stringify(cfg)); }
function applyBackground(cfg) {
  if (!heroEl || !heroImgEl) return;
  heroEl.classList.toggle('flow-dark', cfg.mode === 'flow-dark');
  // 先清理所有状态
  heroEl.classList.remove('has-custom');
  heroEl.classList.remove('has-video');
  heroImgEl.style.backgroundImage = '';
  if (heroVideoEl) {
    heroVideoEl.removeAttribute('src');
    heroVideoEl.muted = true;
    heroVideoEl.autoplay = true;
    heroVideoEl.playsInline = true;
    heroVideoEl.load?.();
  }
  // 分支应用背景
  if (cfg.mode === 'custom' && cfg.dataUrl) {
    heroImgEl.style.backgroundImage = `url('${cfg.dataUrl}')`;
    heroEl.classList.add('has-custom');
  } else if (cfg.mode === 'preset' && cfg.preset) {
    const dataUrl = generatePresetPng(cfg.preset, 1600, 1000);
    heroImgEl.style.backgroundImage = `url('${dataUrl}')`;
    heroEl.classList.add('has-custom');
  } else if (cfg.mode === 'video') {
    heroEl.classList.add('has-video');
    if (heroVideoEl) {
      heroVideoEl.setAttribute('src', './assets/video1.mp4');
      try {
        heroVideoEl.load();
        const tryPlay = () => heroVideoEl.play?.().catch(() => {});
        if (heroVideoEl.readyState >= 2) {
          tryPlay();
        } else {
          heroVideoEl.oncanplay = () => { tryPlay(); heroVideoEl.oncanplay = null; };
        }
      } catch {}
    }
  }
  // 根据背景明暗切换文字颜色
  updateHeroDarkTheme(cfg);
}
function initBackground() {
  const cfg = loadBg();
  // 表单显示逻辑
  document.body.classList.toggle('bg-enabled', cfg.mode === 'custom');
  document.body.classList.toggle('bg-preset', cfg.mode === 'preset');
  document.body.classList.toggle('bg-flow', cfg.mode === 'flow-dark' || cfg.mode === 'default');
  // 设置单选框
  const radios = bgModeInputs();
  radios.forEach(r => { r.checked = (cfg.mode === 'video' ? r.value === 'preset' : r.value === cfg.mode); });
  if (bgFileInput) bgFileInput.value = '';
  applyBackground(cfg);
}

// 背景表单交互
toggleBgFormBtn?.addEventListener('click', () => {
  const isOpen = bgForm.classList.toggle('open');
  bgForm.classList.toggle('collapsible', true);
  toggleBgFormBtn.setAttribute('aria-expanded', String(isOpen));
  const mode = loadBg().mode || 'default';
  document.body.classList.toggle('bg-enabled', mode === 'custom');
  document.body.classList.toggle('bg-preset', mode === 'preset');
});

// 已移除主区“背景”按钮

bgForm?.addEventListener('change', async (e) => {
  const t = e.target;
  if (!t) return;
  if (t.name === 'bgMode') {
    const mode = t.value;
    document.body.classList.toggle('bg-enabled', mode === 'custom');
    document.body.classList.toggle('bg-preset', mode === 'preset');
    if (mode === 'default' || mode === 'flow-dark') {
      const cfg = { mode };
      saveBg(cfg); applyBackground(cfg); return;
    }
    if (mode === 'preset') {
  const cfg = { mode: 'video', video: 'video1' };
      saveBg(cfg); applyBackground(cfg); return;
    }
    if (mode === 'custom') {
      // 等待用户选择文件；若已有存档，则直接应用
      const prev = loadBg();
      if (prev.mode === 'custom' && prev.dataUrl) { applyBackground(prev); }
      return;
    }
  }
  // 生机没有子选项
  if (t.id === 'bgFile') {
    const file = t.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    const cfg = { mode: 'custom', dataUrl };
    saveBg(cfg); applyBackground(cfg); return;
  }
});


// 清除选项已移除

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 生成 PNG 预设（Canvas -> data:image/png）
function generatePresetPng(key, w = 1200, h = 800) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  // 渐变色定义（无 bg1，使用首个预设兜底）
  const fallback = Object.values(PRESET_SCHEMES)[0];
  const [c1, c2] = (PRESET_SCHEMES[key] || fallback);
  // 线性渐变对角
  let lg = ctx.createLinearGradient(0, 0, w, h);
  lg.addColorStop(0, hexWithAlpha(c1, 0.9));
  lg.addColorStop(1, hexWithAlpha(c2, 0.9));
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, w, h);
  // 柔光圆斑
  function glow(cx, cy, r, alpha=0.18) {
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, `rgba(255,255,255,${alpha})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  }
  glow(w*0.18, h*0.2, Math.min(w,h)*0.35, 0.16);
  glow(w*0.85, h*0.18, Math.min(w,h)*0.30, 0.14);
  glow(w*0.5, h*0.8, Math.min(w,h)*0.40, 0.16);
  return canvas.toDataURL('image/png');
}

function hexWithAlpha(hex, alpha=1) {
  const c = hex.replace('#','');
  const r = parseInt(c.substr(0,2), 16);
  const g = parseInt(c.substr(2,2), 16);
  const b = parseInt(c.substr(4,2), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// 预设配色表（供生成与测光共用）
const PRESET_SCHEMES = {
  bg2: ['#22c55e', '#facc15'],
  bg3: ['#f472b6', '#f87171'],
};

// 根据当前配置评估背景是否偏暗，并切换 hero-dark 类（白字）
function updateHeroDarkTheme(cfg) {
  if (!heroEl) return;
  if (cfg.mode === 'flow-dark') { heroEl.classList.add('hero-dark'); return; }
  if (cfg.mode === 'default') { heroEl.classList.remove('hero-dark'); return; }
  if (cfg.mode === 'preset' && cfg.preset) {
    const isDark = computePresetDark(cfg.preset);
    heroEl.classList.toggle('hero-dark', isDark);
    return;
  }
  if (cfg.mode === 'video') { heroEl.classList.add('hero-dark'); return; }
  if (cfg.mode === 'custom' && cfg.dataUrl) {
    computeCustomDark(cfg.dataUrl).then(isDark => {
      heroEl.classList.toggle('hero-dark', isDark);
    }).catch(() => {
      // 失败时保守：不改变
    });
  }
}

function computePresetDark(key) {
  const w = 120, h = 80;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  // 与生成逻辑一致（兜底到第一个预设）
  const fallback = Object.values(PRESET_SCHEMES)[0];
  const [c1, c2] = (PRESET_SCHEMES[key] || fallback);
  let lg = ctx.createLinearGradient(0, 0, w, h);
  lg.addColorStop(0, hexWithAlpha(c1, 0.9));
  lg.addColorStop(1, hexWithAlpha(c2, 0.9));
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, w, h);
  function glow(cx, cy, r, alpha=0.18) {
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, `rgba(255,255,255,${alpha})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  }
  glow(w*0.18, h*0.2, Math.min(w,h)*0.35, 0.16);
  glow(w*0.85, h*0.18, Math.min(w,h)*0.30, 0.14);
  glow(w*0.5, h*0.8, Math.min(w,h)*0.40, 0.16);
  return averageLuma(ctx, w, h) < 140; // 阈值：<140 认为偏暗
}

function computeCustomDark(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = 120, h = 80;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const isDark = averageLuma(ctx, w, h) < 140;
        resolve(isDark);
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function averageLuma(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0, count = 0, stride = 4 * 4; // 每隔4像素采样一次
  for (let i = 0; i < data.length; i += stride) {
    const r = data[i], g = data[i+1], b = data[i+2];
    // 感知亮度（Rec. 601）
    const y = 0.299*r + 0.587*g + 0.114*b;
    sum += y; count++;
  }
  return sum / count;
}
