import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

const TYPES = [
  { value: 'vacances',  label: 'Vacances',  emoji: '🌴', color: '#4FD9C4' },
  { value: 'événement', label: 'Événement', emoji: '🎉', color: '#C8F56A' },
  { value: 'fête',      label: 'Fête',      emoji: '🎂', color: '#FFB3D1' },
  { value: 'rdv',       label: 'RDV',       emoji: '📅', color: '#7DD3FC' },
]

const DEFAULT = {
  title: '', type: 'événement', date: '', time: '',
  participants: ['antoine', 'andreanne'], note: '', notification: true
}

export default function EventForm({ event, onClose }) {
  const { profile } = useAuth()
  const coupleId = profile?.coupleId
  const editing  = !!event

  const [form, setForm]     = useState(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (event) {
      const d = event.date?.toDate ? event.date.toDate() : new Date(event.date)
      setForm({
        title: event.title || '', type: event.type || 'événement',
        date: d.toISOString().split('T')[0], time: event.time || '',
        participants: event.participants || ['antoine', 'andreanne'],
        note: event.note || '', notification: event.notification ?? true,
      })
    }
  }, [event])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleP = (p) => set('participants', form.participants.includes(p)
    ? form.participants.filter(x => x !== p)
    : [...form.participants, p]
  )

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    if (form.participants.length === 0) { setError('Sélectionne au moins une personne.'); return }
    setLoading(true); setError('')
    try {
      const payload = {
        title: form.title.trim(), type: form.type,
        date: Timestamp.fromDate(new Date(form.date + 'T' + (form.time || '00:00'))),
        time: form.time, participants: form.participants,
        note: form.note.trim(), notification: form.notification,
        updatedAt: Timestamp.now(),
      }
      if (editing) {
        await updateDoc(doc(db, 'couples', coupleId, 'events', event.id), payload)
      } else {
        await addDoc(collection(db, 'couples', coupleId, 'events'), {
          ...payload, createdAt: Timestamp.now(), createdBy: profile?.name,
        })
      }
      onClose()
    } catch { setError('Erreur lors de la sauvegarde.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full"/>
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <h2 className="text-2xl font-black text-black">
            {editing ? 'Modifier' : 'Nouvel événement'}
          </h2>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-3 space-y-5 pb-8">
          {/* Titre */}
          <div>
            <label className="form-label">Titre</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Nom de l'événement" className="input" required autoFocus={!editing} />
          </div>

          {/* Type */}
          <div>
            <label className="form-label">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map(({ value, label, emoji, color }) => (
                <button key={value} type="button" onClick={() => set('type', value)}
                  className={`flex flex-col items-center py-3 rounded-3xl text-xs font-bold transition-all border-2 ${
                    form.type === value ? 'border-black scale-105' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: form.type === value ? color : '#f3f4f6' }}
                >
                  <span className="text-xl mb-1">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Heure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="input" required />
            </div>
            <div>
              <label className="form-label">Heure (optionnel)</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                className="input" />
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="form-label">Pour qui?</label>
            <div className="flex gap-3">
              {[
                { key: 'antoine',   label: 'Antoine',   emoji: 'A', color: '#7DD3FC' },
                { key: 'andreanne', label: 'Andréanne', emoji: 'A', color: '#FFB3D1' },
              ].map(({ key, label, emoji, color }) => {
                const active = form.participants.includes(key)
                return (
                  <button key={key} type="button" onClick={() => toggleP(key)}
                    className={`flex-1 py-3.5 rounded-3xl font-bold text-sm transition-all border-2 ${
                      active ? 'border-black' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: active ? color : '#f3f4f6', color: '#000' }}
                  >
                    {emoji} {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="form-label">Note (optionnel)</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)}
              placeholder="Ajouter une note..." className="input resize-none" rows={3} />
          </div>

          {/* Notification toggle */}
          <div className="flex items-center justify-between bg-gray-100 rounded-3xl px-4 py-4">
            <div>
              <div className="font-bold text-black">Notification</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">Rappel 1 jour avant</div>
            </div>
            <button type="button" onClick={() => set('notification', !form.notification)}
              className={`toggle ${form.notification ? 'bg-black' : 'bg-gray-300'}`}>
              <span className={`toggle-thumb ${form.notification ? 'left-6' : 'left-1'}`}/>
            </button>
          </div>

          {error && <div className="bg-red-50 rounded-2xl px-4 py-3 text-sm font-medium text-red-500">{error}</div>}

          <button type="submit" disabled={loading} className="btn-black">
            {loading ? 'Sauvegarde...' : editing ? 'Modifier →' : 'Ajouter →'}
          </button>
        </form>
      </div>
    </>
  )
}
