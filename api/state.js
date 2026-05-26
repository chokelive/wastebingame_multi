const STORE_KEY = "wastebin:state";

const defaultState = {
  players: [],
  leaderboard: [],
  control: {
    status: "waiting",
    roundId: null,
    roundSize: 12,
    updatedAt: null
  }
};

globalThis.__wastebinState = globalThis.__wastebinState || JSON.parse(JSON.stringify(defaultState));

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function cleanName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 32) || "Player";
}

function cleanScore(value) {
  const score = Number.parseInt(value, 10);
  return Number.isFinite(score) ? score : 0;
}

function upsertPlayer(state, playerId, name, now) {
  const existing = state.players.find((entry) => entry.playerId === playerId);
  if (existing) {
    existing.name = cleanName(name || existing.name);
    existing.updatedAt = now;
    return existing;
  }

  const player = {
    playerId,
    name: cleanName(name),
    updatedAt: now
  };
  state.players.push(player);
  return player;
}

async function redis(command, ...args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify([command, ...args])
  });

  if (!response.ok) {
    throw new Error(`Redis ${command} failed`);
  }

  const payload = await response.json();
  return payload.result;
}

async function readState() {
  const stored = await redis("GET", STORE_KEY);
  if (!stored) {
    return cloneState(globalThis.__wastebinState);
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      ...cloneState(defaultState),
      ...parsed,
      players: Array.isArray(parsed.players) ? parsed.players : [],
      leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
      control: {
        ...cloneState(defaultState.control),
        ...(parsed.control || {})
      }
    };
  } catch (error) {
    return cloneState(defaultState);
  }
}

async function writeState(state) {
  globalThis.__wastebinState = cloneState(state);
  await redis("SET", STORE_KEY, JSON.stringify(state));
}

function sortLeaderboard(rows) {
  return [...rows].sort((a, b) =>
    new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0) ||
    b.lastScore - a.lastScore ||
    b.bestScore - a.bestScore
  );
}

module.exports = async function handler(request, response) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  try {
    const state = await readState();

    if (request.method === "GET") {
      response.status(200).json({
        ...state,
        leaderboard: sortLeaderboard(state.leaderboard)
      });
      return;
    }

    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = typeof request.body === "object" ? request.body : JSON.parse(request.body || "{}");
    const now = new Date().toISOString();

    if (body.action === "join") {
      const playerId = String(body.playerId || "").slice(0, 80);
      if (!playerId) {
        response.status(400).json({ error: "playerId is required" });
        return;
      }

      upsertPlayer(state, playerId, body.name, now);
    }

    if (body.action === "score") {
      const playerId = String(body.playerId || "").slice(0, 80);
      if (!playerId) {
        response.status(400).json({ error: "playerId is required" });
        return;
      }

      upsertPlayer(state, playerId, body.name, now);
      const score = cleanScore(body.score);
      const existing = state.leaderboard.find((entry) => entry.playerId === playerId);
      if (existing) {
        existing.name = cleanName(body.name || existing.name);
        existing.lastScore = score;
        existing.bestScore = Math.max(existing.bestScore || 0, score);
        existing.correct = cleanScore(body.correct);
        existing.wrong = cleanScore(body.wrong);
        existing.rounds = (existing.rounds || 0) + 1;
        existing.updatedAt = now;
      } else {
        state.leaderboard.push({
          playerId,
          name: cleanName(body.name),
          lastScore: score,
          bestScore: score,
          correct: cleanScore(body.correct),
          wrong: cleanScore(body.wrong),
          rounds: 1,
          updatedAt: now
        });
      }
    }

    if (body.action === "control") {
      state.control = {
        status: "waiting",
        roundId: null,
        roundSize: state.control.roundSize || 12,
        updatedAt: now,
        ignored: true
      };
    }

    if (body.action === "clear") {
      state.leaderboard = [];
    }

    await writeState(state);
    response.status(200).json({
      ...state,
      leaderboard: sortLeaderboard(state.leaderboard)
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
};
