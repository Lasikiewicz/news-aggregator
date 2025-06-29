import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Final, production-ready configuration.
// It is still recommended to move this to environment variables.
const firebaseConfig = {
  apiKey: "AIzaSyC9a6aUzhAsxAePaa0iucLFXhZfq1WqyiM",
  authDomain: "my-news-aggregator-eaebc.firebaseapp.com",
  projectId: "my-news-aggregator-eaebc",
  storageBucket: "my-news-aggregator-eaebc.firebasestorage.app",
  messagingSenderId: "515347152406",
  appId: "1:515347152406:web:26015f1437b5539f0fff37"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
