import axios from "axios";
import { pushRequest, flushWith } from "./offlineQueue";
import i18n from "./i18n";


export const serverOrigin =
  (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/,"");

const api = axios.create({ baseURL: `${serverOrigin}/api` });

// Attach token
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Offline queue for non-GET
api.interceptors.request.use(async (config) => {
  if (navigator.onLine) return config;

  if ((config.method || 'get').toLowerCase() !== 'get') {
    // For multipart/form-data we can't serialize easily, so just notify user.
    // You can extend this to store files in IndexedDB if needed.
    const canQueue = !(config.data instanceof FormData);

    if (canQueue) {
      pushRequest({ config: { url: config.url, method: config.method, data: config.data, headers: config.headers, baseURL: config.baseURL } });
      // Return a fake response so UI can continue (show "queued")
      return Promise.reject({ __queued: true });
    } else {
      alert('You are offline. This action requires internet.');
      return Promise.reject({ message: 'offline' });
    }
  }
  return config;
});

// Flush when back online
window.addEventListener('online', () => {
  flushWith(api).catch(console.error);
});

export default api;
