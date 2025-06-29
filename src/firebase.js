import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// IMPORTANT: The configuration is now temporarily handled in App.js for debugging.
// This file just initializes and exports the services.

const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG || '{}');

// Initialize Firebase App only if config is present
const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;

// Initialize and export services
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

export { db, auth, app };
