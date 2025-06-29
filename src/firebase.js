import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Securely loads Firebase configuration from environment variables
const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize and export services
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
