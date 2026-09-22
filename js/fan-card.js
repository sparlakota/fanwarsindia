/**
 * FanWarsIndia — Shareable fan card.
 * html() renders the on-screen preview; download() renders an equivalent
 * card to a <canvas> and triggers a PNG download — built for mobile
 * screenshots / Instagram story sharing.
 */

const FanCard = (function () {
  function html({ actorName, actorImage, amount, cumulative, level, rank }) {
    return `
    <div class="fan-card card-grain relative w-full max-w-[280px] mx-auto rounded-xl border border-fwred/30 p-5 flex flex-col items-center text-center">
      <div class="flex flex-col items-center gap-0.5 mb-6">
        <img src="assets/logo/crown-mark.png" class="h-4 w-auto object-contain" alt="" />
        <img src="assets/logo/wordmark-mark.png" class="h-4 w-auto object-contain" alt="FanWarsIndia" />
      </div>

      <img src="${actorImage}" alt="${actorName}" class="w-24 h-28 object-cover rounded-lg border-2 border-fwred/60 mb-4" />

      <p class="text-white/50 text-[11px] uppercase tracking-[0.25em]">I Backed</p>
      <p class="font-display text-2xl uppercase leading-tight text-fwred mb-3">${actorName}</p>

      <p class="font-display text-xl">${formatRupees(amount)}</p>
      <p class="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-3">Contributed</p>

      <p class="font-display text-base mb-1 flex items-center justify-center gap-2">${levelBadgeHTML(level, 16)} ${level.label.toUpperCase()}</p>
      ${rank ? `<p class="text-fwred text-xs font-semibold uppercase tracking-wide mb-4">#${rank} on FanWarsIndia</p>` : `<div class="mb-4"></div>`}

      <p class="text-white/60 text-[11px] uppercase tracking-[0.15em]">Your Star. Your Pride. Your War.</p>
      <p class="text-fwred text-[11px] font-semibold mt-1">#FanWarsIndia</p>
    </div>`;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function download({ actorName, amount, cumulative, level, rank }) {
    const W = 1080,
      H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background
    const grad = ctx.createRadialGradient(W / 2, 0, 0, W / 2, H * 0.5, H * 0.8);
    grad.addColorStop(0, "#1a0808");
    grad.addColorStop(0.45, "#0a0a0a");
    grad.addColorStop(1, "#050505");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,26,26,0.5)";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    ctx.textAlign = "center";

    // Real logo lockup — crown centered above the wordmark, exactly as designed
    const [crownImg, wordmarkImg] = await Promise.all([
      loadImage("assets/logo/crown-mark.png"),
      loadImage("assets/logo/wordmark-mark.png"),
    ]);

    const crownH = 90;
    const crownW = crownImg.width * (crownH / crownImg.height);
    ctx.drawImage(crownImg, W / 2 - crownW / 2, 90, crownW, crownH);

    const wordmarkH = 110;
    const wordmarkW = wordmarkImg.width * (wordmarkH / wordmarkImg.height);
    ctx.drawImage(wordmarkImg, W / 2 - wordmarkW / 2, 195, wordmarkW, wordmarkH);

    // "I BACKED"
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 34px Arial";
    ctx.textAlign = "center";
    ctx.fillText("I  B A C K E D", W / 2, 420);

    // Actor name
    ctx.fillStyle = "#FF1A1A";
    ctx.font = "900 118px Arial";
    wrapCenteredText(ctx, actorName.toUpperCase(), W / 2, 560, W - 160, 120);

    // Amount
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 96px Arial";
    ctx.fillText(formatRupees(amount), W / 2, 820);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "500 30px Arial";
    ctx.fillText("C O N T R I B U T E D", W / 2, 875);

    // Level badge — small colored dot (or gold ring for Legend) beside the label
    const levelLabel = level.label.toUpperCase();
    ctx.font = "700 56px Arial";
    const dotR = 16;
    const labelWidth = ctx.measureText(levelLabel).width;
    const dotX = W / 2 - labelWidth / 2 - dotR - 14;
    ctx.fillStyle = level.color;
    ctx.beginPath();
    ctx.arc(dotX, 980, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText(levelLabel, dotX + dotR + 14, 1000);
    ctx.textAlign = "center";

    if (rank) {
      ctx.fillStyle = "#FF1A1A";
      ctx.font = "700 38px Arial";
      ctx.fillText(`#${rank} ON FANWARSINDIA`, W / 2, 1070);
    }

    // Tagline
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "700 32px Arial";
    ctx.fillText("YOUR STAR. YOUR PRIDE. YOUR WAR.", W / 2, 1700);

    ctx.fillStyle = "#FF1A1A";
    ctx.font = "700 34px Arial";
    ctx.fillText("#FanWarsIndia", W / 2, 1760);

    const link = document.createElement("a");
    link.download = `fanwarsindia-${actorName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function wrapCenteredText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    const lines = [];
    words.forEach((word) => {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  }

  return { html, download };
})();
