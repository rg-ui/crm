"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { Search, BarChart2, Calendar, Users, Settings, Target, Clock, DollarSign, CheckCircle, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';

type Action = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'navigate' | 'create' | 'action';
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toggle = useCallback(() => {
    setOpen(o => !o);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, toggle]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const createGoal = useCallback(() => {
    const title = prompt('Enter goal title:');
    if (!title?.trim()) return;
    fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        priority: 'medium',
        user_id: DEFAULT_USER_ID,
        status: 'pending',
        progress: 0,
      }),
    }).then(() => {
      setOpen(false);
      router.refresh();
    }).catch(console.error);
  }, [router]);

  const actions: Action[] = [
    { id: 'nav-dash', label: 'Dashboard', description: 'Go to Dashboard', icon: <BarChart2 size={16} />, action: () => { router.push('/'); setOpen(false); }, category: 'navigate' },
    { id: 'nav-cal', label: 'Calendar & Goals', description: 'View daily timeline and goals', icon: <Calendar size={16} />, action: () => { router.push('/calendar'); setOpen(false); }, category: 'navigate' },
    { id: 'nav-team', label: 'Team Directory', description: 'Browse team members', icon: <Users size={16} />, action: () => { router.push('/team'); setOpen(false); }, category: 'navigate' },
    { id: 'nav-settings', label: 'Settings', description: 'Manage workspaces and preferences', icon: <Settings size={16} />, action: () => { router.push('/settings'); setOpen(false); }, category: 'navigate' },
    { id: 'add-goal', label: 'Add Daily Goal', description: 'Quickly create a new goal', icon: <Target size={16} />, action: () => { createGoal(); }, category: 'create' },
    { id: 'add-event', label: 'Add Event to Timeline', description: 'Schedule an event for today', icon: <Clock size={16} />, action: () => { router.push('/calendar'); setOpen(false); setTimeout(() => document.querySelector<HTMLButtonElement>('.btn-primary')?.click(), 100); }, category: 'create' },
    { id: 'add-expense', label: 'Add Expense', description: 'Log a new business expense', icon: <DollarSign size={16} />, action: () => { router.push('/settings'); setOpen(false); }, category: 'create' },
    { id: 'goals-today', label: 'Show Today\'s Goals', description: 'Jump to your active goals', icon: <CheckCircle size={16} />, action: () => { router.push('/calendar'); setOpen(false); }, category: 'action' },
  ];

  const filtered = query.trim()
    ? actions.filter(a => {
        const q = query.toLowerCase();
        return a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
      })
    : actions;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 'clamp(60px, 12vh, 120px) clamp(12px, 3vw, 24px)',
        background: 'rgba(14, 16, 21, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="glass-panel"
        style={{
          width: 'min(560px, 100%)',
          maxHeight: 'min(420px, 80vh)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: 'clamp(12px, 2vw, 16px) clamp(16px, 3vw, 20px)', borderBottom: '1px solid var(--surface-border)' }}>
          <Search size={20} className="text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, create goals, take action..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 'clamp(0.875rem, 3vw, 1rem)',
              fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: '0.65rem',
            color: 'var(--text-secondary)',
            background: 'var(--surface-border)',
            padding: '3px 8px',
            borderRadius: '4px',
            border: '1px solid var(--surface-border)',
            flexShrink: 0,
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {filtered.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '32px 0' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {(['navigate', 'create', 'action'] as const).map(category => {
            const items = filtered.filter(a => a.category === category);
            if (items.length === 0) return null;
            const label = category === 'navigate' ? 'Navigate' : category === 'create' ? 'Create' : 'Actions';
            return (
              <div key={category}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px 4px', fontWeight: 600 }}>{label}</div>
                {items.map(item => {
                  const idx = filtered.indexOf(item);
                  return <PaletteItem key={item.id} item={item} selected={selectedIndex === idx} onClick={item.action} />;
                })}
              </div>
            );
          })}
        </div>

        {/* Footer Hints */}
        <div style={{ padding: 'clamp(8px, 1.5vw, 10px) clamp(16px, 3vw, 20px)', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: 'clamp(12px, 3vw, 20px)', fontSize: '0.7rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ArrowUp size={12} /><ArrowDown size={12} /> Navigate</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CornerDownLeft size={12} /> Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

function PaletteItem({ item, selected, onClick }: { item: Action; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={e => { /* noop */ }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '12px',
        cursor: 'pointer',
        background: selected ? 'var(--accent-dim)' : 'transparent',
        border: selected ? '1px solid var(--accent-primary)' : '1px solid transparent',
        transition: 'all 0.1s',
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0, width: '24px', textAlign: 'center' }}>{item.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '0.88rem', color: selected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{item.label}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.description}</div>
      </div>
      {item.category === 'navigate' && (
        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', background: 'var(--surface-border)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
          Page
        </span>
      )}
    </div>
  );
}
