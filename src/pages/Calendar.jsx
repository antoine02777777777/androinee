import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  collection, query, where, orderBy,
  onSnapshot, deleteDoc, doc, Timestamp
} from 'firebase/firestore'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import EventForm from '../components/EventForm'

const EVENT_ICONS  = { vacances: '🌴', événement: '🎉', fête: '🎂', rdv: '📅' }
const TYPE_COLORS  = { vacances: '#4FD9C4', événement: '#C8F56A', fête: '#FFB3D1', rdv: '#7DD3FC' }

export default function Calendar() {
  const { profile } = useAuth()
  const coupleId = profile?.coupleId
  const [tab, setTab]         = useState('calendrier')
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents]   = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setShowForm(true)
      setSearchParams({}, { replace: true })
    }
  }, [])

  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db, 'couples', coupleId, 'events'),
      where('date', '>=', Timestamp.fromDate(startOfMonth(current))),
      where('date', '<=', Timestamp.fromDate(endOfMonth(current))),
      orderBy('date')
    )
    return onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [coupleId, current.getMonth(), current.getFullYear()])

  const daysInGrid = () => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 })
    const end   = endOfWeek(endOfMonth(current),     { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  const eventsForDay = (day) =>
    events.filter(ev => isSameDay(ev.date?.toDate ? ev.date.toDate() : new Date(ev.date), day))

  const deleteEvent = async (id) => {
    if (!confirm('Supprimer?')) return
    await deleteDoc(doc(db, 'couples', coupleId, 'events', id))
  }

  const typeCount  = events.reduce((a, e) => { a[e.type] = (a[e.type] || 0) + 1; return a }, {})
  const selectedEvents = selected ? eventsForDay(selected) : []

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="page-title mb-4">Calendrier.</h1>
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {[
            { key: 'calendrier', label: '📅 Calendrier' },
            { key: 'sommaire',   label: '📊 Sommaire' },
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

      <div className="flex-1 scroll-area px-5 pb-6">

        {tab === 'calendrier' && (
          <div className="fade-in">
            {/* Month nav */}
            <div className="flex items-center justify-between py-3">
              <button onClick={() => setCurrent(subMonths(current, 1))}
                className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-black active:scale-90">
                ‹
              </button>
              <h2 className="text-lg font-black text-black capitalize">
                {format(current, 'MMMM yyyy', { locale: fr })}
              </h2>
              <button onClick={() => setCurrent(addMonths(current, 1))}
                className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-black active:scale-90">
                ›
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['L','M','M','J','V','S','D'].map((d, i) => (
                <div key={i} className="text-center text-xs font-black text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysInGrid().map((day, i) => {
                const dayEvs   = eventsForDay(day)
                const inMonth  = isSameMonth(day, current)
                const isSelected = selected && isSameDay(day, selected)
                const isT      = isToday(day)
                return (
                  <button key={i} onClick={() => setSelected(isSelected ? null : day)}
                    className={`relative flex flex-col items-center py-2 rounded-2xl transition-all ${
                      isSelected ? 'bg-black' :
                      isT        ? 'bg-gray-100' : ''
                    } ${!inMonth ? 'opacity-25' : ''}`}
                  >
                    <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-black'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex gap-0.5 mt-0.5 h-2">
                      {dayEvs.slice(0, 3).map((ev, j) => {
                        const col = ev.participants?.includes('antoine') && ev.participants?.includes('andreanne')
                          ? '#B8B4FF' : ev.participants?.includes('antoine') ? '#7DD3FC' : '#FFB3D1'
                        return <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: col }}/>
                      })}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 justify-center">
              {[
                { color: '#7DD3FC', label: 'Antoine' },
                { color: '#FFB3D1', label: 'Andréanne' },
                { color: '#B8B4FF', label: 'Ensemble' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }}/>
                  <span className="text-xs font-semibold text-gray-400">{label}</span>
                </div>
              ))}
            </div>

            {/* Selected day */}
            {selected && (
              <div className="mt-5 fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-black capitalize">
                    {format(selected, 'EEEE d MMM', { locale: fr })}
                  </h3>
                  <button onClick={() => { setEditEvent(null); setShowForm(true) }}
                    className="tag-black">+ Ajouter</button>
                </div>
                {selectedEvents.length === 0 ? (
                  <div className="rounded-3xl bg-gray-100 p-6 text-center">
                    <p className="text-gray-400 font-semibold text-sm">Aucun événement ce jour</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map(ev => (
                      <EventCard key={ev.id} event={ev}
                        onEdit={() => { setEditEvent(ev); setShowForm(true) }}
                        onDelete={() => deleteEvent(ev.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selected && events.length > 0 && (
              <div className="mt-5">
                <h3 className="text-lg font-black text-black mb-3">
                  Ce mois — {events.length} événement{events.length !== 1 ? 's' : ''}
                </h3>
                <div className="space-y-2">
                  {events.map(ev => (
                    <EventCard key={ev.id} event={ev} showDate
                      onEdit={() => { setEditEvent(ev); setShowForm(true) }}
                      onDelete={() => deleteEvent(ev.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'sommaire' && (
          <div className="fade-in space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="section-title capitalize">{format(current, 'MMMM yyyy', { locale: fr })}</h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrent(subMonths(current, 1))}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center font-black">‹</button>
                <button onClick={() => setCurrent(addMonths(current, 1))}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center font-black">›</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total',      value: events.length, color: '#FF8B7E' },
                { label: 'Antoine',    value: events.filter(e => e.participants?.includes('antoine')).length,   color: '#7DD3FC' },
                { label: 'Andréanne',  value: events.filter(e => e.participants?.includes('andreanne')).length, color: '#FFB3D1' },
                { label: 'Ensemble',   value: events.filter(e => e.participants?.includes('antoine') && e.participants?.includes('andreanne')).length, color: '#B8B4FF' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-4xl p-5" style={{ backgroundColor: color }}>
                  <div className="text-3xl font-black text-black">{value}</div>
                  <div className="text-sm font-bold text-black/60 mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-100 rounded-4xl p-5">
              <h3 className="font-black text-black mb-4">Par catégorie</h3>
              <div className="space-y-3">
                {Object.entries(typeCount).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xl">{EVENT_ICONS[type] || '📅'}</span>
                    <span className="font-bold text-black capitalize flex-1">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full" style={{ width: count * 24, backgroundColor: TYPE_COLORS[type] || '#ccc' }}/>
                      <span className="font-black text-black w-4 text-right">{count}</span>
                    </div>
                  </div>
                ))}
                {Object.keys(typeCount).length === 0 && (
                  <p className="text-gray-400 font-semibold text-sm">Aucun événement ce mois</p>
                )}
              </div>
            </div>

            {events.length > 0 && (
              <div>
                <h3 className="section-title mb-3">Tous les événements</h3>
                <div className="space-y-2">
                  {events.map(ev => <EventCard key={ev.id} event={ev} showDate />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      {tab === 'calendrier' && (
        <button onClick={() => { setEditEvent(null); setShowForm(true) }}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl bg-black text-white shadow-lg flex items-center justify-center text-2xl active:scale-90 transition-transform z-30">
          +
        </button>
      )}

      {showForm && (
        <EventForm event={editEvent} onClose={() => { setShowForm(false); setEditEvent(null) }} />
      )}
    </div>
  )
}

function EventCard({ event, onEdit, onDelete, showDate }) {
  const d    = event.date?.toDate ? event.date.toDate() : new Date(event.date)
  const both = event.participants?.includes('antoine') && event.participants?.includes('andreanne')
  const ant  = event.participants?.includes('antoine') && !event.participants?.includes('andreanne')

  return (
    <div className="rounded-3xl p-4 flex items-start gap-3"
         style={{ backgroundColor: TYPE_COLORS[event.type] || '#f3f4f6' }}>
      <span className="text-2xl flex-shrink-0">{EVENT_ICONS[event.type] || '📅'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="font-black text-black truncate">{event.title}</span>
          <div className="flex gap-1 flex-shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="w-7 h-7 rounded-xl bg-black/10 flex items-center justify-center text-sm">✏️</button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="w-7 h-7 rounded-xl bg-black/10 flex items-center justify-center text-sm">🗑️</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {showDate && (
            <span className="text-xs font-bold text-black/50">
              {format(d, 'd MMM', { locale: fr })}{event.time ? ' · ' + event.time : ''}
            </span>
          )}
          <span className="tag-black text-xs">
            {both ? 'Ensemble' : ant ? 'Antoine' : 'Andréanne'}
          </span>
          {event.notification && <span className="text-xs">🔔</span>}
        </div>
        {event.note && <p className="text-xs text-black/50 mt-1.5 font-medium italic">{event.note}</p>}
      </div>
    </div>
  )
}
