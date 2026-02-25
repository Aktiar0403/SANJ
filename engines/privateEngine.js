export function processPrivateInvestors(privateInvestors, availableCash) {
  let totalInterest = 0;
  let totalPaid = 0;

  privateInvestors.forEach(inv => {
    const interest = inv.principal * (inv.monthlyRate / 100);
    totalInterest += interest;

    if (availableCash >= interest) {
      availableCash -= interest;
      totalPaid += interest;
    } else {
      inv.pendingInterest += interest;
    }
  });

  return {
    totalInterest,
    totalPaid,
    remainingCash: availableCash
  };
}