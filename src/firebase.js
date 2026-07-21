import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyACw70zpMg3BssmWjNEdN0EIeBHoBOCIDg",
  authDomain: "doorprize-c7d82.firebaseapp.com",
  projectId: "doorprize-c7d82",
  storageBucket: "doorprize-c7d82.firebasestorage.app",
  messagingSenderId: "247462830367",
  appId: "1:247462830367:web:153b3d26a9d3a1fe1b102a",
  measurementId: "G-TQ0YKGNN21",
  databaseURL: "https://doorprize-c7d82-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getDatabase(app);
