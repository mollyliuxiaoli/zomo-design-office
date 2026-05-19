'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

interface ShowcaseStyle {
  id: string;
  title: string;
  keywords: string[];
  primary: string;
  bg: string;
  confidence: number;
  vibe: string;
}

export default function ShowcasePage() {
  const [styles, setStyles] = useState<ShowcaseStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/showcase', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => {
        setStyles(data.styles || []);
        setLoading(false);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load showcase');
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-black mb-4">
            Distill Showcase
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore design styles extracted from the world&apos;s best websites.
            Each card is a complete StyleSpecV1 you can use in your projects.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Gallery */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4" />
            <p className="text-gray-500">Loading styles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {styles.map(style => {
              const params = new URLSearchParams({
                title: style.title,
                keywords: style.keywords.join(','),
                primary: style.primary,
                bg: style.bg,
                confidence: String(style.confidence),
                vibe: style.vibe,
                palette: [style.primary, style.bg].join(','),
              });
              const ogUrl = `/api/og?${params.toString()}`;

              return (
                <div
                  key={style.id}
                  className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all"
                >
                  {/* OG Image Preview */}
                  <div className="aspect-[1200/630] bg-gray-100 overflow-hidden">
                    <img
                      src={ogUrl}
                      alt={`${style.title} style card`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-black mb-2">{style.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{style.vibe}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {style.keywords.slice(0, 4).map(kw => (
                        <span key={kw} className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: style.primary }} />
                        <span className="text-xs text-gray-500">{style.primary}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-400">
                        {style.confidence}% match
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-500 mb-4">Want to extract your own styles?</p>
          <Link
            href="/analyze"
            className="inline-block bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Start Analyzing
          </Link>
        </div>
      </div>
    </div>
  );
}
