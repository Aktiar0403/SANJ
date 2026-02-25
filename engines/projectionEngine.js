import { processBanks } from './bankEngine.js';
import { processPrivateInvestors } from './privateEngine.js';
import { updateCash } from './cashflowEngine.js';

export function runProjection(bankLoans, privateInvestors, config) {

  let cash = config.openingCash;
  let history = [];

  for (let month = 1; month <= config.months; month++) {

    // Revenue & expenses
    cash = updateCash(cash, config.monthlyRevenue, config.monthlyExpenses);

    // Bank processing
    const bankData = processBanks(bankLoans);
    cash -= bankData.totalEMI;

    // Private processing
    const privateData = processPrivateInvestors(privateInvestors, cash);
    cash = privateData.remainingCash;

    history.push({
      month,
      cash,
      bankEMI: bankData.totalEMI,
      bankInterest: bankData.totalInterest,
      privateInterest: privateData.totalInterest,
      privatePaid: privateData.totalPaid
    });

    if (cash < 0) {
      history.push({ message: "System Collapse: Cash Negative" });
      break;
    }
  }

  return history;
}