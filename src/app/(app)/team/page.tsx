"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { Users, CheckCircle, Sparkles, X, Mail } from 'lucide-react';

type Profile = {
  id: string;
  full_name: string;
  email?: string;
  role_title?: string;
  skills?: string[];
  avatar_url?: string;
};

export default function TeamDirectory() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role_title: '', skills: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<{ name: string; emailStatus: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch profiles');
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      const matchesSearch = !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.skills?.some(s => s.toLowerCase().includes(search.toLowerCase()));
      return matchesSearch;
    });
  }, [profiles, search]);

  const avatarColor = (name: string) => {
    const colors = ['#C6F432', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleInvite = async () => {
    if (!inviteForm.full_name.trim()) return;
    setInviting(true);
    try {
      const newId = crypto.randomUUID();
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          full_name: inviteForm.full_name.trim(),
          email: inviteForm.email.trim(),
          role_title: inviteForm.role_title.trim(),
          skills: inviteForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite teammate');
      setShowInviteModal(false);
      setInviteSuccess({ name: inviteForm.full_name.trim(), emailStatus: data.emailStatus || 'unknown' });
      setInviteForm({ full_name: '', email: '', role_title: '', skills: '' });
      fetchProfiles();
      setTimeout(() => setInviteSuccess(null), 6000);
    } catch (err: any) {
      console.error(err);
      alert('Failed to invite teammate: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');
      setProfiles(prev => prev.filter(p => p.id !== id));
      setConfirmRemoveId(null);
    } catch (err: any) {
      alert('Failed to remove: ' + err.message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 3vw, 32px)' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Team Directory <Users size={24} /></h2>
            <p className="page-subtitle">Find teammates, check their skills, and see what they are working on.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-secondary">Export List</button>
            <button className="btn-primary" onClick={() => setShowInviteModal(true)}>Invite Teammate</button>
          </div>
        </div>
      </header>

      {/* Invite success banner */}
      {inviteSuccess && (
        <div className="animate-fade-in-up" style={{
          padding: 'clamp(10px, 2vw, 14px) clamp(16px, 3vw, 20px)', borderRadius: '14px', fontSize: '0.9rem', fontWeight: 500,
          background: inviteSuccess.emailStatus === 'sent' ? 'rgba(16,185,129,0.12)' : 'rgba(198,244,50,0.1)',
          border: `1px solid ${inviteSuccess.emailStatus === 'sent' ? 'rgba(16,185,129,0.3)' : 'rgba(198,244,50,0.25)'}`,
          color: inviteSuccess.emailStatus === 'sent' ? '#10b981' : 'var(--accent-primary)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ display: 'flex' }}>{inviteSuccess.emailStatus === 'sent' ? <CheckCircle size={20} /> : <Sparkles size={20} />}</span>
          <span>
            <strong>{inviteSuccess.name}</strong> added to the team!{' '}
            {inviteSuccess.emailStatus === 'sent' && 'Invitation email sent successfully.'}
            {inviteSuccess.emailStatus === 'simulated' && 'Add RESEND_API_KEY to .env.local to send real emails.'}
            {inviteSuccess.emailStatus === 'failed' && 'Email could not be sent — check RESEND_API_KEY config.'}
          </span>
        </div>
      )}

      <div className="glass-card" style={{ padding: 'clamp(12px, 2vw, 16px) clamp(16px, 2vw, 24px)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name or skill..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
          style={{ flex: 1, minWidth: '180px', minHeight: '44px', padding: '10px 16px', fontSize: '0.875rem' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 'clamp(12px, 2vw, 24px)' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--surface-border)', flexShrink: 0 }}></div>
                <div style={{ flex: 1 }}>
                  <div className="animate-shimmer" style={{ height: '20px', width: '60%', background: 'var(--surface-border)', borderRadius: '4px', marginBottom: '8px' }}></div>
                  <div className="animate-shimmer" style={{ height: '14px', width: '40%', background: 'var(--surface-border)', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 'clamp(32px, 6vw, 48px)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            {profiles.length === 0
              ? 'No team members yet. Add profiles in your database to see them here.'
              : 'No team members match your search.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 'clamp(12px, 2vw, 24px)' }}>
          {filtered.map(member => {
            const color = avatarColor(member.full_name);
            const isRemoving = removingId === member.id;
            const isConfirming = confirmRemoveId === member.id;
            return (
              <div key={member.id} className="glass-card" style={{
                padding: 'clamp(16px, 2vw, 24px)', display: 'flex', flexDirection: 'column', gap: '14px',
                opacity: isRemoving ? 0.5 : 1, transition: 'opacity 0.2s',
                position: 'relative',
              }}>
                <button
                  onClick={() => setConfirmRemoveId(isConfirming ? null : member.id)}
                  title="Remove from team"
                  style={{
                    position: 'absolute', top: '12px', right: '12px',
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: isConfirming ? 'rgba(239,68,68,0.15)' : 'transparent',
                    border: isConfirming ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent',
                    color: isConfirming ? '#ef4444' : 'rgba(148,163,184,0.4)',
                    fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s', 
                  }}
                  aria-label="Remove team member"
                >
                  <X size={16} />
                </button>

                {isConfirming && (
                  <div style={{
                    position: 'absolute', top: '44px', right: '12px', zIndex: 10,
                    background: '#1A1C23', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '12px', padding: '12px 16px', minWidth: 'clamp(140px, 40vw, 180px)',
                    boxShadow: 'var(--shadow-md)',
                  }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
                      Remove <strong style={{ color: 'white' }}>{member.full_name}</strong> from the team?
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', background: 'var(--surface-secondary)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', minHeight: '36px' }}
                      >Cancel</button>
                      <button
                        onClick={() => handleRemove(member.id)}
                        disabled={isRemoving}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', minHeight: '36px' }}
                      >{isRemoving ? '...' : 'Remove'}</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${color}, rgba(14, 16, 21, 0.5))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.125rem',
                    color: '#0E1015',
                    flexShrink: 0,
                  }}>
                    {initials(member.full_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.full_name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{member.role_title || 'Team Member'}</p>
                    {member.email && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {member.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {member.skills && member.skills.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Skills</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {member.skills.map(skill => (
                        <span key={skill} style={{
                          background: `${color}20`,
                          color,
                          border: `1px solid ${color}40`,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 500,
                        }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(14, 16, 21, 0.8)', backdropFilter: 'blur(8px)', padding: '16px',
            WebkitBackdropFilter: 'blur(8px)', touchAction: 'none',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
        >
          <div className="glass-panel modal-content" style={{
            width: 'min(480px, 100%)', padding: 'clamp(20px, 4vw, 32px)',
            display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Invite Teammate</h3>
              <button onClick={() => setShowInviteModal(false)} className="btn-ghost" style={{ padding: '4px 8px', minWidth: 'auto', minHeight: 'auto' }}><X size={20} /></button>
            </div>

            <div>
              <label className="label" style={{ marginBottom: '6px' }}>Full Name *</label>
              <input type="text" placeholder="e.g. Jane Doe" value={inviteForm.full_name}
                onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                className="input" autoFocus />
            </div>

            <div>
              <label className="label" style={{ marginBottom: '6px' }}>Email Address *</label>
              <input type="email" placeholder="e.g. jane@startup.com" value={inviteForm.email}
                onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                className="input" />
            </div>

            <div>
              <label className="label" style={{ marginBottom: '6px' }}>Role / Title</label>
              <input type="text" placeholder="e.g. Software Engineer" value={inviteForm.role_title}
                onChange={e => setInviteForm(f => ({ ...f, role_title: e.target.value }))}
                className="input" />
            </div>

            <div>
              <label className="label" style={{ marginBottom: '6px' }}>Skills (comma separated)</label>
              <input type="text" placeholder="e.g. React, Node.js, Design" value={inviteForm.skills}
                onChange={e => setInviteForm(f => ({ ...f, skills: e.target.value }))}
                className="input" />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button className="btn-secondary" onClick={() => setShowInviteModal(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button className="btn-primary" onClick={handleInvite} disabled={inviting || !inviteForm.full_name.trim() || !inviteForm.email.trim()} style={{ flex: 2, padding: '12px', opacity: (!inviteForm.full_name.trim() || !inviteForm.email.trim() || inviting) ? 0.5 : 1 }}>
                {inviting ? 'Sending Invite...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}