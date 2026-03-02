import {
  db,
  collection,
  getDocs
} from "./firebase.js";

let baseInvestors = [];
let decisions = {};
let privateInvestors = [];
let bankLoans = [];

async function loadPrivateInvestors() {
  const snap = await getDocs(collection(db,"privateInvestors"));

  baseInvestors = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderPrivateUI();
}

function renderPrivateUI() {

  const container =
    document.getElementById("privateContainer");

  if (!container) return;

  container.innerHTML = "";

  baseInvestors.forEach(inv => {

    const rate =
      inv.monthlyInterest > 0
      ? ((inv.monthlyInterest / inv.principal) * 100).toFixed(2)
      : 0;

    container.innerHTML += `
      <div class="investor-card">

        <div class="investor-header"
          data-id="${inv.id}">

          <h3>${inv.name}</h3>

          <div>
            ₹ ${(inv.principal/100000).toFixed(1)}L
            <span class="toggle-icon"
              id="icon-${inv.id}">+</span>
          </div>

        </div>

        <div class="investor-body"
          id="body-${inv.id}"
          style="display:none;">

          <p><strong>Principal:</strong>
          ₹ ${(inv.principal/100000).toFixed(2)} L</p>

          <p><strong>Monthly Interest:</strong>
          ₹ ${(inv.monthlyInterest/100000).toFixed(2)} L</p>

          <p><strong>Effective Rate:</strong>
          ${rate}%</p>

        </div>
      </div>
    `;
  });

  // Attach listeners safely
  document
    .querySelectorAll(".investor-header")
    .forEach(header => {

      header.addEventListener("click", () => {

        const id = header.dataset.id;

        const body =
          document.getElementById("body-" + id);

        const icon =
          document.getElementById("icon-" + id);

        if (body.style.display === "block") {
          body.style.display = "none";
          icon.innerText = "+";
        } else {
          body.style.display = "block";
          icon.innerText = "−";
        }

      });

    });
}

function toggleInvestor(id) {

  const body =
    document.getElementById("body-" + id);

  const icon =
    document.getElementById("icon-" + id);

  if (body.style.display === "block") {
    body.style.display = "none";
    icon.innerText = "+";
  } else {
    body.style.display = "block";
    icon.innerText = "−";
  }
}



function setDecision(id,key,value) {
  if (!decisions[id]) decisions[id] = {};
  decisions[id][key] = value;
}


function calculateOutcome(godfatherAmount) {

  let injectionUsed = 0;
  let newPrivateInterest = 0;

  baseInvestors.forEach(inv => {

    const action = decisions[inv.id] || {};

    if (action.close) {
      injectionUsed += inv.principal;
      return;
    }

    const reduceAmount = Number(action.reduce) || 0;
    const remainingPrincipal = inv.principal - reduceAmount;

    injectionUsed += reduceAmount;

    let rate;

    if (action.newRate) {
      rate = Number(action.newRate);
    } else if (inv.monthlyInterest > 0) {
      rate = (inv.monthlyInterest / inv.principal) * 100;
    } else {
      rate = 0;
    }

    if (action.skip > 0) {
      return; // temporarily no interest
    }

    newPrivateInterest +=
      remainingPrincipal * (rate/100);
  });

  const godfatherCost = godfatherAmount * 0.01;

  return {
    injectionUsed,
    newPrivateInterest,
    godfatherCost
  };
}

function addPrivate() {
  privateInvestors.push({
    name: "Investor " + (privateInvestors.length + 1),
    principal: 0,
    rate: 2,
    close: false,
    reduce: 0,
    newRate: null
  });
  renderPrivate();
}

function addBank() {
  bankLoans.push({
    name: "Loan " + (bankLoans.length + 1),
    principal: 0,
    emi: 0,
    close: false
  });
  renderBank();
}

function renderPrivate() {
  const container = document.getElementById("privateList");
  container.innerHTML = "";

  privateInvestors.forEach((inv, i) => {
    container.innerHTML += `
      <div class="investor">
        <strong>${inv.name}</strong>
        <label>Principal</label>
        <input type="number" onchange="privateInvestors[${i}].principal=this.value" />
        <label>Rate %</label>
        <input type="number" onchange="privateInvestors[${i}].rate=this.value" />
        <label>Reduce Principal</label>
        <input type="number" onchange="privateInvestors[${i}].reduce=this.value" />
        <label>New Rate (optional)</label>
        <input type="number" onchange="privateInvestors[${i}].newRate=this.value" />
        <label>
          <input type="checkbox" onchange="privateInvestors[${i}].close=this.checked" />
          Close Fully
        </label>
      </div>
    `;
  });
}

function renderBank() {
  const container = document.getElementById("bankList");
  container.innerHTML = "";

  bankLoans.forEach((loan, i) => {
    container.innerHTML += `
      <div class="investor">
        <strong>${loan.name}</strong>
        <label>Principal</label>
        <input type="number" onchange="bankLoans[${i}].principal=this.value" />
        <label>EMI</label>
        <input type="number" onchange="bankLoans[${i}].emi=this.value" />
        <label>
          <input type="checkbox" onchange="bankLoans[${i}].close=this.checked" />
          Close Fully
        </label>
      </div>
    `;
  });
}

function calculate() {
  const revenue = Number(document.getElementById("revenue").value);
  const doctorPercent = Number(document.getElementById("doctorPercent").value);
  const cogsPercent = Number(document.getElementById("cogsPercent").value);
  const fixedExpense = Number(document.getElementById("fixedExpense").value);
  const godfatherAmount = Number(document.getElementById("godfatherAmount").value);

  // Operating
  const doctorCost = revenue * (doctorPercent / 100);
  const cogs = revenue * (cogsPercent / 100);
  const operatingSurplus = revenue - doctorCost - cogs - fixedExpense;

  let injectionUsed = 0;
  let privateInterest = 0;
  let bankEMI = 0;

  privateInvestors.forEach(inv => {
    if (inv.close) {
      injectionUsed += Number(inv.principal);
      return;
    }

    const reducedPrincipal =
      Number(inv.principal) - Number(inv.reduce || 0);

    injectionUsed += Number(inv.reduce || 0);

    const finalRate = inv.newRate
      ? Number(inv.newRate)
      : Number(inv.rate);

    privateInterest +=
      reducedPrincipal * (finalRate / 100);
  });

  bankLoans.forEach(loan => {
    if (loan.close) {
      injectionUsed += Number(loan.principal);
      return;
    }

    bankEMI += Number(loan.emi);
  });

  // Godfather cost
  const godfatherCost =
    godfatherAmount * 0.01;

  const totalBurden =
    privateInterest + bankEMI + godfatherCost;

  const netMonthly =
    operatingSurplus - totalBurden;

  const buffer =
    godfatherAmount - injectionUsed;

  let runway = "Stable";

  if (netMonthly < 0 && buffer > 0) {
    runway = (buffer / Math.abs(netMonthly)).toFixed(1) + " months";
  }

  document.getElementById("results").innerHTML = `
    <p><strong>Operating Surplus:</strong> ₹${operatingSurplus.toFixed(0)}</p>
    <p><strong>Private Interest:</strong> ₹${privateInterest.toFixed(0)}</p>
    <p><strong>Bank EMI:</strong> ₹${bankEMI.toFixed(0)}</p>
    <p><strong>Godfather Cost (1%):</strong> ₹${godfatherCost.toFixed(0)}</p>
    <hr>
    <p><strong>Total Monthly Burden:</strong> ₹${totalBurden.toFixed(0)}</p>
    <p><strong>Net Monthly Position:</strong> ₹${netMonthly.toFixed(0)}</p>
    <p><strong>Injection Used:</strong> ₹${injectionUsed.toFixed(0)}</p>
    <p><strong>Remaining Buffer:</strong> ₹${buffer.toFixed(0)}</p>
    <p><strong>Runway:</strong> ${runway}</p>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadPrivateInvestors();
});