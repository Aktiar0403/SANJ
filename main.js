import {
  db,
  collection,
  getDocs
} from "./firebase.js";

/* ==============================
   GLOBAL STATE
============================== */
let negotiationMap = {};
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
   UNIT CONVERSION (LAKHS MODE)
============================== */

function L(value) {
  // Lakhs → Rupees
  return Number(value) * 100000;
}

function toL(value) {
  // Rupees → Lakhs (2 decimal)
  return (Number(value) / 100000).toFixed(2);
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
    <strong>Total Monthly Commission:</strong>
    ₹ ${(totalInterest/100000).toFixed(2)} L
  `;

  baseInvestors.forEach(inv => {

    container.innerHTML += `
      <div class="investor-card">

        <div class="investor-header"
             data-id="${inv.id}"
             style="cursor:pointer;">

          <div>
            <h3>${inv.name}</h3>
            <small>
              Principal:
              ₹ ${(inv.principal/100000).toFixed(2)} L
            </small>
          </div>

          <div>
            Commission:
            ₹ ${(inv.monthlyInterest/100000).toFixed(2)} L
          </div>

        </div>

      </div>
    `;
  });

  /* 🔵 OPEN MODAL ON CLICK */

  document
    .querySelectorAll("#privateContainer .investor-header")
    .forEach(header => {

      header.addEventListener("click", () => {

        const id = header.dataset.id;

        const investor =
          baseInvestors.find(inv => inv.id === id);

        openModal(id, investor.name);

      });

    });

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

        document.getElementById(
          `allocated-${id}`
        ).innerText =
          (amount/100000).toFixed(2) + " L";

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


}

/* ==============================
   PERSONAL LOANS UI
============================== */

function renderPersonalLoans() {

  const container =
    document.getElementById("personalLoanContainer");

  if (!container) return;

  container.innerHTML = "";

  personalLoans.forEach(loan => {

    container.innerHTML += `
      <div class="investor-card">

        <div class="investor-header"
             data-id="${loan.id}"
             style="cursor:pointer;">

          <div>
            <h3>${loan.name}</h3>
            <small>
              Outstanding:
              ₹ ${(loan.principal/100000).toFixed(2)} L
            </small>
          </div>

          <div>
            EMI:
            ₹ ${(loan.emi/100000).toFixed(2)} L
          </div>

        </div>

      </div>
    `;
  });

  /* 🔵 OPEN MODAL ON CLICK */

  document
    .querySelectorAll("#personalLoanContainer .investor-header")
    .forEach(header => {

      header.addEventListener("click", () => {

        const id = header.dataset.id;

        const loan =
          personalLoans.find(l => l.id === id);

        openModal(id, loan.name);

      });

    });

}

/* ==============================
   BUSINESS LOANS UI
============================== */

function renderBusinessLoans() {

  const container =
    document.getElementById("businessLoanContainer");

  if (!container) return;

  container.innerHTML = "";

  businessLoans.forEach(loan => {

    container.innerHTML += `
      <div class="investor-card">

        <div class="investor-header"
             data-id="${loan.id}"
             style="cursor:pointer;">

          <div>
            <h3>${loan.name}</h3>
            <small>
              Outstanding:
              ₹ ${(loan.principal/100000).toFixed(2)} L
            </small>
          </div>

          <div>
            EMI:
            ₹ ${(loan.emi/100000).toFixed(2)} L
          </div>

        </div>

      </div>
    `;
  });

  /* 🔵 OPEN MODAL ON CLICK */

  document
    .querySelectorAll("#businessLoanContainer .investor-header")
    .forEach(header => {

      header.addEventListener("click", () => {

        const id = header.dataset.id;

        const loan =
          businessLoans.find(l => l.id === id);

        openModal(id, loan.name);

      });

    });

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

  confirmedInjection =
  L(document.getElementById("godfatherInput")?.value || 0);

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

const revenueInput =
  Number(document.getElementById("revenue")?.value) || 0;

const fixedExpenseInput =
  Number(document.getElementById("fixedExpense")?.value) || 0;

const revenue = L(revenueInput);
const fixedExpense = L(fixedExpenseInput);

const doctorPercent =
  Number(document.getElementById("doctorPercent")?.value) || 0;

const cogsPercent =
  Number(document.getElementById("cogsPercent")?.value) || 0;

const doctorCost =
  revenue * (doctorPercent / 100);

const cogs =
  revenue * (cogsPercent / 100);

const operatingSurplus =
  revenue - doctorCost - cogs - fixedExpense;

/* ==============================
   3️⃣ PRIVATE INVESTORS
============================== */

let newPrivateInterest = 0;
let injectionUsed = 0;

baseInvestors.forEach(inv => {

  const allocation = allocationMap[inv.id] || 0;

  const effectiveAllocation =
    Math.min(allocation, inv.principal);

  injectionUsed += effectiveAllocation;

  const remainingPrincipal =
    inv.principal - effectiveAllocation;

  if (remainingPrincipal <= 0) return;

  // proportional interest calculation
  const interestRatio =
    remainingPrincipal / inv.principal;

  const adjustedInterest =
    inv.monthlyInterest * interestRatio;

  newPrivateInterest += adjustedInterest;

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

 /* ==============================
   DISPLAY RESULTS (UPGRADED UI)
============================== */

const totalEMI =
  newPersonalEMI + newBusinessEMI;

const results =
  document.getElementById("results");

const heroClass =
  netMonthly >= 0
    ? "hero-card hero-positive"
    : "hero-card hero-negative";

results.innerHTML = `

  <div class="hero-container">

    <div class="hero-card">
      <h4>Total Monthly Burden</h4>
      <h2>₹ ${toL(totalMonthlyBurden)} L</h2>
    </div>

    <div class="${netMonthly >= 0 ? "hero-card hero-positive" : "hero-card hero-negative"}">
      <h4>Net Monthly Position</h4>
      <h2>₹ ${toL(netMonthly)} L</h2>
    </div>

  </div>

  <div class="summary-block">

    <p><strong>Operating Surplus:</strong>
    ₹ ${toL(operatingSurplus)} L</p>

    <hr>

    <p><strong>Commission:</strong>
    ₹ ${toL(newPrivateInterest)} L</p>

    <p><strong>Total EMI (Personal + Business):</strong>
    ₹ ${toL(newPersonalEMI + newBusinessEMI)} L</p>

    <p><strong>Godfather Cost (1%):</strong>
    ₹ ${toL(godfatherCost)} L</p>

    <hr>

    <p><strong>Injection Used:</strong>
    ₹ ${toL(injectionUsed)} L</p>

    <p><strong>Remaining Buffer:</strong>
    ₹ ${toL(remainingBuffer)} L</p>

    <p><strong>Runway:</strong> ${runway}</p>

  </div>
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

let currentModalId = null;

function openModal(id, name) {

  currentModalId = id;

  document.getElementById("modalTitle").innerText = name;

  document.getElementById("allocationModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("allocationModal").style.display = "none";
}

document.getElementById("closeModal")
  .addEventListener("click", closeModal);


  document.getElementById("negotiationToggle")
  .addEventListener("change", function() {

    document.getElementById("negotiationFields")
      .style.display = this.checked ? "block" : "none";

});

document.getElementById("modalAddBtn")
  .addEventListener("click", () => {

    const amount =
  L(document.getElementById("modalAllocation").value || 0);

    if (amount <= 0) {
      alert("Enter valid amount");
      return;
    }

    const totalUsed =
      Object.values(allocationMap)
            .reduce((a,b)=>a+b,0);

    if (totalUsed + amount > confirmedInjection) {
      alert("Not enough injection remaining");
      return;
    }

    allocationMap[currentModalId] = amount;

    // Save negotiation
    if (document.getElementById("negotiationToggle").checked) {

      const newRate =
        Number(document.getElementById("modalNewRate").value);

      const skip =
        Number(document.getElementById("modalSkipMonths").value);

      negotiationMap[currentModalId] = {
        newRate,
        skip
      };
    }

    updateStickyBar();
    closeModal();

});