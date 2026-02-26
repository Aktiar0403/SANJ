import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   🔐 FIREBASE CONFIG
========================= */

const firebaseConfig = {
   apiKey: "AIzaSyBuv5n9ulb1zNEtcXVnR8Z0ITeh5eBycEs",
  authDomain: "sanj-601ea.firebaseapp.com",
  projectId: "sanj-601ea",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   🧹 CLEAR COLLECTION
========================= */

async function clearCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, name, d.id));
  }
}

/* =========================
   🚀 SEED FUNCTION
========================= */

async function seed() {

  console.log("Clearing old data...");

  await clearCollection("loans");
  await clearCollection("privateInvestors");
  await clearCollection("capitalInjections");

  console.log("Old data cleared.");

  /* =========================
     1️⃣ BUSINESS CONFIG
  ========================== */

  await setDoc(doc(db, "businessConfig", "main"), {
    startDate: "2026-03",
    peakBilling: 1700000,
    lowBilling: 1050000,
    doctorPercent: 30,
    cogsPercent: 16.7,
    fixedExpenses: 200000,
    salary: 150000,
    openingCash: 0
  });

  /* =========================
     2️⃣ LOANS (Business + Personal)
  ========================== */

  const loans = [

    // Business
    { name: "Lendingkart Business", type: "business", principal: 1100000, annualRate: 22, monthlyEMI: 88000 },
    { name: "HDFC Business Loan", type: "business", principal: 1600000, annualRate: 16, monthlyEMI: 72000 },
    { name: "Bajaj Business Loan", type: "business", principal: 1100000, annualRate: 22, monthlyEMI: 42000 },

    // Personal (used for business)
    { name: "HDFC Personal Block", type: "personal", principal: 600000, annualRate: 14, monthlyEMI: 46000 },
    { name: "Bajaj Personal", type: "personal", principal: 600000, annualRate: 18, monthlyEMI: 30000 },
    { name: "FinanceCorp Personal", type: "personal", principal: 600000, annualRate: 20, monthlyEMI: 19000 }

  ];

  for (const loan of loans) {
    await addDoc(collection(db, "loans"), loan);
  }

  /* =========================
     3️⃣ PRIVATE INVESTORS
  ========================== */

  const privateInvestors = [

    // 🔴 PRESSURE
    { name: "Raju Da", principal: 900000, monthlyRate: 0, category: "pressure" },
    { name: "Sual", principal: 1500000, monthlyRate: 3, category: "pressure" },
    { name: "Bappon BIL", principal: 700000, monthlyRate: 0, category: "pressure" },
    { name: "Amit", principal: 1000000, monthlyRate: 2, category: "pressure" },

    // 🟢 LOCKED
    { name: "Father in Law", principal: 600000, monthlyRate: 4, category: "locked" },
    { name: "Munna Sister", principal: 400000, monthlyRate: 3, category: "locked" },
    { name: "Bappon", principal: 1900000, monthlyRate: 2.1, category: "locked" },
    { name: "Munna", principal: 5100000, monthlyRate: 1.18, category: "locked" },

    // ⚫ NEGOTIABLE
    { name: "Titu", principal: 200000, monthlyRate: 4, category: "negotiable" },
    { name: "Uncle (3.5)", principal: 350000, monthlyRate: 3.43, category: "negotiable" },
    { name: "Sultan", principal: 1500000, monthlyRate: 4, category: "negotiable" },
    { name: "Father", principal: 600000, monthlyRate: 2, category: "negotiable" },
    { name: "Uncle (20)", principal: 2000000, monthlyRate: 2, category: "negotiable" },
    { name: "Shaim", principal: 900000, monthlyRate: 2.44, category: "negotiable" },
    { name: "Raushan", principal: 1900000, monthlyRate: 0, category: "negotiable" }

  ];

  for (const inv of privateInvestors) {
    await addDoc(collection(db, "privateInvestors"), inv);
  }

  /* =========================
     4️⃣ CAPITAL INJECTIONS
  ========================== */

  const injections = [
    { month: 2, amount: 5000000, privatePercent: 70, bankPercent: 20, bufferPercent: 10 },
    { month: 6, amount: 5000000, privatePercent: 70, bankPercent: 20, bufferPercent: 10 }
  ];

  for (const inj of injections) {
    await addDoc(collection(db, "capitalInjections"), inj);
  }

  console.log("✅ SEEDING COMPLETE");
  alert("Firestore successfully seeded!");
}

seed();