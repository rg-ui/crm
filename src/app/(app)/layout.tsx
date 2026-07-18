"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';

import { Home, Calendar, Users, Settings } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: <Home size={22} /> },
  { name: 'Calendar', href: '/calendar', icon: <Calendar size={22} /> },
  { name: 'Team', href: '/team', icon: <Users size={22} /> },
  { name: 'Settings', href: '/settings', icon: <Settings size={22} /> },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <div className="app-layout">
        {/* Mobile sidebar overlay */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={closeSidebar}
        />

        {/* Mobile sidebar drawer */}
        <aside
          className={`sidebar-drawer${sidebarOpen ? ' open' : ''}`}
          role="navigation"
          aria-label="Main navigation"
        >
          <Sidebar onNavigate={closeSidebar} />
        </aside>

        {/* Desktop sidebar */}
        <aside className="desktop-sidebar glass-panel" style={{ width: 'var(--sidebar-width)', margin: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden', height: 'calc(100vh - 32px)' }}>
          <Sidebar onNavigate={() => {}} />
        </aside>

        <main className="app-main">
          {/* Mobile header */}
          <header
            className="mobile-header"
            style={{
              display: 'none',
              position: 'sticky',
              top: 0,
              zIndex: 50,
              height: 'var(--header-height)',
              padding: '0 16px',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--surface-border)',
              background: 'rgba(14, 16, 21, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              paddingTop: 'env(safe-area-inset-top)',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', margin: '0 auto' }}>StartupOS</span>
          </header>

          <div className="app-content" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="mobile-nav" role="navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`mobile-nav-item${pathname === item.href ? ' active' : ''}`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      <CommandPalette />
    </>
  );
}