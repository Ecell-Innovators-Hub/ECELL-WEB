// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword ,signOut  } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBpN5JRasO0AUQwbVQ8QFJonE_VQdQXe10",
  authDomain: "lexicaar-b7f90.firebaseapp.com",
  projectId: "lexicaar-b7f90",
  storageBucket: "lexicaar-b7f90.appspot.com",
  messagingSenderId: "947523686788",
  appId: "1:947523686788:web:6d764c09bc93bfb5f24dd1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, storage, auth, googleProvider,signInWithEmailAndPassword,signOut  };
