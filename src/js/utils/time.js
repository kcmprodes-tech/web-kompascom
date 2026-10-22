/** "3 menit lalu" / "2 jam lalu" / "4 hari lalu" from an ISO timestamp. */
export function timeAgo(iso, now = Date.now()) {
  const mins = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} menit lalu`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} jam lalu`;
  return `${Math.floor(mins / 1440)} hari lalu`;
}

/** Refresh every [data-time] element's relative timestamp. */
export function refreshTimes(root = document) {
  root.querySelectorAll("[data-time]").forEach((el) => {
    el.textContent = timeAgo(el.dataset.time);
  });
}
