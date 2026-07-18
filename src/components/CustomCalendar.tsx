"use client";

import React, { useState, useEffect } from 'react';
import { DEFAULT_USER_ID, DEFAULT_USER_NAME } from '@/lib/constants';
import { CheckSquare, Brain, Users, Sun, RefreshCw, AlertTriangle, ExternalLink, Play, UploadCloud, Trash, X, Clock } from 'lucide-react';

const PX_PER_HOUR = 60;
const START_HOUR  = 8;

type EventType = 'task' | 'deep_work' | 'meeting' | 'standup';

type CalendarEvent = {
  id: string;
  title: string;
  workspace?: string;
  startTime: string;
  endTime: string;
  top: number;
  height: number;
  colorBg: string;
  colorBorder: string;
  meetLink?: string;
  eventType?: string;
  googleEventId?: string;
};

type EventFromAPI = {
  id: string;
  title: string;
  workspace_id?: string;
  event_type?: string;
  start_time: string;
  end_time: string;
  color?: string;
  meet_link?: string;
  google_event_id?: string;
};

type ModalForm = {
  title: string;
  eventType: string;
  workspaceId: string;
  startTime: string;
  endTime: string;
};

const EVENT_COLORS: Record<string, { bg: string; border: string }> = {
  deep_work: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981' },
  meeting:   { bg: 'rgba(245, 158, 11, 0.15)',  border: '#f59e0b' },
  standup:   { bg: 'rgba(59, 130, 246, 0.15)',  border: '#3b82f6' },
  task:      { bg: 'rgba(198, 244, 50, 0.15)',   border: '#C6F432' },
};

const EVENT_TYPE_LABELS: Record<string, React.ReactNode> = {
  task:      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckSquare size={12} /> Task</span>,
  deep_work: <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Brain size={12} /> Deep Work</span>,
  meeting:   <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> Meeting</span>,
  standup:   <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={12} /> Standup</span>,
};

function hhmm_to_px(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return ((h - START_HOUR) + m / 60) * PX_PER_HOUR;
}

function iso_to_px(iso: string): number {
  const d = new Date(iso);
  return hhmm_to_px(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`);
}

function iso_duration_px(s: string, e: string): number {
  const mins = (new Date(e).getTime() - new Date(s).getTime()) / 60000;
  return Math.max(PX_PER_HOUR * 0.5, (mins / 60) * PX_PER_HOUR);
}

function formatTime12(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function time24to12(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} ${ampm}`;
}

const DEFAULT_FORM: ModalForm = {
  title: '', eventType: 'task', workspaceId: '',
  startTime: '09:00', endTime: '10:00',
};

const HOURS = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM',
];

export default function CustomCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ModalForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      await fetchWorkspaces();
      fetchEvents();
    })();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`/api/workspaces?user_id=${DEFAULT_USER_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch workspaces');
      const list = data || [];
      setWorkspaces(list);
      if (list.length > 0) {
        setForm(f => ({ ...f, workspaceId: list[0].id }));
      }
      return list;
    } catch (err: any) {
      console.error(err);
      return [];
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/events?date=${today}&user_id=${DEFAULT_USER_ID}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      if (Array.isArray(data)) {
        setEvents(data.map(e => {
          const colors = EVENT_COLORS[e.event_type || 'task'] || EVENT_COLORS.task;
          const ws = workspaces.find(w => w.id === e.workspace_id);
          return {
            id: e.id,
            title: e.title,
            workspace: ws ? ws.name : 'Personal',
            startTime: formatTime12(e.start_time),
            endTime:   formatTime12(e.end_time),
            top:    iso_to_px(e.start_time),
            height: iso_duration_px(e.start_time, e.end_time),
            colorBg:     e.color ? `${e.color}25` : colors.bg,
            colorBorder: e.color || colors.border,
            meetLink: e.meet_link || undefined,
            eventType: e.event_type,
            googleEventId: e.google_event_id || undefined,
          };
        }));
      }
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
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.startTime || !form.endTime) return;
    if (form.endTime <= form.startTime) {
      alert('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const startIso = new Date(`${todayStr}T${form.startTime}:00`).toISOString();
      const endIso = new Date(`${todayStr}T${form.endTime}:00`).toISOString();

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          start_time: startIso,
          end_time: endIso,
          event_type: form.eventType,
          workspace_id: form.workspaceId || null,
          user_id: DEFAULT_USER_ID,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchEvents();
      setForm({ ...DEFAULT_FORM, workspaceId: workspaces[0]?.id || '' });
      setShowModal(false);
    } catch (err: any) {
      alert(`Error saving event: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const [eventMenu, setEventMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!eventMenu) return;
    const close = () => setEventMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [eventMenu]);

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/events?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(`Error deleting event: ${err.message}`);
    }
  };

  const handleExportToGoogle = async (event: CalendarEvent) => {
    try {
      const res = await fetch('/api/integrations/google/calendar/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id }),
      });
      const data = await res.json();
      if (data.success) {
        setEvents(prev => prev.map(e =>
          e.id === event.id
            ? { ...e, meetLink: data.meet_link || e.meetLink, googleEventId: data.google_event_id }
            : e
        ));
        if (data.meet_link) {
          window.open(data.meet_link, '_blank');
        }
      } else {
        alert('Export failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const durationPreview = (() => {
    if (!form.startTime || !form.endTime || form.endTime <= form.startTime) return null;
    const [sh, sm] = form.startTime.split(':').map(Number);
    const [eh, em] = form.endTime.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
  })();

  const fieldStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--surface-border)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: 'white',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.72rem', color: 'var(--text-secondary)',
    marginBottom: '6px', display: 'block',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div className="cal-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* Topbar */}
      <div style={{ padding: 'clamp(12px, 2vw, 20px) clamp(16px, 2vw, 24px)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Today's Timeline</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={fetchEvents}
            style={{ padding: '6px 12px', fontSize: '0.82rem', minHeight: '36px' }}
            aria-label="Refresh events"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              if (dbError === 'DATABASE_TABLES_MISSING') {
                alert('Please run the setup SQL schema in your Supabase dashboard first!');
              } else {
                setShowModal(true);
              }
            }}
            style={{ padding: '6px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap', minHeight: '36px' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, padding: 'clamp(12px, 2vw, 24px)', position: 'relative', overflowY: 'auto' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 12, right: 24, color: 'var(--text-secondary)', fontSize: '0.7rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={10} className="animate-spin" /> Loading…</div>
        )}

        {dbError === 'DATABASE_TABLES_MISSING' ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: 'clamp(16px, 3vw, 24px)',
            textAlign: 'center',
            margin: '16px 0',
          }}>
            <h4 style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={18} /> Supabase Tables Missing</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '12px' }}>
              The required database tables do not exist in your Supabase project yet.
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 500 }}>
              Please copy the SQL from <code>supabase-schema.sql</code> and run it in the SQL Editor in your Supabase Dashboard.
            </p>
          </div>
        ) : dbError === 'DATABASE_UNREACHABLE' ? (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: 'clamp(16px, 3vw, 24px)',
            textAlign: 'center',
            margin: '16px 0',
          }}>
            <h4 style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={18} /> Database Unreachable</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '12px' }}>
              Cannot connect to Supabase. Your project may be <strong>paused</strong> (free tier pauses after 1 week of inactivity).
            </p>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '8px', color: 'var(--warning)', fontWeight: 600, fontSize: '0.82rem' }}
            >
              <ExternalLink size={14} /> Go to Supabase Dashboard
            </a>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {HOURS.map(hour => (
              <div
                key={hour}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(8px, 2vw, 16px)', height: `${PX_PER_HOUR}px` }}
              >
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', width: 'clamp(48px, 10vw, 64px)', textAlign: 'right', flexShrink: 0, paddingTop: '2px' }}>
                  {hour}
                </div>
                <div style={{ flex: 1, height: '1px', background: 'var(--surface-border)', marginTop: '9px' }} />
              </div>
            ))}

            <div style={{ position: 'absolute', top: 0, left: 'clamp(56px, 12vw, 80px)', right: 0, bottom: 0, pointerEvents: 'none' }}>
              {events.length === 0 && !loading && (
                <div style={{ padding: 'clamp(24px, 4vw, 40px)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem', pointerEvents: 'auto' }}>
                  No events scheduled for today. Click "+ Add" to schedule one.
                </div>
              )}
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="cal-event-block"
                  style={{
                    position: 'absolute',
                    top:    event.top,
                    left:   index % 2 === 0 ? 0 : '51%',
                    right:  index % 2 === 0 ? '51%' : 0,
                    height: event.height,
                    background:  event.colorBg,
                    borderLeft: `4px solid ${event.colorBorder}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    marginLeft: index % 2 === 0 ? 0  : '6px',
                    marginRight: index % 2 === 0 ? '6px' : 0,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    pointerEvents: 'all',
                    display: 'flex',
                    flexDirection: 'column',
                    touchAction: 'manipulation',
                    minHeight: '44px',
                  }}
                  onClick={() => setEventMenu(eventMenu?.id === event.id ? null : { id: event.id, x: 0, y: 0 })}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = `0 4px 20px ${event.colorBorder}40`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 'clamp(0.75rem, 2vw, 0.82rem)', color: event.colorBorder, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.7rem)', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.workspace} &bull; {event.startTime} – {event.endTime}
                  </div>
                  {event.meetLink && (
                    <a
                      href={event.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        marginTop: '4px',
                        fontSize: '0.65rem',
                        color: '#10b981',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Play size={12} /> Join Meet
                    </a>
                  )}

                  {eventMenu?.id === event.id && (
                    <div
                      className="cal-context-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        zIndex: 100,
                        background: '#1e1e2a',
                        border: '1px solid var(--surface-border)',
                        borderRadius: '8px',
                        padding: '4px',
                        minWidth: 'clamp(120px, 30vw, 140px)',
                        boxShadow: 'var(--shadow-md)',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      {!event.googleEventId && (
                        <button
                          onClick={() => { handleExportToGoogle(event); setEventMenu(null); }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '0.75rem',
                            color: 'var(--accent-primary)',
                            textAlign: 'left',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            minHeight: '36px',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(198, 244, 50, 0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <UploadCloud size={14} /> Export to Google Calendar
                        </button>
                      )}
                      <button
                        onClick={() => { handleDeleteEvent(event.id, event.title); setEventMenu(null); }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '0.75rem',
                          color: 'var(--danger)',
                          textAlign: 'left',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          minHeight: '36px',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(14, 16, 21, 0.8)', backdropFilter: 'blur(8px)', padding: '16px',
            WebkitBackdropFilter: 'blur(8px)', touchAction: 'none',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="glass-panel modal-content" style={{
            width: 'min(480px, 100%)', padding: 'clamp(20px, 4vw, 32px)',
            display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 20px)',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add to Timeline</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ padding: '4px 8px', minWidth: 'auto', minHeight: 'auto' }}><X size={20} /></button>
            </div>

            <div>
              <label style={labelStyle}>Event / Task Title *</label>
              <input type="text" placeholder="e.g. Product design review…" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={fieldStyle} autoFocus />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 'clamp(8px, 2vw, 16px)' }}>
              <div>
                <label style={labelStyle}>Event Type</label>
                <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))} style={{ ...fieldStyle, appearance: 'none' }}>
                  {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Workspace</label>
                <select value={form.workspaceId} onChange={e => setForm(f => ({ ...f, workspaceId: e.target.value }))} style={{ ...fieldStyle, appearance: 'none' }}>
                  <option value="">Personal</option>
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 'clamp(8px, 2vw, 16px)' }}>
              <div>
                <label style={labelStyle}>Start Time *</label>
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={{ ...fieldStyle, colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={labelStyle}>End Time *</label>
                <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} style={{ ...fieldStyle, colorScheme: 'dark' }} />
              </div>
            </div>

            {durationPreview && (
              <div style={{
                background: `${EVENT_COLORS[form.eventType]?.border || 'var(--accent-primary)'}15`,
                border: `1px solid ${EVENT_COLORS[form.eventType]?.border || 'var(--accent-primary)'}30`,
                borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Duration:</span> <span style={{ color: EVENT_COLORS[form.eventType]?.border || 'var(--accent-primary)', fontWeight: 600 }}>{durationPreview}</span>
                &nbsp;&bull;&nbsp;{time24to12(form.startTime)} → {time24to12(form.endTime)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: '1 1 120px', padding: '12px' }}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving || !form.title.trim()} style={{ flex: '2 1 200px', padding: '12px', opacity: !form.title.trim() ? 0.5 : 1 }}>
                {saving ? 'Adding…' : '+ Add to Timeline'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .cal-wrapper .cal-context-menu {
            position: fixed !important;
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            min-width: 100% !important;
            border-radius: 16px 16px 0 0 !important;
            padding: 12px 8px !important;
            box-shadow: 0 -8px 40px rgba(0,0,0,0.5) !important;
            background: var(--bg-secondary) !important;
            border: 1px solid var(--surface-border) !important;
            z-index: 110 !important;
          }
          .cal-wrapper .cal-context-menu button {
            padding: 14px 16px !important;
            font-size: 0.875rem !important;
            min-height: 48px !important;
            border-radius: 10px !important;
          }
          .cal-wrapper .cal-event-block {
            left: 4px !important;
            right: 4px !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}