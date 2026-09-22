/**
 * FanWarsIndia — Support flow modal (amount -> name -> celebration/share).
 * Frontend-only simulation. Wiring point for a real payment provider later
 * is clearly marked in Store.addContribution().
 */

const SupportFlow = (function () {
  const AMOUNT_OPTIONS = [49, 99, 199, 499, 999];

  let flow = {
    open: false,
    step: "amount", // amount | name | success
    actor: null,
    amount: null,
    customMode: false,
    supporterName: "",
    result: null,
  };

  const root = () => document.getElementById("modal-root");

  function open(actorId) {
    const actor = Store.state.actors.find((a) => a.id === actorId);
    if (!actor) return;
    flow = {
      open: true,
      step: "amount",
      actor,
      amount: null,
      customMode: false,
      supporterName: "",
      result: null,
    };
    document.body.style.overflow = "hidden";
    render();
  }

  function close() {
    flow.open = false;
    document.body.style.overflow = "";
    root().innerHTML = "";
  }

  function goToName(amount) {
    flow.amount = amount;
    flow.step = "name";
    render();
  }

  function submit(name) {
    flow.supporterName = name;
    const result = Store.addContribution(flow.actor.id, flow.amount, name);
    flow.result = result;
    flow.step = "success";
    render(); // Store.addContribution() already triggered the homepage re-render via subscribe()
    setTimeout(() => flashMetric(flow.actor.id), 50);
  }

  function shell(innerHTML) {
    return `
    <div id="sheet-backdrop" class="fixed inset-0 z-50 sheet-backdrop flex items-end sm:items-center justify-center">
      <div id="sheet-panel" class="pop-in relative w-full sm:max-w-md sm:rounded-lg rounded-t-2xl bg-fwblack border border-white/10 max-h-[92vh] overflow-y-auto no-scrollbar">
        ${innerHTML}
      </div>
    </div>`;
  }

  function amountStepHTML() {
    const a = flow.actor;
    return shell(`
      <div class="p-5 pb-8">
        <div class="flex items-center justify-between mb-5">
          <span class="text-xs uppercase tracking-[0.2em] text-white/40">Support</span>
          <button id="modal-close" class="icon-btn text-white/50 hover:text-white w-9 h-9 -mr-2 flex items-center justify-center"><span class="w-4 h-4">${Icons.close()}</span></button>
        </div>

        <div class="flex items-center gap-3 mb-6">
          <img src="${a.image}" alt="${a.name}" class="w-14 h-16 rounded-md object-cover border border-white/10" />
          <div>
            <h3 class="font-display uppercase text-xl leading-none">${a.name}</h3>
            <p class="text-fwred/90 text-xs uppercase tracking-wide mt-1">${a.nickname}</p>
          </div>
        </div>

        <p class="font-display uppercase text-lg mb-3 flex items-center gap-2">
          <span class="w-4 h-4 text-fwred inline-block">${Icons.flame()}</span> Choose your fan power
        </p>

        <div class="grid grid-cols-3 gap-2 mb-3">
          ${AMOUNT_OPTIONS.map(
            (amt) => `
            <button class="amount-btn chip-outline tap-active rounded-md py-4 font-display text-lg" data-amount="${amt}">
              ${formatRupees(amt)}
            </button>`
          ).join("")}
          <button id="custom-amount-btn" class="chip-outline tap-active rounded-md py-4 font-display text-sm col-span-3 sm:col-span-1">
            Custom
          </button>
        </div>

        <div id="custom-amount-wrap" class="${flow.customMode ? "" : "hidden"} mb-3">
          <label class="text-xs uppercase tracking-wide text-white/40 block mb-1">Enter amount (₹)</label>
          <input
            id="custom-amount-input"
            type="number"
            min="1"
            inputmode="numeric"
            placeholder="e.g. 250"
            class="w-full bg-white/5 border border-white/15 rounded-md px-4 py-3 text-lg font-display focus:outline-none focus:border-fwred"
          />
        </div>

        <button id="amount-continue" disabled
          class="fire-btn tap-active w-full rounded-md py-4 font-display uppercase text-lg opacity-40 pointer-events-none">
          Continue
        </button>
      </div>
    `);
  }

  function nameStepHTML() {
    const a = flow.actor;
    return shell(`
      <div class="p-5 pb-8">
        <div class="flex items-center justify-between mb-5">
          <button id="modal-back" class="icon-btn text-white/50 hover:text-white flex items-center gap-1.5 text-sm uppercase tracking-wide -ml-2 px-2 py-2">
            <span class="w-3.5 h-3.5 inline-block">${Icons.back()}</span> Back
          </button>
          <button id="modal-close" class="icon-btn text-white/50 hover:text-white w-9 h-9 -mr-2 flex items-center justify-center"><span class="w-4 h-4">${Icons.close()}</span></button>
        </div>

        <p class="text-white/50 text-xs uppercase tracking-wide mb-1">Backing ${actorTitle(a)} with</p>
        <p class="font-display text-4xl text-fwred mb-6">${formatRupees(flow.amount)}</p>

        <p class="font-display uppercase text-lg mb-3">What's your name?</p>
        <input
          id="supporter-name-input"
          type="text"
          maxlength="40"
          placeholder="Enter your name"
          class="w-full bg-white/5 border border-white/15 rounded-md px-4 py-4 text-lg font-body focus:outline-none focus:border-fwred mb-2"
          autofocus
        />
        <p class="text-[11px] text-white/30 mb-6 uppercase tracking-wide">Shown on your Fan Card and the activity wall</p>

        <button id="name-submit" disabled
          class="fire-btn tap-active w-full rounded-md py-4 font-display uppercase text-lg opacity-40 pointer-events-none flex items-center justify-center gap-2">
          <span class="w-4 h-4">${Icons.flame()}</span> Confirm Support
        </button>
      </div>
    `);
  }

  function successStepHTML() {
    const { actor, result } = flow;
    const level = result.level;
    const rankMoved = result.previousRank && result.newRank && result.previousRank !== result.newRank;

    return shell(`
      <div class="p-5 pb-8 text-center">
        <div class="flex justify-end mb-1">
          <button id="modal-close" class="icon-btn text-white/50 hover:text-white w-9 h-9 -mr-2 flex items-center justify-center"><span class="w-4 h-4">${Icons.close()}</span></button>
        </div>

        <div class="pop-in">
          <p class="font-display uppercase text-2xl sm:text-3xl leading-tight text-center flex flex-col items-center gap-1">
            <span class="w-6 h-6 text-fwred">${Icons.flame()}</span>
            <span>You just backed</span>
            <span class="text-fwred">${actorTitle(actor)}</span>
          </p>

          <p class="font-display text-fwred text-4xl mt-4">+${formatRupees(flow.amount)}</p>
          <p class="text-white/40 text-xs uppercase tracking-wide -mt-1">Fan Power</p>

          <div class="mt-4 flex items-center justify-center gap-2 text-white/60 text-sm font-display">
            <span>${formatRupees(result.previousFanPower)}</span>
            <span class="text-fwred">→</span>
            <span class="text-fwwhite text-base">${formatRupees(result.newFanPower)}</span>
          </div>
          ${rankMoved ? `<p class="text-fwred text-xs uppercase tracking-wide mt-1">Your star climbed from #${result.previousRank} to #${result.newRank}</p>` : ""}
        </div>

        <div class="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p class="text-white/40 text-xs uppercase tracking-wide mb-1">Your Fan Status</p>
          <p class="font-display text-2xl flex items-center justify-center gap-2">${levelBadgeHTML(level, 22)} ${level.label.toUpperCase()}</p>
          <p class="text-white/40 text-xs mt-1">${formatRupees(result.cumulative)} contributed to ${actor.name}</p>
        </div>

        <p class="mt-5 text-white/70 text-sm">Your support just moved your star.</p>

        <!-- FAN CARD -->
        <div class="mt-6">
          <p class="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">Share Your Support</p>
          <div id="fan-card-mount"></div>
        </div>

        <div class="grid grid-cols-4 gap-2 mt-5">
          <button id="share-whatsapp" class="chip-outline tap-active rounded-md py-3 flex flex-col items-center gap-1.5">
            <span class="w-5 h-5">${Icons.whatsapp()}</span><span class="text-[10px] uppercase">WhatsApp</span>
          </button>
          <button id="share-x" class="chip-outline tap-active rounded-md py-3 flex flex-col items-center gap-1.5">
            <span class="w-5 h-5">${Icons.x()}</span><span class="text-[10px] uppercase">X</span>
          </button>
          <button id="share-instagram" class="chip-outline tap-active rounded-md py-3 flex flex-col items-center gap-1.5">
            <span class="w-5 h-5">${Icons.instagram()}</span><span class="text-[10px] uppercase">Instagram</span>
          </button>
          <button id="share-copy" class="chip-outline tap-active rounded-md py-3 flex flex-col items-center gap-1.5">
            <span class="w-5 h-5">${Icons.link()}</span><span class="text-[10px] uppercase">Copy</span>
          </button>
        </div>
        <button id="download-card" class="mt-3 w-full chip-outline tap-active rounded-md py-3 font-display uppercase text-sm flex items-center justify-center gap-2">
          <span class="w-4 h-4">${Icons.download()}</span> Download Fan Card
        </button>

        <button id="done-btn" class="fire-btn tap-active w-full rounded-md py-4 font-display uppercase text-lg mt-6">
          Done
        </button>
      </div>
    `);
  }

  function render() {
    if (!flow.open) return;
    root().innerHTML =
      flow.step === "amount" ? amountStepHTML() : flow.step === "name" ? nameStepHTML() : successStepHTML();
    wireStep();
  }

  function wireStep() {
    const backdrop = document.getElementById("sheet-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        if (e.target.id === "sheet-backdrop") close();
      });
    }
    const closeBtn = document.getElementById("modal-close");
    if (closeBtn) closeBtn.addEventListener("click", close);

    if (flow.step === "amount") wireAmountStep();
    if (flow.step === "name") wireNameStep();
    if (flow.step === "success") wireSuccessStep();
  }

  function wireAmountStep() {
    const continueBtn = document.getElementById("amount-continue");
    const amountBtns = document.querySelectorAll(".amount-btn");
    const customBtn = document.getElementById("custom-amount-btn");
    const customWrap = document.getElementById("custom-amount-wrap");
    const customInput = document.getElementById("custom-amount-input");

    function enableContinue(amount) {
      const valid = Number(amount) > 0;
      continueBtn.disabled = !valid;
      continueBtn.classList.toggle("opacity-40", !valid);
      continueBtn.classList.toggle("pointer-events-none", !valid);
    }

    amountBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        flow.customMode = false;
        flow.amount = Number(btn.dataset.amount);
        amountBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        customWrap.classList.add("hidden");
        customBtn.classList.remove("active");
        enableContinue(flow.amount);
      });
    });

    customBtn.addEventListener("click", () => {
      flow.customMode = true;
      flow.amount = null;
      amountBtns.forEach((b) => b.classList.remove("active"));
      customBtn.classList.add("active");
      customWrap.classList.remove("hidden");
      customInput.focus();
      enableContinue(null);
    });

    if (customInput) {
      customInput.addEventListener("input", () => {
        flow.amount = Number(customInput.value);
        enableContinue(flow.amount);
      });
    }

    continueBtn.addEventListener("click", () => {
      if (Number(flow.amount) > 0) goToName(Math.round(Number(flow.amount)));
    });
  }

  function wireNameStep() {
    const backBtn = document.getElementById("modal-back");
    const input = document.getElementById("supporter-name-input");
    const submitBtn = document.getElementById("name-submit");

    backBtn.addEventListener("click", () => {
      flow.step = "amount";
      render();
    });

    function toggleSubmit() {
      const valid = input.value.trim().length > 0;
      submitBtn.disabled = !valid;
      submitBtn.classList.toggle("opacity-40", !valid);
      submitBtn.classList.toggle("pointer-events-none", !valid);
    }

    input.addEventListener("input", toggleSubmit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) submit(input.value.trim());
    });
    submitBtn.addEventListener("click", () => {
      if (input.value.trim()) submit(input.value.trim());
    });
  }

  function wireSuccessStep() {
    const { actor, result } = flow;
    const level = result.level;
    const mount = document.getElementById("fan-card-mount");
    mount.innerHTML = FanCard.html({
      actorName: actor.name,
      actorImage: actor.image,
      amount: flow.amount,
      cumulative: result.cumulative,
      level,
      rank: result.newRank,
    });

    const shareText = buildShareText(actor, flow.amount, level, result.newRank);

    document.getElementById("share-whatsapp").addEventListener("click", () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
    });
    document.getElementById("share-x").addEventListener("click", () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
    });
    document.getElementById("share-instagram").addEventListener("click", async () => {
      await copyToClipboard(shareText);
      toast("Caption copied — paste it into your Instagram story");
    });
    document.getElementById("share-copy").addEventListener("click", async () => {
      await copyToClipboard(shareText);
      toast("Copied to clipboard");
    });
    document.getElementById("download-card").addEventListener("click", () => {
      FanCard.download({
        actorName: actor.name,
        amount: flow.amount,
        cumulative: result.cumulative,
        level,
        rank: result.newRank,
      });
    });
    document.getElementById("done-btn").addEventListener("click", close);
  }

  function buildShareText(actor, amount, level, rank) {
    const rankText = rank ? ` and they're #${rank} on FanWarsIndia` : "";
    return `I just backed ${actor.name} with ${formatRupees(amount)} Fan Power on FanWarsIndia${rankText}. ${level.label} tier. How powerful is your fandom? #FanWarsIndia`;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      /* clipboard unavailable — silently ignore */
    }
  }

  function toast(message) {
    const el = document.createElement("div");
    el.className =
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-fwwhite text-fwblack text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg pop-in";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  return { open, close };
})();
