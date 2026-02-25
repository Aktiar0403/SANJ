import { runProjection } from './engines/projectionEngine.js';

let bankLoans = [];
let privateInvestors = [];

const bankList = document.getElementById("bankList");
const investorList = document.getElementById("investorList");

// Add Bank Loan
document.getElementById("addBank").addEventListener("click", () => {
  const loan = {
    name: bankName.value,
    principal: Number(bankPrincipal.value),
    annualRate: Number(bankRate.value),
    emi: Number(bankEMI.value)
  };

  bankLoans.push(loan);
  renderBanks();
});

// Add Investor
document.getElementById("addInvestor").addEventListener("click", () => {
  const investor = {
    name: invName.value,
    principal: Number(invPrincipal.value),
    monthlyRate: Number(invRate.value),
    pendingInterest: 0
  };

  privateInvestors.push(investor);
  renderInvestors();
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