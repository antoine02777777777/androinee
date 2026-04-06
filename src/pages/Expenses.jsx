import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, Timestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const CATEGORIES = [
  { id: 'epicerie',   label: 'Épicerie',   emoji: '🛒', color: '#C8F56A' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️', color: '#FF8B7E' },
  { id: 'transport',  label: 'Transport',  emoji: '🚗', color: '#4FD9C4' },
  { id: 'logement',   label: 'Logement',   emoji: '🏠', color: '#B8B4FF' },
  { id: 'loisirs',    label: 'Loisirs',    emoji: '🎬', color: '#FFE566' },
  { id: 'voyage',     label: 'Voyage',     emoji: '✈️', color: '#FFB3D1' },
  { id: 'sante',      label: 'Santé',      emoji: '💊', color: '#4FD9C4' },
  { id: 'autre',      label: 'Autre',      emoji: '💸', color: '#f3f4f6' },
]

const fmt = (n) => `${(n || 0).toFixed(2)} $`

export default function Expenses() {
  const { user, profile, couple } = useAuth()
  const [expenses, setExpenses]   = useState([])
  const [filter, setFilter]       = useState('unsettled')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [detail, setDetail]       = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setShowForm(true)
      setSearchParams({}, { replace: true })
    }
  }, [])

  const coupleId    = profile?.coupleId
  const myUid       = user?.uid
  const partnerUid  = couple?.members?.find(m => m !== myUid)
  const myName      = profile?.name?.split(' ')[0] || 'Moi'
  const partnerName = couple?.names?.[partnerUid]?.split(' ')[0] || 'Partenaire'

  useEffect(() => {
    if (!coupleId) return
    return onSnapshot(
      query(collection(db, 'couples', coupleId, 'expenses'), orderBy('date', 'desc')),
      snap => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [coupleId])

  const balance = useMemo(() => {
    let iOwe = 0, theyOwe = 0
    expenses.filter(e => !e.settled).forEach(e => {
      if (e.paidBy === partnerUid) iOwe      += e.splits?.[myUid]      || 0
      else if (e.paidBy === myUid) theyOwe   += e.splits?.[partnerUid] || 0
    })
    return { iOwe, theyOwe, net: theyOwe - iOwe }
  }, [expenses, myUid, partnerUid])

  const filtered = expenses.filter(e =>
    filter === 'all' ? true : filter === 'settled' ? e.settled : !e.settled
  )

  const settleAll = async () => {
    await Promise.all(
      expenses.filter(e => !e.settled).map(e =>
        updateDoc(doc(db, 'couples', coupleId, 'expenses', e.id), {
          settled: true, settledAt: Timestamp.now()
        })
      )
    )
  }

  const deleteExpense = async (id) => {
    await deleteDoc(doc(db, 'couples', coupleId, 'expenses', id))
    setDetail(null)
  }

  const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[7]

  // Balance card color
  const balColor = balance.net === 0 ? '#C8F56A' : balance.net > 0 ? '#4FD9C4' : '#FF8B7E'

  return (
    <div className="h-full scroll-area bg-white">
      <div className="px-5 pb-8">

        {/* Header */}
        <div className="pt-14 pb-4">
          <h1 className="text-4xl font-black text-black leading-tight">Dépenses.</h1>
          <p className="text-gray-400 font-semibold text-sm mt-1">Partage des frais du couple</p>
        </div>

        {/* Balance Card */}
        <div className="rounded-4xl p-6 mb-5" style={{ backgroundColor: balColor }}>
          {balance.net === 0 ? (
            <div className="text-center py-2">
              <div className="text-4xl mb-2">🎉</div>
              <div className="font-black text-black text-xl">Vous êtes à égalité!</div>
              <div className="text-black/60 font-semibold text-sm mt-1">Aucune dette entre vous</div>
            </div>
          ) : (
            <div>
              <div className="text-black/60 font-bold text-sm mb-1">
                {balance.net > 0 ? `${partnerName} te doit` : `Tu dois à ${partnerName}`}
              </div>
              <div className="text-5xl font-black text-black mb-1">{fmt(Math.abs(balance.net))}</div>
              <div className="text-black/50 text-sm font-semibold mb-4">
                Net de toutes les dépenses non réglées
              </div>
              <button
                onClick={settleAll}
                className="bg-black text-white font-bold px-5 py-2.5 rounded-full text-sm active:scale-95 transition-transform"
              >
                Tout marquer réglé ✓
              </button>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 mb-5">
          {[
            { label: 'Tu dois',     value: fmt(balance.iOwe) },
            { label: 'On te doit',  value: fmt(balance.theyOwe) },
            { label: 'En attente',  value: `${expenses.filter(e => !e.settled).length}` },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-gray-100 rounded-3xl p-3.5 text-center">
              <div className="text-base font-black text-black leading-tight">{s.value}</div>
              <div className="text-xs font-bold text-gray-400 mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'unsettled', label: 'Non réglé' },
            { id: 'all',       label: 'Tout' },
            { id: 'settled',   label: 'Réglé' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                filter === f.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="rounded-4xl bg-gray-100 p-10 text-center">
            <div className="text-4xl mb-3">💸</div>
            <p className="font-black text-gray-400 text-lg">Aucune dépense</p>
            <p className="text-gray-400 text-sm font-semibold mt-1">Appuie sur + pour ajouter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(exp => {
              const cat     = getCat(exp.category)
              const isMine  = exp.paidBy === myUid
              const myShare = exp.splits?.[myUid] || 0
              const thShare = exp.splits?.[partnerUid] || 0
              return (
                <button
                  key={exp.id}
                  onClick={() => setDetail(exp)}
                  className="w-full flex items-center gap-3 bg-gray-50 rounded-3xl px-4 py-3.5 active:scale-98 transition-transform text-left"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                       style={{ backgroundColor: cat.color }}>
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-black truncate">{exp.title}</div>
                    <div className="text-xs font-semibold text-gray-400 mt-0.5">
                      {isMine ? 'Tu as payé' : `${partnerName} a payé`}
                      {' · '}
                      {format(exp.date?.toDate ? exp.date.toDate() : new Date(exp.date), 'd MMM', { locale: fr })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-black text-base">{fmt(exp.amount)}</div>
                    <div className={`text-xs font-bold ${isMine ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isMine ? `+${fmt(thShare)}` : `-${fmt(myShare)}`}
                    </div>
                  </div>
                  {exp.settled && (
                    <div className="ml-1 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3.5">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="h-24"/>
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditing(null); setShowForm(true) }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-transform z-20"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Detail Sheet */}
      {detail && (
        <DetailSheet
          exp={detail}
          myUid={myUid} partnerUid={partnerUid}
          myName={myName} partnerName={partnerName}
          coupleId={coupleId}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditing(detail); setShowForm(true); setDetail(null) }}
          onDelete={() => deleteExpense(detail.id)}
          onSettle={async () => {
            await updateDoc(doc(db, 'couples', coupleId, 'expenses', detail.id), {
              settled: !detail.settled,
              settledAt: detail.settled ? null : Timestamp.now()
            })
            setDetail(null)
          }}
        />
      )}

      {/* Form Sheet */}
      {showForm && (
        <ExpenseForm
          coupleId={coupleId}
          myUid={myUid} partnerUid={partnerUid}
          myName={myName} partnerName={partnerName}
          expense={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

/* ─── Detail Sheet ─────────────────────────────────────────────── */
function DetailSheet({ exp, myUid, partnerUid, myName, partnerName, onClose, onEdit, onDelete, onSettle }) {
  const cat      = CATEGORIES.find(c => c.id === exp.category) || CATEGORIES[7]
  const isMine   = exp.paidBy === myUid
  const myShare  = exp.splits?.[myUid] || 0
  const thShare  = exp.splits?.[partnerUid] || 0
  const expDate  = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date)

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative w-full bg-white rounded-t-4xl px-5 pt-5 pb-10 safe-bottom">
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>

        {/* Title row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl flex-shrink-0"
               style={{ backgroundColor: cat.color }}>
            {cat.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-black text-black leading-tight">{exp.title}</h3>
            <p className="text-gray-400 font-semibold text-sm">{cat.label} · {format(expDate, 'd MMMM yyyy', { locale: fr })}</p>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2 mb-5">
          {[
            { label: 'Total payé',         value: fmt(exp.amount),  bold: true },
            { label: 'Payé par',           value: isMine ? `${myName} (toi)` : partnerName },
            { label: `Part de ${myName}`,  value: fmt(myShare) },
            { label: `Part de ${partnerName}`, value: fmt(thShare) },
            { label: 'Statut',             value: exp.settled ? '✓ Réglé' : '⏳ Non réglé',
              color: exp.settled ? 'text-emerald-600' : 'text-orange-500' },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center bg-gray-50 rounded-2xl px-4 py-3">
              <span className="font-bold text-gray-500 text-sm">{r.label}</span>
              <span className={`font-black text-base ${r.color || 'text-black'}`}>{r.value}</span>
            </div>
          ))}
          {exp.note ? (
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <span className="font-bold text-gray-500 text-sm block mb-1">Note</span>
              <span className="font-semibold text-black">{exp.note}</span>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onSettle}
            className="flex-1 py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-transform"
            style={{ backgroundColor: exp.settled ? '#f3f4f6' : '#C8F56A' }}
          >
            {exp.settled ? 'Marquer non réglé' : 'Marquer réglé ✓'}
          </button>
          <button
            onClick={onEdit}
            className="flex-1 py-3.5 rounded-2xl bg-black text-white font-black text-sm active:scale-95 transition-transform"
          >
            Modifier
          </button>
          <button
            onClick={onDelete}
            className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19,6l-1,14H6L5,6"/>
              <path d="M10,11v6M14,11v6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Expense Form ─────────────────────────────────────────────── */
function ExpenseForm({ coupleId, myUid, partnerUid, myName, partnerName, expense, onClose }) {
  const [title,         setTitle]         = useState(expense?.title || '')
  const [amount,        setAmount]        = useState(expense?.amount?.toString() || '')
  const [category,      setCategory]      = useState(expense?.category || 'autre')
  const [paidBy,        setPaidBy]        = useState(expense?.paidBy || myUid)
  const [splitType,     setSplitType]     = useState(expense?.splitType || 'equal')
  const [customMine,    setCustomMine]    = useState(expense?.splits?.[myUid]?.toString() || '')
  const [customPartner, setCustomPartner] = useState(expense?.splits?.[partnerUid]?.toString() || '')
  const [date,          setDate]          = useState(
    expense?.date
      ? format(expense.date.toDate ? expense.date.toDate() : new Date(expense.date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  )
  const [note,    setNote]    = useState(expense?.note || '')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const amt = parseFloat(amount) || 0

  const getSplits = () => {
    if (splitType === 'equal') {
      const half = Math.round(amt * 100 / 2) / 100
      return { [myUid]: half, [partnerUid]: parseFloat((amt - half).toFixed(2)) }
    }
    return {
      [myUid]:      parseFloat(customMine)    || 0,
      [partnerUid]: parseFloat(customPartner) || 0,
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !amount || amt <= 0) return
    if (!coupleId) { setError('Erreur: espace couple introuvable.'); return }
    setLoading(true)
    setError('')
    try {
      // Si partenaire pas encore rejoint, utiliser un placeholder
      const partner = partnerUid || 'pending'
      const splits = splitType === 'equal'
        ? { [myUid]: parseFloat((amt / 2).toFixed(2)), [partner]: parseFloat((amt / 2).toFixed(2)) }
        : { [myUid]: parseFloat(customMine) || 0, [partner]: parseFloat(customPartner) || 0 }

      const data = {
        title: title.trim(), amount: amt, category, paidBy,
        splitType, splits,
        date: Timestamp.fromDate(new Date(date + 'T12:00:00')),
        note: note.trim(),
        settled: expense?.settled || false,
        updatedAt: Timestamp.now(),
      }
      if (expense) {
        await updateDoc(doc(db, 'couples', coupleId, 'expenses', expense.id), data)
      } else {
        await addDoc(collection(db, 'couples', coupleId, 'expenses'), {
          ...data, createdAt: Timestamp.now(), createdBy: myUid
        })
      }
      onClose()
    } catch (e) {
      console.error('Expenses error:', e)
      setError(`Erreur: ${e.code === 'permission-denied' ? 'Règles Firestore — voir instructions.' : e.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative w-full bg-white rounded-t-4xl px-5 pt-5 pb-10 safe-bottom"
           style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>
        <h2 className="text-2xl font-black text-black mb-5">
          {expense ? 'Modifier' : 'Nouvelle'} dépense
        </h2>

        {/* Title */}
        <label className="field-label">Description</label>
        <input
          className="field-input mb-4"
          placeholder="Ex: Épicerie, Resto, Loyer..."
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {/* Amount */}
        <label className="field-label">Montant total</label>
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">$</span>
          <input
            type="number" inputMode="decimal"
            className="field-input pl-9 text-2xl font-black"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        {/* Category */}
        <label className="field-label">Catégorie</label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex flex-col items-center gap-1 py-3 rounded-2xl transition-all ${
                category === cat.id ? 'ring-2 ring-black ring-offset-1 scale-105' : ''
              }`}
              style={{ backgroundColor: cat.color }}
            >
              <span className="text-xl">{cat.emoji}</span>
              <span className="text-xs font-bold text-black/70 leading-tight text-center">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Qui a payé */}
        <label className="field-label">Qui a payé?</label>
        <div className="flex gap-2 mb-4">
          {[{ uid: myUid, name: `${myName} (moi)` }, { uid: partnerUid, name: partnerName }].map(p => (
            <button
              key={p.uid}
              onClick={() => setPaidBy(p.uid)}
              className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all ${
                paidBy === p.uid ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Split */}
        <label className="field-label">Partage</label>
        <div className="flex gap-2 mb-3">
          {[{ id: 'equal', label: '50 / 50' }, { id: 'custom', label: 'Personnalisé' }].map(s => (
            <button
              key={s.id}
              onClick={() => setSplitType(s.id)}
              className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all ${
                splitType === s.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {splitType === 'equal' && amt > 0 && (
          <div className="flex gap-2 mb-4">
            {[
              { name: myName, share: (amt / 2).toFixed(2) },
              { name: partnerName, share: (amt / 2).toFixed(2) }
            ].map(p => (
              <div key={p.name} className="flex-1 bg-gray-50 rounded-2xl p-3 text-center">
                <div className="font-black text-black">{p.share} $</div>
                <div className="text-xs font-bold text-gray-400">{p.name}</div>
              </div>
            ))}
          </div>
        )}

        {splitType === 'custom' && (
          <div className="flex gap-2 mb-4">
            {[
              { name: myName, val: customMine, set: setCustomMine },
              { name: partnerName, val: customPartner, set: setCustomPartner }
            ].map(p => (
              <div key={p.name} className="flex-1">
                <label className="block text-xs font-bold text-gray-400 mb-1">{p.name}</label>
                <input
                  type="number" inputMode="decimal"
                  className="w-full bg-gray-100 rounded-2xl px-4 py-3 font-black text-black outline-none"
                  placeholder="0.00"
                  value={p.val}
                  onChange={e => p.set(e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Date */}
        <label className="field-label">Date</label>
        <input
          type="date"
          className="field-input mb-4"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        {/* Note */}
        <label className="field-label">Note (optionnel)</label>
        <textarea
          className="field-input mb-6 resize-none"
          rows={2}
          placeholder="Détails..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        {error && (
          <div className="bg-red-50 rounded-2xl px-4 py-3 mb-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || amt <= 0}
          className="w-full py-4 bg-black text-white font-black rounded-2xl text-base disabled:opacity-40 active:scale-98 transition-transform"
        >
          {loading ? 'Enregistrement...' : expense ? 'Modifier →' : 'Ajouter →'}
        </button>
      </div>
    </div>
  )
}
