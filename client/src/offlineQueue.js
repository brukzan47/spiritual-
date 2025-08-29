const KEY = 'pendingRequests';

export function pushRequest(job) {
  const list = getAll();
  list.push({ ...job, id: crypto.randomUUID(), createdAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch { return []; }
}

export function setAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// Try to flush in order
export async function flushWith(axiosInstance) {
  const list = getAll();
  if (!list.length) return;

  const next = [];
  for (const job of list) {
    try {
      await axiosInstance.request(job.config);
      // success: drop it
    } catch (e) {
      // keep failed ones to retry later
      next.push(job);
    }
  }
  setAll(next);
}
