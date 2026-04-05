import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, getDoc, collection, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function Setup() {
  const { user, saveProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep]           = useState(1)
  const [name, setName]           = useState('')
  const [action, setAction]       = useState('')
  const [joinCode, setJoinCode]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [coupleCode, setCoupleCode] = useState('')

  const createCouple = async () => {
    setLoading(true); setError('')
    try {
      const code = generateCode()
      const coupleRef = doc(collection(db, 'couples'))
      await setDoc(coupleRef, {
        code, members: [user.uid], createdAt: new Date(),
        names: { [user.uid]: name.trim() }
      })
      await saveProfile(user.uid, {
        name: name.trim(), coupleId: coupleRef.id, coupleCode: code,
        color: name.toLowerCase().includes('antoine') ? 'blue' : 'pink',
        createdAt: new Date()
      })
      setCoupleCode(code); setStep(3)
    } catch { setError('Erreur. Réessayez.') }
    finally { setLoading(false) }
  }

  const joinCouple = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    try {
      const { getDocs, query, where } = await import('firebase/firestore')
      const q = query(collection(db, 'couples'), where('code', '==', joinCode.trim().toUpperCase()))
      const snap = await getDocs(q)
      if (snap.empty) { setError('Code introuvable.'); setLoading(false); return }
      const coupleDoc = snap.docs[0]; const coupleData = coupleDoc.data()
      if (coupleData.members.length >= 2) { setError('Ce couple est déjà complet.'); setLoading(false); return }
      await updateDoc(doc(db, 'couples', coupleDoc.id), {
        members: [...coupleData.members, user.uid],
        [`names.${user.uid}`]: name.trim()
      })
      await saveProfile(user.uid, {
        name: name.trim(), coupleId: coupleDoc.id, coupleCode: coupleData.code,
        color: name.toLowerCase().includes('antoine') ? 'blue' : 'pink',
        createdAt: new Date()
      })
      navigate('/')
    } catch { setError('Erreur. Réessayez.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-full bg-white flex flex-col px-6 safe-top safe-bottom">

      {/* Colored header */}
      <div className="rounded-4xl bg-lime-card flex items-center justify-center mt-10 mb-8"
           style={{ height: 180 }}>
        <div className="text-7xl font-black text-black/40">A</div>
      </div>

      {step === 1 && (
        <div className="fade-in">
          <h1 className="page-title mb-1">Comment tu<br/>t'appelles?</h1>
          <p className="text-gray-500 font-medium mb-8">Ton prénom dans l'app.</p>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Andréanne ou Antoine" className="input mb-4" autoFocus
          />
          <button onClick={() => name.trim() && setStep(2)} disabled={!name.trim()} className="btn-black">
            Continuer →
          </button>
        </div>
      )}

      {step === 2 && !action && (
        <div className="fade-in">
          <h1 className="page-title mb-1">Salut, {name}!</h1>
          <p className="text-gray-500 font-medium mb-8">Comment on commence?</p>
          <div className="space-y-3">
            <button onClick={() => setAction('create')}
              className="w-full rounded-4xl bg-coral p-5 text-left active:scale-95 transition-transform">
              <div className="text-2xl mb-1">✨</div>
              <div className="font-black text-black text-lg">Créer notre espace</div>
              <div className="text-black/60 text-sm mt-0.5 font-medium">Je suis le/la premier(e)</div>
            </button>
            <button onClick={() => setAction('join')}
              className="w-full rounded-4xl bg-mint p-5 text-left active:scale-95 transition-transform">
              <div className="text-2xl mb-1">🔗</div>
              <div className="font-black text-black text-lg">Rejoindre l'espace</div>
              <div className="text-black/60 text-sm mt-0.5 font-medium">Mon partenaire a déjà configuré</div>
            </button>
          </div>
          <button onClick={() => setStep(1)} className="btn-ghost mt-3 w-full text-center">← Retour</button>
        </div>
      )}

      {step === 2 && action === 'create' && (
        <div className="fade-in">
          <h1 className="page-title mb-1">Créer votre<br/>espace.</h1>
          <p className="text-gray-500 font-medium mb-8">Un code sera généré pour ton partenaire.</p>
          {error && <div className="bg-red-50 rounded-2xl px-4 py-3 text-sm font-medium text-red-500 mb-4">{error}</div>}
          <button onClick={createCouple} disabled={loading} className="btn-black">
            {loading ? 'Création...' : 'Créer notre espace →'}
          </button>
          <button onClick={() => setAction('')} className="btn-ghost mt-3 w-full text-center">← Retour</button>
        </div>
      )}

      {step === 2 && action === 'join' && (
        <div className="fade-in">
          <h1 className="page-title mb-1">Rejoindre<br/>l'espace.</h1>
          <p className="text-gray-500 font-medium mb-8">Entre le code de ton partenaire.</p>
          <input
            type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="EX: AB1234" className="input tracking-widest text-center text-2xl font-black mb-4"
            maxLength={6}
          />
          {error && <div className="bg-red-50 rounded-2xl px-4 py-3 text-sm font-medium text-red-500 mb-4">{error}</div>}
          <button onClick={joinCouple} disabled={loading || joinCode.length < 6} className="btn-black">
            {loading ? 'Connexion...' : 'Rejoindre →'}
          </button>
          <button onClick={() => setAction('')} className="btn-ghost mt-3 w-full text-center">← Retour</button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center fade-in">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="page-title mb-2">Espace créé!</h1>
          <p className="text-gray-500 font-medium mb-6">Donne ce code à ton partenaire:</p>
          <div className="bg-gray-100 rounded-4xl py-6 mb-6">
            <div className="text-4xl font-black tracking-widest text-black">{coupleCode}</div>
          </div>
          <button onClick={() => navigate('/')} className="btn-lime">
            Commencer →
          </button>
        </div>
      )}
    </div>
  )
}
