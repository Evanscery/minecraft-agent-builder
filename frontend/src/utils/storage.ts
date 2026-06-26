// Thin localStorage helpers for UI working state (not project data — that lives on the backend).
const PREFIX = 'mcab:';

export function loadUiState(key: string, fallback: unknown): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveUiState(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}
