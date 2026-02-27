import {
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc
} from "./firebase.js";



/* =========================
   📅 Month Label Generator
========================= */

function getMonthLabel(startDate, offset) {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + offset);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric"
  });
}
function generateSeasonalRevenue(totalYearRevenue) {

  const weights = [
    0.7, // Jan
    0.8, // Feb
    1.0, // Mar
    1.4, // Apr
    1.5, // May
    1.4, // Jun
    1.2, // Jul
    1.1, // Aug
    1.1, // Sep
    1.0, // Oct
    0.9, // Nov
    0.8  // Dec
  ];

  const totalWeight =
    weights.reduce((a,b)=>a+b,0);

  return weights.map(w => {
    const monthly =
      (w / totalWeight) * totalYearRevenue;

    return Math.round(monthly);
  });
}
/* =========================
   📊 DASHBOARD RENDER
========================= */

function renderDashboard(data) {
  const container = document.getElementById("dashboard");
  if (!container) return;

  container.innerHTML = data.map(row => `
    <div style="padding:8px;border-bottom:1px solid #334155;">
      <strong>${row.label}</strong><br>
      Billing: ₹${Math.round(row.billing || 0)}<br>
      EMI: ₹${Math.round(row.totalLoanEMI || 0)}<br>
      Private Interest: ₹${Math.round(row.totalPrivateInterest || 0)}<br>
      Cash: ₹${Math.round(row.cash || 0)}
    </div>
  `).join("");
}

/* =========================
   💉 LOAD INJECTIONS UI
========================= */

async function loadInjectionsUI() {

  const snap = await getDocs(collection(db, "capitalInjections"));
  const injections = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const container = document.getElementById("injectionList");
  if (!container) return;

  container.innerHTML = injections.map(i => `
    <div class="card-item">
      <strong>Month ${i.month}</strong><br>
      Amount: ₹${i.amount}<br>
      Private: ${i.privatePercent}% |
      Bank: ${i.bankPercent}% |
      Buffer: ${i.bufferPercent}%<br>
      <button onclick="editInjection('${i.id}')">Edit</button>
      <button onclick="deleteInjection('${i.id}')">Delete</button>
    </div>
  `).join("");
}

window.editInjection = async function(id) {

  const snap = await getDocs(collection(db, "capitalInjections"));
  const injection = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .find(i => i.id === id);

  if (!injection) return;

  const newMonth = prompt("Month", injection.month);
  const newAmount = prompt("Amount", injection.amount);
  const newPrivate = prompt("Private %", injection.privatePercent);
  const newBank = prompt("Bank %", injection.bankPercent);
  const newBuffer = prompt("Buffer %", injection.bufferPercent);

  await setDoc(doc(db, "capitalInjections", id), {
    month: Number(newMonth),
    amount: Number(newAmount),
    privatePercent: Number(newPrivate),
    bankPercent: Number(newBank),
    bufferPercent: Number(newBuffer)
  }, { merge: true });

  loadInjectionsUI();
};

window.deleteInjection = async function(id) {
  await deleteDoc(doc(db, "capitalInjections", id));
  loadInjectionsUI();
};

/* =========================
   🏦 LOAD LOANS UI
========================= */

async function loadLoansUI() {

  const snap = await getDocs(collection(db, "loans"));
  const loans = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const container = document.getElementById("loanCards");
  if (!container) return;

  container.innerHTML = loans.map(l => `
    <div class="card-item">
      <strong>${l.name}</strong> (${l.type})<br>
      Principal: ₹${l.principal}<br>
      EMI: ₹${l.monthlyEMI}<br>
      <button onclick="editLoan('${l.id}', ${l.principal}, ${l.monthlyEMI})">
        Edit
      </button>
    </div>
  `).join("");
}

window.editLoan = async function(id, principal, emi) {

  const newPrincipal = prompt("New Principal", principal);
  const newEMI = prompt("New EMI", emi);

  await setDoc(doc(db, "loans", id), {
    principal: Number(newPrincipal),
    monthlyEMI: Number(newEMI)
  }, { merge: true });

  loadLoansUI();
};

/* =========================
   👤 LOAD PRIVATE UI
========================= */

async function loadPrivateUI() {

  const snap = await getDocs(collection(db, "privateInvestors"));
  const investors = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const container = document.getElementById("privateCards");
  if (!container) return;

  container.innerHTML = investors.map(inv => `
    <div class="card-item">
      <strong>${inv.name}</strong><br>
      Category: ${inv.category}<br>
      Principal: ₹${inv.principal}<br>
      Monthly Rate: ${inv.monthlyRate}%<br>
      <button onclick="editPrivate('${inv.id}', ${inv.principal}, ${inv.monthlyRate})">
        Adjust
      </button>
      <button onclick="skipInterest('${inv.id}')">
        Skip Interest
      </button>
    </div>
  `).join("");
}

window.editPrivate = async function(id, principal, rate) {

  const newPrincipal = prompt("New Principal", principal);
  const newRate = prompt("New Monthly %", rate);

  await setDoc(doc(db, "privateInvestors", id), {
    principal: Number(newPrincipal),
    monthlyRate: Number(newRate)
  }, { merge: true });

  loadPrivateUI();
};

window.skipInterest = async function(id) {
  await setDoc(doc(db, "privateInvestors", id), {
    monthlyRate: 0
  }, { merge: true });

  loadPrivateUI();
};

function applyInjection(month, injections, loans, privateInvestors, cash) {

  injections.forEach(inj => {

    if (inj.month !== month) return;

    const privateAlloc =
      inj.amount * (inj.privatePercent / 100);

    const bankAlloc =
      inj.amount * (inj.bankPercent / 100);

    const bufferAlloc =
      inj.amount * (inj.bufferPercent / 100);

    let remaining = privateAlloc;

    privateInvestors.forEach(inv => {

      if (remaining <= 0) return;

      const reduce =
        Math.min(inv.principal, remaining);

      inv.principal -= reduce;
      remaining -= reduce;
    });

    loans.forEach(l => {
      l.principal -= bankAlloc / loans.length;
    });

    cash += bufferAlloc;
  });

  return cash;
}




/* =========================
   🚀 RUN SIMULATION
========================= */

async function runSimulation() {

  /* =========================
     1️⃣ LOAD DATA FROM FIREBASE
  ========================== */

  const configSnap =
    await getDoc(doc(db, "businessConfig", "main"));

  const config = configSnap.data();

  const loansSnap =
    await getDocs(collection(db, "loans"));
  const loans =
    loansSnap.docs.map(d => ({ ...d.data() }));

  const invSnap =
    await getDocs(collection(db, "privateInvestors"));
  const privateInvestors =
    invSnap.docs.map(d => ({ ...d.data() }));

  const injSnap =
    await getDocs(collection(db, "capitalInjections"));
  const injections =
    injSnap.docs.map(d => d.data());

  /* =========================
     2️⃣ SEASONAL REVENUE SETUP
  ========================== */

  const yearlyRevenue = 15000000; // 1.5 Cr
  const seasonalRevenue =
    generateSeasonalRevenue(yearlyRevenue);

  let cash = config.openingCash;
  let history = [];

  /* =========================
     3️⃣ 36-MONTH LOOP
  ========================== */

  for (let m = 0; m < 36; m++) {

    const baseDate = new Date(config.startDate);
    baseDate.setMonth(baseDate.getMonth() + m);

    const monthIndex = baseDate.getMonth(); // 0–11

    const billing = seasonalRevenue[monthIndex];

    /* ---- BUSINESS CORE ---- */

    const doctorCost =
      billing * (config.doctorPercent / 100);

    const cogs =
      billing * (config.cogsPercent / 100);

    const operating =
      billing
      - doctorCost
      - cogs
      - config.fixedExpenses
      - config.salary;

    cash += operating;

    /* ---- BANK + PERSONAL EMI ---- */

    let totalLoanEMI = 0;

    loans.forEach(l => {
      totalLoanEMI += Number(l.monthlyEMI || 0);
    });

    cash -= totalLoanEMI;

    /* ---- PRIVATE INTEREST ---- */

    let totalPrivateInterest = 0;

    privateInvestors.forEach(inv => {
      totalPrivateInterest +=
        inv.principal * (inv.monthlyRate / 100);
    });

    cash -= totalPrivateInterest;

    /* ---- APPLY INJECTION ---- */

    cash = applyInjection(
      m + 1,
      injections,
      loans,
      privateInvestors,
      cash
    );

    /* ---- STORE MONTH SNAPSHOT ---- */

    history.push({
      label: getMonthLabel(config.startDate, m),
      billing,
      totalLoanEMI,
      totalPrivateInterest,
      operating,
      cash
    });

    /* ---- COLLAPSE CHECK ---- */

    if (cash < 0) {
      history.push({
        label: "⚠ SYSTEM COLLAPSE",
        cash
      });
      break;
    }
  }

  /* =========================
     4️⃣ RENDER DASHBOARD
  ========================== */

  renderDashboard(history);
}

/* =========================
   🎬 INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {

  loadLoansUI();
  loadPrivateUI();
  loadInjectionsUI();

  const runBtn = document.getElementById("runSim");
  if (runBtn) {
    runBtn.addEventListener("click", runSimulation);
  }

  const injectBtn = document.getElementById("addInjection");
  if (injectBtn) {
    injectBtn.addEventListener("click", async () => {

      await addDoc(collection(db, "capitalInjections"), {
        month: Number(injectMonth.value),
        amount: Number(injectAmount.value),
        privatePercent: Number(injectPrivatePercent.value),
        bankPercent: Number(injectBankPercent.value),
        bufferPercent: Number(injectBufferPercent.value)
      });

      loadInjectionsUI();
    });
  }

});