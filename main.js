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

  const summary =
    document.getElementById("privateSummary");

  if (!container) return;

  container.innerHTML = "";

  let totalInterest = 0;

  baseInvestors.forEach(inv => {
    totalInterest += Number(inv.monthlyInterest) || 0;
  });

  summary.innerHTML = `
    <strong>Total Monthly Private Interest:</strong>
    ₹ ${(totalInterest/100000).toFixed(2)} L
  `;

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

<hr>

<label>Allocate from Godfather (₹)</label>
<input type="number"
  class="allocate-input"
  data-id="${inv.id}"
  placeholder="0">

<div class="negotiation-section"
  id="negotiation-${inv.id}"
  style="display:none;">

  <label>New Negotiated Rate %</label>
  <input type="number"
    class="new-rate"
    data-id="${inv.id}">

  <label>Skip Months</label>
  <input type="number"
    class="skip-months"
    data-id="${inv.id}">

</div>
    `;
  });

  // Auto-close logic
  document
    .querySelectorAll(".investor-header")
    .forEach(header => {

      header.addEventListener("click", () => {

        const id = header.dataset.id;

        // Close all first
        document
          .querySelectorAll(".investor-body")
          .forEach(body => {
            body.style.display = "none";
          });

        document
          .querySelectorAll(".toggle-icon")
          .forEach(icon => {
            icon.innerText = "+";
          });

        // Open selected
        const body =
          document.getElementById("body-" + id);

        const icon =
          document.getElementById("icon-" + id);

        body.style.display = "block";
        icon.innerText = "−";

      });

    });

    document
  .querySelectorAll(".allocate-input")
  .forEach(input => {

    input.addEventListener("input", () => {

      const id = input.dataset.id;
      const value = Number(input.value) || 0;

      const negotiation =
        document.getElementById("negotiation-" + id);

      if (value > 0) {
        negotiation.style.display = "block";
      } else {
        negotiation.style.display = "none";
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


function calculateOutcome() {

  const godfatherAmount =
    Number(document.getElementById("godfatherAmount")?.value) || 0;

  let injectionUsed = 0;
  let newPrivateInterest = 0;

  baseInvestors.forEach(inv => {

    const allocationInput =
      document.querySelector(
        `.allocate-input[data-id='${inv.id}']`
      );

    const rateInput =
      document.querySelector(
        `.new-rate[data-id='${inv.id}']`
      );

    const skipInput =
      document.querySelector(
        `.skip-months[data-id='${inv.id}']`
      );

    const allocation =
      Number(allocationInput?.value) || 0;

    const negotiatedRate =
      Number(rateInput?.value);

    const skipMonths =
      Number(skipInput?.value) || 0;

    // If allocation exceeds principal, clamp
    const effectiveAllocation =
      Math.min(allocation, inv.principal);

    injectionUsed += effectiveAllocation;

    const remainingPrincipal =
      inv.principal - effectiveAllocation;

    // Determine rate
    let originalRate = 0;

    if (inv.monthlyInterest > 0) {
      originalRate =
        (inv.monthlyInterest / inv.principal) * 100;
    }

    let finalRate = originalRate;

    if (effectiveAllocation > 0 && negotiatedRate) {
      finalRate = negotiatedRate;
    }

    // Skip logic
    if (skipMonths > 0) {
      // temporarily zero interest
      return;
    }

    newPrivateInterest +=
      remainingPrincipal * (finalRate / 100);

  });

  const godfatherCost =
    godfatherAmount * 0.01;

  const remainingBuffer =
    godfatherAmount - injectionUsed;

  const totalPrivateBurden =
    newPrivateInterest + godfatherCost;

  // Display result
  const results =
    document.getElementById("results");

  results.innerHTML = `
    <h3>Post-Restructure Summary</h3>

    <p><strong>Godfather Total:</strong>
    ₹ ${(godfatherAmount/100000).toFixed(2)} L</p>

    <p><strong>Injection Used:</strong>
    ₹ ${(injectionUsed/100000).toFixed(2)} L</p>

    <p><strong>Remaining Buffer:</strong>
    ₹ ${(remainingBuffer/100000).toFixed(2)} L</p>

    <hr>

    <p><strong>New Private Interest:</strong>
    ₹ ${(newPrivateInterest/100000).toFixed(2)} L</p>

    <p><strong>Godfather Monthly Cost (1%):</strong>
    ₹ ${(godfatherCost/100000).toFixed(2)} L</p>

    <p><strong>Total Private Burden:</strong>
    ₹ ${(totalPrivateBurden/100000).toFixed(2)} L</p>
  `;
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