const els = {
  leaderboardList: document.querySelector("#leaderboard-list"),
  qrOpen: document.querySelector("#dashboard-qr-open"),
  qrModal: document.querySelector("#dashboard-qr-modal"),
  qrClose: document.querySelector("#dashboard-qr-close")
};

let lastState = {
  leaderboard: []
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

function renderLeaderboard(leaderboard = lastState.leaderboard) {
  const rows = Array.isArray(leaderboard) ? leaderboard : [];

  els.leaderboardList.replaceChildren();
  if (rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No scores yet";
    row.append(cell);
    els.leaderboardList.append(row);
    return;
  }

  rows.forEach((entry, index) => {
    const row = document.createElement("tr");
    [
      index + 1,
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
    renderLeaderboard(lastState.leaderboard);
  } catch (error) {
    console.warn(error);
  }
}

els.qrOpen.addEventListener("click", () => {
  els.qrModal.hidden = false;
  els.qrClose.focus();
});
els.qrClose.addEventListener("click", () => {
  els.qrModal.hidden = true;
  els.qrOpen.focus();
});
els.qrModal.addEventListener("click", (event) => {
  if (event.target === els.qrModal) {
    els.qrModal.hidden = true;
    els.qrOpen.focus();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.qrModal.hidden) {
    els.qrModal.hidden = true;
    els.qrOpen.focus();
  }
});

window.setInterval(refresh, 1000);
refresh();
