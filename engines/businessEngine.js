export function generateSeasonalRevenue(totalYearRevenue) {

  const weights = [
    0.7,0.8,1.0,1.4,1.5,1.4,
    1.2,1.1,1.1,1.0,0.9,0.8
  ];

  const totalWeight =
    weights.reduce((a,b)=>a+b,0);

  return weights.map(w =>
    Math.round((w/totalWeight)*totalYearRevenue)
  );
}

export function calculateBusiness(billing, config){

  const doctor =
    billing * (config.doctorPercent/100);

  const cogs =
    billing * (config.cogsPercent/100);

  const operating =
    billing - doctor - cogs
    - config.fixedExpenses
    - config.salary;

  return {
    doctor,
    cogs,
    operating
  };
}