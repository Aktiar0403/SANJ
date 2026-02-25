import { runProjection } from './engines/projectionEngine.js';
import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { collection, addDoc, getDocs }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let bankLoans = [];
let privateInvestors = [];

const bankList = document.getElementById("bankList");
const investorList = document.getElementById("investorList");

async function loadData() {

  const bankSnapshot = await getDocs(collection(db, "bankLoans"));
  bankLoans = bankSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderBanks();

  const invSnapshot = await getDocs(collection(db, "privateInvestors"));
  privateInvestors = invSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderInvestors();
}





document.getElementById("addBank").addEventListener("click", async () => {

  const loan = {
    name: bankName.value,
    principal: Number(bankPrincipal.value),
    annualRate: Number(bankRate.value),
    emi: Number(bankEMI.value),
    createdAt: new Date()
  };

  await addDoc(collection(db, "bankLoans"), loan);
  loadData();
});


document.getElementById("addInvestor").addEventListener("click", async () => {

  const investor = {
    name: invName.value,
    principal: Number(invPrincipal.value),
    monthlyRate: Number(invRate.value),
    pendingInterest: 0,
    createdAt: new Date()
  };

  await addDoc(collection(db, "privateInvestors"), investor);
  loadData();
});

function renderBanks() {
  bankList.innerHTML = "";
  bankLoans.forEach((b, i) => {
    bankList.innerHTML += `<li>${b.name} - ₹${b.principal}</li>`;
  });
}

function renderInvestors() {
  investorList.innerHTML = "";
  privateInvestors.forEach((i, idx) => {
    investorList.innerHTML += `<li>${i.name} - ₹${i.principal} @ ${i.monthlyRate}%</li>`;
  });
}

// Run Simulation
document.getElementById("runSimulation").addEventListener("click", () => {

  const config = {
    monthlyRevenue: Number(revenue.value),
    monthlyExpenses: Number(expenses.value),
    openingCash: Number(openingCash.value),
    months: 24
  };

  const result = runProjection(
    structuredClone(bankLoans),
    structuredClone(privateInvestors),
    config
  );

  renderTable(result);
});

function renderTable(data) {
  let html = `
    <table>
      <tr>
        <th>Month</th>
        <th>Cash</th>
        <th>Bank EMI</th>
        <th>Private Interest</th>
        <th>Deficit</th>
      </tr>
  `;

  data.forEach(row => {
    if (!row.month) return;

    html += `
      <tr>
        <td>${row.month}</td>
        <td>${Math.round(row.cash)}</td>
        <td>${Math.round(row.bankEMI)}</td>
        <td>${Math.round(row.privateInterest)}</td>
        <td>${Math.round(row.monthlyDeficit)}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("output").innerHTML = html;
}

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
    loadData();
  }
});


