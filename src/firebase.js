// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics"; 
// Only import getAuth and getFirestore here as they are used to export auth and db
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyDnWJrN4XggVtDyxXQPi0TXLaVSuaETqwQ",
  authDomain: "homeworkout-pal.firebaseapp.com",
  projectId: "homeworkout-pal",
  storageBucket: "homeworkout-pal.firebasestorage.app",
  messagingSenderId: "523845584790",
  appId: "1:523845584790:web:15554c8433a691bac0bfb7",
  measurementId: "G-58CBP7GDQW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics
export const analytics = getAnalytics(app);

// Export Auth & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app; // Export the app instance if needed elsewhere
