import { NextResponse } from 'next/server';

// Static demo data — no filesystem/edge incompatibility
const DEMO_STYLES = [
  { id: 'demo-linear', title: 'Linear', keywords: ['minimal','dark','developer-tool','clean','modern','dense'], primary: '#5e6ad2', bg: '#0a0a0a', confidence: 95, vibe: 'Dark, minimal SaaS app with tight spacing and purple accents.' },
  { id: 'demo-stripe', title: 'Stripe', keywords: ['professional','payment','clean','gradient','corporate','trustworthy'], primary: '#635bff', bg: '#ffffff', confidence: 95, vibe: 'Clean, professional fintech design with purple-to-blue gradients.' },
  { id: 'demo-apple', title: 'Apple', keywords: ['luxury','minimal','premium','photography','cinematic','iconic'], primary: '#0071e3', bg: '#000000', confidence: 95, vibe: 'Ultra-premium, photography-driven design with massive hero images.' },
  { id: 'demo-vercel', title: 'Vercel', keywords: ['dark-mode','developer','clean','gradient','modern','tech'], primary: '#ffffff', bg: '#000000', confidence: 95, vibe: 'Dark-first developer platform with blue-to-purple gradient accents.' },
  { id: 'demo-notion', title: 'Notion', keywords: ['warm','document','editorial','organic','clean','productive'], primary: '#2383e2', bg: '#ffffff', confidence: 95, vibe: 'Warm, document-centric design with paper-like off-white background.' },
  { id: 'demo-tailwindcss', title: 'Tailwind CSS', keywords: ['developer','utility-first','dark','code','documentation','modern'], primary: '#38bdf8', bg: '#0f172a', confidence: 95, vibe: 'Dark documentation site with sky-blue primary and indigo accents.' },
  { id: 'demo-github', title: 'GitHub', keywords: ['developer','code','repository','functional','dense','monochrome'], primary: '#58a6ff', bg: '#0d1117', confidence: 95, vibe: 'Functional dark-mode developer platform. Dense information layout.' },
  { id: 'demo-framer', title: 'Framer', keywords: ['creative','design-tool','animation','modern','playful','showcase'], primary: '#0055ff', bg: '#ffffff', confidence: 95, vibe: 'Creative design tool with bold blue primary and playful animations.' },
];

export async function GET() {
  return NextResponse.json({ styles: DEMO_STYLES });
}
