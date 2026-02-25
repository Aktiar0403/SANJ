export function classifyTier(rate) {
  if (rate <= 1.5) return 1;
  if (rate <= 3) return 2;
  return 3;
}

export function processPrivateInvestors(privateInvestors, availableCash) {
  let totalInterest = 0;
  let totalPaid = 0;
  let tierSummary = { 1: 0, 2: 0, 3: 0 };

  privateInvestors.forEach(inv => {
    const tier = classifyTier(inv.monthlyRate);
    const interest = inv.principal * (inv.monthlyRate / 100);

    tierSummary[tier] += interest;
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
    remainingCash: availableCash,
    tierSummary
  };
}