import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, orderBy, query, Timestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const PRIORITIES = [
  { value: 'high',   label: 'Élevée',  bg: '#FF8B7E' },
  { value: 'medium', label: 'Moyenne', bg: '#FFE566' },
  { value: 'low',    label: 'Faible',  bg: '#C8F56A' },
]
const FREQ = [
  { value: 'daily',   label: 'Chaque jour' },
  { value: 'weekly',  label: 'Chaque semaine' },
  { value: 'monthly', label: 'Chaque mois' },
]

export default function Tasks() {
  const { profile } = useAuth()
  const coupleId = profile?.coupleId
  const [tasks, setTasks]       = useState([])
  const [tab, setTab]           = useState('pending')
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [filter, setFilter]     = useState('all')

  useEffect(() => {
    if (!coupleId) return
    return onSnapshot(
      query(collection(db, 'couples', coupleId, 'tasks'), orderBy('createdAt', 'desc')),
      snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [coupleId])

  const toggleComplete = async (task) => {
    await updateDoc(doc(db, 'couples', coupleId, 'tasks', task.id), {
      completed: !task.completed, completedAt: task.completed ? null : Timestamp.now(),
    })
  }
  const deleteTask = async (id) => {
    if (!confirm('Supprimer?')) return
    await deleteDoc(doc(db, 'couples', coupleId, 'tasks', id))
  }

  const pending   = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t =>  t.completed)
  const filtered  = (tab === 'pending' ? pending : completed)
    .filter(t => filter === 'all' || t.assignee === filter)

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-5 pt-14 pb-4">
        <h1 className="page-title mb-4">Tâches.</h1>
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-3">
          {[
            { key: 'pending',   label: `À faire (${pending.length})` },
            { key: 'completed', label: `Faites (${completed.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === key ? 'bg-black text-white' : 'text-gray-400'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all',       label: 'Tous' },
            { key: 'antoine',   label: 'Antoine' },
            { key: 'andreanne', label: 'Andréanne' },
            { key: 'both',      label: 'Ensemble' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === key ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 scroll-area px-5 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">{tab === 'pending' ? '🎉' : '📋'}</div>
            <p className="text-gray-400 font-semibold">
              {tab === 'pending' ? 'Aucune tâche à faire!' : 'Aucune tâche complétée.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(task => {
              const pri = PRIORITIES.find(p => p.value === task.priority) || PRIORITIES[1]
              return (
                <div key={task.id}
                  className={`rounded-3xl p-4 flex items-start gap-3 transition-opacity ${task.completed ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: pri.bg + (task.completed ? '40' : '50') }}
                >
                  <button onClick={() => toggleComplete(task)}
                    className={`checkbox-custom mt-0.5 ${task.completed ? 'checked' : ''}`}>
                    {task.completed && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-black text-black ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </span>
                      <div className="flex gap-1 flex-shrink-0">
                        {!task.completed && (
                          <button onClick={() => { setEditTask(task); setShowForm(true) }}
                            className="w-8 h-8 rounded-xl bg-black/10 flex items-center justify-center text-sm">✏️</button>
                        )}
                        <button onClick={() => deleteTask(task.id)}
                          className="w-8 h-8 rounded-xl bg-black/10 flex items-center justify-center text-sm">🗑️</button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm text-black/60 font-medium mt-1">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="tag-black text-xs">
                        {task.assignee === 'antoine' ? 'Antoine' :
                         task.assignee === 'andreanne' ? 'Andréanne' : 'Ensemble'}
                      </span>
                      {task.dueDate && (
                        <span className="bg-black/10 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                          📅 {format(task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate), 'd MMM', { locale: fr })}
                        </span>
                      )}
                      {task.recurring && (
                        <span className="bg-black/10 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                          🔄 {FREQ.find(f => f.value === task.recurringFreq)?.label || 'Récurrent'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={() => { setEditTask(null); setShowForm(true) }}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl bg-black text-white shadow-lg flex items-center justify-center text-2xl active:scale-90 transition-transform z-30">
        +
      </button>

      {showForm && (
        <TaskForm task={editTask} coupleId={coupleId} profileName={profile?.name}
          onClose={() => { setShowForm(false); setEditTask(null) }} />
      )}
    </div>
  )
}

function TaskForm({ task, coupleId, profileName, onClose }) {
  const editing = !!task
  const [form, setForm] = useState(task ? {
    title: task.title || '', description: task.description || '',
    assignee: task.assignee || 'both',
    dueDate: task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate)).toISOString().split('T')[0] : '',
    priority: task.priority || 'medium',
    recurring: task.recurring || false, recurringFreq: task.recurringFreq || 'weekly',
  } : { title: '', description: '', assignee: 'both', dueDate: '', priority: 'medium', recurring: false, recurringFreq: 'weekly' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true); setError('')
    try {
      const payload = {
        title: form.title.trim(), description: form.description.trim(),
        assignee: form.assignee,
        dueDate: form.dueDate ? Timestamp.fromDate(new Date(form.dueDate)) : null,
        priority: form.priority, recurring: form.recurring,
        recurringFreq: form.recurring ? form.recurringFreq : null,
        updatedAt: Timestamp.now(),
      }
      if (editing) {
        await updateDoc(doc(db, 'couples', coupleId, 'tasks', task.id), payload)
      } else {
        await addDoc(collection(db, 'couples', coupleId, 'tasks'), {
          ...payload, completed: false, createdAt: Timestamp.now(), createdBy: profileName,
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
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full"/></div>
        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <h2 className="text-2xl font-black text-black">{editing ? 'Modifier' : 'Nouvelle tâche'}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">✕</button>
        </div>

        <form onSubmit={submit} className="px-5 py-3 space-y-5 pb-8">
          <div>
            <label className="form-label">Titre</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Nom de la tâche" className="input" required autoFocus={!editing}/>
          </div>

          <div>
            <label className="form-label">Détails (optionnel)</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Ajouter des détails..." className="input resize-none" rows={2}/>
          </div>

          <div>
            <label className="form-label">Assignée à</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'antoine',   label: 'Antoine',   emoji: 'A', color: '#7DD3FC' },
                { key: 'andreanne', label: 'Andréanne', emoji: 'A', color: '#FFB3D1' },
                { key: 'both',      label: 'Ensemble',  emoji: '+', color: '#B8B4FF' },
              ].map(({ key, label, emoji, color }) => (
                <button key={key} type="button" onClick={() => set('assignee', key)}
                  className={`py-3.5 rounded-3xl text-xs font-black transition-all border-2 ${
                    form.assignee === key ? 'border-black' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: form.assignee === key ? color : '#f3f4f6' }}>
                  <div className="text-xl mb-0.5">{emoji}</div>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Priorité</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map(({ value, label, bg }) => (
                <button key={value} type="button" onClick={() => set('priority', value)}
                  className={`py-2.5 rounded-3xl text-xs font-black transition-all border-2 ${
                    form.priority === value ? 'border-black' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: form.priority === value ? bg : '#f3f4f6' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Date limite (optionnel)</label>
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className="input"/>
          </div>

          <div>
            <div className="flex items-center justify-between bg-gray-100 rounded-3xl px-4 py-4">
              <div>
                <div className="font-black text-black">Tâche récurrente</div>
                <div className="text-xs text-gray-400 font-medium mt-0.5">Se répète automatiquement</div>
              </div>
              <button type="button" onClick={() => set('recurring', !form.recurring)}
                className={`toggle ${form.recurring ? 'bg-black' : 'bg-gray-300'}`}>
                <span className={`toggle-thumb ${form.recurring ? 'left-6' : 'left-1'}`}/>
              </button>
            </div>
            {form.recurring && (
              <div className="grid grid-cols-3 gap-2 mt-2 fade-in">
                {FREQ.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => set('recurringFreq', value)}
                    className={`py-2.5 rounded-2xl text-xs font-bold transition-all border-2 ${
                      form.recurringFreq === value ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <div className="bg-red-50 rounded-2xl px-4 py-3 text-sm font-bold text-red-500">{error}</div>}
          <button type="submit" disabled={loading} className="btn-black">
            {loading ? 'Sauvegarde...' : editing ? 'Modifier →' : 'Ajouter →'}
          </button>
        </form>
      </div>
    </>
  )
}
