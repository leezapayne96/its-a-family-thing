/* It’s a Family Thing — main JS (nav, countdown, RSVP storage, payments, filters) */
(function(){
  const cfg = window.SITE_CONFIG || {};
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // Footer year
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();

  // Mobile nav
  const toggle = $(".nav-toggle");
  const nav = $(".site-nav");
  if (toggle && nav){
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    // Close on link click
    $$(".nav-link", nav).forEach(a => a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
  }

  // Countdown (days until START_DATE_ISO)
  const counterEl = document.querySelector("[data-counter='days']");
  if (counterEl && cfg.START_DATE_ISO){
    const start = new Date(cfg.START_DATE_ISO + "T00:00:00");
    const now = new Date();
    const diff = start.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diff / (1000*60*60*24)));
    counterEl.textContent = String(days);
  }

  // RSVP storage (localStorage)
  const STORAGE_KEY = "its-a-family-thing:rsvps";
  const readRsvps = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch(e){ return []; }
  };
  const writeRsvps = (arr) => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

  // Home page RSVP count
  const rsvpCountEl = $("#rsvpCount");
  if (rsvpCountEl){
    rsvpCountEl.textContent = String(readRsvps().length);
  }

  // RSVP page
  const form = $("#rsvpForm");
  const list = $("#rsvpList");
  const sumAdults = $("#sumAdults");
  const sumKids = $("#sumKids");
  const sumParties = $("#sumParties");

  function renderRsvps(){
    if (!list) return;
    const rsvps = readRsvps();
    list.innerHTML = "";
    let aSum = 0, kSum = 0;

    if (!rsvps.length){
      list.innerHTML = `<div class="tiny">No RSVPs saved yet. Submit the form to add one.</div>`;
    } else {
      rsvps.slice().reverse().forEach(item => {
        aSum += Number(item.adults || 0);
        kSum += Number(item.kids || 0);
        const el = document.createElement("div");
        el.className = "rsvp-item";
        el.innerHTML = `
          <div class="row">
            <div class="name">${escapeHtml(item.name || "")}</div>
            <div class="meta">${escapeHtml(item.arrival || "")}</div>
          </div>
          <div class="meta">
            Adults: <strong>${Number(item.adults||0)}</strong> • Kids: <strong>${Number(item.kids||0)}</strong>
            ${item.tshirt ? ` • Shirt: <strong>${escapeHtml(item.tshirt)}</strong>` : ""}
          </div>
          ${item.notes ? `<div class="tiny" style="margin-top:6px">${escapeHtml(item.notes)}</div>` : ""}
        `;
        list.appendChild(el);
      });
    }

    if (sumAdults) sumAdults.textContent = String(aSum);
    if (sumKids) sumKids.textContent = String(kSum);
    if (sumParties) sumParties.textContent = String(rsvps.length);
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  if (form){
    renderRsvps();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const item = Object.fromEntries(fd.entries());
      item.savedAt = new Date().toISOString();

      // Save locally
      const rsvps = readRsvps();
      rsvps.push(item);
      writeRsvps(rsvps);

      form.reset();
      $("#adults").value = 1;
      $("#kids").value = 0;
      renderRsvps();

      alert("RSVP saved on this device! 🎉");

      // ===== OPTIONAL: send RSVPs to a real endpoint =====
      // 1) Formspree: https://formspree.io/
      //    - Create a form, then POST your data via fetch here.
      // 2) Google Forms: embed a Google Form instead of this local form.
      // 3) Airtable / Sheets: use a no-code form or a simple API endpoint.
    });

    const clearBtn = $("#clearRsvps");
    if (clearBtn){
      clearBtn.addEventListener("click", () => {
        if (confirm("Clear all saved RSVPs on this device?")){
          writeRsvps([]);
          renderRsvps();
        }
      });
    }

    const dlBtn = $("#downloadRsvps");
    if (dlBtn){
      dlBtn.addEventListener("click", () => {
        const rsvps = readRsvps();
        if (!rsvps.length){
          alert("No RSVPs to download yet.");
          return;
        }
        const cols = ["name","email","phone","adults","kids","arrival","tshirt","notes","savedAt"];
        const lines = [
          cols.join(","),
          ...rsvps.map(r => cols.map(c => csvCell(r[c] ?? "")).join(","))
        ];
        const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "rsvps-its-a-family-thing.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }
  }

  function csvCell(v){
    const s = String(v).replaceAll('"','""');
    return `"${s}"`;
  }

  // Payments page
  const stripeBtn = $("#stripePayBtn");
  if (stripeBtn){
    stripeBtn.href = cfg.STRIPE_PAYMENT_LINK || "#";
    if (!cfg.STRIPE_PAYMENT_LINK || cfg.STRIPE_PAYMENT_LINK.includes("REPLACE_ME")){
      stripeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        alert("Add your Stripe Payment Link in js/config.js (STRIPE_PAYMENT_LINK).");
      });
    }
  }
  const duesText = $("#duesText");
  if (duesText) duesText.textContent = cfg.DUES_TEXT || "";

  const contactLine = $("#contactLine");
  if (contactLine){
    const phone = cfg.CONTACT_PHONE ? ` • ${cfg.CONTACT_PHONE}` : "";
    const email = cfg.CONTACT_EMAIL ? ` • ${cfg.CONTACT_EMAIL}` : "";
    contactLine.textContent = `${cfg.CONTACT_NAME || ""}${phone}${email}`;
  }

  const PAID_KEY = "its-a-family-thing:paid";
  const paidStatus = $("#paidStatus");
  const paidDate = $("#paidDate");
  const markPaidBtn = $("#markPaidBtn");

  function renderPaid(){
    if (!paidStatus || !paidDate) return;
    const v = localStorage.getItem(PAID_KEY);
    if (!v){
      paidStatus.textContent = "Not marked paid";
      paidDate.textContent = "—";
      return;
    }
    try{
      const obj = JSON.parse(v);
      paidStatus.textContent = obj.status || "Paid";
      paidDate.textContent = new Date(obj.at).toLocaleString();
    }catch{
      paidStatus.textContent = "Paid";
      paidDate.textContent = "—";
    }
  }

  if (markPaidBtn){
    renderPaid();
    markPaidBtn.addEventListener("click", () => {
      const obj = { status: "Paid (marked on this device)", at: new Date().toISOString() };
      localStorage.setItem(PAID_KEY, JSON.stringify(obj));
      renderPaid();
      alert("Marked as paid on this device ✅");
    });
  }

  // Activities filters
  const grid = $("#activityGrid");
  const chips = $$(".chip");
  if (grid && chips.length){
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const f = chip.dataset.filter;
        $$(".activity", grid).forEach(card => {
          const tags = (card.dataset.tags || "").split(",");
          const show = (f === "all") || tags.includes(f);
          card.style.display = show ? "" : "none";
        });
      });
    });
  }
})();
