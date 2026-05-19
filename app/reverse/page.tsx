import { permanentRedirect } from 'next/navigation';

export default function ReversePage() {
  permanentRedirect('/analyze');
}
