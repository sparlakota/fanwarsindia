/**
 * FanWarsIndia — Support flow sheet.
 * amount -> details (name + mobile) -> paying (Dodo checkout) -> verifying -> success
 *                                                                   \-> failed | processing
 * Nothing is credited in the browser: the server confirms with Dodo, and "success" is only
 * shown once order-status says so.
 */

const SupportFlow = (function () {
  const AMOUNT_OPTIONS = [49, 99, 199, 499, 999, 9999];
  const MIN_AMOUNT = 49; // Dodo product minimum — keep in sync with create-order
  const LARGEST_AMOUNT = 2147483647; // no limit by design: this is only the database column's capacity (a whole number of rupees)
  const BUSY_STEPS = ["paying", "verifying"];

  const ERROR_MESSAGES = {
    payments_not_configured: "Payments open very soon — we're finishing setup with our payment partner.",
    invalid_phone: "Enter a valid 10-digit Indian mobile number.",
    invalid_name: "Enter your name.",
    invalid_amount: `Enter an amount of ₹${MIN_AMOUNT} or more.`,
    too_many_attempts: "Too many attempts from this number. Try again in a few minutes.",
    network: "Couldn't reach the server. Check your connection and try again.",
    checkout_load: "Couldn't open the payment window. Check your connection and try again.",
    gateway_error: "Our payment partner didn't respond in time. Nothing was charged — please try again.",
  };
  const DEFAULT_ERROR = "Something went wrong starting the payment. Please try again.";

  function blankFlow() {
    return {
      open: false,
      step: "amount",
      actor: null,
      amount: null,
      customMode: false,
      supporterName: "",
      phone: "",
      orderId: null,
      result: null,
      error: null,
    };
  }

  let flow = blankFlow();

  function cleanAmount(value) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) && n >= MIN_AMOUNT && n <= LARGEST_AMOUNT ? n : null;
  }

  /** "+91 98765 43210" / "098765 43210" / "9876543210" -> "9876543210"; anything else -> null. */
  function normalizePhone(raw) {
    let digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : null;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const root = () => document.getElementById("modal-root");

  function closeBtnHTML() {
    return `<button id="modal-close" aria-label="Close" class="icon-btn text-white/50 hover:text-white w-9 h-9 -mr-2 flex items-center justify-center"><span class="w-4 h-4">${Icons.close()}</span></button>`;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && flow.open && !BUSY_STEPS.includes(flow.step)) close();
  });

  function open(actorId) {
    const actor = Store.getActorById(actorId);
    if (!actor) return;
    flow = { ...blankFlow(), open: true, actor };
    document.body.style.overflow = "hidden";
    if (!FW_CONFIG.paymentsOpen) {
      goTo("soon");
      return;
    }
    render();
    prepareForPayment();
  }

  /** Re-enter after a Dodo redirect back to /?order_id=... */
  function resume(orderId) {
    if (!/^fw_[a-z0-9_]{6,40}$/.test(orderId)) return;
    flow = { ...blankFlow(), open: true, orderId };
    document.body.style.overflow = "hidden";
    verify(orderId, { userClosed: false });
  }

  function close() {
    flow.open = false;
    document.body.style.overflow = "";
    root().innerHTML = "";
  }

  function goTo(step) {
    flow.step = step;
    render();
  }

  // ---------- payment ----------

  let dodoScript = null;
  function loadDodoScript() {
    if (!dodoScript) {
      dodoScript = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js";
        s.onload = resolve;
        s.onerror = () => {
          dodoScript = null;
          reject(new Error("checkout_load"));
        };
        document.head.appendChild(s);
      });
    }
    return dodoScript;
  }

  // Dodo's SDK is initialised once; each payment plugs its own listener into this slot.
  let dodoReady = null;
  let onCheckoutEvent = null;
  function getDodo(environment) {
    return loadDodoScript().then(() => {
      const sdk = window.DodoPaymentsCheckout && window.DodoPaymentsCheckout.DodoPayments;
      if (!sdk) throw new Error("checkout_load");
      if (!dodoReady) {
        sdk.Initialize({
          mode: environment === "live_mode" ? "live" : "test",
          displayType: "overlay",
          onEvent: (event) => onCheckoutEvent && onCheckoutEvent(event),
        });
        dodoReady = true;
      }
      return sdk;
    });
  }

  /** Called when the sheet opens: fetch Dodo's checkout code and wake our server in the background. */
  function prepareForPayment() {
    loadDodoScript().catch(() => {});
    Store.warmPaymentServer();
  }

  /**
   * Open Dodo's checkout over the page. Resolves { closed: true } when the fan closes it, or
   * { paid: true } / { failed: true } once Dodo reports an outcome (the server still confirms it).
   * manualRedirect keeps the fan on our page; if a bank/UPI step has to leave the page, we follow
   * Dodo's redirect and pick the order up again via ?order_id= on return.
   */
  function openCheckout(order) {
    return getDodo(order.environment).then(
      (sdk) =>
        new Promise((resolve) => {
          let pollTimer = null;
          const done = (result) => {
            clearInterval(pollTimer);
            onCheckoutEvent = null;
            resolve(result);
          };

          onCheckoutEvent = (event) => {
            const type = event && event.event_type;
            const data = (event && event.data) || {};
            console.debug("Dodo checkout event", type, data);
            if (type === "checkout.status") {
              const outcome = String(data.status || data.payment_status || "").toLowerCase();
              if (outcome === "succeeded" || outcome === "success") done({ paid: true });
              else if (outcome === "failed" || outcome === "cancelled") done({ failed: true });
            } else if (type === "checkout.redirect_requested") {
              const url = data.url || data.redirect_url || data.redirectUrl;
              if (typeof url === "string" && url.startsWith("https://")) {
                done({ redirect: true });
                window.location.assign(url);
              }
            } else if (type === "checkout.closed") {
              done({ closed: true });
            } else if (type === "checkout.error") {
              console.warn("Dodo checkout error", data);
            }
          };

          // The popup does not always announce the outcome (a UPI payment can leave it on "Processing"
          // even after Dodo confirmed it), so also ask OUR server, which asks Dodo. Only success ends
          // the wait here: after a failed attempt the fan may retry inside the same popup.
          let checking = false;
          pollTimer = setInterval(async () => {
            if (checking) return;
            checking = true;
            try {
              const s = await Store.getOrderStatus(order.order_id);
              if (s && s.status === "success") done({ paid: true });
            } catch (e) {
              /* keep waiting */
            } finally {
              checking = false;
            }
          }, 4000);

          sdk.Checkout.open({
            checkoutUrl: order.checkout_url,
            options: { manualRedirect: true, showSecurityBadge: true },
          });
        })
    );
  }

  async function startPayment() {
    flow.error = null;
    flow.slow = false;
    goTo("paying");
    // If the payment partner is slow, say so instead of leaving a silent spinner.
    const slowTimer = setTimeout(() => {
      if (flow.open && flow.step === "paying") {
        flow.slow = true;
        render();
      }
    }, 5000);

    let order;
    try {
      order = await Store.createOrder({
        actorId: flow.actor.id,
        amount: flow.amount,
        name: flow.supporterName.trim(),
        phone: flow.phone,
      });
    } catch (e) {
      clearTimeout(slowTimer);
      flow.error = ERROR_MESSAGES[e.code] || DEFAULT_ERROR;
      goTo("details");
      return;
    }
    clearTimeout(slowTimer);
    flow.orderId = order.order_id;

    let result;
    try {
      result = await openCheckout(order);
    } catch (e) {
      flow.error = ERROR_MESSAGES.checkout_load;
      goTo("details");
      return;
    }

    // Some bank/UPI flows leave the page; we pick the order up again via ?order_id= on return.
    if (result && result.redirect) return;
    try {
      if (window.DodoPaymentsCheckout.DodoPayments.Checkout.isOpen()) window.DodoPaymentsCheckout.DodoPayments.Checkout.close();
    } catch (e) {
      /* already closed */
    }
    await verify(order.order_id, { userClosed: !!(result && (result.closed || result.failed)) });
  }

  /**
   * Poll the server until Dodo has confirmed (or rejected) the order.
   * If the fan closed the checkout, give it a few seconds (they may have paid just before closing).
   */
  async function verify(orderId, { userClosed }) {
    goTo("verifying");
    const attempts = userClosed ? 3 : 20;
    for (let i = 0; i < attempts; i++) {
      let s = null;
      try {
        s = await Store.getOrderStatus(orderId);
      } catch (e) {
        if (e.code === "not_found" || e.code === "invalid_order") break;
      }
      if (!flow.open) return;
      if (s && s.status === "success") return finishSuccess(s);
      if (s && s.status === "failed") return goTo("failed");
      await sleep(2000);
      if (!flow.open) return;
    }
    goTo(userClosed ? "failed" : "processing");
  }

  function finishSuccess(s) {
    const actor = Store.getActorById(s.actor_id);
    if (!actor) return goTo("processing");
    flow.actor = actor;
    flow.amount = Number(s.amount);
    flow.supporterName = s.name;
    flow.result = {
      token: s.card_token,
      cumulative: Number(s.cumulative),
      previousFanPower: Number(s.previous_fan_power),
      newFanPower: Number(s.new_fan_power),
      previousRank: s.previous_rank,
      newRank: s.new_rank,
      level: getFanLevel(Number(s.cumulative)),
    };
    goTo("success");
    Store.load().then(() => flashMetric(actor.id));
  }

  // ---------- markup ----------

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
          ${closeBtnHTML()}
        </div>

        <div class="flex items-center gap-3 mb-6">
          <img src="${a.image}" alt="${a.name}" class="w-14 h-16 rounded-md object-cover border border-white/10" />
          <div>
            <h3 class="font-name font-semibold uppercase text-2xl leading-none">${a.name}</h3>
            <p class="font-name font-medium text-fwred/90 text-[13px] uppercase tracking-[0.14em] mt-1">${a.nickname}</p>
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
          <label for="custom-amount-input" class="text-xs uppercase tracking-wide text-white/40 block mb-1">Enter amount (₹)</label>
          <input
            id="custom-amount-input"
            type="number"
            min="${MIN_AMOUNT}"
            step="1"
            inputmode="numeric"
            placeholder="e.g. 250"
            class="w-full bg-white/5 border border-white/15 rounded-md px-4 py-3 text-lg font-display focus:outline-none focus:border-fwred"
          />
          <p id="custom-amount-hint" class="text-[11px] text-white/35 mt-1">Minimum ${formatRupees(MIN_AMOUNT)}</p>
        </div>

        <button id="amount-continue" disabled
          class="fire-btn tap-active w-full rounded-md py-4 font-display uppercase text-lg opacity-40 pointer-events-none">
          Continue
        </button>
      </div>
    `);
  }

  function detailsStepHTML() {
    const a = flow.actor;
    return shell(`
      <div class="p-5 pb-8">
        <div class="flex items-center justify-between mb-5">
          <button id="modal-back" class="icon-btn text-white/50 hover:text-white flex items-center gap-1.5 text-sm uppercase tracking-wide -ml-2 px-2 py-2">
            <span class="w-3.5 h-3.5 inline-block">${Icons.back()}</span> Back
          </button>
          ${closeBtnHTML()}
        </div>

        <p class="text-white/50 text-xs uppercase tracking-wide mb-1">Backing ${actorTitle(a)} with</p>
        <p class="font-display text-4xl text-fwred mb-6">${formatRupees(flow.amount)}</p>

        <label for="supporter-name-input" class="font-display uppercase text-lg mb-2 block">Your name</label>
        <input
          id="supporter-name-input"
          type="text"
          maxlength="40"
          autocomplete="name"
          placeholder="Shown on your Fan Card and the Fan Leaderboard"
          value="${escapeHTML(flow.supporterName)}"
          class="w-full bg-white/5 border border-white/15 rounded-md px-4 py-3.5 text-lg font-body focus:outline-none focus:border-fwred mb-5"
        />

        <label for="supporter-phone-input" class="font-display uppercase text-lg mb-2 block">Mobile number</label>
        <div class="flex items-stretch rounded-md border border-white/15 bg-white/5 focus-within:border-fwred mb-2">
          <span class="px-3 flex items-center text-white/50 text-lg border-r border-white/10">+91</span>
          <input
            id="supporter-phone-input"
            type="tel"
            inputmode="numeric"
            autocomplete="tel-national"
            maxlength="14"
            placeholder="10-digit mobile"
            value="${escapeHTML(flow.phone)}"
            class="flex-1 min-w-0 bg-transparent px-3 py-3.5 text-lg font-body focus:outline-none"
          />
        </div>
        <p class="text-[11px] text-white/40 mb-5 leading-relaxed">One number = one fan, so Fan Army stays real. We never show your number — only the last 4 digits appear on Top Fans.</p>

        ${flow.error ? `<p id="flow-error" role="alert" class="text-sm text-fwred bg-fwred/10 border border-fwred/30 rounded-md px-3 py-2.5 mb-4">${escapeHTML(flow.error)}</p>` : ""}

        <button id="pay-btn" disabled
          class="fire-btn tap-active w-full rounded-md py-4 font-display uppercase text-lg opacity-40 pointer-events-none flex items-center justify-center gap-2">
          <span class="w-4 h-4">${Icons.flame()}</span> Pay ${formatRupees(flow.amount)}
        </button>
        <p class="text-[11px] text-white/35 text-center mt-3">Secure payment · UPI and cards (RuPay, Visa, Mastercard)</p>
        <p class="text-[11px] text-white/40 text-center mt-2 leading-relaxed">By paying you agree to our <a href="terms.html" target="_blank" rel="noopener" class="underline hover:text-white">Terms</a>, <a href="privacy.html" target="_blank" rel="noopener" class="underline hover:text-white">Privacy Policy</a> and <a href="refund.html" target="_blank" rel="noopener" class="underline hover:text-white">Refund Policy</a>. Contributions are voluntary, non-refundable and go to FanWarsIndia, not to the actor.</p>
      </div>
    `);
  }

  function busyStepHTML(title, subtitle) {
    return shell(`
      <div class="p-8 pb-10 text-center" aria-live="polite">
        <div class="mx-auto mb-5 w-12 h-12 rounded-full border-4 border-white/10 border-t-fwred animate-spin"></div>
        <p class="font-display uppercase text-2xl">${title}</p>
        <p class="text-white/50 text-sm mt-2">${subtitle}</p>
      </div>
    `);
  }

  function soonStepHTML() {
    const a = flow.actor;
    return shell(`
      <div class="p-6 pb-8 text-center">
        <div class="flex justify-end mb-1">${closeBtnHTML()}</div>
        <img src="${a.image}" alt="${a.name}" class="w-24 h-28 mx-auto rounded-lg object-cover border-2 border-fwred/60 mb-4" />
        <p class="text-white/50 text-xs uppercase tracking-[0.2em]">Get ready to back</p>
        <p class="font-display uppercase text-2xl text-fwred leading-tight mt-1">${actorTitle(a)}</p>
        <p class="font-display uppercase text-xl mt-5">Support opens very soon</p>
        <p class="text-white/60 text-sm mt-2 leading-relaxed">We're switching on secure payments with our payment partner. Check back shortly — the war starts at zero, and the first fans in lead the board.</p>
        <button id="done-btn" class="fire-btn tap-active w-full rounded-md py-4 mt-6 font-display uppercase text-lg">Got it</button>
      </div>
    `);
  }

  function failedStepHTML() {
    const canRetry = !!flow.actor && !!flow.amount;
    return shell(`
      <div class="p-6 pb-8 text-center">
        <div class="flex justify-end mb-1">${closeBtnHTML()}</div>
        <p class="font-display uppercase text-2xl">Payment not completed</p>
        <p class="text-white/55 text-sm mt-2">No money was taken. If it was deducted, it's refunded automatically by your bank.</p>
        ${
          canRetry
            ? `<button id="retry-btn" class="fire-btn tap-active w-full rounded-md py-4 mt-6 font-display uppercase text-lg">Try again</button>`
            : ""
        }
        <button id="done-btn" class="chip-outline tap-active w-full rounded-md py-3 mt-3 font-display uppercase text-sm">Close</button>
      </div>
    `);
  }

  function processingStepHTML() {
    return shell(`
      <div class="p-6 pb-8 text-center">
        <div class="flex justify-end mb-1">${closeBtnHTML()}</div>
        <p class="font-display uppercase text-2xl">Payment processing</p>
        <p class="text-white/55 text-sm mt-2">Your bank is taking a little longer. As soon as it confirms, your support lands on the leaderboard automatically — no need to pay again.</p>
        <button id="done-btn" class="fire-btn tap-active w-full rounded-md py-4 mt-6 font-display uppercase text-lg">Got it</button>
      </div>
    `);
  }

  function successStepHTML() {
    const { actor, result } = flow;
    const level = result.level;
    // A star with no support yet is unranked on the board, so "climbed from #4" would be made up.
    const enteredBoard = result.previousFanPower === 0 && result.newRank;
    const rankMoved = !enteredBoard && result.previousRank && result.newRank && result.previousRank !== result.newRank;
    const rankLine = enteredBoard
      ? `Your star entered the board at #${result.newRank}`
      : rankMoved
        ? `Your star climbed from #${result.previousRank} to #${result.newRank}`
        : "";

    return shell(`
      <div class="p-5 pb-8 text-center">
        <div class="flex justify-end mb-1">
          ${closeBtnHTML()}
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
          ${rankLine ? `<p class="text-fwred text-xs uppercase tracking-wide mt-1">${rankLine}</p>` : ""}
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

        <button id="share-native" class="fire-btn tap-active w-full rounded-md py-4 mt-5 font-display uppercase text-lg flex items-center justify-center gap-2">
          <span class="w-5 h-5">${Icons.share()}</span> Share Fan Card
        </button>

        <div class="grid grid-cols-4 gap-2 mt-3">
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
        <p class="text-[11px] text-white/35 mt-2 text-center">On your phone, tap an app and your card image goes straight into it. For Instagram, choose Stories.</p>
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
    const views = {
      amount: amountStepHTML,
      details: detailsStepHTML,
      paying: () =>
        busyStepHTML(
          "Opening secure checkout",
          flow.slow
            ? "Our payment partner is taking a little longer than usual — still working, don't close this page."
            : "Hold tight — don't close this page."
        ),
      verifying: () => busyStepHTML("Confirming your payment", "Checking with the bank. This takes a few seconds."),
      soon: soonStepHTML,
      failed: failedStepHTML,
      processing: processingStepHTML,
      success: successStepHTML,
    };
    root().innerHTML = views[flow.step]();
    wireStep();
  }

  // ---------- wiring ----------

  function wireStep() {
    const backdrop = document.getElementById("sheet-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        if (e.target.id === "sheet-backdrop" && !BUSY_STEPS.includes(flow.step)) close();
      });
    }
    const closeBtn = document.getElementById("modal-close");
    if (closeBtn) closeBtn.addEventListener("click", close);
    const doneBtn = document.getElementById("done-btn");
    if (doneBtn && flow.step !== "success") doneBtn.addEventListener("click", close);

    if (flow.step === "amount") wireAmountStep();
    if (flow.step === "details") wireDetailsStep();
    if (flow.step === "failed") {
      const retry = document.getElementById("retry-btn");
      if (retry) retry.addEventListener("click", () => goTo("details"));
    }
    if (flow.step === "success") wireSuccessStep();
  }

  function wireAmountStep() {
    const continueBtn = document.getElementById("amount-continue");
    const amountBtns = document.querySelectorAll(".amount-btn");
    const customBtn = document.getElementById("custom-amount-btn");
    const customWrap = document.getElementById("custom-amount-wrap");
    const customInput = document.getElementById("custom-amount-input");
    const hint = document.getElementById("custom-amount-hint");

    function enableContinue(amount) {
      const valid = cleanAmount(amount) !== null;
      continueBtn.disabled = !valid;
      continueBtn.classList.toggle("opacity-40", !valid);
      continueBtn.classList.toggle("pointer-events-none", !valid);
    }

    // Coming back from the details step: restore the previous choice instead of a blank form.
    if (flow.customMode) {
      customBtn.classList.add("active");
      if (flow.amount) customInput.value = flow.amount;
    } else if (flow.amount) {
      amountBtns.forEach((b) => b.classList.toggle("active", Number(b.dataset.amount) === flow.amount));
    }
    enableContinue(flow.amount);

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
      flow.amount = cleanAmount(customInput.value);
      amountBtns.forEach((b) => b.classList.remove("active"));
      customBtn.classList.add("active");
      customWrap.classList.remove("hidden");
      customInput.focus();
      enableContinue(flow.amount);
    });

    customInput.addEventListener("input", () => {
      flow.amount = cleanAmount(customInput.value);
      const bad = customInput.value !== "" && flow.amount === null;
      hint.classList.toggle("text-fwred", bad);
      hint.classList.toggle("text-white/35", !bad);
      enableContinue(flow.amount);
    });

    function next() {
      const amount = cleanAmount(flow.amount);
      if (!amount) return;
      flow.amount = amount;
      flow.error = null;
      goTo("details");
    }
    customInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") next();
    });
    continueBtn.addEventListener("click", next);
  }

  function wireDetailsStep() {
    const backBtn = document.getElementById("modal-back");
    const nameInput = document.getElementById("supporter-name-input");
    const phoneInput = document.getElementById("supporter-phone-input");
    const payBtn = document.getElementById("pay-btn");

    function valid() {
      return nameInput.value.trim().length > 0 && normalizePhone(phoneInput.value) !== null;
    }
    function refresh() {
      flow.supporterName = nameInput.value;
      flow.phone = phoneInput.value;
      const ok = valid();
      payBtn.disabled = !ok;
      payBtn.classList.toggle("opacity-40", !ok);
      payBtn.classList.toggle("pointer-events-none", !ok);
    }
    function pay() {
      if (!valid()) return;
      flow.supporterName = nameInput.value.trim();
      flow.phone = normalizePhone(phoneInput.value);
      startPayment();
    }

    backBtn.addEventListener("click", () => {
      refresh();
      flow.error = null;
      goTo("amount");
    });
    [nameInput, phoneInput].forEach((el) => {
      el.addEventListener("input", refresh);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") pay();
      });
    });
    payBtn.addEventListener("click", pay);

    refresh();
    (nameInput.value.trim() ? phoneInput : nameInput).focus();
  }

  function wireSuccessStep() {
    const { actor, result } = flow;
    const level = result.level;
    const token = result.token;
    const cardData = {
      actorTitle: actorTitle(actor),
      actorName: actor.name,
      actorImage: actor.image,
      amount: flow.amount,
      level,
      rank: result.newRank,
      supporterName: flow.supporterName,
      token,
    };
    const filename = `fanwarsindia-${actor.slug}-${token}.png`;

    const mount = document.getElementById("fan-card-mount");
    mount.innerHTML = FanCard.html(cardData);

    // Render the PNG up front so the share sheet opens instantly inside the tap (browsers require that).
    const blobPromise = FanCard.toBlob(cardData);
    blobPromise.catch(() => {});

    const shareText = buildShareText(actor, flow.amount, level, result.newRank);

    document.getElementById("share-native").addEventListener("click", async () => {
      try {
        const outcome = await FanCard.shareBlob(await blobPromise, filename, shareText);
        if (outcome === "saved") toast("Card saved — post it from your gallery");
      } catch (e) {
        toast("Couldn't build the card — try Download");
      }
    });
    // WhatsApp / X / Instagram: on a phone the share sheet opens with the card IMAGE attached, so the
    // fan taps the app (for Instagram: Stories). Web pages cannot push a file into one named app any other
    // way. On a desktop browser (no file sharing) we save the card and open the app's page instead.
    async function shareImageTo(target) {
      let blob;
      try {
        blob = await blobPromise;
      } catch (e) {
        toast("Couldn't build the card — try Download");
        return;
      }
      const outcome = await FanCard.share(blob, filename, shareText);
      if (outcome === "shared" || outcome === "cancelled") return;

      FanCard.saveBlob(blob, filename);
      if (target === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
        toast("Card saved — attach it in WhatsApp");
      } else if (target === "x") {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
        toast("Card saved — attach it to your post");
      } else {
        const copied = await copyToClipboard(shareText);
        toast(copied ? "Card saved + caption copied — add it to your story" : "Card saved — add it to your story");
      }
    }
    document.getElementById("share-whatsapp").addEventListener("click", () => shareImageTo("whatsapp"));
    document.getElementById("share-x").addEventListener("click", () => shareImageTo("x"));
    document.getElementById("share-instagram").addEventListener("click", () => shareImageTo("instagram"));
    document.getElementById("share-copy").addEventListener("click", async () => {
      toast((await copyToClipboard(shareText)) ? "Copied to clipboard" : "Couldn't copy — select and copy manually");
    });
    document.getElementById("download-card").addEventListener("click", async () => {
      try {
        FanCard.saveBlob(await blobPromise, filename);
      } catch (e) {
        toast("Couldn't build the card — please retry");
      }
    });
    document.getElementById("done-btn").addEventListener("click", close);
  }

  function buildShareText(actor, amount, level, rank) {
    const rankText = rank ? ` and they're #${rank} on FanWarsIndia` : "";
    return `I just backed ${actorTitle(actor)} with ${formatRupees(amount)} Fan Power on FanWarsIndia${rankText}. ${level.label} tier. How powerful is your fandom? https://fanwarsindia.com #FanWarsIndia`;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  function toast(message) {
    const el = document.createElement("div");
    // Centred with mx-auto, not translate: pop-in's transform would override a translate.
    el.className =
      "fixed bottom-6 inset-x-4 mx-auto w-fit max-w-full text-center z-[70] bg-fwwhite text-fwblack text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg pop-in";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  return { open, resume, close };
})();
