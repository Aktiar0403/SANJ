export function processDebt(bank, privateInvestors) {

  let privateInterest = 0;

  privateInvestors.forEach(inv => {
    privateInterest +=
      inv.principal * (inv.monthlyRate / 100);
  });

  return {
    bankEMI: bank.monthlyEMI,
    privateInterest
  };
}