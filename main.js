import { runProjection } from "./engines/projectionEngine.js";
import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===============================
   GLOBAL STATE
================================= */

let bankLoans = [];
let privateInvestors = [];
let marketingOverrides = {};
const overrideList = document.getElementById("overrideList");

let editingBankId = null;
let editingInvestorId = null;

/* ===============================
   DOM REFERENCES
================================= */

const bankList = document.getElementById("bankList");
const investorList = document.getElementById("investorList");

/* ===============================
   AUTH
================================= */

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(err.message);
  }
});

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("appSection").style.display = "block";
    loadAllData();
  }
});

/* ===============================
   LOAD ALL DATA
================================= */

async function loadAllData() {
  await loadConfig();
  await loadBanks();
  await loadInvestors();
}

/* ===============================
   CONFIG
================================= */

async function loadConfig() {
  const snap = await getDoc(doc(db, "config", "main"));

  if (snap.exists()) {
    const cfg = snap.data();
    revenue.value = cfg.monthlyRevenue || 0;
    expenses.value = cfg.monthlyExpenses || 0;
    openingCash.value = cfg.openingCash || 0;
  }
}

document.getElementById("saveConfig").addEventListener("click", async () => {
  const configData = {
    monthlyRevenue: Number(revenue.value),
    monthlyExpenses: Number(expenses.value),
    openingCash: Number(openingCash.value),
    updatedAt: new Date()
  };

  await setDoc(doc(db, "config", "main"), configData);
  alert("Business Config Saved");
});

/* ===============================
   BANK LOANS
================================= */

async function loadBanks() {
  const snapshot = await getDocs(collection(db, "bankLoans"));
  bankLoans = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderBanks();
}

document.getElementById("addBank").addEventListener("click", async () => {

  const loanData = {
    name: bankName.value,
    principal: Number(bankPrincipal.value),
    annualRate: Number(bankRate.value),
    emi: Number(bankEMI.value),
    createdAt: new Date()
  };

  if (editingBankId) {
    await setDoc(doc(db, "bankLoans", editingBankId), loanData);
    editingBankId = null;
  } else {
    await addDoc(collection(db, "bankLoans"), loanData);
  }

  clearBankForm();
  loadBanks();
});

function renderBanks() {
  bankList.innerHTML = "";

  bankLoans.forEach(bank => {
    bankList.innerHTML += `
      <li>
        ${bank.name} - ₹${bank.principal}
        <button onclick="editBank('${bank.id}')">Edit</button>
        <button onclick="deleteBank('${bank.id}')">Delete</button>
      </li>
    `;
  });
}

window.editBank = function(id) {
  const bank = bankLoans.find(b => b.id === id);
  if (!bank) return;

  bankName.value = bank.name;
  bankPrincipal.value = bank.principal;
  bankRate.value = bank.annualRate;
  bankEMI.value = bank.emi;

  editingBankId = id;
};

window.deleteBank = async function(id) {
  await deleteDoc(doc(db, "bankLoans", id));
  loadBanks();
};

function clearBankForm() {
  bankName.value = "";
  bankPrincipal.value = "";
  bankRate.value = "";
  bankEMI.value = "";
}

/* ===============================
   PRIVATE INVESTORS
================================= */

async function loadInvestors() {
  const snapshot = await getDocs(collection(db, "privateInvestors"));
  privateInvestors = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderInvestors();
}

document.getElementById("addInvestor").addEventListener("click", async () => {

  const investorData = {
    name: invName.value,
    principal: Number(invPrincipal.value),
    monthlyRate: Number(invRate.value),
    pendingInterest: 0,
    createdAt: new Date()
  };

  if (editingInvestorId) {
    await setDoc(doc(db, "privateInvestors", editingInvestorId), investorData);
    editingInvestorId = null;
  } else {
    await addDoc(collection(db, "privateInvestors"), investorData);
  }

  clearInvestorForm();
  loadInvestors();
});

function renderInvestors() {
  investorList.innerHTML = "";

  privateInvestors.forEach(inv => {
    investorList.innerHTML += `
      <li>
        ${inv.name} - ₹${inv.principal} @ ${inv.monthlyRate}%
        <button onclick="editInvestor('${inv.id}')">Edit</button>
        <button onclick="deleteInvestor('${inv.id}')">Delete</button>
      </li>
    `;
  });
}

window.editInvestor = function(id) {
  const inv = privateInvestors.find(i => i.id === id);
  if (!inv) return;

  invName.value = inv.name;
  invPrincipal.value = inv.principal;
  invRate.value = inv.monthlyRate;

  editingInvestorId = id;
};

window.deleteInvestor = async function(id) {
  await deleteDoc(doc(db, "privateInvestors", id));
  loadInvestors();
};

function clearInvestorForm() {
  invName.value = "";
  invPrincipal.value = "";
  invRate.value = "";
}
function renderTable(data) {
  let html = `
    <table>
      <tr>
        <th>Month</th>
        <th>Revenue</th>
        <th>Expenses</th>
        <th>Marketing</th>
        <th>Cash</th>
        <th>Deficit</th>
      </tr>
  `;

  data.forEach(row => {
    if (!row.month) return;

    html += `
      <tr>
        <td>${row.month}</td>
        <td>${Math.round(row.revenue)}</td>
        <td>${Math.round(row.expenses)}</td>
        <td>${Math.round(row.marketingSpend)}</td>
        <td>${Math.round(row.cash)}</td>
        <td>${Math.round(row.monthlyDeficit)}</td>
      </tr>
    `;
  });

  html += "</table>";
  document.getElementById("output").innerHTML = html;
}
/* ===============================
   RUN SIMULATION
================================= */

document.getElementById("runSimulation").addEventListener("click", () => {

  const config = {
    openingCash: Number(openingCash.value),

    baseRevenue: Number(baseRevenue.value),
    monthlyGrowthPercent: Number(growthPercent.value),

    marketingPlan: {
      defaultSpend: Number(marketingSpend.value),
      custom: marketingOverrides
    },

    marketingROI: Number(marketingROI.value),

    fixedExpenses: Number(fixedExpenses.value),
    salary: Number(salary.value),
    inventoryCostPercent: Number(inventoryPercent.value),

    months: 24
  };

  const result = runProjection(
    structuredClone(bankLoans),
    structuredClone(privateInvestors),
    config
  );

  renderTable(result);
});

/* ===============================
   MARKETING OVERRIDES
================================= */

document.getElementById("addOverride").addEventListener("click", () => {

  const month = Number(overrideMonth.value);
  const amount = Number(overrideAmount.value);

  if (!month || !amount) return;

  marketingOverrides[month] = amount;

  renderOverrides();
  overrideMonth.value = "";
  overrideAmount.value = "";
});

function renderOverrides() {
  overrideList.innerHTML = "";

  Object.keys(marketingOverrides).forEach(month => {
    overrideList.innerHTML += `
      <li>
        Month ${month} → ₹${marketingOverrides[month]}
        <button onclick="deleteOverride(${month})">Remove</button>
      </li>
    `;
  });
}

window.deleteOverride = function(month) {
  delete marketingOverrides[month];
  renderOverrides();
};