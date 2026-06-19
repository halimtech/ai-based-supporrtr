export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://localhost:8000");

export function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

export function ratingKey(participant, alternative, criterion) {
  return `${participant}__${alternative}__${criterion}`;
}
