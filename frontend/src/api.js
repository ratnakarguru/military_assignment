const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function apiRequest(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...options.headers,
  };
  const requestOptions = { ...options, headers };

  if (options.body && typeof options.body !== "string") {
    headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, requestOptions);
  const data = response.status === 204 ? null : await response.json().catch(() => null);

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
    const user = JSON.parse(localStorage.getItem("mams_user") || "{}");
    if (user.id) return Number(user.id);
  } catch {
    // Treat invalid local session data as a signed-out user.
  }

  throw new Error("Your session is missing. Please sign in again.");
}