const { invoke } = window.__TAURI__.core;

let processes = [];
let filteredProcesses = [];
let searchInput;
let processList;
let processCount;
let portCount;
let refreshBtn;

async function fetchProcesses() {
  try {
    processes = await invoke("fetch_processes");
    updateTable();
  } catch (err) {
    showToast(`Error fetching processes: ${err}`, "danger");
  }
}

async function killProcess(pid, name) {
  console.log(`Attempting to kill ${name} (PID: ${pid})...`);
  try {
    await invoke("kill_process", { pid });
    console.log(`Success: ${name} terminated.`);
    showToast(`Successfully terminated ${name}`, "success");
    fetchProcesses();
  } catch (err) {
    console.error(`Error killing ${pid}:`, err);
    showToast(`Failed to kill process: ${err}`, "danger");
  }
}

function updateTable() {
  const query = searchInput.value.toLowerCase();
  filteredProcesses = processes.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.pid.toString().includes(query) ||
    p.ports.some(port => port.toString().includes(query))
  );

  // Sort by ports presence first, then by name
  filteredProcesses.sort((a, b) => {
    if (a.ports.length > 0 && b.ports.length === 0) return -1;
    if (a.ports.length === 0 && b.ports.length > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  processList.innerHTML = filteredProcesses.map(p => `
    <tr>
      <td><span class="text-secondary">${p.pid}</span></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.cpu.toFixed(1)}%</td>
      <td>${(p.memory / 1024 / 1024).toFixed(1)} MB</td>
      <td>
        ${p.ports.map(port => `<span class="port-tag">${port}</span>`).join('')}
      </td>
      <td>
        <button class="kill-btn" data-pid="${p.pid}" data-name="${p.name}">Kill</button>
      </td>
    </tr>
  `).join('');

  processCount.textContent = processes.length;
  portCount.textContent = processes.reduce((acc, p) => acc + p.ports.length, 0);
}

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.borderLeft = `4px solid ${type === "success" ? "var(--success)" : "var(--danger)"}`;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

window.addEventListener("DOMContentLoaded", () => {
  searchInput = document.getElementById("search-input");
  processList = document.getElementById("process-list");
  processCount = document.getElementById("process-count");
  portCount = document.getElementById("port-count");
  refreshBtn = document.getElementById("refresh-btn");

  searchInput.addEventListener("input", updateTable);
  refreshBtn.addEventListener("click", fetchProcesses);

  // Event delegation for Kill buttons
  processList.addEventListener("click", (e) => {
    if (e.target.classList.contains("kill-btn")) {
      const pid = parseInt(e.target.getAttribute("data-pid"));
      const name = e.target.getAttribute("data-name");
      console.log(pid, name);
      killProcess(pid, name);
    }
  });

  // Initial fetch
  fetchProcesses();

  // Auto-refresh every 5 seconds
  setInterval(fetchProcesses, 5000);
});
