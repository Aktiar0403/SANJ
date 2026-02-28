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

  const config = configSnap.data();

  const invSnap =
    await getDocs(collection(db,"privateInvestors"));

  const privateInvestors =
    invSnap.docs.map(d=>({
      id:d.id,
      ...d.data()
    }));

  const loanSnap =
    await getDocs(collection(db,"loans"));

  const loans =
    loanSnap.docs.map(d=>({
      id:d.id,
      ...d.data()
    }));

  cachedBaseState = {
    doctorPercent: config.doctorPercent,
    cogsPercent: config.cogsPercent,
    fixedExpenses: config.fixedExpenses,
    salary: config.salary,
    openingCash: config.openingCash || 0,
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

  const amount =
    Number(document.getElementById("injAmount").value);

  const month =
    Number(document.getElementById("injMonth").value);

  if (!amount || !month) {
    alert("Enter Injection Amount and Month");
    return;
  }

  const manualAllocations = [];

  document.querySelectorAll(".reduce-input")
    .forEach(input=>{

      const id = input.dataset.id;

      const reduceAmount =
        (Number(input.value) || 0) * 100000;

      const skipMonths =
        Number(document.querySelector(
          `.skip-input[data-id='${id}']`
        ).value) || 0;

      const newRate =
        Number(document.querySelector(
          `.rate-input[data-id='${id}']`
        ).value);

      if (reduceAmount > 0) {

        manualAllocations.push({
          id,
          reduceAmount,
          skipMonths,
          newRate:
            isNaN(newRate) ? null : newRate
        });
      }
    });

  currentInjection = {
    month,
    amount,
    strategy: "manual",
    manualAllocations,
    monthlyPayoutRate: 1
  };

  /* CALCULATE BEFORE */

  const privateBefore =
    cachedBaseState.privateInvestors.reduce((s,i)=>
      s + (i.principal*(i.monthlyRate/100)),0);

  /* CLONE STATE */

  const cloned =
    JSON.parse(JSON.stringify(
      cachedBaseState.privateInvestors
    ));

  /* APPLY MANUAL */

  manualAllocations.forEach(m=>{

    const investor =
      cloned.find(i=>i.id===m.id);

    if (!investor) return;

    investor.principal -= m.reduceAmount;

    if (m.newRate !== null)
      investor.monthlyRate = m.newRate;
  });

  const privateAfter =
    cloned.reduce((s,i)=>
      s + (i.principal*(i.monthlyRate/100)),0);

  const injectionPayout =
    amount * 0.01;

  const netImpact =
    (privateBefore - privateAfter)
    - injectionPayout;

  renderInjectionPreview({
    privateBefore,
    privateAfter,
    injectionPayout,
    netImpact,
    breakdown: manualAllocations
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

  const netClass =
    data.netImpact >= 0
      ? "highlight-green"
      : "highlight-red";

  container.innerHTML = `
    <p><strong>Private Before:</strong>
      ₹ ${(data.privateBefore/100000).toFixed(2)} L</p>

    <p><strong>Private After:</strong>
      ₹ ${(data.privateAfter/100000).toFixed(2)} L</p>

    <p><strong>Injection Payout (1%):</strong>
      ₹ ${(data.injectionPayout/100000).toFixed(2)} L</p>

    <p><strong>Net Monthly Impact:</strong>
      <span class="${netClass}">
        ₹ ${(data.netImpact/100000).toFixed(2)} L
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

async function renderManualAllocationTable() {

  if (!cachedBaseState)
    await loadBaseState();

  const investors =
    cachedBaseState.privateInvestors;

  const container =
    document.getElementById("manualAllocationTable");

  container.innerHTML = `
    <table>
      <tr>
        <th>Name</th>
        <th>Principal (L)</th>
        <th>Rate %</th>
        <th>Reduce (L)</th>
        <th>Skip Months</th>
        <th>New Rate %</th>
      </tr>
      ${investors.map(inv=>`
        <tr>
          <td>${inv.name}</td>
          <td>${(inv.principal/100000).toFixed(2)}</td>
          <td>${inv.monthlyRate}</td>
          <td>
            <input type="number"
              class="reduce-input"
              data-id="${inv.id}"
              value="0">
          </td>
          <td>
            <input type="number"
              class="skip-input"
              data-id="${inv.id}"
              value="0">
          </td>
          <td>
            <input type="number"
              class="rate-input"
              data-id="${inv.id}"
              placeholder="${inv.monthlyRate}">
          </td>
        </tr>
      `).join("")}
    </table>
  `;

  attachRemainingListener();
}


function updateRemainingInjection() {

  const totalInjection =
    Number(document.getElementById("injAmount").value) || 0;

  let totalAllocated = 0;

  document.querySelectorAll(".reduce-input")
    .forEach(input=>{
      totalAllocated +=
        (Number(input.value) || 0) * 100000;
    });

  const remaining =
    totalInjection - totalAllocated;

  document.getElementById("remainingInjection")
    .innerText =
      `₹ ${(remaining/100000).toFixed(2)} L`;
}


function attachRemainingListener() {

  document.querySelectorAll(".reduce-input")
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
   ADD HYPOTHETICAL INJECTION
====================================== */

function setCurrentInjection() {

  const amount =
    Number(document.getElementById("injAmount").value);

  const month =
    Number(document.getElementById("injMonth").value);

  const privatePercent =
    Number(document.getElementById("injPrivate").value);

  const bankPercent =
    Number(document.getElementById("injBank").value);

  const bufferPercent =
    Number(document.getElementById("injBuffer").value);

  const strategy =
    document.getElementById("injStrategy").value;

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

renderManualAllocationTable();
  renderSnapshot();
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