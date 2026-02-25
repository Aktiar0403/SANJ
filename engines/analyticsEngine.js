export function calculateMonthlyDeficit(config, totalEMI, totalPrivateInterest) {
  return config.monthlyRevenue
    - config.monthlyExpenses
    - totalEMI
    - totalPrivateInterest;
}

export function requiredPrincipalReduction(deficit, weightedRate) {
  if (deficit >= 0) return 0;
  return Math.abs(deficit) / (weightedRate / 100);
}