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
let strategyStore = [];

let personalLoans = [
  {
    id: "hdfc",
    name: "HDFC Block",
    emi: 46000,
    principal: 600000,
    tenureRemaining: 8
  },
  {
    id: "hero",
    name: "Hero Fincorp",
    emi: 19000,
    principal: 600000,
    tenureRemaining: 24
  },
  {
    id: "bajajHero",
    name: "Bajaj Finance",
    emi: 30000,
    principal: 600000,
    tenureRemaining: 24
  }
];

let businessLoans = [
  {
    id: "lendingkart",
    name: "Lendingkart",
    emi: 88000,
    principal: 1100000,
    tenureRemaining: 12
  },
  {
    id: "hdfcBusiness",
    name: "HDFC Business",
    emi: 72000,
    principal: 1600000,
    tenureRemaining: 24
  },
  {
    id: "bajajBusiness",
    name: "Bajaj Business",
    emi: 42000,
    principal: 1100000,
    tenureRemaining: 36
  }
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

function L(value){
  value = Number(value) || 0;

  // prevent double conversion
  if(value > 1000000) return value;

  return value * 100000;
}


function toL(value) {
  // Rupees → Lakhs (2 decimal)
  return (Number(value) / 100000).toFixed(2);
}


function runStrategyEngine(){

  const strategies = [
    strategySurvival(),
    strategyLoanKill(),
    strategyRelationship(),
    strategyNegotiation()
  ];

  renderStrategyComparison(strategies);

}
const mandatoryPayments = {
  raju: 900000,
  munnaSister: 400000,
  sual: 300000,
  bapponBil: 200000,
  amit: 500000,
  raushan: 500000
};




function strategySurvival(){

  const alloc = {};
  const nego = {};

  let remaining = confirmedInjection;

  // mandatory investors
  alloc["Raju"] = 900000;
  remaining -= 900000;

  alloc["Sual"] = 300000;
  remaining -= 300000;

  alloc["Bappon BIL"] = 200000;
  remaining -= 200000;

  // close highest EMI loans first
  const loans =
    [...personalLoans, ...businessLoans]
    .sort((a,b)=> b.emi - a.emi);

  loans.forEach(l => {

    if(remaining >= l.principal){

      alloc[l.id] = l.principal;
      remaining -= l.principal;

    }

  });

  return evaluateStrategy(
    "Survival",
    alloc,
    nego
  );

}

function strategyLoanKill(){

  const alloc = {};
  const nego = {};

  let remaining = confirmedInjection;

  const loans =
    [...personalLoans, ...businessLoans]
    .sort((a,b)=> b.tenureRemaining - a.tenureRemaining);

  loans.forEach(l => {

    if(remaining >= l.principal){

      alloc[l.id] = l.principal;
      remaining -= l.principal;

    }

  });

  return evaluateStrategy(
    "Loan Kill",
    alloc,
    nego
  );

}


function strategyRelationship(){

  const alloc = {};
  const nego = {};

  let remaining = confirmedInjection;

  baseInvestors.forEach(inv => {

    const partial =
      Math.min(
        inv.principal * 0.15,
        remaining
      );

    alloc[inv.id] = partial;

    remaining -= partial;

  });

  return evaluateStrategy(
    "Relationship",
    alloc,
    nego
  );

}

function strategyNegotiation(){

  const alloc = {};
  const nego = {};

  baseInvestors.forEach(inv => {

    if(inv.name === "Munna" ||
       inv.name === "Bappon")
       return;

    nego[inv.id] = {
      skip: 2
    };

  });

  return evaluateStrategy(
    "Negotiation",
    alloc,
    nego
  );

}

function evaluateStrategy(name, alloc, nego){

  const savedAlloc = allocationMap;
  const savedNego = negotiationMap;

  allocationMap = alloc;
  negotiationMap = nego;

  const result = calculateOutcome();

  allocationMap = savedAlloc;
  negotiationMap = savedNego;

  return {
    name,
    result
  };

}


function renderStrategyComparison(strategies){

  const container =
    document.getElementById("results");

  container.innerHTML = `
  <h3>Strategy Comparison</h3>

  <table class="sim-table">
  <tr>
    <th>Strategy</th>
    <th>Net Monthly</th>
    <th>Runway</th>
  </tr>

  ${strategies.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${toL(s.result.netMonthly)} L</td>
      <td>${s.result.runway}</td>
    </tr>
  `).join("")}

  </table>
  `;

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

function confirmInjection(){

  const input =
    Number(document.getElementById("godfatherInput").value || 0);

  if(input <= 0){
    alert("Enter valid injection amount");
    return;
  }

  confirmedInjection = L(input);

  document.getElementById("gfTotal").innerText =
    "₹ " + toL(confirmedInjection) + " L";

  document.getElementById("gfUsed").innerText =
    "₹ 0.00 L";

  document.getElementById("gfRemaining").innerText =
    "₹ " + toL(confirmedInjection) + " L";

  console.log("Injection L:", input);
  console.log("Injection ₹:", confirmedInjection);
}
/* ==============================
   FULL SURVIVAL CALCULATION
============================== */

function calculateOutcome() {

let savedByPrincipal = 0;
let savedByNegotiation = 0;
let savedBySkip = 0;
let savedByBankClosure = 0;

let actions = [];

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

  const originalInterest = inv.monthlyInterest;

  const effectiveAllocation =
    Math.min(allocation, inv.principal);

  injectionUsed += effectiveAllocation;

  const remainingPrincipal =
    inv.principal - effectiveAllocation;

  if (remainingPrincipal <= 0) {
    savedByPrincipal += originalInterest;
    return;
  }

  const interestRatio =
    remainingPrincipal / inv.principal;

  const adjustedInterest =
    inv.monthlyInterest * interestRatio;


     const saved =
  originalInterest - adjustedInterest;

savedByPrincipal += saved;

if (effectiveAllocation > 0) {

  actions.push(
    `Principal Reduced → ${inv.name}
     (₹ ${(effectiveAllocation/100000).toFixed(2)} L)`
  );

}

 

  newPrivateInterest += adjustedInterest;

});

Object.keys(negotiationMap).forEach(id => {

  const inv =
    baseInvestors.find(i => i.id === id);

  if (!inv) return;

  const negotiation = negotiationMap[id];

  if (negotiation.skip > 0) {

    savedBySkip += inv.monthlyInterest;

    actions.push(
     `Interest Skipped → ${inv.name}
      (${negotiation.skip} months)`
    );

  }

  if (negotiation.newRate) {

    const newInterest =
      inv.principal * (negotiation.newRate / 100);

    const diff =
      inv.monthlyInterest - newInterest;

    if (diff > 0) {

      savedByNegotiation += diff;

      actions.push(
       `Rate Negotiated → ${inv.name}
        (${negotiation.newRate}% monthly)`
      );

    }

  }

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

    savedByBankClosure += loan.emi;

    actions.push(
      `Closed Personal Loan → ${loan.name}`
    );

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

    savedByBankClosure += loan.emi;

    actions.push(
      `Closed Business Loan → ${loan.name}`
    );

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

<div class="impact-grid">

<div class="impact-card">
<h4>Saved from Bank EMI</h4>
<h2>₹ ${toL(savedByBankClosure)} L</h2>
</div>

<div class="impact-card">
<h4>Saved by Principal Reduction</h4>
<h2>₹ ${toL(savedByPrincipal)} L</h2>
</div>

<div class="impact-card">
<h4>Saved by Negotiation</h4>
<h2>₹ ${toL(savedByNegotiation)} L</h2>
</div>

<div class="impact-card">
<h4>Saved by Interest Skip</h4>
<h2>₹ ${toL(savedBySkip)} L</h2>
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

<div class="action-block">

<h3>Restructuring Actions</h3>

<ul>

${actions.map(a => `<li>${a}</li>`).join("")}

</ul>

</div>

`;


console.log({
  revenue,
  operatingSurplus,
  newPrivateInterest,
  newPersonalEMI,
  newBusinessEMI,
  godfatherCost,
  totalMonthlyBurden,
  netMonthly
});

return {
  netMonthly,
  runway,
  totalMonthlyBurden,
  operatingSurplus
};

}



function runSurvivalSimulation(){

  const months = 36;

  let cash =
    confirmedInjection -
    Object.values(allocationMap)
      .reduce((a,b)=>a+b,0);

  const simulation = [];

  let investors =
    JSON.parse(JSON.stringify(baseInvestors));

  let pLoans =
    JSON.parse(JSON.stringify(personalLoans));

  let bLoans =
    JSON.parse(JSON.stringify(businessLoans));

  for(let m = 1; m <= months; m++){

    /* ======================
       OPERATING SURPLUS
    ====================== */

    const revenue =
      L(Number(document.getElementById("revenue").value));

    const fixed =
      L(Number(document.getElementById("fixedExpense").value));

    const doctorPercent =
      Number(document.getElementById("doctorPercent").value);

    const cogsPercent =
      Number(document.getElementById("cogsPercent").value);

    const doctorCost =
      revenue * doctorPercent / 100;

    const cogs =
      revenue * cogsPercent / 100;

    const operating =
      revenue - doctorCost - cogs - fixed;

    /* ======================
       INVESTOR INTEREST
    ====================== */

    let investorInterest = 0;

    investors.forEach(inv => {

      investorInterest += inv.monthlyInterest;

    });

    /* ======================
       LOAN EMI
    ====================== */

    let loanEMI = 0;

    pLoans.forEach(l => {

      if(l.tenureRemaining > 0){

        loanEMI += l.emi;

        l.tenureRemaining--;

      }

    });

    bLoans.forEach(l => {

      if(l.tenureRemaining > 0){

        loanEMI += l.emi;

        l.tenureRemaining--;

      }

    });

    /* ======================
       GODFATHER COST
    ====================== */

    const gfCost =
      confirmedInjection * 0.01;

    /* ======================
       NET MONTHLY
    ====================== */

    const net =
      operating -
      investorInterest -
      loanEMI -
      gfCost;

    cash += net;

    /* ======================
       SAVE MONTH DATA
    ====================== */

    simulation.push({
      month: m,
      cash,
      net,
      investorInterest,
      loanEMI
    });

  }

  renderSimulation(simulation);

}

function renderSimulation(data){

  const results =
    document.getElementById("results");

  let riskMonth = null;

  data.forEach(d => {

    if(d.cash < 0 && !riskMonth){
      riskMonth = d.month;
    }

  });

  results.innerHTML += `

  <h3>36 Month Survival Simulation</h3>

  <p><strong>Risk Month:</strong>
  ${riskMonth || "None (Stable)"}</p>

  <table class="sim-table">

  <tr>
    <th>Month</th>
    <th>Cash Balance</th>
    <th>Investor Interest</th>
    <th>Loan EMI</th>
    <th>Net</th>
  </tr>

  ${data.map(d => `
    <tr>
      <td>${d.month}</td>
      <td>${toL(d.cash)} L</td>
      <td>${toL(d.investorInterest)} L</td>
      <td>${toL(d.loanEMI)} L</td>
      <td>${toL(d.net)} L</td>
    </tr>
  `).join("")}

  </table>
  `;

}



function autoAllocateCapital(){

  if(confirmedInjection <= 0){
    alert("Confirm injection first");
    return;
  }

  allocationMap = {};
  negotiationMap = {};

  let remaining = confirmedInjection;

  const MIN_BUFFER = 1500000;

  let actions = [];

  /* =========================
     MANDATORY INVESTORS
  ========================= */

  const mandatory = {
    "Raju": 900000,
    "Munna Sister": 400000,
    "Sual": 300000,
    "Bappon BIL": 200000
  };

  baseInvestors.forEach(inv => {

    const req = mandatory[inv.name];

    if(req){

      const pay = Math.min(req, remaining);

      allocationMap[inv.id] = pay;

      remaining -= pay;

      actions.push(
        `Mandatory → ${inv.name} ₹${(pay/100000).toFixed(2)}L`
      );

    }

  });

  /* =========================
     RESERVE BUSINESS BUFFER
  ========================= */

  if(remaining < MIN_BUFFER){
    alert("Injection too small after mandatory payments");
    return;
  }

  actions.push(
   `Reserved Operational Buffer → 15L`
  );

  /* =========================
     LOAN PRIORITY CALCULATION
  ========================= */

  const allLoans = [
    ...personalLoans,
    ...businessLoans
  ];

  allLoans.forEach(loan => {

    loan.futureBurden =
      loan.emi * loan.tenureRemaining;

    loan.score =
      loan.futureBurden / loan.principal;

  });

  allLoans.sort((a,b)=> b.score - a.score);

  /* =========================
     CLOSE HIGH IMPACT LOANS
  ========================= */

  allLoans.forEach(loan => {

    if(remaining <= MIN_BUFFER) return;

    if(loan.tenureRemaining <= 9){

      actions.push(
        `Skipped ${loan.name}
         (${loan.tenureRemaining} months left)`
      );

      return;
    }

    if(remaining - loan.principal < MIN_BUFFER)
      return;

    allocationMap[loan.id] = loan.principal;

    remaining -= loan.principal;

    actions.push(
      `Closed Loan → ${loan.name}
       (${loan.tenureRemaining} months left)`
    );

  });

  /* =========================
     TOUCH MULTIPLE INVESTORS
  ========================= */

  baseInvestors.forEach(inv => {

    if(remaining <= MIN_BUFFER) return;

    if(allocationMap[inv.id]) return;

    const partial =
      Math.min(inv.principal * 0.15,
               remaining - MIN_BUFFER);

    if(partial <= 0) return;

    allocationMap[inv.id] = partial;

    remaining -= partial;

    actions.push(
      `Partial Payment → ${inv.name}`
    );

  });

  /* =========================
     OPTIONAL INTEREST SKIP
  ========================= */

  baseInvestors.forEach(inv => {

    if(!negotiationMap[inv.id]){

      negotiationMap[inv.id] = {
        skip: 2
      };

      actions.push(
       `Interest Skip → ${inv.name} (2 months)`
      );

    }

  });

  updateStickyBar();

  /* =========================
     SHOW RESULT IN UI
  ========================= */

  document.getElementById("results").innerHTML = `

  <h3>Auto Allocation Strategy</h3>

  <div class="summary-block">

  <p><strong>Injection:</strong>
  ₹ ${(confirmedInjection/100000).toFixed(2)} L</p>

  <p><strong>Mandatory Investors:</strong>
  Raju 9L, Munna Sister 4L, Sual 3L, Bappon 2L</p>

  <p><strong>Operational Buffer:</strong>
  ₹ 15L reserved</p>

  <p><strong>Remaining Available:</strong>
  ₹ ${(remaining/100000).toFixed(2)} L</p>

  </div>

  <h4>Bank Loans Status</h4>

  <ul>
  ${allLoans.map(l =>
   `<li>${l.name}
    → EMI ${(l.emi/100000).toFixed(2)}L
    | Months Left ${l.tenureRemaining}</li>`
   ).join("")}
  </ul>

  <h4>Strategy Actions</h4>

  <ul>
  ${actions.map(a => `<li>${a}</li>`).join("")}
  </ul>

  <p>Now click <strong>Calculate Outcome</strong>.</p>

  `;

}

/* ==========================================
   SCENARIO ENGINE
========================================== */


function simulateScenario(config){

  let investors =
    JSON.parse(JSON.stringify(baseInvestors));

  let pLoans =
    JSON.parse(JSON.stringify(personalLoans));

  let bLoans =
    JSON.parse(JSON.stringify(businessLoans));

  let cash =
    confirmedInjection -
    Object.values(config.allocation || {})
      .reduce((a,b)=>a+b,0);

  let months = [];

  for(let m=1; m<=36; m++){

    let investorInterest = 0;

    investors.forEach(inv => {

      const nego =
        config.negotiation?.[inv.id];

      if(nego?.skip >= m) return;

      investorInterest += inv.monthlyInterest;

    });

    let loanEMI = 0;

    pLoans.forEach(l => {

      if(l.tenureRemaining > 0){
        loanEMI += l.emi;
        l.tenureRemaining--;
      }

    });

    bLoans.forEach(l => {

      if(l.tenureRemaining > 0){
        loanEMI += l.emi;
        l.tenureRemaining--;
      }

    });

    const revenue =
      L(Number(document.getElementById("revenue").value));

    const fixed =
      L(Number(document.getElementById("fixedExpense").value));

    const doctor =
      revenue *
      Number(document.getElementById("doctorPercent").value)/100;

    const cogs =
      revenue *
      Number(document.getElementById("cogsPercent").value)/100;

    const operating =
      revenue - doctor - cogs - fixed;

    const gfCost =
      confirmedInjection * 0.01;

    const net =
      operating -
      investorInterest -
      loanEMI -
      gfCost;

    cash += net;

    months.push({
      month: m,
      cash,
      net
    });

  }

  const riskMonth =
    months.find(m => m.cash < 0)?.month || null;

  return {
    months,
    riskMonth
  };

}

function generateScenarioCombinations(){

  const scenarios = [];

  const mandatory = {
    raju: 900000,
    munnaSister: 400000,
    sual: 300000,
    bapponBil: 200000,
    amit: 500000,
    raushan: 500000
  };

  const lockedNames = [
    "Raju",
    "Munna Sister",
    "Sual",
    "Bappon BIL",
    "Amit",
    "Raushan"
  ];

  const investors =
    baseInvestors.filter(i =>
      !lockedNames.includes(i.name)
    );

  const loans =
    [...personalLoans, ...businessLoans];

  for(let i=0;i<200;i++){

    const allocation = {...mandatory};
    const negotiation = {};

    let capitalUsed =
      Object.values(mandatory)
      .reduce((a,b)=>a+b,0);

    const capitalLimit =
      confirmedInjection;

    /* BANK ACTIONS */

    const bankActions =
      Math.floor(Math.random()*2);

    for(let b=0;b<bankActions;b++){

      const loan =
        loans[Math.floor(Math.random()*loans.length)];

      if(capitalUsed + loan.principal < capitalLimit){

        allocation[loan.id] = loan.principal;
        capitalUsed += loan.principal;

      }

    }

    /* INVESTOR SKIPS */

    const skipCount =
      2 + Math.floor(Math.random()*4);

    for(let s=0;s<skipCount;s++){

      const inv =
        investors[Math.floor(Math.random()*investors.length)];

      negotiation[inv.id] = {
        skip: [3,6,12][Math.floor(Math.random()*3)]
      };

    }

    /* INVESTOR REDUCTIONS */

    const reduceCount =
      Math.floor(Math.random()*3);

    for(let r=0;r<reduceCount;r++){

      const inv =
        investors[Math.floor(Math.random()*investors.length)];

      const amount =
        [100000,200000,300000,500000]
        [Math.floor(Math.random()*4)];

      if(capitalUsed + amount < capitalLimit){

        allocation[inv.id] = amount;
        capitalUsed += amount;

      }

    }

    scenarios.push({
      name: `Strategy ${i+1}`,
      allocation,
      negotiation
    });

  }

  return scenarios;

}

function runScenarioEngine(){


  const mandatoryUsed =
  Object.values(mandatoryPayments)
    .reduce((a,b)=>a+b,0);

const strategyCapital =
  confirmedInjection - mandatoryUsed;

  const scenarios =
    generateScenarioCombinations();

    strategyStore = scenarios;

  const results = [];

  scenarios.forEach(s => {

    const sim =
      simulateScenario(s);

    results.push({
      name: s.name,
      riskMonth: sim.riskMonth,
      finalCash: sim.months[35].cash
    });

  });

  results.sort((a,b) =>
    b.finalCash - a.finalCash
  );

  renderScenarioResults(results.slice(0,20));

}


function inspectStrategy(index){

  const strategy = strategyStore[index];

  const sim = simulateScenario(strategy);

  const el =
    document.getElementById("results");

  let allocationHTML = "";

  Object.entries(strategy.allocation || {})
  .forEach(([k,v])=>{

    allocationHTML +=
      `<li>${k} → ₹ ${(v/100000).toFixed(2)} L</li>`;

  });

  let negotiationHTML = "";

  Object.entries(strategy.negotiation || {})
  .forEach(([k,v])=>{

    negotiationHTML +=
      `<li>${k} skip ${v.skip} months</li>`;

  });

  el.innerHTML = `

  <h2>${strategy.name}</h2>

  <h3>Initial Allocation</h3>
  <ul>${allocationHTML}</ul>

  <h3>Negotiations</h3>
  <ul>${negotiationHTML}</ul>

  <h3>36 Month Timeline</h3>

  <table class="sim-table">

  <tr>
  <th>Month</th>
  <th>Cash</th>
  <th>Net</th>
  <th>Investor Interest</th>
  <th>Loan EMI</th>
  </tr>

  ${sim.months.map(m=>`

    <tr>
      <td>${m.month}</td>
      <td>${toL(m.cash)} L</td>
      <td>${toL(m.net)} L</td>
      <td>${toL(m.investorInterest || 0)} L</td>
      <td>${toL(m.loanEMI || 0)} L</td>
    </tr>

  `).join("")}

  </table>

  `;

}


function renderScenarioResults(data){

  const el =
    document.getElementById("results");

  el.innerHTML = `

  <h3>Top Strategies</h3>

  <table class="sim-table">

  <tr>
  <th>Rank</th>
  <th>Scenario</th>
  <th>Risk Month</th>
  <th>Final Cash</th>
  </tr>

  ${data.map((d,i)=>`

    <tr>
      <td>${i+1}</td>
      <td>${d.name}</td>
      <td>${d.riskMonth || "Stable"}</td>
      <td>${toL(d.finalCash)} L</td>
    </tr>

  `).join("")}

  </table>

  `;

}


/* ==========================================
   INITIALIZATION
========================================== */

document.addEventListener("DOMContentLoaded", async () => {


const autoBtn =
 document.getElementById("autoAllocateBtn");

if(autoBtn){
 autoBtn.addEventListener(
   "click",
   autoAllocateCapital
 );
}

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

document
  .getElementById("runSim")
  .addEventListener(
    "click",
    runSurvivalSimulation
  );

document.addEventListener("DOMContentLoaded", () => {

  const btn =
    document.getElementById("runStrategies");

  if(btn){
    btn.addEventListener(
      "click",
      runStrategyEngine
    );
  }

});

const scenarioBtn =
 document.getElementById("runScenario");

if(scenarioBtn){
 scenarioBtn.addEventListener(
  "click",
  runScenarioEngine
 );
}