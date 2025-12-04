// firebase.js (frontend)
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDrJByJlvjgzF-Q6rZn1d3pMLSH6JmcXD8",
  authDomain: "rastreo-gps-f15f7.firebaseapp.com",
  databaseURL: "https://rastreo-gps-f15f7-default-rtdb.firebaseio.com",
  projectId: "rastreo-gps-f15f7",
  storageBucket: "rastreo-gps-f15f7.firebasestorage.app",
  messagingSenderId: "374522324465",
  appId: "1:374522324465:web:f278b35dc8571fa74a9050"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
