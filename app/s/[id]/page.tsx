import { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'Distill — Shared Style',
    description: 'A visual design style extracted and shared via Distill',
    openGraph: {
      title: 'Distill — Shared Style',
      description: 'Visual style analysis powered by AI',
      images: [`/api/og?name=Shared%20Style&confidence=85`],
    },
  };
}

export default function SharePage() {
  return <ShareClient />;
}

import ShareClient from './ShareClient';
