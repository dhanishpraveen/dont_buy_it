const backendOrigin =
  import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "") ||
  (import.meta.env.PROD ? "https://dont-buy-it.onrender.com" : "");

export function apiUrl(path: string): string {
  return `${backendOrigin}/api/${path.replace(/^\/+/, "")}`;
}
