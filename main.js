import {
  db,
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



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

/* =========================
   🏦 Process Loans
========================= */

function processLoans(loans) {
  let totalEMI = 0;
  loans.forEach(l => {
    totalEMI += Number(l.monthlyEMI || 0);
  });
  return totalEMI;
}

/* =========================
   💰 Process Private Interest
========================= */

function processPrivateInterest(privateInvestors) {
  let total = 0;
  privateInvestors.forEach(inv => {
    total += inv.principal * (inv.monthlyRate / 100);
  });
  return total;
}

/* =========================
   💉 Apply Injection
========================= */

function applyInjection(
  monthNumber,
  injections,
  loans,
  privateInvestors,
  cash
) {

  injections.forEach(inj => {

    if (inj.month !== monthNumber) return;

    const privateAlloc =
      inj.amount * (inj.privatePercent / 100);

    const bankAlloc =
      inj.amount * (inj.bankPercent / 100);

    const bufferAlloc =
      inj.amount * (inj.bufferPercent / 100);

    /* ---- Reduce Private (priority: pressure → negotiable → locked) ---- */

    let remaining = privateAlloc;

    const priorityOrder = ["pressure", "negotiable", "locked"];

    priorityOrder.forEach(cat => {

      privateInvestors
        .filter(inv => inv.category === cat)
        .forEach(inv => {

          if (remaining <= 0) return;

          const reducible = inv.principal;
          const reduce = Math.min(reducible, remaining);

          inv.principal -= reduce;
          remaining -= reduce;
        });
    });

    /* ---- Reduce Bank Loans (proportional) ---- */

    let totalBankPrincipal = 0;

    loans.forEach(l => {
      if (l.type === "business") {
        totalBankPrincipal += l.principal;
      }
    });

    loans.forEach(l => {
      if (l.type === "business") {
        const share =
          l.principal / totalBankPrincipal;
        l.principal -= bankAlloc * share;
      }
    });

    /* ---- Add Buffer ---- */

    cash += bufferAlloc;
  });

  return cash;
}

/* =========================
   🚀 RUN SIMULATION
========================= */

async function runSimulation() {

  /* ---- Load Business Config ---- */

  const configSnap =
    await getDoc(doc(db, "businessConfig", "main"));

  const config = configSnap.data();

  /* ---- Load Loans ---- */

  const loansSnap =
    await getDocs(collection(db, "loans"));

  const loans =
    loansSnap.docs.map(d => ({ ...d.data() }));

  /* ---- Load Private Investors ---- */

  const invSnap =
    await getDocs(collection(db, "privateInvestors"));

  const privateInvestors =
    invSnap.docs.map(d => ({ ...d.data() }));

  /* ---- Load Injections ---- */

  const injSnap =
    await getDocs(collection(db, "capitalInjections"));

  const injections =
    injSnap.docs.map(d => d.data());

  /* ---- Simulation Loop ---- */

  let cash = config.openingCash;
  let history = [];

  for (let m = 0; m < 36; m++) {

    const date = new Date(config.startDate);
    date.setMonth(date.getMonth() + m);

    const monthNum = date.getMonth() + 1;

    let billing;

    if (monthNum >= 3 && monthNum <= 9)
      billing = config.peakBilling;
    else
      billing = config.lowBilling;

    /* ---- Business Core ---- */

    const doctorCost =
      billing * (config.doctorPercent / 100);

    const cogs =
      billing * (config.cogsPercent / 100);

    const contribution =
      billing - doctorCost - cogs;

    const operating =
      contribution -
      config.fixedExpenses -
      config.salary;

    cash += operating;

    /* ---- Debt ---- */

    const totalLoanEMI =
      processLoans(loans);

    const totalPrivateInterest =
      processPrivateInterest(privateInvestors);

    cash -= totalLoanEMI;
    cash -= totalPrivateInterest;

    /* ---- Injection ---- */

    cash = applyInjection(
      m + 1,
      injections,
      loans,
      privateInvestors,
      cash
    );

    history.push({
      label: getMonthLabel(config.startDate, m),
      billing,
      cash,
      totalLoanEMI,
      totalPrivateInterest
    });

    if (cash < 0) {
      history.push({
        label: "⚠ SYSTEM COLLAPSE",
        cash
      });
      break;
    }
  }

  renderDashboard(history);
}

/* =========================
   📊 Dashboard Renderer
========================= */

function renderDashboard(data) {

  const container =
    document.getElementById("dashboard");

  container.innerHTML =
    data.map(row => `
      <div style="
        padding:8px;
        border-bottom:1px solid #334155;
      ">
        <strong>${row.label}</strong>
        <br>
        Billing: ₹${Math.round(row.billing || 0)}
        <br>
        EMI: ₹${Math.round(row.totalLoanEMI || 0)}
        <br>
        Private Interest: ₹${Math.round(row.totalPrivateInterest || 0)}
        <br>
        Cash: ₹${Math.round(row.cash || 0)}
      </div>
    `).join("");
}

/* =========================
   🎬 BUTTON BIND
========================= */

document.getElementById("runSim")
  .addEventListener("click", runSimulation);