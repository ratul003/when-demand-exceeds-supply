import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'When Demand Exceeds Supply - Wahid Tawsif Ratul'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#0a0a0f',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 70% 60% at 30% 50%, rgba(6,182,212,0.08), transparent)', display: 'flex' }} />
      <div style={{ fontSize: 13, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 28, display: 'flex' }}>
        Project 5 — On-Demand Marketplace
      </div>
      <div style={{ fontSize: 68, fontWeight: 900, color: '#f8fafc', lineHeight: 1.1, marginBottom: 32, maxWidth: 900, display: 'flex', flexWrap: 'wrap' }}>
        When Demand Exceeds Supply
      </div>
      <div style={{ fontSize: 22, color: '#64748b', maxWidth: 780, lineHeight: 1.55, display: 'flex' }}>
        Real-time barometer + surge pricing + tiered expert incentives for an online marketplace
      </div>
      <div style={{ position: 'absolute', bottom: 72, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, color: '#334155', display: 'flex', gap: 24 }}>
          <span>5 demand signals</span>
          <span>3 incentive tiers</span>
          <span>Self-financing surge loop</span>
        </div>
        <div style={{ fontSize: 14, color: '#475569', display: 'flex' }}>Wahid Tawsif Ratul</div>
      </div>
    </div>,
    { ...size }
  )
}
