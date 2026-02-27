import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
   apiKey: "AIzaSyBuv5n9ulb1zNEtcXVnR8Z0ITeh5eBycEs",
  authDomain: "sanj-601ea.firebaseapp.com",
  projectId: "sanj-601ea",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedPrivateInvestors() {

  const investors = [

    { name:"Munna", principal:5100000, monthlyRate:1.18, type:"locked", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:3 },

    { name:"Bappon BIL", principal:700000, monthlyRate:0, type:"pressure", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:1 },

    { name:"Raushan", principal:1900000, monthlyRate:0, type:"negotiable", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:2 },

    { name:"Munna Sister", principal:400000, monthlyRate:3, type:"locked", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:3 },

    { name:"Sultan", principal:1500000, monthlyRate:4, type:"negotiable", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:2 },

    { name:"Titu", principal:200000, monthlyRate:4, type:"negotiable", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:2 },

    { name:"Father", principal:600000, monthlyRate:2, type:"negotiable", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:2 },

    { name:"Raju Da", principal:900000, monthlyRate:0, type:"pressure", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:1 },

    { name:"Father in Law", principal:600000, monthlyRate:4, type:"locked", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:3 },

    { name:"Uncle (3.5)", principal:350000, monthlyRate:3.43, type:"negotiable", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:2 },

    { name:"Amit", principal:1000000, monthlyRate:2, type:"pressure", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:1 },

    { name:"Bappon", principal:1900000, monthlyRate:2.1, type:"locked", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:3 },

    { name:"Uncle (20)", principal:2000000, monthlyRate:2, type:"negotiable", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:2 },

    { name:"Sual", principal:1500000, monthlyRate:3, type:"pressure", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:1 },

    { name:"Shaim", principal:900000, monthlyRate:2.44, type:"negotiable", minLockedPrincipal:0, skipUntilMonth:0, priorityLevel:2 }

  ];

  for (const inv of investors) {
    await addDoc(collection(db,"privateInvestors"), inv);
  }

  console.log("✅ All 15 Private Investors Seeded Successfully");
}

seedPrivateInvestors();