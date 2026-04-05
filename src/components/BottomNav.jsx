import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',           label: 'Accueil',    emoji: '🏠' },
  { to: '/calendrier', label: 'Calendrier', emoji: '📅' },
  { to: '/depenses',   label: 'Dépenses',   emoji: '💰' },
  { to: '/courses',    label: 'Courses',    emoji: '🛒' },
  { to: '/taches',     label: 'Tâches',     emoji: '✅' },
]

export default function BottomNav() {
  return (
    <nav className="bg-white flex-shrink-0 safe-bottom"
         style={{ borderTop: '1.5px solid #f3f4f6' }}>
      <div className="flex items-center justify-around nav-height px-2">
        {tabs.map(({ to, label, emoji }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 flex-1 py-2 transition-all duration-150 ${
                isActive ? 'text-black' : 'text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`transition-all duration-200 ${isActive ? 'scale-110' : ''}`}>
                  {isActive ? (
                    <div className="bg-black text-white w-10 h-10 rounded-2xl flex items-center justify-center text-xl">
                      {emoji}
                    </div>
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center text-xl grayscale opacity-40">
                      {emoji}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-bold ${isActive ? 'text-black' : 'text-gray-300'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
