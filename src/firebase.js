import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// --- TEMPORARY DIAGNOSTIC STEP ---
// This configuration is hardcoded to bypass any issues with environment variables
// during the deployment build process. This is NOT secure for a real production app,
// but it is the best way to confirm if the configuration is the root cause of the crash.

const firebaseConfig = {
  apiKey: "AIzaSyC9a6aUzhAsxAePaa0iucLFXhZfq1WqyiM",
  authDomain: "my-news-aggregator-eaebc.firebaseapp.com",
  projectId: "my-news-aggregator-eaebc",
  storageBucket: "my-news-aggregator-eaebc.firebasestorage.app",
  messagingSenderId: "515347152406",
  appId: "1:515347152406:web:26015f1437b5539f0fff37"
};

// Initialize Firebase App
console.log("Initializing Firebase with hardcoded config...");
const app = initializeApp(firebaseConfig);

// Initialize and export services
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, app };
