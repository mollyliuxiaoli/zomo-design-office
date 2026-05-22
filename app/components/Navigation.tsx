'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/library', label: 'Library' },
    { href: '/analyze', label: 'Analyze' },
    { href: '/styles/linear-app', label: 'Styles' },
    { href: '/compare', label: 'Compare' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Map sub-routes to parent nav item
  const activeNav = (() => {
    if (pathname.startsWith('/style/')) return '/library';
    if (pathname.startsWith('/styles/')) return pathname;
    return pathname;
  })();

  return (
    <nav className="bg-white border-b border-zinc-200/80 backdrop-blur-sm bg-opacity-80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="text-xl font-bold text-zinc-950 tracking-tight hover:text-zinc-800 transition-colors active:scale-[0.98]"
            >
              Distill
            </Link>
            <div className="hidden md:flex space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-all relative ${
                    isActive(item.href) || activeNav === item.href
                      ? 'text-zinc-950'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {item.label}
                  {(isActive(item.href) || activeNav === item.href) && (
                    <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-zinc-950" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile menu */}
          <div className="flex md:hidden space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.href) ? 'text-zinc-950' : 'text-zinc-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
