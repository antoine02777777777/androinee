import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, orderBy, query, Timestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

const STORES = ['Tous', 'Costco', 'IGA', 'Maxi', 'Metro', 'Super C']
const STORE_COLORS = { Costco: '#C8F56A', IGA: '#FF8B7E', Maxi: '#FFE566', Metro: '#4FD9C4', 'Super C': '#B8B4FF' }

export default function Shopping() {
  const { profile } = useAuth()
  const coupleId = profile?.coupleId

  const [items, setItems]         = useState([])
  const [search, setSearch]       = useState('')
  const [results, setResults]     = useState([])
  const [searching, setSearching] = useState(false)
  const [filterStore, setFilterStore] = useState('Tous')
  const [tab, setTab]             = useState('liste')
  const [editItem, setEditItem]   = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setShowManual(true)
      setSearchParams({}, { replace: true })
    }
  }, [])
  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty]   = useState('1')
  const [manualStore, setManualStore] = useState('')
  const searchTimeout = useRef(null)

  useEffect(() => {
    if (!coupleId) return
    return onSnapshot(
      query(collection(db, 'couples', coupleId, 'shopping'), orderBy('createdAt', 'desc')),
      snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [coupleId])

  useEffect(() => {
    if (!search.trim() || search.length < 2) { setResults([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(search)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,brands,image_small_url,quantity&lc=fr&cc=ca`
        const res  = await fetch(url)
        const data = await res.json()
        setResults((data.products || []).filter(p => p.product_name).slice(0, 10))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
  }, [search])

  const addItem = async (name, image = '', quantity = '1', store = '') => {
    if (!name.trim()) return
    await addDoc(collection(db, 'couples', coupleId, 'shopping'), {
      name: name.trim(), image, quantity, store,
      checked: false, addedBy: profile?.name, createdAt: Timestamp.now(),
    })
    setSearch(''); setResults([])
    setManualName(''); setManualQty('1'); setManualStore(''); setShowManual(false)
  }

  const toggleCheck = async (item) => {
    await updateDoc(doc(db, 'couples', coupleId, 'shopping', item.id), {
      checked: !item.checked, checkedAt: item.checked ? null : Timestamp.now(),
    })
  }

  const deleteItem  = async (id) => await deleteDoc(doc(db, 'couples', coupleId, 'shopping', id))
  const saveEdit    = async () => {
    if (!editItem) return
    await updateDoc(doc(db, 'couples', coupleId, 'shopping', editItem.id), {
      name: editItem.name, quantity: editItem.quantity, store: editItem.store || '',
    })
    setEditItem(null)
  }
  const clearChecked = async () => {
    if (!confirm('Supprimer tous les articles cochés?')) return
    await Promise.all(items.filter(i => i.checked).map(i => deleteItem(i.id)))
  }

  const pending  = items.filter(i => !i.checked)
  const bought   = items.filter(i =>  i.checked)
  const filtered = (tab === 'liste' ? pending : bought)
    .filter(i => filterStore === 'Tous' || i.store === filterStore)

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="page-title">Courses.</h1>
          {bought.length > 0 && (
            <button onClick={clearChecked} className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
              Vider ✓
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un aliment..." className="input-search" />
          {search && (
            <button onClick={() => { setSearch(''); setResults([]) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">✕</button>
          )}
        </div>

        {/* Search results */}
        {(results.length > 0 || searching || search.length >= 2) && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden max-h-56 overflow-y-auto z-20 relative mb-3">
            {searching && (
              <div className="flex items-center gap-3 px-4 py-3 text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"/>
                <span className="text-sm font-semibold">Recherche...</span>
              </div>
            )}
            {!searching && results.length === 0 && search.length >= 2 && (
              <div className="px-4 py-4">
                <p className="text-sm text-gray-400 font-semibold mb-2">Aucun résultat</p>
                <button onClick={() => { setManualName(search); setShowManual(true); setSearch(''); setResults([]) }}
                  className="text-sm font-black text-black">+ Ajouter «{search}» manuellement</button>
              </div>
            )}
            {results.map((p, i) => (
              <button key={i} onClick={() => addItem(p.product_name, p.image_small_url || '', '1', '')}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-100 text-left border-b border-gray-50 last:border-0">
                {p.image_small_url ? (
                  <img src={p.image_small_url} alt="" className="w-10 h-10 rounded-2xl object-cover bg-gray-100 flex-shrink-0"/>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🛒</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-black truncate">{p.product_name}</div>
                  {p.brands && <div className="text-xs text-gray-400 truncate">{p.brands}</div>}
                </div>
                <span className="text-2xl font-black text-black/30 flex-shrink-0">+</span>
              </button>
            ))}
          </div>
        )}

        {/* Store filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {STORES.map(s => (
            <button key={s} onClick={() => setFilterStore(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterStore === s ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 pb-3">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {[
            { key: 'liste',   label: `À acheter (${pending.length})` },
            { key: 'achetés', label: `Achetés (${bought.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === key ? 'bg-black text-white shadow-sm' : 'text-gray-400'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 scroll-area px-5 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">{tab === 'liste' ? '🛒' : '✅'}</div>
            <p className="text-gray-400 font-semibold">
              {tab === 'liste' ? 'Liste vide! Appuie sur + pour ajouter.' : 'Aucun article acheté.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <div key={item.id}
                className={`flex items-center gap-3 rounded-3xl p-4 transition-opacity ${
                  item.checked ? 'opacity-50' : ''
                }`}
                style={{ backgroundColor: item.store && STORE_COLORS[item.store] ? STORE_COLORS[item.store] + '30' : '#f3f4f6' }}
              >
                <button onClick={() => toggleCheck(item)}
                  className={`checkbox-custom ${item.checked ? 'checked' : ''}`}>
                  {item.checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                  )}
                </button>

                {item.image ? (
                  <img src={item.image} alt="" className="w-11 h-11 rounded-2xl object-cover bg-white flex-shrink-0"/>
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-xl flex-shrink-0">🛒</div>
                )}

                {editItem?.id === item.id ? (
                  <div className="flex-1 space-y-2">
                    <input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                      className="input text-sm py-2"/>
                    <div className="flex gap-2">
                      <input value={editItem.quantity} onChange={e => setEditItem({ ...editItem, quantity: e.target.value })}
                        placeholder="Qté" className="input text-sm py-2 w-20"/>
                      <select value={editItem.store || ''} onChange={e => setEditItem({ ...editItem, store: e.target.value })}
                        className="input text-sm py-2 flex-1">
                        <option value="">Épicerie</option>
                        {STORES.filter(s => s !== 'Tous').map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="flex-1 bg-black text-white font-bold py-2 rounded-2xl text-sm">Sauvegarder</button>
                      <button onClick={() => setEditItem(null)} className="flex-1 bg-gray-200 text-black font-bold py-2 rounded-2xl text-sm">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-black ${item.checked ? 'line-through' : ''}`}>{item.name}</div>
                      <div className="flex gap-2 mt-0.5 flex-wrap items-center">
                        {item.quantity && item.quantity !== '1' && (
                          <span className="text-xs font-semibold text-gray-500">×{item.quantity}</span>
                        )}
                        {item.store && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: STORE_COLORS[item.store] || '#e5e7eb', color: '#000' }}>
                            {item.store}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!item.checked && (
                        <button onClick={() => setEditItem(item)}
                          className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-sm shadow-sm">✏️</button>
                      )}
                      <button onClick={() => deleteItem(item.id)}
                        className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-sm shadow-sm">🗑️</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowManual(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl bg-black text-white shadow-lg flex items-center justify-center text-2xl active:scale-90 transition-transform z-30">
        +
      </button>

      {/* Manual add sheet */}
      {showManual && (
        <>
          <div className="sheet-overlay" onClick={() => setShowManual(false)} />
          <div className="sheet">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full"/></div>
            <div className="px-5 pt-3 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black text-black">Ajouter un article</h2>
              <button onClick={() => setShowManual(false)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4 pb-8">
              <div>
                <label className="form-label">Nom de l'article</label>
                <input type="text" value={manualName} onChange={e => setManualName(e.target.value)}
                  placeholder="Lait, Pain, Pommes..." className="input" autoFocus/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Quantité</label>
                  <input type="text" value={manualQty} onChange={e => setManualQty(e.target.value)}
                    placeholder="1" className="input"/>
                </div>
                <div>
                  <label className="form-label">Épicerie</label>
                  <select value={manualStore} onChange={e => setManualStore(e.target.value)} className="input">
                    <option value="">Non précisé</option>
                    {STORES.filter(s => s !== 'Tous').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => addItem(manualName, '', manualQty, manualStore)}
                disabled={!manualName.trim()} className="btn-black">
                Ajouter à la liste →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
