import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import api from '../api/client'

const LIFTS = ['squat', 'bench', 'deadlift']
const LIFT_COLORS = { squat: '#64A4CE', bench: '#ACF2E7', deadlift: '#DAC7FF' }

const tooltipStyle = {
  contentStyle: { background: '#12121a', border: '1px solid rgba(100,164,206,0.2)', borderRadius: 10, fontSize: 13 },
  labelStyle: { color: '#8a8a9a' },
  itemStyle: { color: '#e8e8ed' },
}

export default function Training() {
  const [e1rmLift, setE1rmLift] = useState('squat')
  const [e1rmData, setE1rmData] = useState([])
  const [volumeData, setVolumeData] = useState([])
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState({ lift: 'squat', weight_kg: '', reps: '', rpe: '', variation: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get(`/training/e1rm-history?lift=${e1rmLift}`).then((r) => setE1rmData(r.data))
  }, [e1rmLift])

  useEffect(() => {
    api.get('/training/weekly-volume?weeks=12').then((r) => setVolumeData(r.data))
    api.get('/training/?limit=20').then((r) => setLogs(r.data))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      await api.post('/training/', {
        lift: form.lift,
        weight_kg: parseFloat(form.weight_kg),
        reps: parseInt(form.reps),
        rpe: form.rpe ? parseFloat(form.rpe) : undefined,
        variation: form.variation || undefined,
        notes: form.notes || undefined,
      })
      setMsg('Set logged!')
      setForm({ ...form, weight_kg: '', reps: '', rpe: '', notes: '' })
      const [l, v, e] = await Promise.all([
        api.get('/training/?limit=20'),
        api.get('/training/weekly-volume?weeks=12'),
        api.get(`/training/e1rm-history?lift=${e1rmLift}`),
      ])
      setLogs(l.data); setVolumeData(v.data); setE1rmData(e.data)
    } catch { setMsg('Failed to log set.') }
    finally { setSaving(false) }
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#e8e8ed' }}>Training</h1>
        <p style={{ color: '#8a8a9a', fontSize: 15, marginTop: 2 }}>Log sets and track strength progress</p>
      </div>

      {/* Log a set */}
      <div className="card stagger-1">
        <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Log a Set</p>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <select className="input" value={form.lift} onChange={(e) => setForm({ ...form, lift: e.target.value })}>
            {LIFTS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
          <input className="input" placeholder="Weight (kg)" type="number" step="0.5" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} required />
          <input className="input" placeholder="Reps" type="number" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} required />
          <input className="input" placeholder="RPE (optional)" type="number" step="0.5" min="6" max="10" value={form.rpe} onChange={(e) => setForm({ ...form, rpe: e.target.value })} />
          <input className="input" placeholder="Variation (e.g. pause)" value={form.variation} onChange={(e) => setForm({ ...form, variation: e.target.value })} style={{ gridColumn: 'span 2' }} />
          <input className="input" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ gridColumn: 'span 2' }} />
          <button type="submit" disabled={saving} className="btn btn--primary" style={{ gridColumn: '1 / -1' }}>
            {saving ? 'Logging…' : 'Log set'}
          </button>
          {msg && <p style={{ gridColumn: '1 / -1', fontSize: 13, color: msg.includes('Failed') ? '#f87171' : '#ACF2E7' }}>{msg}</p>}
        </form>
      </div>

      {/* e1RM chart */}
      <div className="card stagger-2">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>e1RM Trend</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {LIFTS.map((l) => (
              <button
                key={l}
                onClick={() => setE1rmLift(l)}
                className={e1rmLift === l ? 'btn btn--ghost' : ''}
                style={{
                  padding: '4px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  color: e1rmLift === l ? '#64A4CE' : '#8a8a9a',
                  background: e1rmLift === l ? 'rgba(100,164,206,0.1)' : 'transparent',
                  border: e1rmLift === l ? '1px solid rgba(100,164,206,0.2)' : '1px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                }}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {e1rmData.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={e1rmData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,164,206,0.08)" />
              <XAxis dataKey="date" stroke="#8a8a9a" tick={{ fontSize: 11, fill: '#8a8a9a' }} />
              <YAxis stroke="#8a8a9a" tick={{ fontSize: 11, fill: '#8a8a9a' }} unit=" kg" />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="e1rm" stroke={LIFT_COLORS[e1rmLift]} strokeWidth={2} dot={{ r: 3, fill: LIFT_COLORS[e1rmLift] }} name="e1RM (kg)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#8a8a9a', fontSize: 14 }}>No data yet for {e1rmLift}. Log sets with RPE to see trends.</p>
        )}
      </div>

      {/* Weekly volume */}
      <div className="card stagger-3">
        <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 20 }}>Weekly Tonnage — 12 weeks</p>
        {volumeData.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,164,206,0.08)" />
              <XAxis dataKey="week" stroke="#8a8a9a" tick={{ fontSize: 11, fill: '#8a8a9a' }} />
              <YAxis stroke="#8a8a9a" tick={{ fontSize: 11, fill: '#8a8a9a' }} unit=" kg" />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="total_tonnage" fill="#64A4CE" name="Tonnage (kg)" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#8a8a9a', fontSize: 14 }}>No volume data yet.</p>
        )}
      </div>

      {/* Recent sets table */}
      <div className="stagger-4">
        <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Recent Sets</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(100,164,206,0.15)' }}>
                {['Date', 'Lift', 'Weight', 'Reps', 'RPE', 'e1RM'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 12px 8px 0', textAlign: i > 1 ? 'right' : 'left', color: '#8a8a9a', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(100,164,206,0.06)' }}>
                  <td style={{ padding: '10px 12px 10px 0', color: '#8a8a9a' }}>{log.date}</td>
                  <td style={{ padding: '10px 12px 10px 0', color: '#e8e8ed', fontWeight: 500, textTransform: 'capitalize' }}>
                    {log.lift}{log.variation ? ` (${log.variation})` : ''}
                    {log.is_pr && <span style={{ marginLeft: 8, fontSize: 11, color: '#ACF2E7', fontWeight: 700 }}>PR</span>}
                  </td>
                  <td style={{ padding: '10px 12px 10px 0', textAlign: 'right', color: '#e8e8ed' }}>{log.weight_kg} kg</td>
                  <td style={{ padding: '10px 12px 10px 0', textAlign: 'right', color: '#8a8a9a' }}>{log.reps}</td>
                  <td style={{ padding: '10px 12px 10px 0', textAlign: 'right', color: '#8a8a9a' }}>{log.rpe ?? '—'}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', color: '#8a8a9a' }}>{log.e1rm ? `${log.e1rm.toFixed(1)} kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && <p style={{ color: '#8a8a9a', fontSize: 14, marginTop: 12 }}>No sets logged yet.</p>}
        </div>
      </div>
    </div>
  )
}
