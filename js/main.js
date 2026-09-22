/**
 * FanWarsIndia — app bootstrap & event wiring.
 */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".js-icon-flame").forEach((el) => (el.innerHTML = Icons.flame()));
  document.querySelectorAll(".js-icon-crowd").forEach((el) => (el.innerHTML = Icons.crowd()));

  renderAll();

  document.getElementById("toggle-power").addEventListener("click", () => {
    Store.setLeaderboardMode("power");
  });
  document.getElementById("toggle-army").addEventListener("click", () => {
    Store.setLeaderboardMode("army");
  });

  // Event delegation: leaderboard re-renders, so bind on the static container.
  document.getElementById("leaderboard-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".support-btn");
    if (!btn) return;
    const actorId = Number(btn.dataset.actorId);
    SupportFlow.open(actorId);
  });

  Store.subscribe(() => {
    renderLeaderboard();
    renderActivity();
  });
});
