// Firebase initialization module
// This file sets up Firebase for the web app and exports the initialized app and analytics instances.

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
// import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyDXmVWE4BgtUofOLd3MVUphO77Z7xKOz2I",
  authDomain: "secrethitlerme.firebaseapp.com",
  projectId: "secrethitlerme",
  storageBucket: "secrethitlerme.firebasestorage.app",
  messagingSenderId: "381485309719",
  appId: "1:381485309719:web:f38788db2a9a54006fe152",
  measurementId: "G-BY229GRNY4"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// Guard analytics for environments where it isn't supported (non-HTTPS, missing gtag, etc.)
// Disabled analytics in dev to avoid adblock noise; re-enable later if needed
export const analyticsPromise = Promise.resolve(null);


