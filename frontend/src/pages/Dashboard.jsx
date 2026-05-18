import { useEffect, useState } from 'react'
import api from '../api/client'

const PHASE_TAG = {
  off_season:  { cls: 'tag--muted',      label: 'Off Season' },
  hypertrophy: { cls: 'tag--secondary',  label: 'Hypertrophy' },
  strength:    { cls: 'tag--primary',    label: 'Strength' },
  peaking:     { cls: 'tag--tertiary',   label: 'Peaking' },
  deload:      { cls: 'tag--secondary',  label: 'Deload' },
  meet_week:   { cls: 'tag--tertiary',   label: 'Meet Week' },
  post_meet:   { cls: 'tag--muted',      label: 'Post Meet' },
}

function StatCard({ label, value, sub, delay }) {
  return (
    <div className={`card stagger-${delay}`}>
      <p style={{ color: '#8a8a9a', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#e8e8ed' }}>{value ?? '—'}</p>
      {sub && <p style={{ color: '#8a8a9a', fontSize: 12, marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: '#8a8a9a' }}>Loading…</p>

  const { meet, weight_cut, nutrition, recent_prs } = data ?? {}
  const phase = meet?.training_phase
  const phaseInfo = phase ? PHASE_TAG[phase] : null

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#e8e8ed' }}>Dashboard</h1>
          <p style={{ color: '#8a8a9a', fontSize: 15, marginTop: 2 }}>Your meet prep at a glance</p>
        </div>
        {phaseInfo && <span className={`tag ${phaseInfo.cls}`}>{phaseInfo.label}</span>}
      </div>

      {/* Meet countdown */}
      {meet ? (
        <div className="card stagger-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: '#8a8a9a', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Next Meet</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#e8e8ed' }}>{meet.name}</p>
            <p style={{ color: '#8a8a9a', fontSize: 13, marginTop: 4 }}>{meet.meet_date} · {meet.federation}{meet.location ? ` · ${meet.location}` : ''}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 48, fontWeight: 700, color: '#64A4CE', lineHeight: 1 }}>{meet.days_out}</span>
            <p style={{ color: '#8a8a9a', fontSize: 13, marginTop: 4 }}>days out</p>
          </div>
        </div>
      ) : (
        <div className="card stagger-1">
          <p style={{ color: '#8a8a9a' }}>No upcoming meet. Add one on the Meets page.</p>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Current weight" value={weight_cut?.current_weight_kg ? `${weight_cut.current_weight_kg} kg` : null} delay={1} />
        <StatCard label="To cut" value={weight_cut?.kg_to_cut != null ? `${weight_cut.kg_to_cut} kg` : null} sub="to 93 kg class" delay={2} />
        <StatCard label="Avg calories (7d)" value={nutrition?.avg_calories ? `${nutrition.avg_calories} kcal` : null} sub={nutrition?.days_logged ? `${nutrition.days_logged} days logged` : null} delay={3} />
        <StatCard label="Avg protein (7d)" value={nutrition?.avg_protein_g ? `${nutrition.avg_protein_g} g` : null} delay={4} />
      </div>

      {/* Recent PRs */}
      <div>
        <p style={{ fontSize: 13, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Recent PRs</p>
        {recent_prs?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {recent_prs.map((pr, i) => (
              <div key={pr.id} className={`card stagger-${i + 1}`}>
                <p style={{ color: '#64A4CE', fontWeight: 600, textTransform: 'capitalize', marginBottom: 6 }}>{pr.lift}</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#e8e8ed' }}>
                  {pr.e1rm?.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 400, color: '#8a8a9a' }}>kg e1RM</span>
                </p>
                <p style={{ color: '#8a8a9a', fontSize: 12, marginTop: 6 }}>
                  {pr.weight_kg} kg × {pr.reps} @ RPE {pr.rpe} · {pr.date}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#8a8a9a' }}>No PRs yet. Start logging sets on the Training page.</p>
        )}
      </div>
    </div>
  )
}
