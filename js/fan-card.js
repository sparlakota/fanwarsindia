/**
 * FanWarsIndia — Shareable fan card.
 * html()    on-screen preview inside the success sheet.
 * toBlob()  renders the same card to a 1080x1920 PNG (Instagram story / WhatsApp status size).
 * share()   hands that PNG to the OS share sheet (Instagram, WhatsApp, X, ...) when the browser
 *           supports sharing files; reports "unsupported" otherwise so the caller can fall back.
 * Layout is the original card; the only additions are "I just backed" and the red-outlined FAN CARD ID
 * box in the space above the footer.
 */

const FanCard = (function () {
  function html({ actorTitle, actorName, actorImage, amount, level, rank, supporterName, token }) {
    return `
    <div class="fan-card card-grain relative w-full max-w-[280px] mx-auto rounded-xl border border-fwred/30 p-5 flex flex-col items-center text-center">
      <div class="flex flex-col items-center gap-0.5 mb-4">
        <img src="assets/logo/crown-mark.png" class="h-4 w-auto object-contain" alt="" />
        <img src="assets/logo/wordmark-mark.png" class="h-4 w-auto object-contain" alt="FanWarsIndia" />
      </div>

      <img src="${actorImage}" alt="${actorName}" class="w-24 h-28 object-cover rounded-lg border-2 border-fwred/60 mb-3" />

      <p class="font-name text-white/50 text-[11px] uppercase tracking-[0.25em]">I Just Backed</p>
      <p class="font-display text-[22px] uppercase leading-[1.1] text-fwred mb-2">${actorTitle}</p>

      <p class="font-display text-xl leading-none">${formatRupees(amount)}</p>
      <p class="font-name text-white/40 text-[10px] uppercase tracking-[0.2em] mb-2">Contributed</p>

      <p class="font-name font-semibold text-base mb-0.5 flex items-center justify-center gap-2">${levelBadgeHTML(level, 14)} ${level.label.toUpperCase()}</p>
      ${rank ? `<p class="font-name text-fwred text-xs font-medium uppercase tracking-wide">#${rank} on FanWarsIndia</p>` : ""}

      <p class="font-name font-medium text-white text-sm uppercase tracking-wide mt-3 max-w-full truncate">${escapeHTML(supporterName)}</p>

      <div class="mt-auto w-full flex justify-center">
        <div class="rounded-lg border-2 border-fwred px-4 py-1.5 text-center" style="background:rgba(255,26,26,0.06)">
          <p class="font-name text-white/50 text-[8px] uppercase tracking-[0.25em] leading-none">Fan card ID</p>
          <p class="font-name font-semibold text-white text-[15px] tracking-[0.18em] leading-tight mt-0.5">${escapeHTML(token || "")}</p>
        </div>
      </div>

      <div class="mt-auto pt-3">
        <p class="font-name text-white/60 text-[10px] uppercase tracking-[0.15em]">Your Star. Your Pride. Your War.</p>
        <p class="font-name font-medium text-fwred text-xs mt-0.5">fanwarsindia.com</p>
      </div>
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

  function roundedRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Draw an image scaled to cover a box (like object-fit: cover), biased toward the top so faces stay in frame.
  function drawCover(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) * 0.2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
    return t + "…";
  }

  function wrapLines(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
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
    return lines;
  }

  function spaced(ctx, text, x, y, spacing) {
    // Canvas letterSpacing is not universal yet — fall back to plain text where missing.
    if ("letterSpacing" in ctx) {
      ctx.letterSpacing = spacing + "px";
      // Trailing letter-spacing shifts centred text; nudge it back so it stays optically centred.
      ctx.fillText(text, x + (ctx.textAlign === "center" ? spacing / 2 : 0), y);
      ctx.letterSpacing = "0px";
    } else {
      ctx.fillText(text, x, y);
    }
  }

  async function toBlob({ actorTitle, actorImage, amount, level, rank, supporterName, token }) {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    await Promise.all([
      document.fonts.load("100px Anton"),
      document.fonts.load("600 40px Oswald"),
      document.fonts.load("500 30px Oswald"),
      document.fonts.load("500 30px Barlow"),
    ]).catch(() => {});

    const [crownImg, wordmarkImg, photo] = await Promise.all([
      loadImage("assets/logo/crown-mark.png"),
      loadImage("assets/logo/wordmark-mark.png"),
      loadImage(actorImage),
    ]);

    // Background + frame
    const grad = ctx.createRadialGradient(W / 2, 0, 0, W / 2, H * 0.5, H * 0.8);
    grad.addColorStop(0, "#2a0a0a");
    grad.addColorStop(0.45, "#0a0a0a");
    grad.addColorStop(1, "#050505");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,26,26,0.5)";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    ctx.textAlign = "center";

    // Logo lockup: crown above wordmark
    const crownH = 80;
    const crownW = crownImg.width * (crownH / crownImg.height);
    ctx.drawImage(crownImg, W / 2 - crownW / 2, 70, crownW, crownH);
    const wordmarkH = 100;
    const wordmarkW = wordmarkImg.width * (wordmarkH / wordmarkImg.height);
    ctx.drawImage(wordmarkImg, W / 2 - wordmarkW / 2, 160, wordmarkW, wordmarkH);

    // Star photo
    const pw = 496;
    const ph = 620;
    const px = (W - pw) / 2;
    const py = 310;
    ctx.save();
    ctx.shadowColor = "rgba(255,26,26,0.55)";
    ctx.shadowBlur = 50;
    roundedRectPath(ctx, px, py, pw, ph, 28);
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundedRectPath(ctx, px, py, pw, ph, 28);
    ctx.clip();
    drawCover(ctx, photo, px, py, pw, ph);
    ctx.restore();
    roundedRectPath(ctx, px, py, pw, ph, 28);
    ctx.strokeStyle = "#FF1A1A";
    ctx.lineWidth = 8;
    ctx.stroke();

    // "I BACKED"
    let y = 1030;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 34px Oswald, Arial";
    spaced(ctx, "I  JUST  BACKED", W / 2, y, 8);

    // Star title (nickname + name)
    // Star title (nickname + name) — shrink until it fits in two lines so nothing collides below.
    ctx.fillStyle = "#FF1A1A";
    // Keep the title on ONE line (shrinking the type) so everything below stays where it is; only wrap
    // as a last resort for an extremely long title.
    let titleSize = 92;
    let titleLines;
    do {
      ctx.font = `${titleSize}px Anton, 'Arial Black', Arial`;
      titleLines = wrapLines(ctx, actorTitle.toUpperCase(), W - 160);
      titleSize -= 2;
    } while (titleLines.length > 1 && titleSize > 56);
    if (titleLines.length > 1) {
      titleSize = 80;
      do {
        ctx.font = `${titleSize}px Anton, 'Arial Black', Arial`;
        titleLines = wrapLines(ctx, actorTitle.toUpperCase(), W - 160);
        titleSize -= 6;
      } while (titleLines.length > 2 && titleSize > 50);
    }
    const lineH = Math.round((titleSize + 6) * 1.13);
    y += 100;
    titleLines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * lineH));
    y += (titleLines.length - 1) * lineH;

    // Amount
    y += 135;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "110px Anton, 'Arial Black', Arial";
    ctx.fillText(formatRupees(amount), W / 2, y);
    y += 50;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "500 30px Oswald, Arial";
    spaced(ctx, "CONTRIBUTED", W / 2, y, 8);

    // Fan level
    y += 90;
    const levelLabel = level.label.toUpperCase();
    ctx.font = "600 54px Oswald, Arial";
    const dotR = 14;
    const labelW = ctx.measureText(levelLabel).width;
    const dotX = W / 2 - labelW / 2 - dotR - 14;
    ctx.fillStyle = level.color;
    ctx.beginPath();
    ctx.arc(dotX, y - 18, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText(levelLabel, dotX + dotR + 14, y);
    ctx.textAlign = "center";

    if (rank) {
      y += 62;
      ctx.fillStyle = "#FF1A1A";
      ctx.font = "500 38px Oswald, Arial";
      spaced(ctx, `#${rank} ON FANWARSINDIA`, W / 2, y, 3);
    }

    // Fan name
    y += 78;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 46px Oswald, Arial";
    ctx.fillText(fitText(ctx, supporterName.toUpperCase(), W - 200), W / 2, y);

    // Fan card ID: red-outlined box centred in the space between the fan name and the footer
    const fanNameY = y;
    const gapTop = fanNameY + 34;
    const gapBottom = 1736;
    const label = "FAN CARD ID";
    ctx.font = "600 58px Oswald, Arial";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "10px";
    const codeW = ctx.measureText(token || "").width;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    const boxW = Math.max(500, codeW + 120);
    const boxH = Math.min(114, Math.max(92, gapBottom - gapTop - 44));
    const boxX = (W - boxW) / 2;
    const boxY = gapTop + Math.max(0, (gapBottom - gapTop - boxH) / 2);
    roundedRectPath(ctx, boxX, boxY, boxW, boxH, 22);
    ctx.fillStyle = "rgba(255,26,26,0.07)";
    ctx.fill();
    ctx.strokeStyle = "#FF1A1A";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 24px Oswald, Arial";
    spaced(ctx, label, W / 2, boxY + 34, 8);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 58px Oswald, Arial";
    spaced(ctx, token || "", W / 2, boxY + boxH - 19, 10);

    // Footer: tagline and site
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 30px Oswald, Arial";
    spaced(ctx, "YOUR STAR. YOUR PRIDE. YOUR WAR.", W / 2, 1782, 4);
    ctx.fillStyle = "#FF1A1A";
    ctx.font = "600 38px Oswald, Arial";
    ctx.fillText("fanwarsindia.com", W / 2, 1838);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Card render failed"))), "image/png");
    });
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /**
   * Open the phone's share sheet with the card IMAGE attached (Instagram stories, WhatsApp, X, ...).
   * Resolves "shared" | "cancelled" | "unsupported" (desktop browsers can't share files).
   */
  async function share(blob, filename, text) {
    const file = new File([blob], filename, { type: "image/png" });
    if (!(navigator.canShare && navigator.canShare({ files: [file] }))) return "unsupported";
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
      return "unsupported";
    }
  }

  /** Share with the image; if the browser can't, save the PNG instead. */
  async function shareBlob(blob, filename, text) {
    const outcome = await share(blob, filename, text);
    if (outcome === "unsupported") {
      saveBlob(blob, filename);
      return "saved";
    }
    return outcome;
  }

  return { html, toBlob, saveBlob, share, shareBlob };
})();
