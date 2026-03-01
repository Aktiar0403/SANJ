import {
  db,
  collection,
  getDocs,
  doc,
  getDoc
} from "./firebase.js";

import {
  simulateBusiness
} from "./engines/simulationEngine.js";

/* ======================================
   GLOBAL STATE
====================================== */

let currentInjection = null;
let cashChart = null;
let cachedBaseState = null;

/* ======================================
   LOAD BASE STATE FROM FIREBASE
====================================== */

async function loadBaseState() {

  const configSnap =
    await getDoc(doc(db,"businessConfig","main"));

  if (!configSnap.exists()) {
    throw new Error(
      "Missing Firestore document: businessConfig/main"
    );
  }

  const config = configSnap.data() || {};

  const invSnap =
    await getDocs(collection(db,"privateInvestors"));

  const privateInvestors =
    invSnap.docs.map(d=>({
      id:d.id,
      ...d.data(),
      principal: Number(d.data().principal) || 0,
      monthlyRate: Number(d.data().monthlyRate) || 0
    }));

  const loanSnap =
    await getDocs(collection(db,"loans"));

  const loans =
    loanSnap.docs.map(d=>({
      id:d.id,
      ...d.data(),
      principal: Number(d.data().principal) || 0,
      monthlyEMI: Number(d.data().monthlyEMI) || 0
    }));

  cachedBaseState = {
    doctorPercent: Number(config.doctorPercent) || 0,
    cogsPercent: Number(config.cogsPercent) || 0,
    fixedExpenses: Number(config.fixedExpenses) || 0,
    salary: Number(config.salary) || 0,
    openingCash: Number(config.openingCash) || 0,
    privateInvestors,
    loans
  };

  return cachedBaseState;
}
async function renderSnapshot() {

  const baseState = await loadBaseState();

  const privateInvestors = baseState.privateInvestors;
  const loans = baseState.loans;

  const BASE_YEAR_REVENUE = 15000000; // 1.5 Cr
  const seasonalWeights = [
    0.7,0.8,1.0,1.4,1.5,1.4,
    1.2,1.1,1.1,1.0,0.9,0.8
  ];
  const totalWeight =
    seasonalWeights.reduce((a,b)=>a+b,0);

  const avgMonthlyRevenue =
    BASE_YEAR_REVENUE / 12;

  const worstWeight =
    Math.min(...seasonalWeights);

  const worstMonthRevenue =
    (worstWeight / totalWeight) *
    BASE_YEAR_REVENUE;

  const doctorExpense =
    avgMonthlyRevenue *
    (baseState.doctorPercent / 100);

  const cogsExpense =
    avgMonthlyRevenue *
    (baseState.cogsPercent / 100);

  const fixedExpense =
    baseState.fixedExpenses;

  const salaryExpense =
    baseState.salary;

  const avgOperating =
    avgMonthlyRevenue -
    doctorExpense -
    cogsExpense -
    fixedExpense -
    salaryExpense;

  const worstOperating =
    worstMonthRevenue -
    (worstMonthRevenue * (baseState.doctorPercent / 100)) -
    (worstMonthRevenue * (baseState.cogsPercent / 100)) -
    fixedExpense -
    salaryExpense;

  const totalPrivatePrincipal =
    privateInvestors.reduce((s,i)=>s+i.principal,0);

  const totalPrivateInterest =
    privateInvestors.reduce((s,i)=>
      s + (i.principal * (i.monthlyRate/100)),0);

  const totalBankPrincipal =
    loans.reduce((s,l)=>s+l.principal,0);

  const totalBankEMI =
    loans.reduce((s,l)=>s+(l.monthlyEMI||0),0);

  const totalDebtBurden =
    totalPrivateInterest + totalBankEMI;

  const structuralResult =
    worstOperating - totalDebtBurden;

  const status =
    structuralResult >= 0
      ? "🟢 Structurally Stable"
      : "🔴 Structural Deficit";

  document.getElementById("snapshot").innerHTML = `
    <p><strong>Annual Revenue:</strong> ₹${toLakh(BASE_YEAR_REVENUE)} L</p>
    <p><strong>Avg Monthly Revenue:</strong> ₹${toLakh(avgMonthlyRevenue)} L</p>
    <hr>
    <p><strong>Total Private Principal:</strong> ₹${toLakh(totalPrivatePrincipal)} L</p>
    <p><strong>Total Private Monthly Interest:</strong> ₹${toLakh(totalPrivateInterest)} L</p>
    <p><strong>Total Bank Principal:</strong> ₹${toLakh(totalBankPrincipal)} L</p>
    <p><strong>Total Bank EMI:</strong> ₹${toLakh(totalBankEMI)} L</p>
    <p><strong>Total Monthly Debt Burden:</strong> ₹${toLakh(totalDebtBurden)} L</p>
    <hr>
    <p><strong>Worst Dry Month Operating:</strong> ₹${toLakh(worstOperating)} L</p>
    <p><strong>Structural Surplus/Deficit:</strong>
      <span style="color:${structuralResult>=0?'lime':'red'}">
        ₹${toLakh(structuralResult)} L
      </span>
    </p>
    <p><strong>Status:</strong> ${status}</p>
  `;
}

function toLakh(n){
  return (n / 100000).toFixed(2);
}
/* ======================================
   LOAD COMMITTED INJECTIONS
====================================== */


async function previewInjectionImpact() {

  if (!cachedBaseState)
    await loadBaseState();

  const amountL =
    Number(document.getElementById("injAmount").value);

  const month =
    Number(document.getElementById("injMonth").value);

  if (!amountL || !month) {
    alert("Enter Injection Amount and Month");
    return;
  }

  const amount = amountL * 100000;

  const manualPrivate = [];
  const manualBank = [];

  document.querySelectorAll(".private-reduce")
    .forEach(input=>{
      const reduceL =
        Number(input.value) || 0;

      if (reduceL > 0) {
        manualPrivate.push({
          id: input.dataset.id,
          reduceAmount: reduceL * 100000,
          skipMonths:
            Number(document.querySelector(
              `.private-skip[data-id='${input.dataset.id}']`
            ).value) || 0,
          newRate:
            Number(document.querySelector(
              `.private-rate[data-id='${input.dataset.id}']`
            ).value) || null
        });
      }
    });

  document.querySelectorAll(".bank-reduce")
    .forEach(input=>{
      const reduceL =
        Number(input.value) || 0;

      if (reduceL > 0) {
        manualBank.push({
          id: input.dataset.id,
          reduceAmount: reduceL * 100000
        });
      }
    });

 currentInjection = {
  month,
  amount,
  privatePercent,
  bankPercent,
  bufferPercent,
  strategy,
  monthlyPayoutRate: 1
};

  const privateBefore =
    cachedBaseState.privateInvestors.reduce((s,i)=>
      s + (i.principal*(i.monthlyRate/100)),0);

  const injectionPayout =
    amount * 0.01;

 renderInjectionPreview({
  privateBefore,
  privateAfter: privateBefore, // temporary
  injectionPayout,
  netImpact: -injectionPayout  // temporary safe calc
});

  showActiveInjectionBanner(currentInjection);
}


function sortInvestorsForPreview(list, strategy) {

  const clone = [...list];

  switch(strategy) {

    case "pressure_first":
      return clone.sort((a,b)=>
        a.type === "pressure" ? -1 : 1
      );

    case "negotiable_first":
      return clone.sort((a,b)=>
        a.type === "negotiable" ? -1 : 1
      );

    case "highest_interest_first":
      return clone.sort((a,b)=>
        b.monthlyRate - a.monthlyRate
      );

    case "priority_level_first":
      return clone.sort((a,b)=>
        (a.priorityLevel||1) -
        (b.priorityLevel||1)
      );

    default:
      return clone;
  }
}


function renderInjectionPreview(data) {

  const container =
    document.getElementById("injectionPreview");

  if (!container) return;

  const privateBefore = Number(data.privateBefore) || 0;
  const privateAfter = Number(data.privateAfter ?? privateBefore) || 0;
  const injectionPayout = Number(data.injectionPayout) || 0;

  const netImpact =
    Number(data.netImpact ??
      (privateBefore - privateAfter - injectionPayout)) || 0;

  const netClass =
    netImpact >= 0
      ? "highlight-green"
      : "highlight-red";

  container.innerHTML = `
    <p><strong>Private Before:</strong>
      ₹ ${(privateBefore/100000).toFixed(2)} L</p>

    <p><strong>Private After:</strong>
      ₹ ${(privateAfter/100000).toFixed(2)} L</p>

    <p><strong>Injection Payout (1%):</strong>
      ₹ ${(injectionPayout/100000).toFixed(2)} L</p>

    <p><strong>Net Monthly Impact:</strong>
      <span class="${netClass}">
        ₹ ${(netImpact/100000).toFixed(2)} L
      </span>
    </p>
  `;
}


function showActiveInjectionBanner(injection) {

  const container =
    document.getElementById("activeInjectionBanner");

  container.innerHTML = `
    <div class="success-banner">
      <strong>Active Injection Applied</strong><br>
      ₹ ${(injection.amount/100000).toFixed(2)} L
      in Month ${injection.month}
    </div>
  `;
}

async function renderManualPrivateTable() {

  if (!cachedBaseState)
    await loadBaseState();

  const investors =
    cachedBaseState.privateInvestors;

  const container =
    document.getElementById("manualPrivateTable");

  container.innerHTML = `
    <table>
      <tr>
        <th>Name</th>
        <th>Principal (L)</th>
        <th>Rate %</th>
        <th>Reduce (L)</th>
        <th>Skip (Months)</th>
        <th>New Rate %</th>
      </tr>
      ${investors.map(inv=>`
        <tr>
          <td>${inv.name}</td>
          <td>${(inv.principal/100000).toFixed(2)}</td>
          <td>${inv.monthlyRate}</td>
          <td>
            <input type="number"
              class="private-reduce"
              data-id="${inv.id}"
              value="0">
          </td>
          <td>
            <input type="number"
              class="private-skip"
              data-id="${inv.id}"
              value="0">
          </td>
          <td>
            <input type="number"
              class="private-rate"
              data-id="${inv.id}"
              placeholder="${inv.monthlyRate}">
          </td>
        </tr>
      `).join("")}
    </table>
  `;

  attachRemainingListener();
}

async function renderManualBankTable() {

  if (!cachedBaseState)
    await loadBaseState();

  const loans =
    cachedBaseState.loans;

  const container =
    document.getElementById("manualBankTable");

  container.innerHTML = `
    <table>
      <tr>
        <th>Name</th>
        <th>Principal (L)</th>
        <th>EMI (L)</th>
        <th>Reduce (L)</th>
      </tr>
      ${loans.map(loan=>`
        <tr>
          <td>${loan.name}</td>
          <td>${(loan.principal/100000).toFixed(2)}</td>
          <td>${((loan.monthlyEMI||0)/100000).toFixed(2)}</td>
          <td>
            <input type="number"
              class="bank-reduce"
              data-id="${loan.id}"
              value="0">
          </td>
        </tr>
      `).join("")}
    </table>
  `;

  attachRemainingListener();
}


function updateRemainingInjection() {

  const totalInjectionL =
    Number(document.getElementById("injAmount").value) || 0;

  let totalAllocatedL = 0;

  document.querySelectorAll(".private-reduce")
    .forEach(input=>{
      totalAllocatedL +=
        Number(input.value) || 0;
    });

  document.querySelectorAll(".bank-reduce")
    .forEach(input=>{
      totalAllocatedL +=
        Number(input.value) || 0;
    });

  const remainingL =
    totalInjectionL - totalAllocatedL;

  document.getElementById("remainingInjection")
    .innerText =
      `₹ ${remainingL.toFixed(2)} L`;
}


function attachRemainingListener() {

  document
    .querySelectorAll(".private-reduce, .bank-reduce")
    .forEach(input=>{
      input.addEventListener("input",
        updateRemainingInjection
      );
    });
}

/* ======================================
   RUN SIMULATION
====================================== */

async function runSimulation() {

  const baseState =
    await loadBaseState();

const committedInjections = [];

  const growthPercent =
    Number(document.getElementById("growthInput")?.value || 0);

  const runUntilCollapse =
    document.getElementById("runUntilCollapse")?.checked || false;

  const result =
   simulateBusiness({
  baseState,
  committedInjections: [],
  hypotheticalInjections:
    currentInjection ? [currentInjection] : [],
  months: 60,
  runUntilCollapse,
  growthPercent
});

  renderTable(result.history);
  renderChart(result.history);
  renderSummary(result);
}

/* ======================================
   RENDER TABLE
====================================== */

function renderTable(history) {

  const container =
    document.getElementById("simulationTable");

  container.innerHTML = history.map(row=>`
    <tr>
      <td>${row.monthIndex}</td>
      <td>₹${row.billing}</td>
      <td>₹${row.totalBusinessExpense}</td>
      <td>₹${row.bankEMI}</td>
      <td>₹${row.privateInterest}</td>
      <td>₹${row.injectionPayout}</td>
      <td>₹${row.cash}</td>
      <td>${row.stabilityStatus}</td>
    </tr>
  `).join("");
}

/* ======================================
   RENDER CASH GRAPH
====================================== */

function renderChart(history) {

  const ctx =
    document.getElementById("cashChart").getContext("2d");

  const labels =
    history.map(h=>h.monthIndex);

  const cashData =
    history.map(h=>h.cash);

  if (cashChart) {
    cashChart.destroy();
  }

  cashChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cash",
        data: cashData,
        borderWidth: 2,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

/* ======================================
   RENDER SUMMARY
====================================== */

function renderSummary(result) {

  const summary =
    document.getElementById("summary");

  summary.innerHTML = `
    <p><strong>Final Cash:</strong> ₹${result.finalCash}</p>
    <p><strong>Collapse Month:</strong> ${
      result.collapseMonth || "None"
    }</p>
    <p><strong>Final Private Principal:</strong> ₹${result.finalPrivatePrincipal}</p>
    <p><strong>Final Bank Principal:</strong> ₹${result.finalBankPrincipal}</p>
  `;
}

/* ======================================
 INJECTION
====================================== */

function setCurrentInjection() {

  const amountL =
    Number(document.getElementById("injAmount")?.value) || 0;

  const month =
    Number(document.getElementById("injMonth")?.value) || 0;

  const privatePercent =
    Number(document.getElementById("injPrivate")?.value) || 0;

  const bankPercent =
    Number(document.getElementById("injBank")?.value) || 0;

  const bufferPercent =
    Number(document.getElementById("injBuffer")?.value) || 0;

  const strategy =
    document.getElementById("injStrategy")?.value || "manual";

  // Convert Lakh → Rupees (CRITICAL FIX)
  const amount = amountL * 100000;

  currentInjection = {
    month,
    amount,
    privatePercent,
    bankPercent,
    bufferPercent,
    strategy,
    monthlyPayoutRate: 1
  };
}

/* ======================================
   INIT
====================================== */

document.addEventListener("DOMContentLoaded",()=>{



  renderSnapshot();
  renderManualPrivateTable();
  renderManualBankTable();
  document
    .getElementById("runSimulationBtn")
    ?.addEventListener("click",runSimulation);

  document
    .getElementById("previewInjectionBtn")
    ?.addEventListener("click", previewInjectionImpact);

});

document.addEventListener("input", e=>{
  if (e.target.classList.contains("reduce-input")) {
    updateRemainingInjection();
  }
});