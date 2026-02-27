export function processBankLoans(loans){

  const totalEMI =
    loans.reduce((sum,l)=>sum+l.monthlyEMI,0);

  return totalEMI;
}

export function processInjectionPayout(injections,currentMonth){

  let total = 0;

  injections.forEach(inj=>{
    if(currentMonth>=inj.month){
      total += inj.amount *
        (inj.monthlyPayoutRate/100);
    }
  });

  return total;
}