import { createContext, useContext, useEffect, useState, useRef } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [couple,  setCouple]  = useState(null)
  const [loading, setLoading] = useState(true)
  const unsubCoupleRef = useRef(null)

  useEffect(() => {
    // Force la session à persister — DOIT être awaité avant onAuthStateChanged
    let unsubAuth = () => {}
    setPersistence(auth, browserLocalPersistence).then(() => {
      unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)

      if (!firebaseUser) {
        setProfile(null)
        setCouple(null)
        setLoading(false)
        return
      }

      const profileRef = doc(db, 'users', firebaseUser.uid)

      const unsubProfile = onSnapshot(
        profileRef,
        (snap) => {
          if (!snap.exists()) {
            setProfile(null)
            setCouple(null)
            setLoading(false)
            return
          }

          const data = snap.data()
          setProfile(data)

          if (data.coupleId) {
            // Nettoie l'ancien listener si existant
            if (unsubCoupleRef.current) {
              unsubCoupleRef.current()
              unsubCoupleRef.current = null
            }

            const coupleRef = doc(db, 'couples', data.coupleId)
            unsubCoupleRef.current = onSnapshot(
              coupleRef,
              (coupleSnap) => {
                setCouple(coupleSnap.exists() ? { id: coupleSnap.id, ...coupleSnap.data() } : null)
                setLoading(false)
              },
              (err) => {
                console.error('Erreur lecture couple:', err)
                setCouple(null)
                setLoading(false)
              }
            )
          } else {
            if (unsubCoupleRef.current) {
              unsubCoupleRef.current()
              unsubCoupleRef.current = null
            }
            setCouple(null)
            setLoading(false)
          }
        },
        (err) => {
          console.error('Erreur lecture profil:', err)
          setProfile(null)
          setLoading(false)
        }
      )

      return () => {
        unsubProfile()
        if (unsubCoupleRef.current) unsubCoupleRef.current()
      }
    })
    }).catch(console.error)

    return () => unsubAuth()
  }, [])

  const register    = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    return cred.user
  }
  const login       = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout      = () => signOut(auth)
  const saveProfile = (userId, data) => setDoc(doc(db, 'users', userId), data, { merge: true })

  return (
    <AuthContext.Provider value={{ user, profile, couple, loading, register, login, logout, saveProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
