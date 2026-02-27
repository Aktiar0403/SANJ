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


let revenueOverrides = [];


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

async function updateSnapshot() {

  const loansSnap = await getDocs(collection(db,"loans"));
  const loans = loansSnap.docs.map(d=>d.data());

  const privateSnap = await getDocs(collection(db,"privateInvestors"));
  const privates = privateSnap.docs.map(d=>d.data());

  let bank = 0;
  let personal = 0;
  let monthly = 0;

  loans.forEach(l=>{
    if(l.type==="business") bank+=l.principal;
    if(l.type==="personal") personal+=l.principal;
    monthly+=l.monthlyEMI;
  });

  let privateTotal=0;
  let privateMonthly=0;

  privates.forEach(p=>{
    privateTotal+=p.principal;
    privateMonthly+=p.principal*(p.monthlyRate/100);
  });

  document.getElementById("totalBank").innerText="₹"+bank;
  document.getElementById("totalPersonal").innerText="₹"+personal;
  document.getElementById("totalPrivate").innerText="₹"+privateTotal;
  document.getElementById("totalMonthlyBurden").innerText=
    "₹"+(monthly+privateMonthly);
}




async function loadInjectionsUI() {

  const snap = await getDocs(collection(db, "capitalInjections"));
  const injections = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const container = document.getElementById("injectionCards");

  container.innerHTML = injections.map(i => `
    <div class="card-item">
      <strong>Month ${i.month}</strong>
      <br>
      Amount: ₹${i.amount}
      <br>
      Private: ${i.privatePercent}% | Bank: ${i.bankPercent}% | Buffer: ${i.bufferPercent}%
      <br>
      <button onclick="editInjection('${i.id}')">Edit</button>
      <button onclick="deleteInjection('${i.id}')">Delete</button>
    </div>
  `).join("");
}


async function loadLoansUI() {

  const snap = await getDocs(collection(db, "loans"));
  const loans = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const container = document.getElementById("loanCards");

  container.innerHTML = loans.map(l => `
    <div class="card-item">
      <strong>${l.name}</strong> (${l.type})
      <br>
      Principal: ₹${l.principal}
      <br>
      EMI: ₹${l.monthlyEMI}
      <br>
      <button onclick="editLoan('${l.id}', ${l.principal}, ${l.monthlyEMI})">
        Edit
      </button>
    </div>
  `).join("");
}


window.editLoan = async function(id, principal, emi) {

  const newPrincipal = prompt("New Principal", principal);
  const newEMI = prompt("New EMI", emi);

  if (!newPrincipal || !newEMI) return;

  await setDoc(doc(db, "loans", id), {
    principal: Number(newPrincipal),
    monthlyEMI: Number(newEMI)
  }, { merge: true });

  loadLoansUI();
};

async function loadPrivateUI() {

  const snap = await getDocs(collection(db, "privateInvestors"));
  const investors = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const container = document.getElementById("privateCards");

  container.innerHTML = investors.map(inv => `
    <div class="card-item">
      <strong>${inv.name}</strong>
      <br>
      Category: ${inv.category}
      <br>
      Principal: ₹${inv.principal}
      <br>
      Monthly Rate: ${inv.monthlyRate}%
      <br>
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

  if (!newPrincipal || !newRate) return;

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


/* =========================
   🚀 RUN SIMULATION
========================= */

async function runSimulation() {

  /* 1️⃣ Load Config */
  const configSnap =
    await getDoc(doc(db, "businessConfig", "main"));

  const config = configSnap.data();

  /* 2️⃣ Load Loans */
  const loansSnap =
    await getDocs(collection(db, "loans"));

  const loans =
    loansSnap.docs.map(d => ({ ...d.data() }));

  /* 3️⃣ Load Private */
  const invSnap =
    await getDocs(collection(db, "privateInvestors"));

  const privateInvestors =
    invSnap.docs.map(d => ({ ...d.data() }));

  /* 4️⃣ Load Injections */
  const injSnap =
    await getDocs(collection(db, "capitalInjections"));

  const injections =
    injSnap.docs.map(d => d.data());

  let cash = config.openingCash;
  let history = [];

  /* =========================
     🔁 SIMULATION LOOP
  ========================== */

  for (let m = 0; m < 36; m++) {

    /* ---- Calendar Month ---- */

    const date = new Date(config.startDate);
    date.setMonth(date.getMonth() + m);

    const monthNum = date.getMonth() + 1;

    /* ---- Billing Logic ---- */

    let billing;

    const override =
      revenueOverrides.find(o => o.month === (m + 1));

    if (override) {
      billing = override.billing;
    } else {
      if (monthNum >= 3 && monthNum <= 9)
        billing = config.peakBilling;
      else
        billing = config.lowBilling;
    }

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

    /* ---- Loans ---- */

    let totalLoanEMI = 0;
    loans.forEach(l => totalLoanEMI += l.monthlyEMI);
    cash -= totalLoanEMI;

    /* ---- Private ---- */

    let totalPrivateInterest = 0;
    privateInvestors.forEach(inv => {
      totalPrivateInterest +=
        inv.principal * (inv.monthlyRate / 100);
    });

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
      cash
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

document.addEventListener("DOMContentLoaded", () => {
  loadLoansUI();
  loadPrivateUI();
  loadInjectionsUI();
  updateSnapshot();

  const runBtn = document.getElementById("runSim");
  if (runBtn) {
    runBtn.addEventListener("click", runSimulation);
  }
});

document.getElementById("addInjection")
  .addEventListener("click", async () => {

    await addDoc(collection(db,"capitalInjections"),{
      month:Number(injectMonth.value),
      amount:Number(injectAmount.value),
      privatePercent:Number(injectPrivatePercent.value),
      bankPercent:Number(injectBankPercent.value),
      bufferPercent:Number(injectBufferPercent.value)
    });

    loadInjectionsUI();
});