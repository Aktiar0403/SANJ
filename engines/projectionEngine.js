import { processBanks } from './bankEngine.js';
import { processPrivateInvestors } from './privateEngine.js';
import { calculateMonthlyDeficit } from './analyticsEngine.js';

export function runProjection(bankLoans, privateInvestors, config) {

  let cash = config.openingCash;
  let history = [];

  for (let month = 1; month <= config.months; month++) {

   /* =========================
   REVENUE ENGINE
========================= */

const growthFactor =
  1 + (config.monthlyGrowthPercent / 100);

const baseRevenue =
  config.baseRevenue * Math.pow(growthFactor, month - 1);

let marketingSpend =
  config.marketingPlan.defaultSpend;

if (config.marketingPlan.custom[month]) {
  marketingSpend =
    config.marketingPlan.custom[month];
}

const marketingRevenue =
  marketingSpend * config.marketingROI;

const totalRevenue =
  baseRevenue + marketingRevenue;

/* =========================
   EXPENSE ENGINE
========================= */

const inventoryCost =
  totalRevenue * (config.inventoryCostPercent / 100);

const totalExpenses =
  config.fixedExpenses
  + config.salary
  + marketingSpend
  + inventoryCost;

cash += totalRevenue;
cash -= totalExpenses;
    /* =========================
       3️⃣ CASHFLOW BEFORE DEBT
    ========================== */

    cash += totalRevenue;
    cash -= totalExpenses;


    /* =========================
       4️⃣ BANK LOANS
    ========================== */

    const bankData = processBanks(bankLoans);
    cash -= bankData.totalEMI;


    /* =========================
       5️⃣ PRIVATE INVESTORS
    ========================== */

    const privateData =
      processPrivateInvestors(privateInvestors, cash);

    cash = privateData.remainingCash;


    /* =========================
       6️⃣ DEFICIT CALCULATION
    ========================== */

    const monthlyDeficit =
      totalRevenue
      - totalExpenses
      - bankData.totalEMI
      - privateData.totalInterest;


    /* =========================
       7️⃣ STORE SNAPSHOT
    ========================== */

    history.push({
      month,
      cash,
      revenue: totalRevenue,
      expenses: totalExpenses,
      bankEMI: bankData.totalEMI,
      bankInterest: bankData.totalInterest,
      privateInterest: privateData.totalInterest,
      privatePaid: privateData.totalPaid,
      marketingSpend,
      inventoryCost,
      monthlyDeficit,
      tierBreakdown: privateData.tierSummary
    });

    if (cash < 0) {
      history.push({
        message: "⚠ SYSTEM COLLAPSE – Cash Turned Negative"
      });
      break;
    }
  }

  return history;
}