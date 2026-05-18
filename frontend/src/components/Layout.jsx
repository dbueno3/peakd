import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/training', label: 'Training' },
  { to: '/meets', label: 'Meets' },
  { to: '/nutrition', label: 'Nutrition' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glows */}
      <div style={{
        position: 'fixed', top: '-30%', right: '-20%', width: '60vw', height: '60vh',
        background: 'radial-gradient(ellipse, rgba(100,164,206,0.04) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', left: '-15%', width: '50vw', height: '50vh',
        background: 'radial-gradient(ellipse, rgba(218,199,255,0.025) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '14px 40px',
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(100,164,206,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 900 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#8DBEDC', letterSpacing: '-0.5px' }}>Peakd</span>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                style={({ isActive }) => ({
                  padding: '6px 16px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#e8e8ed' : '#8a8a9a',
                  background: isActive ? 'rgba(100,164,206,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(100,164,206,0.15)' : '1px solid transparent',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                })}
              >
                {label}
              </NavLink>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#8a8a9a', fontSize: 13 }}>{user?.name || user?.email}</span>
            <button onClick={handleLogout} style={{ color: '#8a8a9a', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.target.style.color = '#e8e8ed'}
              onMouseLeave={e => e.target.style.color = '#8a8a9a'}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '96px 24px 60px', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  )
}
