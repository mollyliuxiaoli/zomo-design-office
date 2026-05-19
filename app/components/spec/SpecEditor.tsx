'use client';

import { useState, useCallback } from 'react';
import type { StyleSpecV1 } from '@/app/lib/spec/types';

interface SpecEditorProps {
  spec: StyleSpecV1;
  onChange: (updatedSpec: StyleSpecV1) => void;
}

type EditTab = 'colors' | 'typography' | 'spacing' | 'vibe';

export default function SpecEditor({ spec, onChange }: SpecEditorProps) {
  const [activeTab, setActiveTab] = useState<EditTab>('colors');

  const updateSpec = useCallback((partial: Partial<StyleSpecV1>) => {
    const updated = { ...spec, ...partial };
    onChange(updated);
  }, [spec, onChange]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {(['colors', 'typography', 'spacing', 'vibe'] as EditTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-black text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab === 'vibe' ? '风格' : tab === 'colors' ? '颜色' : tab === 'typography' ? '字体' : '间距/圆角'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'colors' && (
          <ColorsEditor spec={spec} onUpdate={updateSpec} />
        )}
        {activeTab === 'typography' && (
          <TypographyEditor spec={spec} onUpdate={updateSpec} />
        )}
        {activeTab === 'spacing' && (
          <SpacingEditor spec={spec} onUpdate={updateSpec} />
        )}
        {activeTab === 'vibe' && (
          <VibeEditor spec={spec} onUpdate={updateSpec} />
        )}
      </div>
    </div>
  );
}

/** Color array editor */
function ColorsEditor({ spec, onUpdate }: { spec: StyleSpecV1; onUpdate: (p: Partial<StyleSpecV1>) => void }) {
  const colorGroups = [
    { key: 'primary' as const, label: '主色' },
    { key: 'secondary' as const, label: '辅色' },
    { key: 'background' as const, label: '背景色' },
    { key: 'foreground' as const, label: '前景色' },
    { key: 'accent' as const, label: '强调色' },
  ];

  const updateColorArray = (key: keyof typeof spec.colors, index: number, value: string) => {
    const arr = [...(spec.colors[key] as string[])];
    arr[index] = value;
    onUpdate({
      colors: { ...spec.colors, [key]: arr },
    });
  };

  const addColor = (key: keyof typeof spec.colors) => {
    const arr = [...(spec.colors[key] as string[]), '#000000'];
    onUpdate({
      colors: { ...spec.colors, [key]: arr },
    });
  };

  const removeColor = (key: keyof typeof spec.colors, index: number) => {
    const arr = (spec.colors[key] as string[]).filter((_, i) => i !== index);
    onUpdate({
      colors: { ...spec.colors, [key]: arr },
    });
  };

  return (
    <div className="space-y-4">
      {colorGroups.map(({ key, label }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <button
              onClick={() => addColor(key)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              + 添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(spec.colors[key] as string[])?.map((color, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => updateColorArray(key, i, e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => updateColorArray(key, i, e.target.value)}
                  className="w-20 px-1 py-1 text-xs border border-gray-300 rounded font-mono"
                />
                <button
                  onClick={() => removeColor(key, i)}
                  className="text-gray-400 hover:text-red-500 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Typography editor */
function TypographyEditor({ spec, onUpdate }: { spec: StyleSpecV1; onUpdate: (p: Partial<StyleSpecV1>) => void }) {
  return (
    <div className="space-y-4">
      {/* Font style */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">字体风格</label>
        <select
          value={spec.typography.fontStyle}
          onChange={(e) => onUpdate({
            typography: { ...spec.typography, fontStyle: e.target.value as StyleSpecV1['typography']['fontStyle'] },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="sans">Sans-serif</option>
          <option value="serif">Serif</option>
          <option value="mono">Monospace</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      {/* Suggested fonts */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">推荐字体</label>
        <div className="space-y-1">
          {spec.typography.suggestedFonts.map((font, i) => (
            <input
              key={i}
              type="text"
              value={font}
              onChange={(e) => {
                const fonts = [...spec.typography.suggestedFonts];
                fonts[i] = e.target.value;
                onUpdate({ typography: { ...spec.typography, suggestedFonts: fonts } });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder="Font name"
            />
          ))}
        </div>
      </div>

      {/* Scale */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">字号阶梯</label>
        <select
          value={spec.typography.scale}
          onChange={(e) => onUpdate({
            typography: { ...spec.typography, scale: e.target.value as StyleSpecV1['typography']['scale'] },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="compact">紧凑</option>
          <option value="balanced">均衡</option>
          <option value="display">展示</option>
        </select>
      </div>

      {/* Weights */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">标题字重</label>
          <select
            value={spec.typography.headingWeight}
            onChange={(e) => onUpdate({
              typography: { ...spec.typography, headingWeight: e.target.value },
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semibold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extra Bold (800)</option>
            <option value="900">Black (900)</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">正文字重</label>
          <select
            value={spec.typography.bodyWeight}
            onChange={(e) => onUpdate({
              typography: { ...spec.typography, bodyWeight: e.target.value },
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semibold (600)</option>
            <option value="700">Bold (700)</option>
          </select>
        </div>
      </div>

      {/* Line height & letter spacing */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">行高</label>
          <select
            value={spec.typography.lineHeight}
            onChange={(e) => onUpdate({
              typography: { ...spec.typography, lineHeight: e.target.value as StyleSpecV1['typography']['lineHeight'] },
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="compact">紧凑</option>
            <option value="normal">正常</option>
            <option value="relaxed">宽松</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">字距</label>
          <select
            value={spec.typography.letterSpacing}
            onChange={(e) => onUpdate({
              typography: { ...spec.typography, letterSpacing: e.target.value as StyleSpecV1['typography']['letterSpacing'] },
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="tight">紧凑</option>
            <option value="normal">正常</option>
            <option value="wide">宽</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/** Spacing & Radius editor */
function SpacingEditor({ spec, onUpdate }: { spec: StyleSpecV1; onUpdate: (p: Partial<StyleSpecV1>) => void }) {
  return (
    <div className="space-y-4">
      {/* Density */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">间距密度</label>
        <select
          value={spec.spacing.density}
          onChange={(e) => onUpdate({
            spacing: { ...spec.spacing, density: e.target.value as StyleSpecV1['spacing']['density'] },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="compact">紧凑</option>
          <option value="comfortable">舒适</option>
          <option value="spacious">宽敞</option>
        </select>
      </div>

      {/* Base unit */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">基础单位</label>
        <input
          type="text"
          value={spec.spacing.baseUnit || '8px'}
          onChange={(e) => onUpdate({
            spacing: { ...spec.spacing, baseUnit: e.target.value },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
        />
      </div>

      {/* Radius style */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">圆角风格</label>
        <select
          value={spec.radius.style}
          onChange={(e) => onUpdate({
            radius: { ...spec.radius, style: e.target.value as StyleSpecV1['radius']['style'] },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="sharp">直角</option>
          <option value="subtle">微圆</option>
          <option value="rounded">圆角</option>
          <option value="pill">胶囊</option>
        </select>
      </div>

      {/* Shadow style */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">阴影风格</label>
        <select
          value={spec.shadow.style}
          onChange={(e) => onUpdate({
            shadow: { ...spec.shadow, style: e.target.value as StyleSpecV1['shadow']['style'] },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="none">无阴影</option>
          <option value="soft">柔和</option>
          <option value="crisp">清晰</option>
          <option value="dramatic">戏剧化</option>
        </select>
      </div>

      {/* Container */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">容器宽度</label>
        <select
          value={spec.layout.container}
          onChange={(e) => onUpdate({
            layout: { ...spec.layout, container: e.target.value as StyleSpecV1['layout']['container'] },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="narrow">窄</option>
          <option value="medium">中</option>
          <option value="wide">宽</option>
          <option value="full">全宽</option>
        </select>
      </div>
    </div>
  );
}

/** Vibe / keywords editor */
function VibeEditor({ spec, onUpdate }: { spec: StyleSpecV1; onUpdate: (p: Partial<StyleSpecV1>) => void }) {
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !spec.vibe.keywords.includes(kw)) {
      onUpdate({
        vibe: { ...spec.vibe, keywords: [...spec.vibe.keywords, kw] },
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    onUpdate({
      vibe: { ...spec.vibe, keywords: spec.vibe.keywords.filter(k => k !== kw) },
    });
  };

  return (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">风格描述</label>
        <textarea
          value={spec.vibe.description}
          onChange={(e) => onUpdate({
            vibe: { ...spec.vibe, description: e.target.value },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          rows={3}
        />
      </div>

      {/* Keywords */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">关键词标签</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {spec.vibe.keywords.map(kw => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
            >
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="text-gray-400 hover:text-red-500 ml-1"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="输入关键词后按 Enter 添加"
          />
          <button
            onClick={addKeyword}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
