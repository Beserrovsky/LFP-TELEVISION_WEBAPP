import { createDefaultState } from "./data.js";

const STORAGE_KEY = "jj_survey_visualiser_state_v1";

export function loadState() {
  const fallback = createDefaultState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    return {
      ...fallback,
      ...parsed,
      settings: {
        ...fallback.settings,
        ...(parsed.settings || {})
      },
      meta: {
        ...fallback.meta,
        ...(parsed.meta || {})
      },
      responses: Array.isArray(parsed.responses) ? parsed.responses : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : []
    };
  } catch (error) {
    console.error("Failed to load stored state:", error);
    return fallback;
  }
}

export function saveState(state) {
  const toStore = {
    ...state,
    meta: {
      ...state.meta,
      serialConnected: false
    }
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

export function clearStoredState() {
  localStorage.removeItem(STORAGE_KEY);
}