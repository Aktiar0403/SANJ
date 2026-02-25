// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBuv5n9ulb1zNEtcXVnR8Z0ITeh5eBycEs",
  authDomain: "sanj-601ea.firebaseapp.com",
  projectId: "sanj-601ea",
  storageBucket: "sanj-601ea.firebasestorage.app",
  messagingSenderId: "131539833480",
  appId: "1:131539833480:web:8c3d5d3e6bed77017f853d",
  measurementId: "G-H7BNWZLFWK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);