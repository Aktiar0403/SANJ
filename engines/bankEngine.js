export function processBanks(bankLoans) {
  let totalEMI = 0;
  let totalInterest = 0;

  bankLoans.forEach(loan => {
    if (loan.principal <= 0) return;

    const monthlyRate = loan.annualRate / 12 / 100;
    const interest = loan.principal * monthlyRate;

    totalInterest += interest;
    totalEMI += loan.emi;

    loan.principal -= (loan.emi - interest);

    if (loan.principal < 0) {
      loan.principal = 0;
    }
  });

  return { totalEMI, totalInterest };
}