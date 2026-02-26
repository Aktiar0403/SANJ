import { calculateBusiness } from "./businessEngine.js";
import { processDebt } from "./debtEngine.js";
import { applyInjection } from "./injectionEngine.js";

function getMonthLabel(startDate, offset) {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + offset);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function runSimulation(config, bank, privateInvestors, injections) {

  let cash = config.openingCash;
  let history = [];

  for (let m = 0; m < 36; m++) {

    const date = new Date(config.startDate);
    date.setMonth(date.getMonth() + m);

    const monthNum = date.getMonth() + 1;

    let billing;

    if (monthNum >= 3 && monthNum <= 9)
      billing = config.peakBilling;
    else
      billing = config.lowBilling;

    const business =
      calculateBusiness(billing, config);

    cash += business.operating;

    const debt =
      processDebt(bank, privateInvestors);

    cash -= debt.bankEMI;
    cash -= debt.privateInterest;

    cash = applyInjection(
      m + 1,
      injections,
      bank,
      privateInvestors,
      cash
    );

    history.push({
      label: getMonthLabel(config.startDate, m),
      cash
    });
  }

  return history;
}