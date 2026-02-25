import { runProjection } from './engines/projectionEngine.js';

const bankLoans = [
  { name: "Bank1", principal: 1500000, annualRate: 12, emi: 35000 },
  { name: "Bank2", principal: 800000, annualRate: 11, emi: 20000 }
];

const privateInvestors = [
  { name: "InvestorA", principal: 1000000, monthlyRate: 4.5, pendingInterest: 0 },
  { name: "InvestorB", principal: 500000, monthlyRate: 2.5, pendingInterest: 0 },
  { name: "InvestorC", principal: 700000, monthlyRate: 1.5, pendingInterest: 0 }
];

const config = {
  monthlyRevenue: 800000,
  monthlyExpenses: 500000,
  openingCash: 200000,
  months: 24
};

document.getElementById("runSimulation").addEventListener("click", () => {
  const result = runProjection(
    structuredClone(bankLoans),
    structuredClone(privateInvestors),
    config
  );

  document.getElementById("output").textContent =
    JSON.stringify(result, null, 2);
});