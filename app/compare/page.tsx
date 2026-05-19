'use client';

import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { styleRepo } from '../lib/storage/repo';
import type { LibraryRecord } from '../lib/storage/db';
import type { StyleSpecV1 } from '../lib/spec/types';

export default function ComparePage() {
  const [records, setRecords] = useState<LibraryRecord[]>([]);
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await styleRepo.listAll();
        setRecords(all);
        if (all.length >= 2) {
          setLeftId(all[0].id);
          setRightId(all[1].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const left = records.find((r) => r.id === leftId);
  const right = records.find((r) => r.id === rightId);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    );
  }

  if (records.length < 2) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold text-black mb-4">风格对比</h1>
          <div className="bg-gray-50 rounded-lg p-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-black mb-4">需要至少 2 个风格</h2>
            <p className="text-gray-600 mb-6">请先分析 2 个以上的设计，才能使用对比功能</p>
            <a href="/analyze" className="inline-block bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800">
              开始分析
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">风格对比</h1>
          <p className="text-gray-600">并排对比两种设计风格的差异</p>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">风格 A</label>
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">风格 B</label>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>
        </div>

        {left && right && (
          <div className="grid grid-cols-2 gap-6">
            <StyleCard record={left} label="A" />
            <StyleCard record={right} label="B" />
            <DiffSection left={left.spec} right={right.spec} />
          </div>
        )}
      </div>
    </div>
  );
}

function StyleCard({ record, label }: { record: LibraryRecord; label: string }) {
  const spec = record.spec;
  const confidence = Math.max(0, Math.min(100, spec.meta?.confidence ?? 0));

  return (
    <div className="border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{String(record.title || 'Untitled')}</h3>
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-medium">风格 {label}</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{String(spec.vibe?.description || '').slice(0, 100)}</p>

      {/* Colors */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">色彩</h4>
        <div className="flex gap-1">
          {(spec.colors?.primary || []).map((c, i) => (
            <div key={i} className="w-8 h-8 rounded border border-gray-200" style={{ backgroundColor: String(c) }}
              title={String(c)} />
          ))}
          {(spec.colors?.secondary || []).map((c, i) => (
            <div key={i} className="w-8 h-8 rounded border border-gray-200" style={{ backgroundColor: String(c) }}
              title={String(c)} />
          ))}
          {(spec.colors?.background || []).slice(0, 2).map((c, i) => (
            <div key={i} className="w-8 h-8 rounded border border-gray-200" style={{ backgroundColor: String(c) }}
              title={String(c)} />
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">排版</h4>
        <p className="text-sm">{String(spec.typography?.fontStyle || 'sans')} · {String(spec.typography?.suggestedFonts?.[0] || 'Inter')}</p>
        <p className="text-xs text-gray-500">Heading {String(spec.typography?.headingWeight || '700')} / Body {String(spec.typography?.bodyWeight || '400')}</p>
      </div>

      {/* Keywords */}
      <div className="flex flex-wrap gap-1 mb-4">
        {(Array.isArray(spec.vibe?.keywords) ? spec.vibe.keywords : []).slice(0, 4).map((kw: unknown, i: number) => (
          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{String(kw)}</span>
        ))}
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${confidence >= 80 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${confidence}%` }} />
        </div>
        <span className="text-xs text-gray-500">{confidence}%</span>
      </div>
    </div>
  );
}

function DiffSection({ left, right }: { left: StyleSpecV1; right: StyleSpecV1 }) {
  const diffs: { label: string; left: string; right: string; same: boolean }[] = [];

  // Color diff
  const leftPrimary = String(left.colors?.primary?.[0] || '');
  const rightPrimary = String(right.colors?.primary?.[0] || '');
  diffs.push({ label: '主色', left: leftPrimary, right: rightPrimary, same: leftPrimary === rightPrimary });

  // Font diff
  const leftFont = String(left.typography?.suggestedFonts?.[0] || '');
  const rightFont = String(right.typography?.suggestedFonts?.[0] || '');
  diffs.push({ label: '字体', left: leftFont, right: rightFont, same: leftFont === rightFont });

  // Density diff
  diffs.push({
    label: '密度',
    left: String(left.spacing?.density || 'comfortable'),
    right: String(right.spacing?.density || 'comfortable'),
    same: String(left.spacing?.density) === String(right.spacing?.density),
  });

  // Radius diff
  diffs.push({
    label: '圆角',
    left: String(left.radius?.style || 'subtle'),
    right: String(right.radius?.style || 'subtle'),
    same: String(left.radius?.style) === String(right.radius?.style),
  });

  // Shadow diff
  diffs.push({
    label: '阴影',
    left: String(left.shadow?.style || 'soft'),
    right: String(right.shadow?.style || 'soft'),
    same: String(left.shadow?.style) === String(right.shadow?.style),
  });

  // Vibe diff
  const leftKw = (Array.isArray(left.vibe?.keywords) ? left.vibe.keywords : []).join(', ');
  const rightKw = (Array.isArray(right.vibe?.keywords) ? right.vibe.keywords : []).join(', ');
  diffs.push({ label: '关键词', left: leftKw, right: rightKw, same: leftKw === rightKw });

  return (
    <div className="col-span-2 border border-gray-200 rounded-xl p-6 mt-2">
      <h3 className="text-lg font-bold mb-4">差异对比</h3>
      <div className="space-y-3">
        {diffs.map((diff) => (
          <div key={diff.label} className={`grid grid-cols-[120px_1fr_1fr] gap-4 p-3 rounded-lg text-sm ${diff.same ? 'bg-gray-50' : 'bg-yellow-50 border border-yellow-200'}`}>
            <span className="font-medium text-gray-700">{diff.label}</span>
            <span className={!diff.same ? 'text-yellow-800 font-medium' : 'text-gray-600'}>{diff.left || '—'}</span>
            <span className={!diff.same ? 'text-yellow-800 font-medium' : 'text-gray-600'}>{diff.right || '—'}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">高亮行 = 有差异的字段</p>
    </div>
  );
}
