/**
 * FanWarsIndia — app bootstrap & event wiring.
 */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".js-icon-flame").forEach((el) => (el.innerHTML = Icons.flame()));
  document.querySelectorAll(".js-icon-crowd").forEach((el) => (el.innerHTML = Icons.crowd()));
  document.querySelectorAll(".js-icon-star").forEach((el) => (el.innerHTML = Icons.star()));

  renderAll();
  Store.load();

  // Coming back from a Cashfree redirect (some UPI/bank flows leave the page): ?order_id=fw_...
  const params = new URLSearchParams(location.search);
  const returnedOrder = params.get("order_id");
  if (returnedOrder) {
    history.replaceState(null, "", location.pathname + location.hash);
    SupportFlow.resume(returnedOrder);
  }

  ["power", "army", "fans"].forEach((mode) => {
    document.getElementById(`toggle-${mode}`).addEventListener("click", () => {
      Store.setLeaderboardMode(mode);
    });
  });

  // Event delegation: leaderboard re-renders, so bind on the static container.
  document.getElementById("leaderboard-list").addEventListener("click", (e) => {
    if (e.target.closest(".retry-load")) {
      Store.state.loadError = false;
      renderAll();
      Store.load();
      return;
    }
    const btn = e.target.closest(".support-btn");
    if (!btn) return;
    const actorId = Number(btn.dataset.actorId);
    SupportFlow.open(actorId);
  });

  Store.subscribe(() => {
    renderLeaderboard();
    renderActivity();
  });

  // Other fans' support lands every minute; this also keeps "3 mins ago" honest.
  setInterval(() => {
    if (!document.hidden) Store.load();
  }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) Store.load();
  });
});
