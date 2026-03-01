import {
  db,
  collection,
  getDocs,
  doc,
  getDoc
} from "./firebase.js";

/* ==========================================
   GLOBAL STATE
========================================== */

let cachedBaseState = null;
let currentInjection = null;
let cashChart = null;

/* ==========================================
   HELPER: SAFE NUMBER
========================================== */

function safe(n) {
  return Number(n) || 0;
}

/* ==========================================
   LOAD BASE STATE FROM FIRESTORE
========================================== */

async function loadBaseState() {

  const configSnap =
    await getDoc(doc(db,"businessConfig","main"));

  if (!configSnap.exists()) {
    throw new Error("businessConfig/main missing in Firestore");
  }

  const config = configSnap.data();

  const invSnap =
    await getDocs(collection(db,"privateInvestors"));

  const privateInvestors =
    invSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      principal: safe(d.data().principal),
      monthlyRate: safe(d.data().monthlyRate),
      type: d.data().type || "flexible",
      minLockedPrincipal: safe(d.data().minLockedPrincipal)
    }));

  const loanSnap =
    await getDocs(collection(db,"loans"));

  const bankLoans =
    loanSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      principal: safe(d.data().principal),
      monthlyEMI: safe(d.data().monthlyEMI)
    }));

  cachedBaseState = {
    doctorPercent: safe(config.doctorPercent),
    cogsPercent: safe(config.cogsPercent),
    fixedExpenses: safe(config.fixedExpenses),
    salary: safe(config.salary),
    openingCash: safe(config.openingCash),
    privateInvestors,
    bankLoans
  };

  return cachedBaseState;
}

/* ==========================================
   STRUCTURAL SNAPSHOT ANALYSIS
========================================== */

function computeSnapshot(baseState) {

  const BASE_ANNUAL_REVENUE = 15000000; // 1.5 Cr baseline

  // Seasonal weights (realistic healthcare model)
  const seasonalWeights = [
    0.7,0.8,1.0,1.4,1.5,1.4,
    1.2,1.1,1.1,1.0,0.9,0.8
  ];

  const totalWeight =
    seasonalWeights.reduce((a,b)=>a+b,0);

  const worstWeight =
    Math.min(...seasonalWeights);

  const worstMonthRevenue =
    (worstWeight / totalWeight) *
    BASE_ANNUAL_REVENUE;

  // Operating Calculation
  const doctorCost =
    worstMonthRevenue *
    (baseState.doctorPercent / 100);

  const cogs =
    worstMonthRevenue *
    (baseState.cogsPercent / 100);

  const worstOperating =
    worstMonthRevenue -
    doctorCost -
    cogs -
    baseState.fixedExpenses -
    baseState.salary;

  // Debt Burden
  const totalPrivateInterest =
    baseState.privateInvestors
      .reduce((s,i)=>
        s + (i.principal *
             (i.monthlyRate/100)),0);

  const totalBankEMI =
    baseState.bankLoans
      .reduce((s,l)=>
        s + l.monthlyEMI,0);

  const totalDebtBurden =
    totalPrivateInterest +
    totalBankEMI;

  const structuralResult =
    worstOperating -
    totalDebtBurden;

  return {
    worstMonthRevenue,
    worstOperating,
    totalPrivateInterest,
    totalBankEMI,
    totalDebtBurden,
    structuralResult,
    status:
      structuralResult >= 0
        ? "STABLE"
        : "DEFICIT"
  };
}

function renderSnapshot(snapshot) {

  const el =
    document.getElementById("snapshot");

  if (!el) return;

  el.innerHTML = `
    <h3>Structural Snapshot</h3>

    <p><strong>Worst Month Revenue:</strong>
    ₹ ${(snapshot.worstMonthRevenue/100000)
      .toFixed(2)} L</p>

    <p><strong>Worst Operating Surplus:</strong>
    ₹ ${(snapshot.worstOperating/100000)
      .toFixed(2)} L</p>

    <hr>

    <p><strong>Total Private Interest:</strong>
    ₹ ${(snapshot.totalPrivateInterest/100000)
      .toFixed(2)} L</p>

    <p><strong>Total Bank EMI:</strong>
    ₹ ${(snapshot.totalBankEMI/100000)
      .toFixed(2)} L</p>

    <p><strong>Total Monthly Debt Burden:</strong>
    ₹ ${(snapshot.totalDebtBurden/100000)
      .toFixed(2)} L</p>

    <hr>

    <p><strong>Structural Result:</strong>
    <span style="color:${
      snapshot.status === "STABLE"
      ? "lime"
      : "red"
    }">
    ₹ ${(snapshot.structuralResult/100000)
      .toFixed(2)} L
    </span></p>

    <p><strong>Status:</strong>
    ${snapshot.status === "STABLE"
      ? "🟢 Structurally Stable"
      : "🔴 Structural Deficit"}
    </p>
  `;
}

/* ==========================================
   PURE FINANCIAL SIMULATION ENGINE
========================================== */

function simulateFinancialModel({
  baseState,
  injections = [],
  months = 60,
  growthPercent = 0,
  runUntilCollapse = false
}) {

  let state =
    JSON.parse(JSON.stringify(baseState));

  let cash = safe(state.openingCash);

  const history = [];

  for (let monthIndex = 1;
       monthIndex <= months;
       monthIndex++) {

    // 1️⃣ Revenue Model
    const baseAnnual = 15000000; // 1.5 Cr baseline
    const baseMonthly =
      baseAnnual / 12;

    const growthFactor =
      Math.pow(
        1 + growthPercent/100,
        monthIndex - 1
      );

    const billing =
      baseMonthly * growthFactor;

    // 2️⃣ Operating Profit
    const doctorCost =
      billing *
      (state.doctorPercent / 100);

    const cogs =
      billing *
      (state.cogsPercent / 100);

    const operating =
      billing -
      doctorCost -
      cogs -
      state.fixedExpenses -
      state.salary;

    cash += operating;

    // 3️⃣ Bank EMI
    let totalBankEMI = 0;

    state.bankLoans.forEach(loan => {
      totalBankEMI += loan.monthlyEMI;
      loan.principal =
        Math.max(
          0,
          loan.principal -
          loan.monthlyEMI
        );
    });

    cash -= totalBankEMI;

    // 4️⃣ Private Interest
    let totalPrivateInterest = 0;

    state.privateInvestors.forEach(inv => {
      const interest =
        inv.principal *
        (inv.monthlyRate / 100);

      totalPrivateInterest += interest;
    });

    cash -= totalPrivateInterest;

    // 5️⃣ Apply Injection
    injections
      .filter(inj =>
        inj.month === monthIndex
      )
      .forEach(inj => {

        const privateAlloc =
          inj.amount *
          (inj.allocation.private / 100);

        const bankAlloc =
          inj.amount *
          (inj.allocation.bank / 100);

        const bufferAlloc =
          inj.amount *
          (inj.allocation.buffer / 100);

        // Reduce private
        let remainingPrivate =
          privateAlloc;

        state.privateInvestors
          .forEach(inv => {

          if (remainingPrivate <= 0)
            return;

          let reducible =
            inv.principal;

          if (inv.type === "partial") {
            reducible =
              inv.principal -
              inv.minLockedPrincipal;
          }

          reducible =
            Math.max(0,reducible);

          const reduction =
            Math.min(
              reducible,
              remainingPrivate
            );

          inv.principal -= reduction;
          remainingPrivate -= reduction;
        });

        // Reduce bank
        let remainingBank =
          bankAlloc;

        state.bankLoans
          .forEach(loan => {

          if (remainingBank <= 0)
            return;

          const reduction =
            Math.min(
              loan.principal,
              remainingBank
            );

          loan.principal -= reduction;
          remainingBank -= reduction;
        });

        // Buffer
        cash += bufferAlloc;
      });

    const collapse =
      cash < 0;

    history.push({
      monthIndex,
      billing,
      operating,
      totalBankEMI,
      totalPrivateInterest,
      cash,
      collapse
    });

    if (collapse &&
        runUntilCollapse)
      break;
  }

  return {
    history,
    finalCash: cash,
    collapseMonth:
      history.find(h=>h.collapse)
      ?.monthIndex || null,
    finalPrivatePrincipal:
      state.privateInvestors
        .reduce((s,i)=>
          s+i.principal,0),
    finalBankPrincipal:
      state.bankLoans
        .reduce((s,l)=>
          s+l.principal,0)
  };
}

/* ==========================================
   BUILD INJECTION OBJECT
========================================== */

function buildInjectionFromUI() {

  const month =
    safe(document
      .getElementById("injMonth")
      ?.value);

  const amountL =
    safe(document
      .getElementById("injAmount")
      ?.value);

  const privatePercent =
    safe(document
      .getElementById("injPrivate")
      ?.value);

  const bankPercent =
    safe(document
      .getElementById("injBank")
      ?.value);

  const bufferPercent =
    safe(document
      .getElementById("injBuffer")
      ?.value);

  const amount =
    amountL * 100000;

  currentInjection = {
    month,
    amount,
    allocation: {
      private: privatePercent,
      bank: bankPercent,
      buffer: bufferPercent
    }
  };
}

/* ==========================================
   REAL-TIME PREVIEW
========================================== */

async function previewInjection() {

  if (!cachedBaseState)
    await loadBaseState();

  buildInjectionFromUI();

  const result =
    simulateFinancialModel({
      baseState: cachedBaseState,
      injections:
        currentInjection
        ? [currentInjection]
        : [],
      months: 12
    });

  document
    .getElementById("injectionPreview")
    .innerHTML = `
      <p><strong>Cash After 12 Months:</strong>
      ₹ ${(result.finalCash/100000)
        .toFixed(2)} L</p>
      <p><strong>Collapse Month:</strong>
      ${result.collapseMonth || "None"}</p>
    `;
}

/* ==========================================
   RUN FULL SIMULATION
========================================== */

async function runSimulation() {

  if (!cachedBaseState)
    await loadBaseState();

  buildInjectionFromUI();

  const growthPercent =
    safe(document
      .getElementById("growthInput")
      ?.value);

  const result =
    simulateFinancialModel({
      baseState: cachedBaseState,
      injections:
        currentInjection
        ? [currentInjection]
        : [],
      months: 60,
      growthPercent
    });

  renderTable(result.history);
  renderSummary(result);
}

/* ==========================================
   TABLE RENDER
========================================== */

function renderTable(history) {

  const container =
    document
      .getElementById("simulationTable");

  container.innerHTML =
    history.map(row=>`
      <tr>
        <td>${row.monthIndex}</td>
        <td>₹${(row.billing/100000)
          .toFixed(2)} L</td>
        <td>₹${(row.operating/100000)
          .toFixed(2)} L</td>
        <td>₹${(row.totalBankEMI/100000)
          .toFixed(2)} L</td>
        <td>₹${(row.totalPrivateInterest/100000)
          .toFixed(2)} L</td>
        <td>₹${(row.cash/100000)
          .toFixed(2)} L</td>
        <td>${row.collapse
          ? "🔴 Collapse"
          : "🟢 Stable"}</td>
      </tr>
    `).join("");
}

/* ==========================================
   SUMMARY
========================================== */

function renderSummary(result) {

  document
    .getElementById("summary")
    .innerHTML = `
      <p><strong>Final Cash:</strong>
      ₹ ${(result.finalCash/100000)
        .toFixed(2)} L</p>
      <p><strong>Collapse Month:</strong>
      ${result.collapseMonth || "None"}</p>
      <p><strong>Remaining Private Principal:</strong>
      ₹ ${(result.finalPrivatePrincipal/100000)
        .toFixed(2)} L</p>
      <p><strong>Remaining Bank Principal:</strong>
      ₹ ${(result.finalBankPrincipal/100000)
        .toFixed(2)} L</p>
    `;
}

/* ==========================================
   INIT
========================================== */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await loadBaseState();

    const snapshot =
      computeSnapshot(cachedBaseState);

    renderSnapshot(snapshot);

    document
      .getElementById("previewInjectionBtn")
      ?.addEventListener(
        "click",
        previewInjection
      );

    document
      .getElementById("runSimulationBtn")
      ?.addEventListener(
        "click",
        runSimulation
      );
  }
);