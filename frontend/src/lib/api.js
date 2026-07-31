function resolveApiBaseUrl() {
  const raw = (process.env.REACT_APP_BACKEND_URL || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export const API = `${resolveApiBaseUrl()}/api`;
