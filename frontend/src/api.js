const API_URL = import.meta.env.VITE_API_URL || "https://military-assignment.onrender.com";
// const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "mams_token";
const USER_KEY = "mams_user";

export function saveSession(response) {
  localStorage.setItem(TOKEN_KEY, response.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const requestOptions = { ...options, headers };

  if (options.body && typeof options.body !== "string") {
    headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, requestOptions);
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  // Token missing, expired or invalid: force a fresh login
  // (but not for the login call itself, where 401 means wrong password)
  if (response.status === 401 && !path.includes("/auth/login")) {
    clearSession();
    window.location.href = "/";          // change to your login route if different
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(", ")
      : detail || data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "{}");
    if (user.id) return Number(user.id);
  } catch {
    // Treat invalid local session data as a signed-out user.
  }

  throw new Error("Your session is missing. Please sign in again.");
}