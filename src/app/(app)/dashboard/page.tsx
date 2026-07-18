"use client";

import React, { useState, useEffect } from 'react';
import CustomCalendar from '@/components/CustomCalendar';
import { DEFAULT_USER_NAME, DEFAULT_USER_ID } from '@/lib/constants';
import { Sun, CheckCircle, Target, Sparkles, Thermometer, Sprout, X, RefreshCw, AlertTriangle } from 'lucide-react';
import TomorrowPlan from '@/components/TomorrowPlan';

type GrowthItem = {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
};

type WorkspaceStat = {
  id: string; name: string; color: string; completed: number; total: number;
};

type Morale = {
  average: number; highWorkloadCount: number;
};

type OKR = {
  id: string; objective: string; progress: number; workspace_id?: string;
};

type DashboardData = {
  workspaceStats: WorkspaceStat[];
  morale: Morale;
  brief: string;
  okrs: OKR[];
};

type Workspace = {
  id: string; name: string; color: string;
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px',
  display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em',
};

const FIELD_STYLE: React.CSSProperties = {
  background: 'var(--surface-secondary)', border: '1px solid var(--surface-border)',
  borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)',
  fontSize: '0.875rem', width: '100%', outline: 'none', fontFamily: 'inherit',
  resize: 'vertical',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const [showStandup, setShowStandup] = useState(false);
  const [standupForm, setStandupForm] = useState({
    accomplished: '', plan_for_tomorrow: '', blockers: '', morale_score: 4, workspace_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [standupMsg, setStandupMsg] = useState('');
  const [standupDone, setStandupDone] = useState(false);

  const [aiBrief, setAiBrief] = useState('');
  const [aiBriefLoading, setAiBriefLoading] = useState(true);
  const [aiBriefSource, setAiBriefSource] = useState<'gemini' | 'fallback' | ''>('');

  const [growthItems, setGrowthItems] = useState<GrowthItem[]>([]);
  const [growthLoading, setGrowthLoading] = useState(true);
  const [newGrowthTitle, setNewGrowthTitle] = useState('');
  const [addingGrowth, setAddingGrowth] = useState(false);
  const [showGrowthInput, setShowGrowthInput] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    fetchData();
    fetchWorkspaces();
    checkStandup();
    fetchAiBrief();
    fetchGrowthItems();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/dashboard-summary?user_id=${DEFAULT_USER_ID}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const json = await res.json();
      if (Array.isArray(json)) setWorkspaces(json);
    } catch { /* ignore */ }
  };

  const checkStandup = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/standups?date=${today}&user_id=${DEFAULT_USER_ID}`);
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) setStandupDone(true);
    } catch { /* ignore */ }
  };

  const fetchAiBrief = async () => {
    setAiBriefLoading(true);
    try {
      const res = await fetch(`/api/ai-brief?user_id=${DEFAULT_USER_ID}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAiBrief(json.brief || '');
      setAiBriefSource(json.source || 'fallback');
    } catch {
      setAiBrief('Unable to generate AI brief. Submit a standup to enable.');
    } finally {
      setAiBriefLoading(false);
    }
  };

  const fetchGrowthItems = async () => {
    setGrowthLoading(true);
    try {
      const res = await fetch(`/api/personal-growth?user_id=${DEFAULT_USER_ID}`);
      const json = await res.json();
      if (Array.isArray(json)) setGrowthItems(json);
    } catch { /* ignore */ } finally {
      setGrowthLoading(false);
    }
  };

  const handleToggleGrowth = async (item: GrowthItem) => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    setGrowthItems(prev => prev.map(g => g.id === item.id ? { ...g, status: newStatus } : g));
    try {
      await fetch('/api/personal-growth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: newStatus }),
      });
    } catch { /* optimistic update already applied */ }
  };

  const handleAddGrowth = async () => {
    if (!newGrowthTitle.trim()) return;
    setAddingGrowth(true);
    try {
      const res = await fetch('/api/personal-growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newGrowthTitle.trim(), user_id: DEFAULT_USER_ID }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setGrowthItems(prev => [...prev, json]);
      setNewGrowthTitle('');
      setShowGrowthInput(false);
    } catch { /* ignore */ } finally {
      setAddingGrowth(false);
    }
  };

  const handleDeleteGrowth = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGrowthItems(prev => prev.filter(g => g.id !== id));
    try {
      await fetch(`/api/personal-growth?id=${id}`, { method: 'DELETE' });
    } catch { /* ignore */ }
  };

  const submitStandup = async () => {
    if (!standupForm.accomplished.trim()) return;
    setSubmitting(true);
    setStandupMsg('');
    try {
      const res = await fetch('/api/standups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: DEFAULT_USER_ID,
          workspace_id: standupForm.workspace_id || workspaces[0]?.id || null,
          accomplished: standupForm.accomplished.trim(),
          plan_for_tomorrow: standupForm.plan_for_tomorrow.trim(),
          blockers: standupForm.blockers.trim(),
          morale_score: standupForm.morale_score,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStandupMsg('✅ Standup submitted! Dashboard updated.');
      setStandupDone(true);
      fetchData();
      fetchAiBrief();
      setTimeout(() => { setShowStandup(false); setStandupMsg(''); }, 1500);
    } catch (err: any) {
      setStandupMsg(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const MORALE_EMOJIS = ['😢', '😟', '😐', '🙂', '😄'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 3vw, 32px)' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header-row">
          <div>
            <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{greeting}, {DEFAULT_USER_NAME}! <Sun size={24} className="text-warning" /></h2>
            <p className="page-subtitle">Here&apos;s what&apos;s happening across your startups today.</p>
          </div>
          <div className="btn-group">
            <button
              className="btn-secondary"
              onClick={() => setShowStandup(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {standupDone ? <><CheckCircle size={16} /> Standup Done</> : <><Sun size={16} /> Submit Standup</>}
            </button>
            <button
              className="btn-primary"
              onClick={async () => {
                const title = prompt('Enter goal title:');
                if (!title?.trim()) return;
                try {
                  await fetch('/api/goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: title.trim(), priority: 'medium', user_id: DEFAULT_USER_ID, status: 'pending', progress: 0 }),
                  });
                  fetchData();
                } catch {}
              }}
            >
              <Target size={16} /> Add Daily Goal
            </button>
          </div>
        </div>
      </header>

      {standupMsg && (
        <div className="animate-fade-in-up" style={{
          padding: 'clamp(10px, 2vw, 14px) clamp(16px, 3vw, 20px)', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 500,
          background: standupMsg.includes('✅') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${standupMsg.includes('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: standupMsg.includes('✅') ? 'var(--success)' : 'var(--danger)',
        }}>
          {standupMsg}
        </div>
      )}

      <div className="dashboard-stats-grid">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                <div style={{ height: '20px', width: '60%', background: 'var(--surface-border)', borderRadius: '4px', marginBottom: '12px' }}></div>
                <div style={{ height: '40px', width: '40%', background: 'var(--surface-border)', borderRadius: '4px' }}></div>
              </div>
            ))}
          </>
        ) : (
          <>
            {data?.workspaceStats?.map(ws => (
              <div key={ws.id} className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: ws.color, flexShrink: 0 }}></span>
                  {ws.name}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700 }}>{ws.completed}/{ws.total}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Goals Completed</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>{ws.completed > 0 ? `+${ws.completed} today` : 'No completions'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Active: —</div>
                  </div>
                </div>
              </div>
            ))}
            {(!data?.workspaceStats || data.workspaceStats.length === 0) && (
              <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>No Workspaces Yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Create a workspace in Settings to start tracking goals.</p>
              </div>
            )}
          </>
        )}

        <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>Burnout Barometer <Thermometer size={18} /></h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
              <span>Team Morale</span>
              <span style={{ color: data?.morale && data.morale.average >= 3 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                {data?.morale ? `${data.morale.average.toFixed(1)}/5` : '—'}
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--surface-border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${data?.morale ? (data.morale.average / 5) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--success), var(--accent-primary))', borderRadius: '4px' }}></div>
            </div>
            {data?.morale && data.morale.highWorkloadCount > 0 ? (
              <div style={{ color: 'var(--warning)', fontSize: '0.75rem', marginTop: '4px' }}>
                <AlertTriangle size={16} /> {data.morale.highWorkloadCount} teammate(s) reported high workload
              </div>
            ) : data?.morale ? (
              <div style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '4px' }}>
                <CheckCircle size={16} /> No workload issues reported today
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)', background: 'var(--surface-primary)', border: '1px solid var(--surface-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} /> AI Executive Brief
              {aiBriefSource === 'gemini' && (
                <span style={{ fontSize: '0.6rem', background: 'rgba(198, 244, 50, 0.15)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(198, 244, 50, 0.3)', fontWeight: 600, letterSpacing: '0.05em' }}>GEMINI</span>
              )}
            </span>
            <button
              onClick={fetchAiBrief}
              disabled={aiBriefLoading}
              className="btn-ghost"
              style={{ fontSize: '0.7rem', padding: '4px 10px', opacity: aiBriefLoading ? 0.5 : 1 }}
            >
              {aiBriefLoading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
          </h3>
          {aiBriefLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="animate-shimmer" style={{ height: '12px', background: 'var(--surface-border)', borderRadius: '4px' }} />
              <div className="animate-shimmer" style={{ height: '12px', width: '80%', background: 'var(--surface-border)', borderRadius: '4px' }} />
              <div className="animate-shimmer" style={{ height: '12px', width: '60%', background: 'var(--surface-border)', borderRadius: '4px' }} />
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
              {aiBrief || 'No data available. Submit a standup to generate your AI brief.'}
            </p>
          )}
        </div>
      </div>

      <div className="calendar-sidebar-grid">
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <CustomCalendar />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 24px)' }}>
          <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>Company OKRs <Target size={18} /></h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data?.okrs?.length ? data.okrs.map(okr => (
                <div key={okr.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{okr.objective}</span>
                    <span style={{ flexShrink: 0, marginLeft: '8px' }}>{okr.progress}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--surface-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${okr.progress}%`, background: 'var(--accent-primary)', borderRadius: '3px' }}></div>
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No OKRs defined yet.</p>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)', flex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Personal Growth <Sprout size={18} />
              <button
                onClick={() => setShowGrowthInput(v => !v)}
                className="btn-ghost"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                + Add
              </button>
            </h3>

            {showGrowthInput && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={newGrowthTitle}
                  onChange={e => setNewGrowthTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddGrowth(); if (e.key === 'Escape') { setShowGrowthInput(false); setNewGrowthTitle(''); } }}
                  placeholder="New habit or goal..."
                  autoFocus
                  className="input"
                  style={{ flex: 1, minHeight: '40px', padding: '8px 12px', fontSize: '0.82rem' }}
                />
                <button
                  onClick={handleAddGrowth}
                  disabled={addingGrowth || !newGrowthTitle.trim()}
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: '0.8rem', minHeight: '40px', opacity: (!newGrowthTitle.trim() || addingGrowth) ? 0.5 : 1 }}
                >
                  {addingGrowth ? '...' : 'Add'}
                </button>
              </div>
            )}

            {growthLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2].map(i => <div key={i} className="animate-shimmer" style={{ height: '36px', background: 'var(--surface-border)', borderRadius: '8px' }} />)}
              </div>
            ) : growthItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <div style={{ marginBottom: '6px', color: 'var(--success)' }}><Sprout size={24} /></div>
                No habits yet. Click + Add to start tracking.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {growthItems.map(item => (
                  <li
                    key={item.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: item.status === 'completed' ? 'rgba(16,185,129,0.06)' : 'var(--surface-secondary)', border: item.status === 'completed' ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--surface-border)', cursor: 'pointer', transition: 'all 0.2s', touchAction: 'manipulation' }}
                    onClick={() => handleToggleGrowth(item)}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: item.status === 'completed' ? 'none' : '2px solid var(--surface-border)', background: item.status === 'completed' ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.status === 'completed' && <span style={{ fontSize: '0.65rem', color: 'white' }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '0.875rem', flex: 1, textDecoration: item.status === 'completed' ? 'line-through' : 'none', color: item.status === 'completed' ? 'var(--success)' : 'var(--text-primary)' }}>
                      {item.title}
                    </span>
                    <button
                      onClick={e => handleDeleteGrowth(item.id, e)}
                      className="btn-ghost"
                      style={{ color: 'rgba(148,163,184,0.3)', fontSize: '0.9rem', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, minHeight: 'auto', minWidth: 'auto' }}
                      aria-label="Delete growth item"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Standup Modal */}
      {showStandup && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(14, 16, 21, 0.8)', backdropFilter: 'blur(8px)', padding: '16px',
            WebkitBackdropFilter: 'blur(8px)', touchAction: 'none',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowStandup(false); }}
        >
          <div className="glass-panel modal-content" style={{
            width: 'min(520px, 100%)', maxHeight: '90vh', padding: 'clamp(20px, 4vw, 32px)',
            display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.5)', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sun size={20} /> Daily Standup
                {standupDone && <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500, background: 'rgba(16,185,129,0.12)', padding: '2px 10px', borderRadius: '12px' }}>Done</span>}
              </h3>
              <button
                onClick={() => setShowStandup(false)}
                className="btn-ghost"
                style={{ fontSize: '1.5rem', lineHeight: 1, padding: '4px 8px', minWidth: 'auto', minHeight: 'auto' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '-8px' }}>
              What did you accomplish? What&apos;s next? Any blockers?
            </p>

            <div>
              <label style={LABEL_STYLE}>Accomplished Today *</label>
              <textarea rows={3} placeholder="Finished API integration, reviewed 3 PRs..."
                value={standupForm.accomplished}
                onChange={e => setStandupForm(f => ({ ...f, accomplished: e.target.value }))}
                style={FIELD_STYLE} autoFocus />
            </div>

            <div>
              <label style={LABEL_STYLE}>Plan for Tomorrow</label>
              <textarea rows={2} placeholder="Start on the dashboard redesign..."
                value={standupForm.plan_for_tomorrow}
                onChange={e => setStandupForm(f => ({ ...f, plan_for_tomorrow: e.target.value }))}
                style={FIELD_STYLE} />
            </div>

            <div>
              <label style={LABEL_STYLE}>Blockers / Need Help</label>
              <textarea rows={2} placeholder="Waiting on design assets from the team..."
                value={standupForm.blockers}
                onChange={e => setStandupForm(f => ({ ...f, blockers: e.target.value }))}
                style={FIELD_STYLE} />
            </div>

            <div>
              <label style={LABEL_STYLE}>Workspace</label>
              <select
                value={standupForm.workspace_id}
                onChange={e => setStandupForm(f => ({ ...f, workspace_id: e.target.value }))}
                style={{ ...FIELD_STYLE, appearance: 'none', resize: 'none' }}
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={LABEL_STYLE}>Morale Score</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setStandupForm(f => ({ ...f, morale_score: score }))}
                    style={{
                      padding: 'clamp(8px, 2vw, 10px)',
                      borderRadius: '8px', textAlign: 'center',
                      background: standupForm.morale_score === score ? 'var(--accent-dim)' : 'var(--surface-secondary)',
                      border: standupForm.morale_score === score ? '1px solid var(--accent-primary)' : '1px solid var(--surface-border)',
                      color: standupForm.morale_score === score ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      transition: '0.15s', touchAction: 'manipulation',
                      fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                      minHeight: '44px', minWidth: '44px',
                    }}
                    aria-label={`Morale score ${score}`}
                  >
                    {MORALE_EMOJIS[score - 1]}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', padding: '0 4px' }}>
                <span>Struggling</span>
                <span>Great</span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={submitStandup}
              disabled={submitting || !standupForm.accomplished.trim()}
              style={{ width: '100%', padding: 'clamp(12px, 2vw, 14px)', fontSize: '1rem', opacity: (!standupForm.accomplished.trim() || submitting) ? 0.5 : 1 }}
            >
              {submitting ? 'Submitting…' : standupDone ? 'Update Standup' : 'Submit Standup'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 480px) {
          .btn-group {
            flex-direction: column;
            width: 100%;
          }
          .btn-group .btn-primary,
          .btn-group .btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}