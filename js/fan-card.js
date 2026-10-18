/**
 * FanWarsIndia — Shareable fan card.
 * html()    on-screen preview inside the success sheet.
 * toBlob()  renders the same card to a 1080x1920 PNG (Instagram story / WhatsApp status size).
 * share()   hands that PNG to the OS share sheet (Instagram, WhatsApp, X, ...) when the browser
 *           supports sharing files; reports "unsupported" otherwise so the caller can fall back.
 *
 * Story-safe layout: Instagram covers roughly the top 250px and bottom 250px of a story with its own
 * UI, so the logo sits just under the top bar and nothing important lives in the last 250px.
 */

const FanCard = (function () {
  /** "Superstar Mahesh Babu" + "Mahesh Babu" -> { nickname: "Superstar", name: "Mahesh Babu" } */
  function splitTitle(actorTitle, actorName) {
    const title = String(actorTitle || "").trim();
    const name = String(actorName || "").trim();
    if (name && title.toLowerCase().endsWith(name.toLowerCase()) && title.length > name.length) {
      return { nickname: title.slice(0, title.length - name.length).trim(), name };
    }
    return { nickname: "", name: name || title };
  }

  function issuedOn() {
    return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  }

  function html({ actorTitle, actorName, actorImage, amount, level, rank, supporterName, token }) {
    const { nickname, name } = splitTitle(actorTitle, actorName);
    const crown = rank === 1 ? brandCrownHTML(12) : "";
    return `
    <div class="fan-card card-grain relative w-full max-w-[280px] mx-auto rounded-xl overflow-hidden border border-fwred/40"
         style="background:radial-gradient(ellipse 95% 42% at 50% 24%, rgba(255,26,26,0.28), transparent 70%),radial-gradient(ellipse 80% 30% at 50% 100%, rgba(176,0,0,0.32), transparent 70%),#050505;">
      <div class="absolute inset-[7px] rounded-lg border border-white/10 pointer-events-none"></div>
      <div class="relative h-full flex flex-col items-center text-center px-4 pt-6 pb-4">
        <div class="flex flex-col items-center gap-0.5">
          <img src="assets/logo/crown-mark.png" class="h-[18px] w-auto object-contain" alt="" />
          <img src="assets/logo/wordmark-mark.png" class="h-[22px] w-auto object-contain" alt="FanWarsIndia" />
        </div>

        <div class="relative mt-3 w-full h-[43%] rounded-lg overflow-hidden border-2 border-fwred/80" style="box-shadow:0 0 28px rgba(255,26,26,0.35)">
          <img src="${actorImage}" alt="${escapeHTML(name)}" class="absolute inset-0 w-full h-full object-cover object-top" />
          <div class="absolute inset-0" style="background:linear-gradient(to bottom, transparent 42%, rgba(5,5,5,0.97) 100%)"></div>
          ${
            rank
              ? `<div class="absolute top-2 left-2 bg-fwblack/90 border border-fwred rounded-md px-2 py-1 flex items-center gap-1 leading-none shadow-lg">${crown}<span class="font-display text-[15px]">#${rank}</span></div>`
              : ""
          }
          <div class="absolute inset-x-0 bottom-1.5 px-2">
            <p class="font-name text-white/70 text-[9px] uppercase tracking-[0.3em]">I Backed</p>
            ${nickname ? `<p class="font-name font-semibold text-fwred text-[11px] uppercase tracking-[0.22em] leading-tight">${escapeHTML(nickname)}</p>` : ""}
            <p class="font-display text-white text-[24px] uppercase leading-none truncate" style="text-shadow:0 2px 10px rgba(0,0,0,0.8)">${escapeHTML(name)}</p>
          </div>
        </div>

        <div class="mt-3">
          <p class="font-display text-[40px] leading-none break-all">${formatRupees(amount)}</p>
          <p class="font-name text-white/45 text-[9px] uppercase tracking-[0.3em] mt-1">Contributed</p>
        </div>

        <div class="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3 py-1">
          ${levelBadgeHTML(level, 10)}<span class="font-name font-semibold text-[12px] uppercase tracking-wide">${level.label}</span>
        </div>
        <p class="font-name text-white/45 text-[8px] uppercase tracking-[0.3em] mt-2">Backed by</p>
        <p class="font-name font-semibold text-[13px] uppercase tracking-wide max-w-full truncate">${escapeHTML(supporterName)}</p>

        <div class="mt-auto w-full pt-2">
          <div class="border-t border-dashed border-white/20 pt-2 flex items-center justify-between gap-2 text-left">
            <div class="rounded-md border border-fwred/70 px-2 py-1">
              <p class="font-name text-white/45 text-[7px] uppercase tracking-[0.25em] leading-none">Fan card ID</p>
              <p class="font-name font-bold text-[12px] tracking-[0.15em] leading-tight">${escapeHTML(token || "")}</p>
            </div>
            <div class="text-right">
              <p class="font-name text-white/45 text-[7px] uppercase tracking-[0.25em] leading-none">Issued</p>
              <p class="font-name font-medium text-[10px] tracking-wider leading-tight">${issuedOn()}</p>
            </div>
          </div>
          <p class="font-name text-white/55 text-[8px] uppercase tracking-[0.18em] mt-2">Your Star. Your Pride. Your War.</p>
          <p class="font-name font-semibold text-fwred text-[11px]">fanwarsindia.com</p>
        </div>
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
    const sy = (img.height - sh) * 0.12;
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
      const nudge = ctx.textAlign === "center" ? spacing / 2 : 0;
      ctx.fillText(text, x + nudge, y);
      ctx.letterSpacing = "0px";
    } else {
      ctx.fillText(text, x, y);
    }
  }

  async function toBlob({ actorTitle, actorName, actorImage, amount, level, rank, supporterName, token }) {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const { nickname, name } = splitTitle(actorTitle, actorName);

    await Promise.all([
      document.fonts.load("100px Anton"),
      document.fonts.load("700 40px Oswald"),
      document.fonts.load("600 40px Oswald"),
      document.fonts.load("500 30px Oswald"),
    ]).catch(() => {});

    const [crownImg, wordmarkImg, photo] = await Promise.all([
      loadImage("assets/logo/crown-mark.png"),
      loadImage("assets/logo/wordmark-mark.png"),
      loadImage(actorImage),
    ]);

    // ---- Background: near-black, red glow behind the star, faint light rays, grain, vignette ----
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, W, H);

    const glowTop = ctx.createRadialGradient(W / 2, 760, 0, W / 2, 760, 900);
    glowTop.addColorStop(0, "rgba(255,26,26,0.32)");
    glowTop.addColorStop(1, "rgba(255,26,26,0)");
    ctx.fillStyle = glowTop;
    ctx.fillRect(0, 0, W, H);

    const glowBottom = ctx.createRadialGradient(W / 2, H + 80, 0, W / 2, H + 80, 780);
    glowBottom.addColorStop(0, "rgba(176,0,0,0.38)");
    glowBottom.addColorStop(1, "rgba(176,0,0,0)");
    ctx.fillStyle = glowBottom;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, 330);
    [-0.62, -0.31, 0, 0.31, 0.62].forEach((angle) => {
      ctx.save();
      ctx.rotate(angle);
      const ray = ctx.createLinearGradient(0, 0, 0, 1500);
      ray.addColorStop(0, "rgba(255,255,255,0.07)");
      ray.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.lineTo(120, 1500);
      ctx.lineTo(-120, 1500);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();

    for (let i = 0; i < 6500; i++) {
      ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.05).toFixed(3)})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }

    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // Double frame
    ctx.strokeStyle = "rgba(255,26,26,0.6)";
    ctx.lineWidth = 5;
    roundedRectPath(ctx, 24, 24, W - 48, H - 48, 30);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    roundedRectPath(ctx, 44, 44, W - 88, H - 88, 22);
    ctx.stroke();

    ctx.textAlign = "center";

    // ---- Logo lockup (crown above wordmark), just below the Instagram top bar ----
    const crownH = 78;
    const crownW = crownImg.width * (crownH / crownImg.height);
    ctx.drawImage(crownImg, W / 2 - crownW / 2, 215, crownW, crownH);
    const wordmarkH = 92;
    const wordmarkW = wordmarkImg.width * (wordmarkH / wordmarkImg.height);
    ctx.drawImage(wordmarkImg, W / 2 - wordmarkW / 2, 298, wordmarkW, wordmarkH);

    // ---- Star photo with a fade into black and the name laid over it ----
    const px = 80;
    const py = 410;
    const pw = W - 160;
    const ph = 690;
    ctx.save();
    ctx.shadowColor = "rgba(255,26,26,0.6)";
    ctx.shadowBlur = 60;
    roundedRectPath(ctx, px, py, pw, ph, 34);
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRectPath(ctx, px, py, pw, ph, 34);
    ctx.clip();
    drawCover(ctx, photo, px, py, pw, ph);
    const fade = ctx.createLinearGradient(0, py + ph * 0.38, 0, py + ph);
    fade.addColorStop(0, "rgba(5,5,5,0)");
    fade.addColorStop(0.7, "rgba(5,5,5,0.86)");
    fade.addColorStop(1, "rgba(5,5,5,0.98)");
    ctx.fillStyle = fade;
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();

    roundedRectPath(ctx, px, py, pw, ph, 34);
    ctx.strokeStyle = "#FF1A1A";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Rank badge on the photo's corner
    if (rank) {
      const label = `#${rank}`;
      ctx.font = "78px Anton, 'Arial Black', Arial";
      const lw = ctx.measureText(label).width;
      const crownBadge = rank === 1;
      const bh = 110;
      const bw = lw + 70 + (crownBadge ? 70 : 0);
      const bx = px + 36;
      const by = py + 36;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 24;
      roundedRectPath(ctx, bx, by, bw, bh, 22);
      ctx.fillStyle = "rgba(5,5,5,0.88)";
      ctx.fill();
      ctx.restore();
      roundedRectPath(ctx, bx, by, bw, bh, 22);
      ctx.strokeStyle = "#FF1A1A";
      ctx.lineWidth = 5;
      ctx.stroke();
      let tx = bx + 35;
      if (crownBadge) {
        const ch = 56;
        const cw = crownImg.width * (ch / crownImg.height);
        ctx.drawImage(crownImg, tx, by + (bh - ch) / 2 - 2, cw, ch);
        tx += cw + 14;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.fillText(label, tx, by + 83);
      ctx.textAlign = "center";
    }

    // "I BACKED" / nickname / star name over the fade
    const textBottom = py + ph - 44;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 24;

    let nameSize = 132;
    let nameLines;
    do {
      ctx.font = `${nameSize}px Anton, 'Arial Black', Arial`;
      nameLines = [name.toUpperCase()];
      if (ctx.measureText(nameLines[0]).width > pw - 80) nameLines = nameSize > 92 ? null : wrapLines(ctx, name.toUpperCase(), pw - 80);
      if (nameLines) break;
      nameSize -= 6;
    } while (true);
    const nameLineH = Math.round(nameSize * 1.06);
    ctx.fillStyle = "#FFFFFF";
    nameLines.forEach((line, i) => ctx.fillText(line, W / 2, textBottom - (nameLines.length - 1 - i) * nameLineH));
    let ty = textBottom - (nameLines.length - 1) * nameLineH - nameSize * 0.86;

    if (nickname) {
      ctx.fillStyle = "#FF1A1A";
      ctx.font = "600 50px Oswald, Arial";
      spaced(ctx, nickname.toUpperCase(), W / 2, ty, 12);
      ty -= 66;
    }
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 32px Oswald, Arial";
    spaced(ctx, "I  BACKED", W / 2, ty, 14);
    ctx.restore();

    // ---- Amount ----
    let y = 1300;
    ctx.fillStyle = "#FFFFFF";
    let amtSize = 190;
    const amtText = formatRupees(amount);
    do {
      ctx.font = `${amtSize}px Anton, 'Arial Black', Arial`;
      amtSize -= 8;
    } while (ctx.measureText(amtText).width > W - 160 && amtSize > 60);
    ctx.fillText(amtText, W / 2, y);
    y += 50;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 32px Oswald, Arial";
    spaced(ctx, "CONTRIBUTED", W / 2, y, 12);

    // ---- Level pill ----
    const levelLabel = level.label.toUpperCase();
    ctx.font = "600 46px Oswald, Arial";
    const labelW = ctx.measureText(levelLabel).width;
    const iconW = level.key === "legend" ? 62 : 30;
    const pillW = labelW + iconW + 110;
    const pillH = 80;
    const pillX = W / 2 - pillW / 2;
    const pillY = 1382;
    roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 3;
    ctx.stroke();
    let ix = pillX + 42;
    if (level.key === "legend") {
      const ch = 50;
      const cw = crownImg.width * (ch / crownImg.height);
      ctx.drawImage(crownImg, ix, pillY + (pillH - ch) / 2 - 2, cw, ch);
      ix += cw + 20;
    } else {
      ctx.fillStyle = level.color;
      ctx.beginPath();
      ctx.arc(ix + 15, pillY + pillH / 2, 15, 0, Math.PI * 2);
      ctx.fill();
      ix += 30 + 20;
    }
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText(levelLabel, ix, pillY + 55);
    ctx.textAlign = "center";

    // ---- Backed by ----
    y = pillY + pillH + 52;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "500 28px Oswald, Arial";
    spaced(ctx, "BACKED BY", W / 2, y, 12);
    y += 58;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 54px Oswald, Arial";
    ctx.fillText(fitText(ctx, supporterName.toUpperCase(), W - 220), W / 2, y);

    // ---- Ticket stub: dashed line, card ID, issue date ----
    const lineY = 1618;
    ctx.save();
    ctx.setLineDash([16, 14]);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(96, lineY);
    ctx.lineTo(W - 96, lineY);
    ctx.stroke();
    ctx.restore();

    const boxX = 96;
    const boxY = lineY + 30;
    const boxW = 430;
    const boxH = 104;
    roundedRectPath(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.strokeStyle = "rgba(255,26,26,0.85)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 22px Oswald, Arial";
    spaced(ctx, "FAN CARD ID", boxX + 28, boxY + 36, 7);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 48px Oswald, Arial";
    spaced(ctx, token || "", boxX + 28, boxY + 86, 6);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 22px Oswald, Arial";
    spaced(ctx, "ISSUED", W - 96, boxY + 36, 7);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 42px Oswald, Arial";
    ctx.fillText(issuedOn(), W - 96, boxY + 86);
    ctx.textAlign = "center";

    // ---- Footer ----
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 28px Oswald, Arial";
    spaced(ctx, "YOUR STAR. YOUR PRIDE. YOUR WAR.", W / 2, 1796, 6);
    ctx.fillStyle = "#FF1A1A";
    ctx.font = "600 42px Oswald, Arial";
    ctx.fillText("fanwarsindia.com", W / 2, 1850);

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
