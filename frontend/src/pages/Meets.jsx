import { useEffect, useState } from 'react'
import api from '../api/client'

function AttemptInput({ label, value, onChange }) {
  return (
    <div>
      <label style={{ color: '#8a8a9a', fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input
        className="input"
        type="number" step="0.5"
        placeholder="kg"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
      />
    </div>
  )
}

export default function Meets() {
  const [meets, setMeets] = useState([])
  const [selected, setSelected] = useState(null)
  const [attempts, setAttempts] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', meet_date: '', federation: 'PA', location: '', weight_class_kg: 93 })

  const load = () => api.get('/meets/').then((r) => setMeets(r.data))
  useEffect(() => { load() }, [])

  const selectMeet = (meet) => {
    setSelected(meet)
    setAttempts({
      squat_opener: meet.squat_opener, squat_second: meet.squat_second, squat_third: meet.squat_third,
      bench_opener: meet.bench_opener, bench_second: meet.bench_second, bench_third: meet.bench_third,
      deadlift_opener: meet.deadlift_opener, deadlift_second: meet.deadlift_second, deadlift_third: meet.deadlift_third,
    })
    setMsg('')
  }

  const saveAttempts = async () => {
    setSaving(true)
    try {
      await api.patch(`/meets/${selected.id}/attempts`, attempts)
      setMsg('Attempts saved!')
      load()
    } catch { setMsg('Failed to save.') }
    finally { setSaving(false) }
  }

  const createMeet = async (e) => {
    e.preventDefault()
    try {
      await api.post('/meets/', { ...newForm, weight_class_kg: parseFloat(newForm.weight_class_kg) })
      setShowNew(false)
      setNewForm({ name: '', meet_date: '', federation: 'PA', location: '', weight_class_kg: 93 })
      load()
    } catch { alert('Failed to create meet.') }
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#e8e8ed' }}>Meets</h1>
          <p style={{ color: '#8a8a9a', fontSize: 15, marginTop: 2 }}>Plan attempts and track results</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn btn--ghost">
          + New meet
        </button>
      </div>

      {showNew && (
        <form onSubmit={createMeet} className="card stagger-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input" placeholder="Meet name" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} required style={{ gridColumn: 'span 2' }} />
          <input type="date" className="input" value={newForm.meet_date} onChange={(e) => setNewForm({ ...newForm, meet_date: e.target.value })} required />
          <input className="input" placeholder="Federation (e.g. PA)" value={newForm.federation} onChange={(e) => setNewForm({ ...newForm, federation: e.target.value })} />
          <input className="input" placeholder="Location" value={newForm.location} onChange={(e) => setNewForm({ ...newForm, location: e.target.value })} />
          <input type="number" step="0.5" className="input" placeholder="Weight class (kg)" value={newForm.weight_class_kg} onChange={(e) => setNewForm({ ...newForm, weight_class_kg: e.target.value })} />
          <button type="submit" className="btn btn--primary" style={{ gridColumn: 'span 2' }}>Create meet</button>
        </form>
      )}

      {/* Meet list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {meets.map((m) => (
          <button
            key={m.id}
            onClick={() => selectMeet(m)}
            style={{
              textAlign: 'left', background: '#12121a',
              border: `1px solid ${selected?.id === m.id ? 'rgba(100,164,206,0.5)' : 'rgba(100,164,206,0.15)'}`,
              borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (selected?.id !== m.id) e.currentTarget.style.borderColor = 'rgba(100,164,206,0.3)' }}
            onMouseLeave={e => { if (selected?.id !== m.id) e.currentTarget.style.borderColor = 'rgba(100,164,206,0.15)' }}
          >
            <p style={{ fontWeight: 600, color: '#e8e8ed', marginBottom: 4 }}>{m.name}</p>
            <p style={{ color: '#8a8a9a', fontSize: 13 }}>{m.meet_date} · {m.federation}</p>
            {m.days_out != null && (
              <p style={{ color: '#64A4CE', fontSize: 13, marginTop: 6 }}>
                {m.days_out > 0 ? `${m.days_out} days out` : 'Past meet'}
              </p>
            )}
          </button>
        ))}
        {!meets.length && <p style={{ color: '#8a8a9a' }}>No meets yet.</p>}
      </div>

      {/* Attempt planner */}
      {selected && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {selected.name} — Attempt Planner
          </p>

          {['squat', 'bench', 'deadlift'].map((lift) => (
            <div key={lift}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64A4CE', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>{lift}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {['opener', 'second', 'third'].map((attempt) => (
                  <AttemptInput
                    key={attempt}
                    label={attempt.charAt(0).toUpperCase() + attempt.slice(1)}
                    value={attempts[`${lift}_${attempt}`]}
                    onChange={(v) => setAttempts({ ...attempts, [`${lift}_${attempt}`]: v })}
                  />
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={saveAttempts} disabled={saving} className="btn btn--primary">
              {saving ? 'Saving…' : 'Save attempts'}
            </button>
            {msg && <p style={{ fontSize: 13, color: msg.includes('Failed') ? '#f87171' : '#ACF2E7' }}>{msg}</p>}
          </div>

          {selected.total_kg && (
            <div style={{ borderTop: '1px solid rgba(100,164,206,0.15)', paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
              <div><p style={{ color: '#8a8a9a', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Total</p><p style={{ color: '#e8e8ed', fontWeight: 700 }}>{selected.total_kg} kg</p></div>
              <div><p style={{ color: '#8a8a9a', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>DOTS</p><p style={{ color: '#e8e8ed', fontWeight: 700 }}>{selected.dots_score?.toFixed(2) ?? '—'}</p></div>
              <div><p style={{ color: '#8a8a9a', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Bodyweight</p><p style={{ color: '#e8e8ed', fontWeight: 700 }}>{selected.bodyweight_kg ? `${selected.bodyweight_kg} kg` : '—'}</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
