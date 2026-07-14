import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyA7rLyfT36AlKg8n3IJrhvJaLFxyf2Baq8',
  authDomain: 'family-shopping-list-ed1d8.firebaseapp.com',
  projectId: 'family-shopping-list-ed1d8',
  storageBucket: 'family-shopping-list-ed1d8.firebasestorage.app',
  messagingSenderId: '1031813495879',
  appId: '1:1031813495879:web:5eaf567b0e0112a866c562',
  databaseURL: 'https://family-shopping-list-ed1d8-default-rtdb.europe-west1.firebasedatabase.app',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
