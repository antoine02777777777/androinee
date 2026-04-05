// ============================================================
// CONFIGURATION FIREBASE
// ============================================================
// 1. Aller sur https://console.firebase.google.com
// 2. Créer un nouveau projet "androine"
// 3. Activer Authentication > Email/mot de passe
// 4. Créer une base de données Firestore (mode Production)
// 5. Dans Paramètres du projet > Vos apps > Web app (</>)
//    copier la config ci-dessous et remplacer les valeurs
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            "AIzaSyAg_h-rn2FfOic-GSYBJHruCBaEs8VgsTY",
  authDomain:        "androine-5a1cc.firebaseapp.com",
  projectId:         "androine-5a1cc",
  storageBucket:     "androine-5a1cc.firebasestorage.app",
  messagingSenderId: "97064837118",
  appId:             "1:97064837118:web:c07d3f8494d04fe372aaaf"
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db   = getFirestore(app)

export const getMessagingInstance = async () => {
  const supported = await isSupported()
  if (supported) return getMessaging(app)
  return null
}

export default app
