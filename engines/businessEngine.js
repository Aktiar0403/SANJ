export function calculateBusiness(billing, config) {

  const doctorCost = billing * (config.doctorPercent / 100);
  const cogs = billing * (config.cogsPercent / 100);

  const contribution =
    billing - doctorCost - cogs;

  const operating =
    contribution -
    config.fixedExpenses -
    config.salary;

  return {
    doctorCost,
    cogs,
    contribution,
    operating
  };
}