import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCNio4tNNV-K1vRNC_c5S16QZb54VbfYiw",
  authDomain: "my-jinro-web.firebaseapp.com",
  projectId: "my-jinro-web",
  storageBucket: "my-jinro-web.firebasestorage.app",
  messagingSenderId: "24158260705",
  appId: "1:24158260705:web:2143f0372dd2047ccdd6a0",
  measurementId: "G-GMSF5BXXEL"
};

// 【重要】app の宣言は1回だけにします
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// これで db を外のファイル（page.tsx）で使えるようになります
export const db = getFirestore(app);
export const auth = getAuth(app);