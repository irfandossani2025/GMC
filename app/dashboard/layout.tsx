'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClinicLogo } from '@/components/branding/ClinicLogo';
import { postJson } from '@/lib/api-client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await postJson('/api/auth/logout');
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Scan', href: '/dashboard/scan' },
    { label: 'Patients', href: '/dashboard/members' },
    { label: 'Treatments', href: '/dashboard/treatments' },
    { label: 'Cards', href: '/dashboard/cards' },
    { label: 'Reports', href: '/dashboard/reports' },
	  { label: 'Sessions', href: '/dashboard/sessions' },
	  { label: 'Users', href: '/dashboard/users' },
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[5rem] items-center justify-between gap-4 py-3">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link href="/dashboard" className="block">
                <ClinicLogo compact />
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-primary/20 hover:text-primary"
              >
                Logout
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-full border border-slate-200 p-2 text-slate-600 hover:text-slate-900 md:hidden"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          {isMenuOpen && (
            <div className="space-y-2 pb-4 md:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-primary text-white'
                      : 'bg-slate-50 text-slate-700'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="page-shell">
        {children}
      </main>
    </div>
  );
}
