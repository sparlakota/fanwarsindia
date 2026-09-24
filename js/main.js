/**
 * FanWarsIndia — app bootstrap & event wiring.
 */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".js-icon-flame").forEach((el) => (el.innerHTML = Icons.flame()));
  document.querySelectorAll(".js-icon-crowd").forEach((el) => (el.innerHTML = Icons.crowd()));
  document.querySelectorAll(".js-icon-star").forEach((el) => (el.innerHTML = Icons.star()));

  renderAll();

  ["power", "army", "fans"].forEach((mode) => {
    document.getElementById(`toggle-${mode}`).addEventListener("click", () => {
      Store.setLeaderboardMode(mode);
    });
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

  // Keep "just now / 3 mins ago" in the activity feed honest.
  setInterval(renderActivity, 60000);
});
