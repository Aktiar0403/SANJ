import { processBanks } from './bankEngine.js';
import { processPrivateInvestors } from './privateEngine.js';

export function runProjection(bankLoans, privateInvestors, config) {

  let cash = config.openingCash;
  let history = [];
  let profitabilityMonth = null;

  for (let month = 1; month <= config.months; month++) {

    /* =========================
       1️⃣ BASE REVENUE (GROWTH)
    ========================== */

    const growthFactor =
      1 + (config.monthlyGrowthPercent / 100);

    const baseRevenue =
      config.baseRevenue * Math.pow(growthFactor, month - 1);


    /* =========================
       2️⃣ STRATEGY TIMELINE APPLY
    ========================== */

    let marketingSpend = config.defaultMarketingSpend;
    let seasonalBoost = 0;
    let extraFixed = 0;

    config.strategyTimeline.forEach(phase => {
      if (month >= phase.startMonth && month <= phase.endMonth) {
        marketingSpend += phase.extraMarketing;
        seasonalBoost += phase.seasonalBoostPercent;
        extraFixed += phase.extraFixedCost;
      }
    });


    /* =========================
       3️⃣ TOTAL REVENUE
    ========================== */

    const marketingRevenue =
      marketingSpend * config.marketingROI;

    let totalRevenue =
      baseRevenue + marketingRevenue;

    totalRevenue +=
      totalRevenue * (seasonalBoost / 100);


    /* =========================
       4️⃣ TOTAL EXPENSES
    ========================== */

    const inventoryCost =
      totalRevenue * (config.inventoryCostPercent / 100);

    const totalExpenses =
      config.fixedExpenses
      + config.salary
      + marketingSpend
      + inventoryCost
      + extraFixed;


    /* =========================
       5️⃣ CASHFLOW BEFORE DEBT
    ========================== */

    cash += totalRevenue;
    cash -= totalExpenses;


    /* =========================
       6️⃣ BANK LOANS
    ========================== */

    const bankData = processBanks(bankLoans);
    cash -= bankData.totalEMI;


    /* =========================
       7️⃣ PRIVATE INVESTORS
    ========================== */

    const privateData =
      processPrivateInvestors(privateInvestors, cash);

    cash = privateData.remainingCash;


    /* =========================
       8️⃣ MONTHLY DEFICIT
    ========================== */

    const monthlyDeficit =
      totalRevenue
      - totalExpenses
      - bankData.totalEMI
      - privateData.totalInterest;


    /* =========================
       9️⃣ PROFITABILITY CHECK
    ========================== */

    if (monthlyDeficit > 0 && profitabilityMonth === null) {
      profitabilityMonth = month;
    }


    /* =========================
       10️⃣ SAVE MONTH SNAPSHOT
    ========================== */

    history.push({
      month,
      cash,
      revenue: totalRevenue,
      expenses: totalExpenses,
      marketingSpend,
      inventoryCost,
      bankEMI: bankData.totalEMI,
      privateInterest: privateData.totalInterest,
      monthlyDeficit
    });


    if (cash < 0) {
      history.push({
        message: "⚠ SYSTEM COLLAPSE – Cash Turned Negative"
      });
      break;
    }
  }

  /* =========================
     FINAL SUMMARY
  ========================== */

  history.push({
    summary: true,
    profitabilityMonth
  });

  return history;
}