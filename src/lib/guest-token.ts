const KEY = "leakbox_guest_token";

export function guestToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let t = localStorage.getItem(KEY);
    if (!t || t.length < 8) {
      t = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
      localStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    return "";
  }
}
