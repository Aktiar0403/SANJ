export function processDebt(bankLoans, personalLoans, privateInvestors) {

  let totalBankEMI = 0;
  let totalPersonalEMI = 0;
  let totalPrivateInterest = 0;

  bankLoans.forEach(b => {
    totalBankEMI += b.monthlyEMI;
  });

  personalLoans.forEach(p => {
    totalPersonalEMI += p.monthlyEMI;
  });

  privateInvestors.forEach(inv => {
    totalPrivateInterest +=
      inv.principal * (inv.monthlyRate / 100);
  });

  return {
    totalBankEMI,
    totalPersonalEMI,
    totalPrivateInterest
  };
}