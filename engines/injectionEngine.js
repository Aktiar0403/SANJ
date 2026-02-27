export function applyInjection(
  month,
  injections,
  loans,
  privateInvestors,
  cash
){

  injections.forEach(inj=>{

    if(inj.month!==month) return;

    const privateAlloc =
      inj.amount*(inj.privatePercent/100);

    const bankAlloc =
      inj.amount*(inj.bankPercent/100);

    const bufferAlloc =
      inj.amount*(inj.bufferPercent/100);

    let remaining = privateAlloc;

    // Priority based reduction
    privateInvestors
      .sort((a,b)=>
        (a.priorityLevel||1)-
        (b.priorityLevel||1)
      )
      .forEach(inv=>{

        if(remaining<=0) return;
        if(inv.type==="locked") return;

        let reducible = inv.principal;

        if(inv.type==="partial"){
          reducible =
            inv.principal -
            (inv.minLockedPrincipal||0);
        }

        const reduce =
          Math.min(reducible,remaining);

        inv.principal -= reduce;
        remaining -= reduce;
      });

    // Bank proportional reduction
    const totalPrincipal =
      loans.reduce((s,l)=>s+l.principal,0);

    loans.forEach(l=>{
      const share =
        l.principal/totalPrincipal;
      l.principal -= bankAlloc*share;
    });

    cash += bufferAlloc;
  });

  return cash;
}