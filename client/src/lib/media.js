import { serverOrigin } from "../api";
export function buildMediaSrc(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.replace(/^\/+/, "").replace(/^uploads\/?/, "");
  return `${serverOrigin}/uploads/${path}`;
}
