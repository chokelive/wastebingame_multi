const leaderboardKey = "wastebin-leaderboard";
const gameControlKey = "wastebin-game-control";

const els = {
  leaderboardList: document.querySelector("#leaderboard-list"),
  status: document.querySelector("#game-status"),
  roundSize: document.querySelector("#dashboard-round-size"),
  clear: document.querySelector("#dashboard-clear"),
  start: document.querySelector("#dashboard-start"),
  stop: document.querySelector("#dashboard-stop")
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function writeControl(status) {
  const control = {
    status,
    roundId: Date.now(),
    roundSize: Number.parseInt(els.roundSize.value, 10),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(gameControlKey, JSON.stringify(control));
  renderStatus(control);
}

function renderStatus(control = readJson(gameControlKey, { status: "waiting" })) {
  const labels = {
    running: "Running",
    stopped: "Stopped",
    waiting: "Waiting"
  };
  els.status.textContent = labels[control.status] || "Waiting";
}

function renderLeaderboard() {
  const leaderboard = readJson(leaderboardKey, []);
  const rows = Array.isArray(leaderboard)
    ? [...leaderboard].sort((a, b) => b.bestScore - a.bestScore || b.lastScore - a.lastScore)
    : [];

  els.leaderboardList.replaceChildren();
  if (rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "ยังไม่มีคะแนน";
    row.append(cell);
    els.leaderboardList.append(row);
    return;
  }

  rows.forEach((entry) => {
    const row = document.createElement("tr");
    [entry.name, entry.lastScore, entry.bestScore, entry.rounds].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    els.leaderboardList.append(row);
  });
}

els.start.addEventListener("click", () => writeControl("running"));
els.stop.addEventListener("click", () => writeControl("stopped"));
els.clear.addEventListener("click", () => {
  localStorage.removeItem(leaderboardKey);
  renderLeaderboard();
});

window.addEventListener("storage", (event) => {
  if (event.key === leaderboardKey) {
    renderLeaderboard();
  }
  if (event.key === gameControlKey) {
    renderStatus(readJson(gameControlKey, { status: "waiting" }));
  }
});

window.setInterval(renderLeaderboard, 1000);
renderStatus();
renderLeaderboard();
