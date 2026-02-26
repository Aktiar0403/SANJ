export function applyInjection(month, injections, bank, privateInvestors, cash) {

  injections.forEach(inj => {

    if (inj.month !== month) return;

    const privateAlloc =
      inj.amount * (inj.privatePercent / 100);

    const bankAlloc =
      inj.amount * (inj.bankPercent / 100);

    const bufferAlloc =
      inj.amount * (inj.bufferPercent / 100);

    let remaining = privateAlloc;

    privateInvestors.forEach(inv => {

      if (inv.type === "locked") return;

      let reducible = inv.principal;

      if (inv.type === "partial") {
        reducible =
          inv.principal - inv.minLockedPrincipal;
      }

      const reduce =
        Math.min(reducible, remaining);

      inv.principal -= reduce;
      remaining -= reduce;
    });

    bank.principal -= bankAlloc;
    cash += bufferAlloc;
  });

  return cash;
}