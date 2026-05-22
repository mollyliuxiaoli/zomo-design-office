'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/library', label: '库' },
  { href: '/analyze', label: '分析' },
  { href: '/styles/linear-app', label: '案例' },
  { href: '/compare', label: '对比' },
];

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const activeNav = (() => {
    if (pathname.startsWith('/style/')) return '/library';
    if (pathname.startsWith('/styles/')) return pathname;
    return pathname;
  })();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/"
              aria-label="Distill 首页"
              className="group flex items-center gap-2 text-xl font-black tracking-tight text-zinc-950 transition hover:text-zinc-800 active:scale-[0.98]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-sm font-black text-white transition group-hover:rotate-[-3deg]">D</span>
              <span>Distill</span>
            </Link>

            <div className="hidden items-center gap-1 rounded-full bg-zinc-100 p-1 md:flex">
              {navItems.map((item) => {
                const active = isActive(item.href) || activeNav === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'bg-white text-zinc-950 shadow-sm'
                        : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-950'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex max-w-[50vw] items-center gap-1 overflow-x-auto rounded-full bg-zinc-100 p-1 md:hidden">
              {navItems.map((item) => {
                const active = isActive(item.href) || activeNav === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <Link
              href="/analyze"
              className="hidden rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 active:scale-[0.98] sm:inline-flex"
            >
              上传截图
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
