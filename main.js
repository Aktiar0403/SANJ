import {
  db,
  collection,
  getDocs
} from "./firebase.js";

/* ==============================
   GLOBAL STATE
============================== */

let baseInvestors = [];
let allocationMap = {};
let confirmedInjection = 0;

let personalLoans = [
  { id: "hdfc", name: "HDFC Block", emi: 46000, principal: 600000 },
  { id: "bajajHero", name: "Bajaj + Hero", emi: 30000, principal: 600000 },
  { id: "financeCorp", name: "FinanceCorp", emi: 19000, principal: 600000 }
];

let businessLoans = [
  { id: "lendingkart", name: "Lendingkart", emi: 88000, principal: 1100000 },
  { id: "hdfcBusiness", name: "HDFC Business", emi: 72000, principal: 1600000 },
  { id: "bajajBusiness", name: "Bajaj Business", emi: 42000, principal: 1100000 }
];

/* ==============================
   LOAD PRIVATE INVESTORS
============================== */

async function loadPrivateInvestors() {
  const snap = await getDocs(collection(db, "privateInvestors"));

  baseInvestors = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderPrivateUI();
}

/* ==============================
   PRIVATE UI
============================== */

function renderPrivateUI() {

  const container = document.getElementById("privateContainer");
  const summary = document.getElementById("privateSummary");

  if (!container) return;

  container.innerHTML = "";

  let totalInterest = 0;

  baseInvestors.forEach(inv => {
    totalInterest += Number(inv.monthlyInterest) || 0;
  });

  summary.innerHTML = `
    <strong>Total Monthly Private Interest:</strong>
    ₹ ${(totalInterest/100000).toFixed(2)} L
  `;

  baseInvestors.forEach(inv => {

    const rate =
      inv.monthlyInterest > 0
      ? ((inv.monthlyInterest / inv.principal) * 100).toFixed(2)
      : 0;

    container.innerHTML += `
      <div class="investor-card">

        <div class="investor-header" data-id="${inv.id}">
          <h3>${inv.name}</h3>
          <div>
            ₹ ${(inv.principal/100000).toFixed(1)}L
            <span class="toggle-icon" id="icon-${inv.id}">+</span>
          </div>
        </div>

        <div class="investor-body"
             id="body-${inv.id}"
             style="display:none;">

          <p><strong>Principal:</strong>
          ₹ ${(inv.principal/100000).toFixed(2)} L</p>

          <p><strong>Monthly Interest:</strong>
          ₹ ${(inv.monthlyInterest/100000).toFixed(2)} L</p>

          <p><strong>Effective Rate:</strong>
          ${rate}%</p>

          <hr>

        <label>Allocate from Godfather (₹)</label>

<div style="display:flex; gap:6px;">
  <input type="number"
    class="allocate-input"
    data-id="${inv.id}"
    placeholder="0">

  <button
    class="allocate-btn"
    data-id="${inv.id}">
    Add
  </button>
</div>

          <div class="negotiation-section"
               id="negotiation-${inv.id}"
               style="display:none;">

            <label>New Negotiated Rate %</label>
            <input type="number"
              class="new-rate"
              data-id="${inv.id}">

            <label>Skip Months</label>
            <input type="number"
              class="skip-months"
              data-id="${inv.id}">

          </div>

        </div>
      </div>
    `;
  });
attachAllocationButtons();
  attachPrivateEvents();
}
function attachAllocationButtons() {

  document
    .querySelectorAll(".allocate-btn, .personal-allocate-btn, .business-allocate-btn")
    .forEach(btn => {

      btn.addEventListener("click", () => {

        const id = btn.dataset.id;

        const input =
          document.querySelector(
            `[data-id='${id}'][type='number']`
          );

        const amount =
          Number(input?.value) || 0;

        if (amount <= 0) {
          alert("Enter valid amount");
          return;
        }

        const totalUsed =
          Object.values(allocationMap)
                .reduce((a,b)=>a+b,0);

        if (totalUsed + amount > confirmedInjection) {
          alert("Not enough remaining injection");
          return;
        }

        allocationMap[id] = amount;

        updateStickyBar();

      });

    });
}

function updateStickyBar() {

  const totalUsed =
    Object.values(allocationMap)
          .reduce((a,b)=>a+b,0);

  const remaining =
    confirmedInjection - totalUsed;

  document.getElementById("gfUsed").innerText =
    "₹ " + (totalUsed/100000).toFixed(2) + " L";

  document.getElementById("gfRemaining").innerText =
    "₹ " + (remaining/100000).toFixed(2) + " L";

}
/* ==============================
   PRIVATE EVENTS
============================== */

function attachPrivateEvents() {

  document
    .querySelectorAll("#privateContainer .investor-header")
    .forEach(header => {

      header.addEventListener("click", () => {

        const id = header.dataset.id;

        document
          .querySelectorAll("#privateContainer .investor-body")
          .forEach(body => body.style.display = "none");

        document
          .querySelectorAll("#privateContainer .toggle-icon")
          .forEach(icon => icon.innerText = "+");

        const body = document.getElementById("body-" + id);
        const icon = document.getElementById("icon-" + id);

        body.style.display = "block";
        icon.innerText = "−";
      });

    });

  document
    .querySelectorAll(".allocate-input")
    .forEach(input => {

      input.addEventListener("input", () => {

        const id = input.dataset.id;
        const value = Number(input.value) || 0;

        const negotiation =
          document.getElementById("negotiation-" + id);

        negotiation.style.display =
          value > 0 ? "block" : "none";

      });

    });
}

/* ==============================
   PERSONAL LOANS UI
============================== */

function renderPersonalLoans() {

  const container =
    document.getElementById("personalLoanContainer");

  container.innerHTML = "";

  personalLoans.forEach(loan => {

    container.innerHTML += `
      <div class="investor-card">

        <div class="investor-header" data-id="${loan.id}">
          <h3>${loan.name}</h3>
          <div>EMI ₹ ${(loan.emi/100000).toFixed(2)}L</div>
        </div>

        <div class="investor-body"
             id="personal-${loan.id}"
             style="display:none;">

          <p><strong>Outstanding:</strong>
          ₹ ${(loan.principal/100000).toFixed(2)} L</p>

          <p><strong>Monthly EMI:</strong>
          ₹ ${(loan.emi/100000).toFixed(2)} L</p>

         <label>Allocate to Close (₹)</label>

<div style="display:flex; gap:6px;">
  <input type="number"
    class="personal-allocate"
    data-id="${loan.id}"
    placeholder="0">

  <button
    class="personal-allocate-btn"
    data-id="${loan.id}">
    Add
  </button>
</div>
        </div>
      </div>
    `;
  });
  attachAllocationButtons();
  attachLoanToggle("#personalLoanContainer", "personal");
}

/* ==============================
   BUSINESS LOANS UI
============================== */

function renderBusinessLoans() {

  const container =
    document.getElementById("businessLoanContainer");

  container.innerHTML = "";

  businessLoans.forEach(loan => {

    container.innerHTML += `
      <div class="investor-card">

        <div class="investor-header" data-id="${loan.id}">
          <h3>${loan.name}</h3>
          <div>EMI ₹ ${(loan.emi/100000).toFixed(2)}L</div>
        </div>

        <div class="investor-body"
             id="business-${loan.id}"
             style="display:none;">

          <p><strong>Outstanding:</strong>
          ₹ ${(loan.principal/100000).toFixed(2)} L</p>

          <p><strong>Monthly EMI:</strong>
          ₹ ${(loan.emi/100000).toFixed(2)} L</p>

          <label>Allocate to Close (₹)</label>

<div style="display:flex; gap:6px;">
  <input type="number"
    class="business-allocate"
    data-id="${loan.id}"
    placeholder="0">

  <button
    class="business-allocate-btn"
    data-id="${loan.id}">
    Add
  </button>
</div>
        </div>
      </div>
    `;
  });
attachAllocationButtons();
  attachLoanToggle("#businessLoanContainer", "business");
}

/* ==============================
   GENERIC LOAN TOGGLE
============================== */

function attachLoanToggle(containerSelector, prefix) {

  document
    .querySelectorAll(`${containerSelector} .investor-header`)
    .forEach(header => {

      header.addEventListener("click", () => {

        const id = header.dataset.id;

        document
          .querySelectorAll(`${containerSelector} .investor-body`)
          .forEach(body => body.style.display = "none");

        const target =
          document.getElementById(`${prefix}-${id}`);

        target.style.display = "block";
      });

    });
}

/* ==============================
   INITIALIZE
============================== */

document.addEventListener("DOMContentLoaded", async () => {

  await loadPrivateInvestors();

  renderPersonalLoans();
  renderBusinessLoans();

});

function confirmInjection() {

  const input =
    Number(document.getElementById("godfatherInput")?.value) || 0;

  if (input <= 0) {
    alert("Enter valid injection amount");
    return;
  }

  confirmedInjection = input;

  // Update sticky immediately
  document.getElementById("gfTotal").innerText =
    "₹ " + (confirmedInjection/100000).toFixed(2) + " L";

  document.getElementById("gfUsed").innerText =
    "₹ 0.00 L";

  document.getElementById("gfRemaining").innerText =
    "₹ " + (confirmedInjection/100000).toFixed(2) + " L";

  alert("Injection Confirmed");

}
/* ==============================
   FULL SURVIVAL CALCULATION
============================== */

function calculateOutcome() {

  /* ==============================
     1️⃣ VALIDATE INJECTION
  ============================== */

  if (confirmedInjection <= 0) {
    alert("Please confirm Godfather injection first.");
    return;
  }

  const godfatherAmount = confirmedInjection;


  /* ==============================
     2️⃣ OPERATING CALCULATION
  ============================== */

  const revenue =
    Number(document.getElementById("revenue")?.value) || 0;

  const doctorPercent =
    Number(document.getElementById("doctorPercent")?.value) || 0;

  const cogsPercent =
    Number(document.getElementById("cogsPercent")?.value) || 0;

  const fixedExpense =
    Number(document.getElementById("fixedExpense")?.value) || 0;

  const doctorCost = revenue * (doctorPercent / 100);
  const cogs = revenue * (cogsPercent / 100);

  const operatingSurplus =
    revenue - doctorCost - cogs - fixedExpense;


  /* ==============================
     3️⃣ PRIVATE INVESTORS
  ============================== */

  let newPrivateInterest = 0;
  let injectionUsed = 0;

  baseInvestors.forEach(inv => {

    const allocation =
      allocationMap[inv.id] || 0;

    const effectiveAllocation =
      Math.min(allocation, inv.principal);

    injectionUsed += effectiveAllocation;

    const remainingPrincipal =
      inv.principal - effectiveAllocation;

    let originalRate = 0;

    if (inv.monthlyInterest > 0) {
      originalRate =
        (inv.monthlyInterest / inv.principal) * 100;
    }

    const negotiatedRate =
      Number(document.querySelector(
        `.new-rate[data-id='${inv.id}']`
      )?.value);

    const skipMonths =
      Number(document.querySelector(
        `.skip-months[data-id='${inv.id}']`
      )?.value) || 0;

    let finalRate = originalRate;

    if (effectiveAllocation > 0 && negotiatedRate) {
      finalRate = negotiatedRate;
    }

    if (skipMonths > 0) return;

    newPrivateInterest +=
      remainingPrincipal * (finalRate / 100);

  });


  /* ==============================
     4️⃣ PERSONAL LOANS
  ============================== */

  let newPersonalEMI = 0;

  personalLoans.forEach(loan => {

    const allocation =
      allocationMap[loan.id] || 0;

    if (allocation >= loan.principal) {
      injectionUsed += loan.principal;
      return;
    }

    newPersonalEMI += loan.emi;

  });


  /* ==============================
     5️⃣ BUSINESS LOANS
  ============================== */

  let newBusinessEMI = 0;

  businessLoans.forEach(loan => {

    const allocation =
      allocationMap[loan.id] || 0;

    if (allocation >= loan.principal) {
      injectionUsed += loan.principal;
      return;
    }

    newBusinessEMI += loan.emi;

  });


  /* ==============================
     6️⃣ VALIDATE OVER-ALLOCATION
  ============================== */

  if (injectionUsed > godfatherAmount) {
    alert("⚠ Allocation exceeds confirmed injection!");
    return;
  }


  /* ==============================
     7️⃣ GODFATHER COST
  ============================== */

  const godfatherCost =
    godfatherAmount * 0.01;


  /* ==============================
     8️⃣ FINAL MONTHLY BURDEN
  ============================== */

  const totalMonthlyBurden =
    newPrivateInterest +
    newPersonalEMI +
    newBusinessEMI +
    godfatherCost;

  const netMonthly =
    operatingSurplus - totalMonthlyBurden;

  const remainingBuffer =
    godfatherAmount - injectionUsed;


  /* ==============================
     9️⃣ RUNWAY
  ============================== */

  let runway;

  if (netMonthly >= 0) {
    runway = "Stable – Positive Cashflow";
  } else if (remainingBuffer > 0) {
    runway =
      (remainingBuffer / Math.abs(netMonthly))
        .toFixed(1) + " months";
  } else {
    runway = "Immediate Stress";
  }


  /* ==============================
     🔟 3-MONTH SAFETY CHECK
  ============================== */

  let warning = "";

  if (netMonthly < 0) {
    const required3MonthBuffer =
      Math.abs(netMonthly) * 3;

    if (remainingBuffer < required3MonthBuffer) {
      warning =
        `<p style="color:orange;">
         ⚠ Buffer below 3-month safety level
         </p>`;
    }
  }


  /* ==============================
     1️⃣1️⃣ UPDATE STICKY BAR
  ============================== */

  updateStickyBar();


  /* ==============================
     1️⃣2️⃣ STATUS
  ============================== */

  const statusColor =
    netMonthly >= 0 ? "lime" : "red";

  const statusText =
    netMonthly >= 0
      ? "🟢 SURVIVING"
      : "🔴 DEFICIT";


  /* ==============================
     1️⃣3️⃣ DISPLAY RESULTS
  ============================== */

  const results =
    document.getElementById("results");

  results.innerHTML = `

    <h3>Survival Report</h3>

    <p><strong>Operating Surplus:</strong>
    ₹ ${(operatingSurplus/100000).toFixed(2)} L</p>

    <hr>

    <p><strong>Private Interest:</strong>
    ₹ ${(newPrivateInterest/100000).toFixed(2)} L</p>

    <p><strong>Personal EMI:</strong>
    ₹ ${(newPersonalEMI/100000).toFixed(2)} L</p>

    <p><strong>Business EMI:</strong>
    ₹ ${(newBusinessEMI/100000).toFixed(2)} L</p>

    <p><strong>Godfather Cost (1%):</strong>
    ₹ ${(godfatherCost/100000).toFixed(2)} L</p>

    <hr>

    <p><strong>Total Monthly Burden:</strong>
    ₹ ${(totalMonthlyBurden/100000).toFixed(2)} L</p>

    <p><strong>Net Monthly Position:</strong>
    ₹ ${(netMonthly/100000).toFixed(2)} L</p>

    <hr>

    <p><strong>Injection Used:</strong>
    ₹ ${(injectionUsed/100000).toFixed(2)} L</p>

    <p><strong>Remaining Buffer:</strong>
    ₹ ${(remainingBuffer/100000).toFixed(2)} L</p>

    <p><strong>Runway:</strong> ${runway}</p>

    ${warning}

    <h3 style="color:${statusColor};">
      ${statusText}
    </h3>

  `;
}
/* ==========================================
   INITIALIZATION
========================================== */

document.addEventListener("DOMContentLoaded", async () => {

  // Load Private Investors from Firebase
  await loadPrivateInvestors();

  // Render Personal & Business Loans
  renderPersonalLoans();
  renderBusinessLoans();

  // Confirm Injection Button
  const injectBtn =
    document.getElementById("injectBtn");

  if (injectBtn) {
    injectBtn.addEventListener(
      "click",
      confirmInjection
    );
  }

  // Calculate Button
  const calculateBtn =
    document.getElementById("calculateBtn");

  if (calculateBtn) {
    calculateBtn.addEventListener(
      "click",
      calculateOutcome
    );
  }

});