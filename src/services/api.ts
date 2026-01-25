// src/services/api.ts

const API_URL = "http://localhost:8000";

export const gameApi = {
  startGame: (level: number) =>
    fetch(`${API_URL}/start_game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    }),

  getStatus: async () => (await fetch(`${API_URL}/status`)).json(),

  pause: () => fetch(`${API_URL}/pause`, { method: "POST" }),

  reset: () => fetch(`${API_URL}/reset`, { method: "POST" }),

  predict: (payload: any) =>
    fetch(`${API_URL}/predecir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};