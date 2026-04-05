import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [profile, setProfile]   = useState(null)
  const [couple, setCouple]     = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (!firebaseUser) {
        setProfile(null)
        setCouple(null)
        setLoading(false)
        return
      }

      // Listen to user profile in real-time
      const profileRef = doc(db, 'users', firebaseUser.uid)
      const unsubProfile = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setProfile(data)

          // Listen to couple data
          if (data.coupleId) {
            const coupleRef = doc(db, 'couples', data.coupleId)
            onSnapshot(coupleRef, (coupleSnap) => {
              if (coupleSnap.exists()) setCouple({ id: coupleSnap.id, ...coupleSnap.data() })
              setLoading(false)
            })
          } else {
            setCouple(null)
            setLoading(false)
          }
        } else {
          setProfile(null)
          setLoading(false)
        }
      })

      return () => unsubProfile()
    })

    return () => unsubAuth()
  }, [])

  const register = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    return cred.user
  }

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)

  const logout = () => signOut(auth)

  const saveProfile = async (userId, data) => {
    await setDoc(doc(db, 'users', userId), data, { merge: true })
  }

  return (
    <AuthContext.Provider value={{ user, profile, couple, loading, register, login, logout, saveProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
