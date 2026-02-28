/* ==========================================
   CAPITAL ALLOCATION SIMULATION ENGINE
   - Multi Injection
   - 1% perpetual payout
   - Simple private interest (non-compounding)
   - Optional growth
   - Full monthly expense breakdown
========================================== */

export function simulateBusiness({
  baseState,
  committedInjections = [],
  hypotheticalInjections = [],
  months = 60,
  runUntilCollapse = false,
  growthPercent = 0
}) {

  /* ==============================
     1️⃣ CLONE BASE STATE
  ============================== */

  const privateInvestors =
    JSON.parse(JSON.stringify(baseState.privateInvestors));

  const loans =
    JSON.parse(JSON.stringify(baseState.loans));

  const injections = [
    ...committedInjections,
    ...hypotheticalInjections
  ];

  /* ==============================
     2️⃣ SEASONAL WEIGHTS
  ============================== */

  const seasonalWeights = [
    0.7, 0.8, 1.0, 1.4, 1.5, 1.4,
    1.2, 1.1, 1.1, 1.0, 0.9, 0.8
  ];

  const totalWeight =
    seasonalWeights.reduce((a,b)=>a+b,0);

  const BASE_YEAR_REVENUE = 15000000; // 1.5 Cr

  /* ==============================
     3️⃣ INITIAL STATE
  ============================== */

  let cash = baseState.openingCash || 0;
  let history = [];
  let collapseMonth = null;

  const MAX_MONTH_CAP = 300;

  const totalMonths =
    runUntilCollapse ? MAX_MONTH_CAP : months;

  /* ==============================
     4️⃣ MONTH LOOP
  ============================== */

  for (let m = 1; m <= totalMonths; m++) {

    /* ===== YEAR INDEX FOR GROWTH ===== */

    const yearIndex =
      Math.floor((m - 1) / 12);

    const adjustedYearRevenue =
      BASE_YEAR_REVENUE *
      Math.pow(1 + growthPercent / 100, yearIndex);

    const monthIndex =
      (m - 1) % 12;

    const billing =
      (seasonalWeights[monthIndex] / totalWeight) *
      adjustedYearRevenue;

    /* ==============================
       5️⃣ BUSINESS EXPENSES
    ============================== */

    const doctorExpense =
      billing * (baseState.doctorPercent / 100);

    const cogsExpense =
      billing * (baseState.cogsPercent / 100);

    const fixedExpense =
      baseState.fixedExpenses;

    const salaryExpense =
      baseState.salary;

    const totalBusinessExpense =
      doctorExpense +
      cogsExpense +
      fixedExpense +
      salaryExpense;

    const operating =
      billing - totalBusinessExpense;

    /* ==============================
       6️⃣ BANK EMI
    ============================== */

    const bankEMI =
      loans.reduce((sum,l)=>
        sum + (l.monthlyEMI || 0), 0);

    /* ==============================
       7️⃣ PRIVATE INTEREST
    ============================== */

    let privateInterest = 0;

    privateInvestors.forEach(inv => {

      if (m <= (inv.skipUntilMonth || 0))
        return;

      privateInterest +=
        inv.principal *
        (inv.monthlyRate / 100);

    });

    /* ==============================
       8️⃣ INJECTION PAYOUT
    ============================== */

    let injectionPayout = 0;

    injections.forEach(inj => {
      if (m >= inj.month) {
        injectionPayout +=
          inj.amount *
          (inj.monthlyPayoutRate / 100);
      }
    });

    /* ==============================
       9️⃣ APPLY INJECTION PRINCIPAL REDUCTION
       (Immediate in injection month)
    ============================== */

    injections.forEach(inj => {

      if (inj.month !== m) return;

      const privateAlloc =
        inj.amount * (inj.privatePercent / 100);

      const bankAlloc =
        inj.amount * (inj.bankPercent / 100);

      const bufferAlloc =
        inj.amount * (inj.bufferPercent / 100);

      let remainingPrivate = privateAlloc;

      /* === STRATEGY BASED REDUCTION === */

      const sortedPrivate =
        getSortedInvestors(
          privateInvestors,
          inj.strategy
        );

      sortedPrivate.forEach(inv => {

        if (remainingPrivate <= 0) return;
        if (inv.type === "locked") return;

        let reducible = inv.principal;

        if (inv.type === "partial") {
          reducible =
            inv.principal -
            (inv.minLockedPrincipal || 0);
        }

        const reduction =
          Math.min(reducible, remainingPrivate);

        inv.principal -= reduction;
        remainingPrivate -= reduction;
      });

      /* === BANK PROPORTIONAL REDUCTION === */

      const totalPrincipal =
        loans.reduce((s,l)=>s+l.principal,0);

      loans.forEach(l => {
        const share =
          l.principal / totalPrincipal;
        l.principal -= bankAlloc * share;
      });

      /* === BUFFER ADDED === */

      cash += bufferAlloc;
    });

    /* ==============================
       🔟 TOTAL EXPENSE + NET
    ============================== */

    const totalDebtExpense =
      bankEMI + privateInterest + injectionPayout;

    const totalExpense =
      totalBusinessExpense + totalDebtExpense;

    const netMonthly =
      operating - totalDebtExpense;

    cash += netMonthly;

    /* ==============================
       1️⃣1️⃣ STABILITY CLASSIFICATION
    ============================== */

    let stabilityStatus = "stable";

    if (cash < 0) {
      stabilityStatus = "collapsed";
    } else if (netMonthly < 0) {
      stabilityStatus = "at_risk";
    } else if (netMonthly < 2 * bankEMI) {
      stabilityStatus = "tight";
    }

    /* ==============================
       1️⃣2️⃣ STORE MONTH SNAPSHOT
    ============================== */

    history.push({
      monthIndex: m,
      billing: round(billing),

      doctorExpense: round(doctorExpense),
      cogsExpense: round(cogsExpense),
      fixedExpense: round(fixedExpense),
      salaryExpense: round(salaryExpense),

      bankEMI: round(bankEMI),
      privateInterest: round(privateInterest),
      injectionPayout: round(injectionPayout),

      totalBusinessExpense: round(totalBusinessExpense),
      totalDebtExpense: round(totalDebtExpense),
      totalExpense: round(totalExpense),

      netMonthlyResult: round(netMonthly),
      cash: round(cash),

      stabilityStatus
    });

    if (cash < 0) {
      collapseMonth = m;
      break;
    }
  }

  /* ==============================
     1️⃣3️⃣ FINAL SUMMARY
  ============================== */

  return {
    history,
    collapseMonth,
    finalCash: round(cash),
    finalPrivatePrincipal:
      round(privateInvestors.reduce((s,i)=>s+i.principal,0)),
    finalBankPrincipal:
      round(loans.reduce((s,l)=>s+l.principal,0))
  };
}

/* ==========================================
   STRATEGY SORTER
========================================== */

function getSortedInvestors(list, strategy) {

  const clone = [...list];

  switch(strategy) {

    case "pressure_first":
      return clone.sort((a,b)=>
        (a.type === "pressure" ? -1 : 1)
      );

    case "negotiable_first":
      return clone.sort((a,b)=>
        (a.type === "negotiable" ? -1 : 1)
      );

    case "highest_interest_first":
      return clone.sort((a,b)=>
        b.monthlyRate - a.monthlyRate
      );

    case "priority_level_first":
      return clone.sort((a,b)=>
        (a.priorityLevel||1) -
        (b.priorityLevel||1)
      );

    case "equal_distribution":
      return clone;

    default:
      return clone;
  }
}

/* ==========================================
   HELPER
========================================== */

function round(n){
  return Math.round(n || 0);
}