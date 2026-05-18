import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import api from '../api/client'

const tooltipStyle = {
  contentStyle: { background: '#12121a', border: '1px solid rgba(100,164,206,0.2)', borderRadius: 10, fontSize: 13 },
  labelStyle: { color: '#8a8a9a' },
  itemStyle: { color: '#e8e8ed' },
}

export default function Nutrition() {
  const [logs, setLogs] = useState([])
  const [weighIns, setWeighIns] = useState([])
  const [averages, setAverages] = useState(null)
  const [macroForm, setMacroForm] = useState({ calories: '', protein_g: '', carbs_g: '', fat_g: '' })
  const [weighForm, setWeighForm] = useState({ weight_kg: '' })
  const [saving, setSaving] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [l, w, a] = await Promise.all([
      api.get('/nutrition/?limit=14'),
      api.get('/nutrition/weigh-ins?limit=30'),
      api.get('/nutrition/averages'),
    ])
    setLogs(l.data)
    setWeighIns(w.data.slice().reverse())
    setAverages(a.data)
  }

  useEffect(() => { load() }, [])

  const logMacros = async (e) => {
    e.preventDefault(); setSaving('macros')
    try {
      await api.post('/nutrition/', {
        calories: macroForm.calories ? parseInt(macroForm.calories) : undefined,
        protein_g: macroForm.protein_g ? parseFloat(macroForm.protein_g) : undefined,
        carbs_g: macroForm.carbs_g ? parseFloat(macroForm.carbs_g) : undefined,
        fat_g: macroForm.fat_g ? parseFloat(macroForm.fat_g) : undefined,
      })
      setMacroForm({ calories: '', protein_g: '', carbs_g: '', fat_g: '' })
      setMsg('Macros logged!')
      load()
    } catch { setMsg('Failed.') }
    finally { setSaving('') }
  }

  const logWeighIn = async (e) => {
    e.preventDefault(); setSaving('weigh')
    try {
      await api.post('/nutrition/weigh-ins', { weight_kg: parseFloat(weighForm.weight_kg) })
      setWeighForm({ weight_kg: '' })
      setMsg('Weigh-in logged!')
      load()
    } catch { setMsg('Failed.') }
    finally { setSaving('') }
  }

  const stats = [
    { label: 'Avg calories', value: averages?.avg_calories ? `${averages.avg_calories} kcal` : '—' },
    { label: 'Avg protein', value: averages?.avg_protein_g ? `${averages.avg_protein_g} g` : '—' },
    { label: 'Avg carbs', value: averages?.avg_carbs_g ? `${averages.avg_carbs_g} g` : '—' },
    { label: 'Avg fat', value: averages?.avg_fat_g ? `${averages.avg_fat_g} g` : '—' },
  ]

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#e8e8ed' }}>Nutrition</h1>
        <p style={{ color: '#8a8a9a', fontSize: 15, marginTop: 2 }}>Track macros and body weight</p>
      </div>

      {/* 7-day averages */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {stats.map(({ label, value }, i) => (
          <div key={label} className={`card stagger-${i + 1}`}>
            <p style={{ color: '#8a8a9a', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label} (7d)</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#e8e8ed' }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Log macros */}
        <div className="card stagger-2">
          <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Log Macros</p>
          <form onSubmit={logMacros} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { key: 'calories', placeholder: 'Calories', step: '1' },
              { key: 'protein_g', placeholder: 'Protein (g)', step: '0.1' },
              { key: 'carbs_g', placeholder: 'Carbs (g)', step: '0.1' },
              { key: 'fat_g', placeholder: 'Fat (g)', step: '0.1' },
            ].map(({ key, placeholder, step }) => (
              <input key={key} className="input" type="number" step={step} placeholder={placeholder}
                value={macroForm[key]} onChange={(e) => setMacroForm({ ...macroForm, [key]: e.target.value })} />
            ))}
            <button type="submit" disabled={saving === 'macros'} className="btn btn--primary">
              {saving === 'macros' ? 'Logging…' : 'Log macros'}
            </button>
          </form>
        </div>

        {/* Log weigh-in */}
        <div className="card stagger-3">
          <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Log Weigh-in</p>
          <form onSubmit={logWeighIn} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input" type="number" step="0.1" placeholder="Weight (kg)"
              value={weighForm.weight_kg} onChange={(e) => setWeighForm({ weight_kg: e.target.value })} required />
            <button type="submit" disabled={saving === 'weigh'} className="btn btn--primary">
              {saving === 'weigh' ? 'Logging…' : 'Log weight'}
            </button>
          </form>
          {msg && <p style={{ fontSize: 13, marginTop: 10, color: msg.includes('Failed') ? '#f87171' : '#ACF2E7' }}>{msg}</p>}
        </div>
      </div>

      {/* Body weight trend */}
      {weighIns.length > 0 && (
        <div className="card stagger-4">
          <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 20 }}>Body Weight Trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weighIns}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,164,206,0.08)" />
              <XAxis dataKey="date" stroke="#8a8a9a" tick={{ fontSize: 11, fill: '#8a8a9a' }} />
              <YAxis stroke="#8a8a9a" tick={{ fontSize: 11, fill: '#8a8a9a' }} unit=" kg" domain={['auto', 'auto']} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="weight_kg" stroke="#ACF2E7" strokeWidth={2} dot={{ r: 3, fill: '#ACF2E7' }} name="Weight (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent logs table */}
      <div className="stagger-4">
        <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Recent Logs</p>
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(100,164,206,0.15)' }}>
              {['Date', 'Calories', 'Protein', 'Carbs', 'Fat'].map((h, i) => (
                <th key={h} style={{ padding: '8px 12px 8px 0', textAlign: i > 0 ? 'right' : 'left', color: '#8a8a9a', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid rgba(100,164,206,0.06)' }}>
                <td style={{ padding: '10px 12px 10px 0', color: '#8a8a9a' }}>{l.date}</td>
                <td style={{ padding: '10px 12px 10px 0', textAlign: 'right', color: '#e8e8ed' }}>{l.calories ?? '—'}</td>
                <td style={{ padding: '10px 12px 10px 0', textAlign: 'right', color: '#8a8a9a' }}>{l.protein_g ? `${l.protein_g}g` : '—'}</td>
                <td style={{ padding: '10px 12px 10px 0', textAlign: 'right', color: '#8a8a9a' }}>{l.carbs_g ? `${l.carbs_g}g` : '—'}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: '#8a8a9a' }}>{l.fat_g ? `${l.fat_g}g` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && <p style={{ color: '#8a8a9a', fontSize: 14, marginTop: 12 }}>No nutrition logs yet.</p>}
      </div>
    </div>
  )
}
