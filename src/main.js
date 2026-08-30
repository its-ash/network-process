const { invoke } = window.__TAURI__.core;

const AVATAR_PALETTE = [
  '#4f46e5', '#0ea5e9', '#ec4899', '#f59e0b',
  '#10b981', '#8b5cf6', '#ef4444', '#14b8a6',
  '#f97316', '#6366f1', '#84cc16', '#06b6d4',
];

let processes = [];
let searchInput;
let processList;
let refreshBtn;
let noResults;
let rowCount;
let killedPids = new Set();
let activeProto = 'ALL';
let protoButtons = [];

function avatarFor(name) {
  const initials = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toLowerCase() || '??';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const color = AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  return { initials, color };
}

function fmtMem(bytes) {
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
  return mb.toFixed(1) + ' MB';
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function fetchProcesses() {
  try {
    processes = await invoke("fetch_processes");
    updateTable();
  } catch (err) {
    showToast(`Error fetching processes: ${err}`, "danger");
  }
}

async function killProcess(pid, name, btn) {
  try {
    await invoke("kill_process", { pid });
    killedPids.add(pid);
    btn.classList.add('killed');
    btn.innerHTML = checkIcon();
    btn.setAttribute('aria-label', 'Process terminated');
    showToast(`Terminated ${name}`, "success");
    setTimeout(fetchProcesses, 1200);
  } catch (err) {
    showToast(`Failed to kill ${name}: ${err}`, "danger");
  }
}

function checkIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
}

function trashIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
}

function updateTable() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = processes.filter(p =>
    (p.name.toLowerCase().includes(query) ||
    p.pid.toString().includes(query) ||
    p.ports.some(port => port.toString().includes(query))) &&
    (activeProto === 'ALL' || (activeProto === 'TCP' && p.ports.length > 0))
  );

  filtered.sort((a, b) => {
    if (a.ports.length > 0 && b.ports.length === 0) return -1;
    if (a.ports.length === 0 && b.ports.length > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  if (filtered.length === 0) {
    processList.innerHTML = '';
    noResults.classList.remove('hidden');
  } else {
    noResults.classList.add('hidden');
    processList.innerHTML = filtered.map(p => {
      const { initials, color } = avatarFor(p.name);
      const killed = killedPids.has(p.pid);
      const cpuPct = Math.min(100, p.cpu);
      const ports = p.ports.length
        ? `<div class="port-tags">${p.ports.map(port => `<span class="port-tag">${port}</span>`).join('')}</div>`
        : `<span class="port-mono" style="color:var(--muted)">—</span>`;
      const state = p.ports.length
        ? `<span class="state-badge"><span class="dot"></span>LISTEN</span>`
        : `<span class="state-badge established"><span class="dot"></span>IDLE</span>`;
      return `
        <tr>
          <td class="col-kill">
            <button class="kill-btn ${killed ? 'killed' : ''}" data-pid="${p.pid}" data-name="${escapeHtml(p.name)}" aria-label="Kill ${escapeHtml(p.name)}">
              ${killed ? checkIcon() : trashIcon()}
            </button>
          </td>
          <td>
            <div class="proc-name">
              <span class="proc-avatar" style="background:${color}">${escapeHtml(initials)}</span>
              <span class="proc-label">${escapeHtml(p.name)}</span>
            </div>
            <div class="stats-row">
              <span class="stats-key">PID</span>
              <span class="pid-mono">${p.pid}</span>
              <span class="stats-sep">·</span>
              <span class="stats-key">CPU</span>
              <div class="cpu-cell">
                <span class="cpu-bar"><span class="cpu-bar-fill" style="width:${cpuPct}%"></span></span>
                <span class="cpu-text">${p.cpu.toFixed(1)}%</span>
              </div>
              <span class="stats-sep">·</span>
              <span class="stats-key">MEM</span>
              <span class="port-mono">${fmtMem(p.memory)}</span>
            </div>
          </td>
          <td>
            ${ports}
            <div style="margin-top:4px">${state}</div>
          </td>
        </tr>
      `;
    }).join('');
  }

  rowCount.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;

  document.getElementById('stat-processes').textContent = processes.length;
  document.getElementById('stat-ports').textContent = processes.reduce((a, p) => a + p.ports.length, 0);
  if (noResults) noResults.classList.toggle('hidden', filtered.length !== 0);
  const topCpu = processes.reduce((m, p) => Math.max(m, p.cpu), 0);
  document.getElementById('stat-cpu').textContent = topCpu.toFixed(1) + '%';
  const totalMem = processes.reduce((a, p) => a + p.memory, 0);
  document.getElementById('stat-memory').textContent = fmtMem(totalMem);
}

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.borderLeft = `4px solid ${type === "success" ? "var(--success)" : "var(--danger)"}`;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 3000);
}

window.addEventListener("DOMContentLoaded", () => {
  searchInput = document.getElementById("search-input");
  processList = document.getElementById("process-list");
  refreshBtn = document.getElementById("refresh-btn");
  noResults = document.getElementById("no-results");
  rowCount = document.getElementById("row-count");
  protoButtons = Array.from(document.querySelectorAll('.proto-btn'));

  searchInput.addEventListener("input", updateTable);
  refreshBtn.addEventListener("click", () => {
    killedPids.clear();
    fetchProcesses();
  });

  protoButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      activeProto = btn.dataset.proto;
      protoButtons.forEach(b => b.classList.toggle('active', b === btn));
      updateTable();
    });
  });

  processList.addEventListener("click", (e) => {
    const btn = e.target.closest(".kill-btn");
    if (!btn || btn.classList.contains("killed")) return;
    const pid = parseInt(btn.getAttribute("data-pid"));
    const name = btn.getAttribute("data-name");
    killProcess(pid, name, btn);
  });

  fetchProcesses();
  setInterval(fetchProcesses, 5000);
});
