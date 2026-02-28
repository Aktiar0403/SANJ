import {
  db,
  collection,
  getDocs,
  doc,
  getDoc
} from "./firebase.js";

import {
  simulateBusiness
} from "./engine/simulationEngine.js";

/* ======================================
   GLOBAL STATE
====================================== */

let hypotheticalInjections = [];
let cashChart = null;

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

  return {
    doctorPercent: config.doctorPercent,
    cogsPercent: config.cogsPercent,
    fixedExpenses: config.fixedExpenses,
    salary: config.salary,
    openingCash: config.openingCash || 0,
    privateInvestors,
    loans
  };
}

/* ======================================
   LOAD COMMITTED INJECTIONS
====================================== */

async function loadCommittedInjections() {

  const snap =
    await getDocs(collection(db,"capitalInjections"));

  return snap.docs.map(d=>d.data());
}
async function previewInjectionImpact() {

  const baseState = await loadBaseState();
  const committedInjections = await loadCommittedInjections();

  const amount = Number(document.getElementById("injAmount").value);
  const month = Number(document.getElementById("injMonth").value);
  const privatePercent = Number(document.getElementById("injPrivate").value);
  const bankPercent = Number(document.getElementById("injBank").value);
  const bufferPercent = Number(document.getElementById("injBuffer").value);
  const strategy = document.getElementById("injStrategy").value;

  const injection = {
    month,
    amount,
    privatePercent,
    bankPercent,
    bufferPercent,
    strategy,
    monthlyPayoutRate: 1
  };

  /* =========================
     CALCULATE PRIVATE BEFORE
  ========================= */

  const privateBefore =
    baseState.privateInvestors.reduce((sum, inv) =>
      sum + (inv.principal * (inv.monthlyRate / 100)), 0);

  /* =========================
     CLONE STATE
  ========================= */

  const clonedState = JSON.parse(JSON.stringify(baseState));

  /* =========================
     APPLY INJECTION LOGIC
  ========================= */

  const privateAlloc =
    injection.amount * (injection.privatePercent / 100);

  let remaining = privateAlloc;

  const sorted =
    sortInvestorsForPreview(
      clonedState.privateInvestors,
      injection.strategy
    );

  let breakdown = [];

  sorted.forEach(inv => {

    if (remaining <= 0) return;
    if (inv.type === "locked") return;

    const before = inv.principal;

    const reduction =
      Math.min(inv.principal, remaining);

    inv.principal -= reduction;
    remaining -= reduction;

    breakdown.push({
      name: inv.name,
      before,
      reduced: reduction,
      after: inv.principal
    });
  });

  /* =========================
     PRIVATE AFTER
  ========================= */

  const privateAfter =
    clonedState.privateInvestors.reduce((sum, inv) =>
      sum + (inv.principal * (inv.monthlyRate / 100)), 0);

  const injectionPayout =
    injection.amount * 0.01;

  const netImpact =
    (privateBefore - privateAfter) - injectionPayout;

  renderInjectionPreview({
    privateBefore,
    privateAfter,
    injectionPayout,
    netImpact,
    breakdown
  });
}
/* ======================================
   RUN SIMULATION
====================================== */

async function runSimulation() {

  const baseState =
    await loadBaseState();

  const committedInjections =
    await loadCommittedInjections();

  const growthPercent =
    Number(document.getElementById("growthInput")?.value || 0);

  const runUntilCollapse =
    document.getElementById("runUntilCollapse")?.checked || false;

  const result =
    simulateBusiness({
      baseState,
      committedInjections,
      hypotheticalInjections,
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

function addHypotheticalInjection() {

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

  hypotheticalInjections.push({
    month,
    amount,
    privatePercent,
    bankPercent,
    bufferPercent,
    strategy,
    monthlyPayoutRate: 1
  });

  alert("Hypothetical Injection Added (Simulation Only)");
}

/* ======================================
   INIT
====================================== */

document.addEventListener("DOMContentLoaded",()=>{

  document
    .getElementById("runSimulationBtn")
    ?.addEventListener("click",runSimulation);

  document
    .getElementById("addHypotheticalBtn")
    ?.addEventListener("click",addHypotheticalInjection);

});