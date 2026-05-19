import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get('title') || 'Untitled Style';
  const keywords = searchParams.get('keywords') || '';
  const primary = searchParams.get('primary') || '#2563eb';
  const bg = searchParams.get('bg') || '#ffffff';
  const fg = searchParams.get('fg') || '#0f172a';
  const confidence = searchParams.get('confidence') || '85';
  const font = searchParams.get('font') || 'sans';
  const vibe = searchParams.get('vibe') || '';

  const keywordList = keywords.split(',').filter(Boolean).slice(0, 5);
  const confNum = Math.max(0, Math.min(100, parseInt(confidence, 10) || 0));
  const confColor = confNum >= 80 ? '#22c55e' : confNum >= 50 ? '#eab308' : '#ef4444';
  const confLabel = confNum >= 80 ? 'HIGH' : confNum >= 50 ? 'MED' : 'LOW';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: bg,
          padding: '48px',
          fontFamily: font === 'mono' ? 'monospace' : font === 'serif' ? 'serif' : 'sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: primary }} />
            <span style={{ fontSize: '16px', color: fg, fontWeight: 600, opacity: 0.7 }}>DISTILL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '48px', height: '6px', borderRadius: '3px', backgroundColor: '#e5e7eb' }}>
              <div style={{ width: `${confNum}%`, height: '100%', borderRadius: '3px', backgroundColor: confColor }} />
            </div>
            <span style={{ fontSize: '12px', color: confColor, fontWeight: 700 }}>{confLabel} {confNum}%</span>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
          {/* Gradient accent line */}
          <div style={{ height: '4px', width: '80px', borderRadius: '2px', background: `linear-gradient(90deg, ${primary}, transparent)` }} />

          {/* Title */}
          <div style={{ fontSize: '52px', fontWeight: 800, color: fg, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {title}
          </div>

          {/* Vibe description */}
          {vibe && (
            <div style={{ fontSize: '18px', color: fg, opacity: 0.6, maxWidth: '80%', lineHeight: 1.4 }}>
              {vibe.length > 120 ? vibe.substring(0, 120) + '...' : vibe}
            </div>
          )}

          {/* Keywords */}
          {keywordList.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {keywordList.map((kw, i) => (
                <div
                  key={i}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    backgroundColor: i === 0 ? primary : `${primary}15`,
                    color: i === 0 ? '#ffffff' : fg,
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {kw.trim()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar — color palette */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {searchParams.get('palette')?.split(',').filter(Boolean).slice(0, 6).map((color, i) => (
              <div key={i} style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: color }} />
            ))}
          </div>
          <span style={{ fontSize: '14px', color: fg, opacity: 0.4 }}>distill.style</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
