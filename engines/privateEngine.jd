export function processPrivateInterest(privateInvestors,currentMonth){

  let total = 0;

  privateInvestors.forEach(inv=>{

    if(currentMonth <= (inv.skipUntilMonth||0))
      return;

    total += inv.principal *
      (inv.monthlyRate/100);
  });

  return total;
}