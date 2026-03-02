import {
  db,
  collection,
  addDoc
} from "./firebase.js";

const investors = [
  { name:"Titu", principal:200000, monthlyInterest:8000, status:"active"},
  { name:"Uncle-3.5", principal:350000, monthlyInterest:12000, status:"active"},
  { name:"Sultan", principal:1500000, monthlyInterest:60000, status:"active"},
  { name:"Raju Da", principal:900000, monthlyInterest:0, status:"skip"},
  { name:"Sual", principal:1500000, monthlyInterest:45000, status:"active"},
  { name:"Father", principal:600000, monthlyInterest:12000, status:"active"},
  { name:"Father in Law", principal:600000, monthlyInterest:24000, status:"active"},
  { name:"Uncle-20", principal:2000000, monthlyInterest:40000, status:"active"},
  { name:"Bappon BIL", principal:700000, monthlyInterest:0, status:"skip"},
  { name:"Shaim", principal:900000, monthlyInterest:22000, status:"active"},
  { name:"Amit", principal:1000000, monthlyInterest:20000, status:"active"},
  { name:"Raushan", principal:1900000, monthlyInterest:0, status:"skip"},
  { name:"Munna Sister", principal:400000, monthlyInterest:12000, status:"active"},
  { name:"Bappon", principal:1900000, monthlyInterest:40000, status:"active"},
  { name:"Munna", principal:5100000, monthlyInterest:60000, status:"active"}
];

async function backfill() {
  for (const inv of investors) {
    await addDoc(collection(db,"privateInvestors"), inv);
  }
  console.log("Backfill complete");
}

backfill();