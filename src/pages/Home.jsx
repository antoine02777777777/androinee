import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, where, orderBy, limit,
  onSnapshot, Timestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { format, isToday, isTomorrow, addDays, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'

const EVENT_ICONS = { vacances: '🌴', événement: '🎉', fête: '🎂', rdv: '📅' }

function checkUpcomingNotifications(events) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const tomorrow = startOfDay(addDays(new Date(), 1))
  const dayAfter  = startOfDay(addDays(new Date(), 2))
  events.forEach(ev => {
    if (!ev.notification) return
    const evDate = ev.date?.toDate ? ev.date.toDate() : new Date(ev.date)
    const evDay  = startOfDay(evDate)
    if (evDay >= tomorrow && evDay < dayAfter) {
      const key = `notif_${ev.id}`
      if (!localStorage.getItem(key)) {
        new Notification(`Rappel — ${ev.title}`, {
          body: `Demain: ${format(evDate, 'd MMMM', { locale: fr })}${ev.time ? ' à ' + ev.time : ''}`,
        })
        localStorage.setItem(key, '1')
      }
    }
  })
}

export default function Home() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents]     = useState([])
  const [tasks, setTasks]       = useState([])
  const [shopping, setShopping] = useState([])
  const coupleId = profile?.coupleId

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db, 'couples', coupleId, 'events'),
      where('date', '>=', Timestamp.now()),
      where('date', '<=', Timestamp.fromDate(addDays(new Date(), 30))),
      orderBy('date'), limit(5)
    )
    return onSnapshot(q, snap => {
      const evs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setEvents(evs)
      checkUpcomingNotifications(evs)
    })
  }, [coupleId])

  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db, 'couples', coupleId, 'tasks'),
      where('completed', '==', false),
      orderBy('createdAt', 'desc'), limit(4)
    )
    return onSnapshot(q, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [coupleId])

  useEffect(() => {
    if (!coupleId) return
    const q = query(collection(db, 'couples', coupleId, 'shopping'), where('checked', '==', false))
    return onSnapshot(q, snap => setShopping(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [coupleId])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour,'
    if (h < 18) return 'Bon après-midi,'
    return 'Bonsoir,'
  }

  const formatEventDate = (ev) => {
    const d = ev.date?.toDate ? ev.date.toDate() : new Date(ev.date)
    if (isToday(d))    return `Aujourd'hui${ev.time ? ' · ' + ev.time : ''}`
    if (isTomorrow(d)) return `Demain${ev.time ? ' · ' + ev.time : ''}`
    return format(d, 'd MMM', { locale: fr }) + (ev.time ? ' · ' + ev.time : '')
  }

  const CARD_COLORS = ['#FF8B7E', '#C8F56A', '#4FD9C4', '#B8B4FF', '#FFE566']

  return (
    <div className="h-full scroll-area bg-white">
      <div className="px-5 pb-8">

        {/* Header */}
        <div className="pt-14 pb-6 flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm font-semibold capitalize">
              {format(new Date(), "EEEE d MMMM", { locale: fr })}
            </p>
            <h1 className="text-4xl font-black text-black mt-0.5 leading-tight">
              {greeting()}<br/>{profile?.name?.split(' ')[0]}.
            </h1>
          </div>
          <button
            onClick={logout}
            className="w-11 h-11 rounded-2xl bg-black flex items-center justify-center mt-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-3 mb-6">
          {[
            { label: 'Événements', value: events.length,   color: '#FF8B7E', route: '/calendrier' },
            { label: 'Tâches',     value: tasks.length,    color: '#B8B4FF', route: '/taches' },
            { label: 'Courses',    value: shopping.length, color: '#C8F56A', route: '/courses' },
          ].map(({ label, value, color, route }) => (
            <button
              key={label}
              onClick={() => navigate(route)}
              className="flex-1 rounded-3xl py-4 active:scale-95 transition-transform text-center"
              style={{ backgroundColor: color }}
            >
              <div className="text-2xl font-black text-black">{value}</div>
              <div className="text-xs font-bold text-black/60 mt-0.5">{label}</div>
            </button>
          ))}
        </div>

        {/* Prochains événements */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Prochains événements</h2>
            <button onClick={() => navigate('/calendrier')} className="text-sm font-bold text-gray-400">
              Voir tout →
            </button>
          </div>
          {events.length === 0 ? (
            <div className="rounded-4xl bg-gray-100 p-6 text-center">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-gray-400 font-semibold text-sm">Aucun événement à venir</p>
              <button
                onClick={() => navigate('/calendrier')}
                className="mt-3 bg-black text-white text-xs font-bold px-4 py-2 rounded-full"
              >
                + Ajouter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 3).map((ev, i) => (
                <div
                  key={ev.id}
                  className="rounded-3xl p-4 flex items-center gap-3"
                  style={{ backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }}
                >
                  <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                    {EVENT_ICONS[ev.type] || '📅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-black truncate">{ev.title}</div>
                    <div className="text-black/60 text-sm font-semibold mt-0.5">{formatEventDate(ev)}</div>
                  </div>
                  <PersonDot participants={ev.participants} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tâches en cours */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Tâches</h2>
            <button onClick={() => navigate('/taches')} className="text-sm font-bold text-gray-400">
              Voir tout →
            </button>
          </div>
          {tasks.length === 0 ? (
            <div className="rounded-4xl bg-gray-100 p-6 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-gray-400 font-semibold text-sm">Aucune tâche en attente!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-gray-100 rounded-3xl px-4 py-3.5">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    t.priority === 'high' ? 'bg-red-400' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'
                  }`}/>
                  <span className="font-bold text-black flex-1 truncate">{t.title}</span>
                  <span className={`tag-black text-xs ${
                    t.assignee === 'antoine' ? 'bg-black' :
                    t.assignee === 'andreanne' ? 'bg-black' : 'bg-black'
                  }`}>
                    {t.assignee === 'antoine' ? 'A' : t.assignee === 'andreanne' ? 'A' : 'A+A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liste de courses */}
        <button
          onClick={() => navigate('/courses')}
          className="w-full rounded-4xl p-5 flex items-center gap-4 active:scale-98 transition-transform"
          style={{ backgroundColor: '#C8F56A' }}
        >
          <div className="w-14 h-14 bg-black/10 rounded-3xl flex items-center justify-center text-3xl flex-shrink-0">
            🛒
          </div>
          <div className="text-left">
            <div className="font-black text-black text-lg">Liste de courses</div>
            <div className="text-black/60 font-semibold text-sm mt-0.5">
              {shopping.length === 0 ? 'Liste vide' : `${shopping.length} article${shopping.length > 1 ? 's' : ''} à acheter`}
            </div>
          </div>
          <div className="ml-auto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </div>
        </button>

      </div>
    </div>
  )
}

function PersonDot({ participants = [] }) {
  const both = participants.includes('antoine') && participants.includes('andreanne')
  if (both)                                  return <span className="tag-black">Ensemble</span>
  if (participants.includes('antoine'))      return <span className="tag-black">Antoine</span>
  if (participants.includes('andreanne'))    return <span className="tag-black">Andréanne</span>
  return null
}
