const els = {
  leaderboardList: document.querySelector("#leaderboard-list"),
  status: document.querySelector("#game-status"),
  roundSize: document.querySelector("#dashboard-round-size"),
  clear: document.querySelector("#dashboard-clear"),
  start: document.querySelector("#dashboard-start"),
  stop: document.querySelector("#dashboard-stop")
};

let lastState = {
  leaderboard: [],
  control: { status: "waiting" }
};

async function api(action, payload = {}) {
  const options = action
    ? {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      }
    : { cache: "no-store" };

  const response = await fetch("/api/state", options);
  if (!response.ok) {
    throw new Error("Dashboard API request failed");
  }
  return response.json();
}

function renderStatus(control = lastState.control) {
  const labels = {
    running: "Running",
    stopped: "Stopped",
    waiting: "Waiting"
  };
  els.status.textContent = labels[control?.status] || "Waiting";
}

function renderLeaderboard(leaderboard = lastState.leaderboard) {
  const rows = Array.isArray(leaderboard) ? leaderboard : [];

  els.leaderboardList.replaceChildren();
  if (rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No scores yet";
    row.append(cell);
    els.leaderboardList.append(row);
    return;
  }

  rows.forEach((entry) => {
    const row = document.createElement("tr");
    [
      entry.name,
      entry.lastScore,
      entry.bestScore,
      entry.correct ?? 0,
      entry.wrong ?? 0,
      entry.rounds
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    els.leaderboardList.append(row);
  });
}

async function refresh() {
  try {
    lastState = await api();
    renderStatus(lastState.control);
    renderLeaderboard(lastState.leaderboard);
  } catch (error) {
    els.status.textContent = "Offline";
    console.warn(error);
  }
}

async function writeControl(status) {
  lastState = await api("control", {
    status,
    roundSize: Number.parseInt(els.roundSize.value, 10)
  });
  renderStatus(lastState.control);
  renderLeaderboard(lastState.leaderboard);
}

els.start.addEventListener("click", () => writeControl("running").catch(console.warn));
els.stop.addEventListener("click", () => writeControl("stopped").catch(console.warn));
els.clear.addEventListener("click", async () => {
  try {
    lastState = await api("clear");
    renderLeaderboard(lastState.leaderboard);
  } catch (error) {
    console.warn(error);
  }
});

window.setInterval(refresh, 1000);
refresh();
