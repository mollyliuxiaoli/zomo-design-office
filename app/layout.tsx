import type { Metadata } from "next";
import "./globals.css";

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Distill';
const brandDomain = process.env.NEXT_PUBLIC_BRAND_DOMAIN || 'distill.style';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${brandDomain}`),
  title: {
    default: `${brandName} — Visual Style Compiler`,
    template: `%s | ${brandName}`,
  },
  description: 'Extract design DNA from any website or image. Get Tailwind configs, CSS variables, shadcn/ui themes, and AI restoration prompts.',
  keywords: ['design system', 'style extraction', 'tailwind', 'css variables', 'shadcn', 'design tokens', 'visual style', 'AI design'],
  authors: [{ name: brandName }],
  openGraph: {
    title: `${brandName} — Visual Style Compiler`,
    description: 'Extract design DNA from any website or image. Get Tailwind, CSS, and shadcn/ui themes instantly.',
    url: `https://${brandDomain}`,
    siteName: brandName,
    type: 'website',
    images: [
      {
        url: `https://${brandDomain}/api/og?title=${encodeURIComponent(brandName)}&keywords=design,style,extract&primary=%232563eb&bg=%23ffffff&confidence=95&vibe=${encodeURIComponent('Visual style compiler for designers and developers')}`,
        width: 1200,
        height: 630,
        alt: brandName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${brandName} — Visual Style Compiler`,
    description: 'Extract design DNA from any website or image.',
    images: [`https://${brandDomain}/api/og?title=${encodeURIComponent(brandName)}&primary=%232563eb&bg=%23ffffff&confidence=95&vibe=Visual+style+compiler`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: `https://${brandDomain}`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
