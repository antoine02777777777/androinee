import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        navigate('/')
      } else {
        await register(email, password)
        navigate('/configuration')
      }
    } catch (err) {
      const msgs = {
        'auth/user-not-found':       'Aucun compte trouvé.',
        'auth/wrong-password':       'Mot de passe incorrect.',
        'auth/email-already-in-use': 'Email déjà utilisé.',
        'auth/weak-password':        'Mot de passe trop court (6 car. min).',
        'auth/invalid-email':        'Email invalide.',
        'auth/invalid-credential':   'Email ou mot de passe incorrect.',
      }
      setError(msgs[err.code] || 'Erreur. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-white flex flex-col px-6 safe-top safe-bottom">

      {/* Top illustration area */}
      <div className="rounded-4xl bg-bubblegum flex items-center justify-center mt-10 mb-8 overflow-hidden"
           style={{ height: 220 }}>
        <div className="text-center">
          <div className="text-7xl font-black text-white/80">A</div>
        </div>
      </div>

      {/* Title */}
      <h1 className="page-title mb-1">Bienvenue sur<br/>Androine.</h1>
      <p className="text-gray-500 font-medium mb-8">Votre espace de couple.</p>

      {/* Toggle */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
        {['login', 'register'].map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === m ? 'bg-white text-black shadow-sm' : 'text-gray-400'
            }`}
          >
            {m === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="input"
          required
          autoComplete="email"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="input"
          required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {error && (
          <div className="bg-red-50 rounded-2xl px-4 py-3 text-sm font-medium text-red-500">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-black mt-2">
          {loading ? '...' : mode === 'login' ? 'Se connecter →' : 'Créer mon compte →'}
        </button>
      </form>
    </div>
  )
}
