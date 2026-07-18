"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { Moon, CheckSquare, Clock, X, Circle, AlertTriangle, Plus } from 'lucide-react';

type TomorrowTask = {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
};

type AddForm = {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
};

const DEFAULT_FORM: AddForm = { title: '', description: '', priority: 'medium' };

const PRIORITY_CONFIG = {
  high: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', label: <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Circle size={10} fill="currentColor" /> High</span> },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Circle size={10} fill="currentColor" /> Medium</span> },
  low: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', label: <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Circle size={10} fill="currentColor" /> Low</span> },
};

export default function TomorrowPlan() {
  const [tasks, setTasks] = useState<TomorrowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowLabel = tomorrow.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    try {
      const res = await fetch(`/api/tomorrow-plan?user_id=${DEFAULT_USER_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tasks');
      setTasks(data || []);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('relation') || msg.includes('does not exist')) {
        setDbError('DATABASE_TABLES_MISSING');
      } else if (msg.includes('fetch failed') || msg.includes('NetworkError') || msg.includes('ECONNREFUSED')) {
        setDbError('DATABASE_UNREACHABLE');
      } else {
        setDbError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tomorrow-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, description: form.description, priority: form.priority, user_id: DEFAULT_USER_ID }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks(prev => [...prev, data]);
      setForm(DEFAULT_FORM);
      setShowModal(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tomorrow-plan?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const completionPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const fieldStyle: React.CSSProperties = {
    background: 'var(--surface-secondary)',
    border: '1px solid var(--surface-border)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <>
      <div
        style={{
          background: 'var(--surface-primary)',
          border: '1px solid var(--surface-border)',
          borderRadius: '24px',
          padding: 'clamp(16px, 2vw, 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(198, 244, 50, 0.05)', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Moon size={20} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Tomorrow's Plan</h3>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.8)' }}>{tomorrowLabel}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'var(--accent-primary)',
              color: '#0E1015',
              padding: '8px 16px',
              borderRadius: '99px',
              fontWeight: 600,
              boxShadow: '0 4px 12px var(--accent-glow)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              flexShrink: 0,
              minHeight: '36px',
            }}
          >
            <Plus size={16} /> Plan Task
          </button>
        </div>

        {totalCount > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <span>{completedCount}/{totalCount} tasks planned</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{completionPct}% ready</span>
            </div>
            <div style={{ height: '6px', background: 'var(--surface-border)', borderRadius: '99px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${completionPct}%`,
                  background: 'var(--accent-primary)',
                  borderRadius: '99px',
                  transition: 'width 0.5s ease',
                  boxShadow: completionPct > 0 ? '0 0 12px var(--accent-glow)' : 'none',
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: 'clamp(240px, 40vh, 340px)', paddingRight: '2px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2].map(i => (
                <div key={i} className="animate-shimmer" style={{ height: '60px', background: 'var(--surface-border)', borderRadius: '10px' }} />
              ))}
            </div>
          )}

          {dbError === 'DATABASE_TABLES_MISSING' && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px', fontSize: '0.78rem', color: '#fca5a5' }}>
              <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Goals table missing. Run supabase-schema.sql to enable.
            </div>
          )}

          {dbError === 'DATABASE_UNREACHABLE' && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '14px', fontSize: '0.78rem', color: '#fcd34d' }}>
              <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Database unreachable. Your Supabase project may be paused — <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#fcd34d', textDecoration: 'underline' }}>resume it here</a>.
            </div>
          )}

          {!loading && !dbError && tasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'rgba(148,163,184,0.6)' }}>
              <div style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}><CheckSquare size={32} /></div>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>No tasks planned yet.<br />Start planning your tomorrow!</p>
            </div>
          )}

          {tasks.map(task => {
            const pc = PRIORITY_CONFIG[task.priority];
            return (
              <div
                key={task.id}
                style={{
                  padding: '10px 12px',
                  background: pc.bg,
                  border: `1px solid ${pc.border}`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  opacity: deletingId === task.id ? 0.4 : 1,
                  transform: deletingId === task.id ? 'scale(0.97)' : 'scale(1)',
                  touchAction: 'manipulation',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pc.color, flexShrink: 0, boxShadow: `0 0 6px ${pc.color}` }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.description}
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '0.65rem', color: pc.color, background: `${pc.color}15`, padding: '2px 7px', borderRadius: '99px', border: `1px solid ${pc.color}30`, fontWeight: 600, flexShrink: 0 }}>
                  {task.priority}
                </span>

                <button
                  onClick={(e) => handleDelete(task.id, e)}
                  style={{ color: 'rgba(148,163,184,0.4)', fontSize: '1rem', padding: '2px 6px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, minHeight: '32px', minWidth: '32px' }}
                  aria-label="Remove task"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {totalCount > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['high', 'medium', 'low'] as const).map(p => {
              const count = tasks.filter(t => t.priority === p).length;
              if (count === 0) return null;
              const pc = PRIORITY_CONFIG[p];
              return (
                <span key={p} style={{ fontSize: '0.68rem', color: pc.color, background: pc.bg, padding: '3px 10px', borderRadius: '99px', border: `1px solid ${pc.border}`, fontWeight: 600 }}>
                  {count} {p}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', padding: '16px',
            WebkitBackdropFilter: 'blur(6px)', touchAction: 'none',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="glass-panel modal-content"
            style={{
              width: 'min(460px, 100%)',
              padding: 'clamp(20px, 4vw, 32px)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0E1015' }}><Moon size={18} /></div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Plan for Tomorrow</h3>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '6px', paddingLeft: '42px' }}>{tomorrowLabel}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ padding: '4px 8px', minWidth: 'auto', minHeight: 'auto' }}><X size={20} /></button>
            </div>

            <div>
              <label className="label" style={{ marginBottom: '8px' }}>Task Title *</label>
              <input
                type="text"
                placeholder="e.g. Review Q3 metrics, Write proposal…"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && form.title.trim()) handleAdd(); }}
              />
            </div>

            <div>
              <label className="label" style={{ marginBottom: '8px' }}>Note (optional)</label>
              <textarea
                placeholder="Any details, links, or context…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="input"
                style={{ resize: 'none', lineHeight: 1.5 }}
              />
            </div>

            <div>
              <label className="label" style={{ marginBottom: '10px' }}>Priority</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['high', 'medium', 'low'] as const).map(p => {
                  const pc = PRIORITY_CONFIG[p];
                  const isSelected = form.priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        background: isSelected ? pc.bg : 'var(--surface-secondary)',
                        border: isSelected ? `2px solid ${pc.color}` : '1px solid var(--surface-border)',
                        color: isSelected ? pc.color : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        minHeight: '44px',
                      }}
                    >
                      {pc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
                style={{ flex: '1 1 120px', padding: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.title.trim()}
                className="btn-primary"
                style={{ flex: '2 1 200px', padding: '12px', opacity: saving ? 0.7 : (!form.title.trim() ? 0.5 : 1) }}
              >
                {saving ? <><Clock size={16} className="animate-spin" /> Saving…</> : <><Moon size={16} /> Add to Plan</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}