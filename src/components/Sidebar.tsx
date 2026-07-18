"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Users, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DEFAULT_USER_ID, DEFAULT_USER_NAME, DEFAULT_USER_ROLE } from '@/lib/constants';

interface SidebarProps {
  onNavigate: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{ full_name: string; role_title?: string } | null>(null);

  useEffect(() => {
    fetch(`/api/profiles?id=${DEFAULT_USER_ID}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.full_name) setProfile(data);
      })
      .catch(() => {});
  }, []);

  const displayName = profile?.full_name || DEFAULT_USER_NAME;
  const displayRole = profile?.role_title || DEFAULT_USER_ROLE;
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={20} /> },
    { name: 'Calendar', path: '/calendar', icon: <Calendar size={20} /> },
    { name: 'Team', path: '/team', icon: <Users size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          StartupOS
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>Workspace Management</p>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {links.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link
              key={link.name}
              href={link.path}
              onClick={onNavigate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s ease',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span aria-hidden="true" style={{ fontSize: '1.125rem' }}>{link.icon}</span>
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="glass-card" style={{ padding: '16px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem', color: '#0E1015', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayRole}</div>
          </div>
        </div>
      </div>
    </div>
  );
}