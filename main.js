import {
  db,
  collection,
  getDocs
} from "./firebase.js";

/* ==============================
   GLOBAL STATE
============================== */

let baseInvestors = [];

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
          <input type="number"
            class="allocate-input"
            data-id="${inv.id}"
            placeholder="0">

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

  attachPrivateEvents();
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

          <label>Close Fully</label>
          <input type="checkbox"
            class="personal-close"
            data-id="${loan.id}">
        </div>
      </div>
    `;
  });

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

          <label>Close Fully</label>
          <input type="checkbox"
            class="business-close"
            data-id="${loan.id}">
        </div>
      </div>
    `;
  });

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

if (confirmedInjection <= 0) {
  alert("Please confirm Godfather injection first.");
  return;
}



  /* ========= 1️⃣ OPERATING ========= */

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


  /* ========= 2️⃣ GODFATHER ========= */

  const godfatherAmount = confirmedInjection;

  const godfatherCost =
    godfatherAmount * 0.01;

  let injectionUsed = 0;


  /* ========= 3️⃣ PRIVATE ========= */

  let newPrivateInterest = 0;

  baseInvestors.forEach(inv => {

    const allocation =
      Number(document.querySelector(
        `.allocate-input[data-id='${inv.id}']`
      )?.value) || 0;

    const negotiatedRate =
      Number(document.querySelector(
        `.new-rate[data-id='${inv.id}']`
      )?.value);

    const skipMonths =
      Number(document.querySelector(
        `.skip-months[data-id='${inv.id}']`
      )?.value) || 0;

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

    let finalRate = originalRate;

    if (effectiveAllocation > 0 && negotiatedRate) {
      finalRate = negotiatedRate;
    }

    if (skipMonths > 0) return;

    newPrivateInterest +=
      remainingPrincipal * (finalRate / 100);

  });


  /* ========= 4️⃣ PERSONAL LOANS ========= */

  let newPersonalEMI = 0;

  personalLoans.forEach(loan => {

    const close =
      document.querySelector(
        `.personal-close[data-id='${loan.id}']`
      )?.checked;

    if (close) {
      injectionUsed += loan.principal;
      return;
    }

    newPersonalEMI += loan.emi;

  });


  /* ========= 5️⃣ BUSINESS LOANS ========= */

  let newBusinessEMI = 0;

  businessLoans.forEach(loan => {

    const close =
      document.querySelector(
        `.business-close[data-id='${loan.id}']`
      )?.checked;

    if (close) {
      injectionUsed += loan.principal;
      return;
    }

    newBusinessEMI += loan.emi;

  });


  /* ========= 6️⃣ VALIDATION ========= */

  if (injectionUsed > godfatherAmount) {
    alert("⚠ Allocation exceeds Godfather amount!");
    return;
  }


  /* ========= 7️⃣ FINAL BURDEN ========= */

  const totalMonthlyBurden =
    newPrivateInterest +
    newPersonalEMI +
    newBusinessEMI +
    godfatherCost;

  const netMonthly =
    operatingSurplus - totalMonthlyBurden;

  const remainingBuffer =
    godfatherAmount - injectionUsed;


   /* ========= UPDATE STICKY BAR ========= */

const gfTotal = document.getElementById("gfTotal");
const gfUsed = document.getElementById("gfUsed");
const gfRemaining = document.getElementById("gfRemaining");

gfTotal.innerText =
  "₹ " + (godfatherAmount/100000).toFixed(2) + " L";

gfUsed.innerText =
  "₹ " + (injectionUsed/100000).toFixed(2) + " L";

gfRemaining.innerText =
  "₹ " + (remainingBuffer/100000).toFixed(2) + " L";

// Color logic
gfRemaining.classList.remove("stable","warning","danger");

if (remainingBuffer < 0) {
  gfRemaining.classList.add("danger");
} else if (remainingBuffer < godfatherAmount * 0.25) {
  gfRemaining.classList.add("warning");
} else {
  gfRemaining.classList.add("stable");
} 

  /* ========= 8️⃣ RUNWAY ========= */

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


  /* ========= 9️⃣ 3-MONTH WARNING ========= */

  let warning = "";

  if (netMonthly < 0) {
    const requiredBuffer =
      Math.abs(netMonthly) * 3;

    if (remainingBuffer < requiredBuffer) {
      warning = `
        <p style="color:orange;">
        ⚠ Buffer less than 3-month safety level
        </p>
      `;
    }
  }


  /* ========= 🔟 STATUS ========= */

  let statusColor =
    netMonthly >= 0 ? "lime" : "red";

  let statusText =
    netMonthly >= 0
      ? "🟢 SURVIVING"
      : "🔴 DEFICIT";


  /* ========= DISPLAY ========= */

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



function renderPrivate() {
  const container = document.getElementById("privateList");
  container.innerHTML = "";

  privateInvestors.forEach((inv, i) => {
    container.innerHTML += `
      <div class="investor">
        <strong>${inv.name}</strong>
        <label>Principal</label>
        <input type="number" onchange="privateInvestors[${i}].principal=this.value" />
        <label>Rate %</label>
        <input type="number" onchange="privateInvestors[${i}].rate=this.value" />
        <label>Reduce Principal</label>
        <input type="number" onchange="privateInvestors[${i}].reduce=this.value" />
        <label>New Rate (optional)</label>
        <input type="number" onchange="privateInvestors[${i}].newRate=this.value" />
        <label>
          <input type="checkbox" onchange="privateInvestors[${i}].close=this.checked" />
          Close Fully
        </label>
      </div>
    `;
  });
}

function renderBank() {
  const container = document.getElementById("bankList");
  container.innerHTML = "";

  bankLoans.forEach((loan, i) => {
    container.innerHTML += `
      <div class="investor">
        <strong>${loan.name}</strong>
        <label>Principal</label>
        <input type="number" onchange="bankLoans[${i}].principal=this.value" />
        <label>EMI</label>
        <input type="number" onchange="bankLoans[${i}].emi=this.value" />
        <label>
          <input type="checkbox" onchange="bankLoans[${i}].close=this.checked" />
          Close Fully
        </label>
      </div>
    `;
  });
}

function calculate() {
  const revenue = Number(document.getElementById("revenue").value);
  const doctorPercent = Number(document.getElementById("doctorPercent").value);
  const cogsPercent = Number(document.getElementById("cogsPercent").value);
  const fixedExpense = Number(document.getElementById("fixedExpense").value);
  const godfatherAmount = Number(document.getElementById("godfatherAmount").value);

  // Operating
  const doctorCost = revenue * (doctorPercent / 100);
  const cogs = revenue * (cogsPercent / 100);
  const operatingSurplus = revenue - doctorCost - cogs - fixedExpense;

  let injectionUsed = 0;
  let privateInterest = 0;
  let bankEMI = 0;

  privateInvestors.forEach(inv => {
    if (inv.close) {
      injectionUsed += Number(inv.principal);
      return;
    }

    const reducedPrincipal =
      Number(inv.principal) - Number(inv.reduce || 0);

    injectionUsed += Number(inv.reduce || 0);

    const finalRate = inv.newRate
      ? Number(inv.newRate)
      : Number(inv.rate);

    privateInterest +=
      reducedPrincipal * (finalRate / 100);
  });

  bankLoans.forEach(loan => {
    if (loan.close) {
      injectionUsed += Number(loan.principal);
      return;
    }

    bankEMI += Number(loan.emi);
  });

  // Godfather cost
  const godfatherCost =
    godfatherAmount * 0.01;

  const totalBurden =
    privateInterest + bankEMI + godfatherCost;

  const netMonthly =
    operatingSurplus - totalBurden;

  const buffer =
    godfatherAmount - injectionUsed;

  let runway = "Stable";

  if (netMonthly < 0 && buffer > 0) {
    runway = (buffer / Math.abs(netMonthly)).toFixed(1) + " months";
  }

  document.getElementById("results").innerHTML = `
    <p><strong>Operating Surplus:</strong> ₹${operatingSurplus.toFixed(0)}</p>
    <p><strong>Private Interest:</strong> ₹${privateInterest.toFixed(0)}</p>
    <p><strong>Bank EMI:</strong> ₹${bankEMI.toFixed(0)}</p>
    <p><strong>Godfather Cost (1%):</strong> ₹${godfatherCost.toFixed(0)}</p>
    <hr>
    <p><strong>Total Monthly Burden:</strong> ₹${totalBurden.toFixed(0)}</p>
    <p><strong>Net Monthly Position:</strong> ₹${netMonthly.toFixed(0)}</p>
    <p><strong>Injection Used:</strong> ₹${injectionUsed.toFixed(0)}</p>
    <p><strong>Remaining Buffer:</strong> ₹${buffer.toFixed(0)}</p>
    <p><strong>Runway:</strong> ${runway}</p>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadPrivateInvestors();
});


document.addEventListener("DOMContentLoaded", async () => {

const injectBtn = document.getElementById("injectBtn");

if (injectBtn) {
  injectBtn.addEventListener("click", confirmInjection);
}


  await loadPrivateInvestors();

  const btn = document.getElementById("calculateBtn");

  if (btn) {
    btn.addEventListener("click", calculateOutcome);
  }

});