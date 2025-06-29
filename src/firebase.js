import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// This secure version reads your configuration from the environment variable
// that is provided by your GitHub Actions workflow secret.
const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize and export services
const db = getFirestore(app);

// Auth is no longer needed since we removed the authentication layer
export { db };
