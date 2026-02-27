import {
  db,
  collection,
  getDocs,
  doc,
  getDoc
} from "./firebase.js";

import {
  generateSeasonalRevenue,
  calculateBusiness
} from "./engines/businessEngine.js";

import {
  processBankLoans,
  processInjectionPayout
} from "./engines/debtEngine.js";

import {
  processPrivateInterest
} from "./engines/privateEngine.js";

import {
  applyInjection
} from "./engines/injectionEngine.js";

/* =============================
   SIMULATION
============================= */

async function runSimulation(){

  const configSnap =
    await getDoc(doc(db,"businessConfig","main"));

  const config = configSnap.data();

  const loansSnap =
    await getDocs(collection(db,"loans"));

  const loans =
    loansSnap.docs.map(d=>({...d.data()}));

  const invSnap =
    await getDocs(collection(db,"privateInvestors"));

  const privateInvestors =
    invSnap.docs.map(d=>({...d.data()}));

  const injSnap =
    await getDocs(collection(db,"capitalInjections"));

  const injections =
    injSnap.docs.map(d=>d.data());

  const seasonal =
    generateSeasonalRevenue(15000000);

  let cash = config.openingCash;
  let history = [];

  for(let m=0;m<36;m++){

    const date =
      new Date(config.startDate);

    date.setMonth(date.getMonth()+m);

    const monthIndex =
      date.getMonth();

    const billing =
      seasonal[monthIndex];

    const business =
      calculateBusiness(billing,config);

    cash += business.operating;

    const totalEMI =
      processBankLoans(loans);

    cash -= totalEMI;

    const privateInterest =
      processPrivateInterest(
        privateInvestors,
        m+1
      );

    cash -= privateInterest;

    const injectionPayout =
      processInjectionPayout(
        injections,
        m+1
      );

    cash -= injectionPayout;

    cash = applyInjection(
      m+1,
      injections,
      loans,
      privateInvestors,
      cash
    );

    history.push({
      month:m+1,
      billing,
      operating:business.operating,
      EMI:totalEMI,
      privateInterest,
      injectionPayout,
      cash
    });

    if(cash<0){
      history.push({
        month:"⚠ COLLAPSE",
        cash
      });
      break;
    }
  }

  renderDashboard(history);
}

/* =============================
   DASHBOARD
============================= */

function renderDashboard(data){

  const container =
    document.getElementById("dashboard");

  container.innerHTML =
    data.map(row=>`
      <div style="padding:6px;border-bottom:1px solid #334155">
        <strong>${row.month}</strong><br>
        Billing: ₹${Math.round(row.billing||0)}<br>
        Operating: ₹${Math.round(row.operating||0)}<br>
        EMI: ₹${Math.round(row.EMI||0)}<br>
        Private: ₹${Math.round(row.privateInterest||0)}<br>
        Injection Payout: ₹${Math.round(row.injectionPayout||0)}<br>
        Cash: ₹${Math.round(row.cash||0)}
      </div>
    `).join("");
}

/* =============================
   INIT
============================= */

document.addEventListener("DOMContentLoaded",()=>{

  const runBtn =
    document.getElementById("runSim");

  if(runBtn){
    runBtn.addEventListener(
      "click",
      runSimulation
    );
  }

});