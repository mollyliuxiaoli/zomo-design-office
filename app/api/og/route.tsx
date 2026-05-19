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
  // Use pixel values for OG compatibility
  const confWidth = Math.round((48 * confNum) / 100);

  const palette = searchParams.get('palette')?.split(',').filter(Boolean).slice(0, 6) || [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200',
          height: '630',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: bg,
          padding: '48px',
          fontFamily: font === 'mono' ? 'monospace' : font === 'serif' ? 'serif' : 'sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '20' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12' }}>
            <div style={{ width: '12', height: '12', borderRadius: '6', backgroundColor: primary }} />
            <span style={{ fontSize: '16', color: fg, fontWeight: 600, opacity: 0.7 }}>DISTILL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8' }}>
            <div style={{ width: '48', height: '6', borderRadius: '3', backgroundColor: '#e5e7eb', display: 'flex' }}>
              <div style={{ width: String(confWidth), height: '6', borderRadius: '3', backgroundColor: confColor }} />
            </div>
            <span style={{ fontSize: '12', color: confColor, fontWeight: 700 }}>{confLabel} {confNum}%</span>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20', marginTop: '80' }}>
          {/* Accent line (solid color, no gradient) */}
          <div style={{ height: '4', width: '80', borderRadius: '2', backgroundColor: primary }} />

          {/* Title */}
          <div style={{ fontSize: '52', fontWeight: 800, color: fg, lineHeight: '1.1', letterSpacing: '-1.04' }}>
            {title}
          </div>

          {/* Vibe description */}
          {vibe && (
            <div style={{ fontSize: '18', color: fg, opacity: 0.6, maxWidth: '960', lineHeight: '1.4' }}>
              {vibe.length > 120 ? vibe.substring(0, 120) + '...' : vibe}
            </div>
          )}

          {/* Keywords */}
          {keywordList.length > 0 && (
            <div style={{ display: 'flex', gap: '8', flexWrap: 'wrap', marginTop: '8' }}>
              {keywordList.map((kw, i) => (
                <div
                  key={i}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20',
                    backgroundColor: i === 0 ? primary : '#f3f4f6',
                    color: i === 0 ? '#ffffff' : fg,
                    fontSize: '14',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '40' }}>
          <div style={{ display: 'flex', gap: '6' }}>
            {palette.map((color, i) => (
              <div key={i} style={{ width: '32', height: '32', borderRadius: '6', backgroundColor: color }} />
            ))}
          </div>
          <span style={{ fontSize: '14', color: fg, opacity: 0.4 }}>distill.style</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  );
}
