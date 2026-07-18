"use client";

import React, { useState, useEffect } from 'react';
import CustomCalendar from '@/components/CustomCalendar';
import TomorrowPlan from '@/components/TomorrowPlan';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { DEFAULT_USER_ID } from '@/lib/constants';
import { Calendar as CalendarIcon, Sun, Flame, X, Circle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

type Goal = {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
};

type Analytics = {
  weeklyGoalsCompleted: number;
  deepWorkHours: number;
  streak: number;
  goalChange: number;
  weeklyVelocity: { name: string; goals: number; deepWork: number }[];
  completionRate: { name: string; completionRate: number }[];
};

const EMPTY_ANALYTICS: Analytics = {
  weeklyGoalsCompleted: 0,
  deepWorkHours: 0,
  streak: 0,
  goalChange: 0,
  weeklyVelocity: [],
  completionRate: [],
};

export default function CalendarGoalsPage() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'analytics'>('calendar');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    fetchGoals();
    fetchAnalytics();
  }, []);

  const fetchGoals = async () => {
    setLoadingGoals(true);
    setDbError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/goals?date=${today}&user_id=${DEFAULT_USER_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch goals');
      setGoals(data || []);
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
      setLoadingGoals(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/analytics?user_id=${DEFAULT_USER_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch analytics');
      setAnalytics(data);
    } catch {
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleAddGoal = async () => {
    const title = prompt("Enter goal title:");
    if (!title || !title.trim()) return;

    const priorityInput = prompt("Enter priority (low, medium, high):", "medium");
    const priority = ['low', 'medium', 'high'].includes(priorityInput || '')
      ? (priorityInput as 'low' | 'medium' | 'high')
      : 'medium';

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          priority,
          user_id: DEFAULT_USER_ID,
          status: 'pending',
          progress: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchGoals();
    } catch (err: any) {
      alert(`Error creating goal: ${err.message}`);
    }
  };

  const handleToggleGoal = async (goal: Goal) => {
    const nextStatus = goal.status === 'completed' ? 'pending' : 'completed';
    const nextProgress = nextStatus === 'completed' ? 100 : 0;

    try {
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goal.id, status: nextStatus, progress: nextProgress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: nextStatus, progress: nextProgress } : g));
      fetchAnalytics();
    } catch (err: any) {
      alert(`Error updating goal: ${err.message}`);
    }
  };

  const handleDeleteGoal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err: any) {
      alert(`Error deleting goal: ${err.message}`);
    }
  };

  const velocityData = analytics.weeklyVelocity.length > 0
    ? analytics.weeklyVelocity
    : [{ name: 'Mon', goals: 0, deepWork: 0 }, { name: 'Tue', goals: 0, deepWork: 0 }, { name: 'Wed', goals: 0, deepWork: 0 }, { name: 'Thu', goals: 0, deepWork: 0 }, { name: 'Fri', goals: 0, deepWork: 0 }, { name: 'Sat', goals: 0, deepWork: 0 }, { name: 'Sun', goals: 0, deepWork: 0 }];

  const completionData = analytics.completionRate.length > 0
    ? analytics.completionRate
    : [{ name: 'Week 1', completionRate: 0 }, { name: 'Week 2', completionRate: 0 }, { name: 'Week 3', completionRate: 0 }, { name: 'Week 4', completionRate: 0 }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 3vw, 32px)', height: '100%' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Calendar & Goals <CalendarIcon size={24} /></h2>
            <p className="page-subtitle">Track your daily schedule and analyze your productivity.</p>
          </div>

          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px', border: '1px solid var(--surface-border)', width: 'fit-content' }}>
            <button
              onClick={() => setActiveTab('calendar')}
              style={{
                padding: '8px clamp(12px, 2vw, 24px)',
                borderRadius: '8px',
                background: activeTab === 'calendar' ? 'var(--surface-secondary)' : 'transparent',
                color: activeTab === 'calendar' ? 'white' : 'var(--text-secondary)',
                fontWeight: activeTab === 'calendar' ? 600 : 400,
                transition: '0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              Daily Timeline
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                padding: '8px clamp(12px, 2vw, 24px)',
                borderRadius: '8px',
                background: activeTab === 'analytics' ? 'var(--surface-secondary)' : 'transparent',
                color: activeTab === 'analytics' ? 'white' : 'var(--text-secondary)',
                fontWeight: activeTab === 'analytics' ? 600 : 400,
                transition: '0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              Progress & Analytics
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'calendar' ? (
        <div className="calendar-sidebar-grid">
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <CustomCalendar />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 20px)', overflowY: 'auto' }}>
            <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sun size={20} className="text-warning" /> Today's Goals
                </span>
                <button
                  onClick={handleAddGoal}
                  className="btn-ghost"
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                >
                  + Add
                </button>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: 'clamp(240px, 40vh, 320px)' }}>
                {loadingGoals && <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Loading goals...</div>}

                {dbError === 'DATABASE_TABLES_MISSING' && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem', background: 'rgba(239,68,68,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Goals table missing. Run schema to enable.
                  </div>
                )}

                {dbError === 'DATABASE_UNREACHABLE' && (
                  <div style={{ color: 'var(--warning)', fontSize: '0.8rem', background: 'rgba(245,158,11,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Database unreachable. Your Supabase project may be paused — visit supabase.com to resume it, then refresh.
                  </div>
                )}

                {!loadingGoals && goals.length === 0 && !dbError && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
                    No goals for today yet.
                  </div>
                )}

                {goals.map(goal => (
                  <div
                    key={goal.id}
                    onClick={() => handleToggleGoal(goal)}
                    style={{
                      padding: '12px 14px',
                      background: goal.status === 'completed' ? 'rgba(16, 185, 129, 0.07)' : 'rgba(255,255,255,0.02)',
                      border: goal.status === 'completed' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--surface-border)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      touchAction: 'manipulation',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', textDecoration: goal.status === 'completed' ? 'line-through' : 'none', color: goal.status === 'completed' ? 'var(--success)' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {goal.title}
                      </span>
                      <button
                        onClick={(e) => handleDeleteGoal(goal.id, e)}
                        className="btn-ghost"
                        style={{ color: 'rgba(148,163,184,0.3)', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', flexShrink: 0, minWidth: 'auto', minHeight: 'auto' }}
                        aria-label="Delete goal"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: goal.priority === 'high' ? 'var(--danger)' : goal.priority === 'medium' ? 'var(--warning)' : 'var(--success)', fontWeight: 600, textTransform: 'capitalize' }}><Circle size={10} fill="currentColor" /> {goal.priority}</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${goal.progress}%`, background: goal.status === 'completed' ? 'var(--success)' : 'var(--accent-primary)', borderRadius: '2px', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <TomorrowPlan />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 24px)', flex: 1 }}>
          {loadingAnalytics ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'clamp(12px, 2vw, 24px)' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                  <div style={{ height: '14px', width: '50%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '10px' }}></div>
                  <div style={{ height: '36px', width: '30%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'clamp(12px, 2vw, 24px)' }}>
                <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Weekly Goals Completed</div>
                  <div style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 700, color: 'var(--success)' }}>{analytics.weeklyGoalsCompleted}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {analytics.goalChange >= 0 ? <><TrendingUp size={12} style={{ display: 'inline' }} /> {analytics.goalChange}%</> : <><TrendingDown size={12} style={{ display: 'inline' }} /> {Math.abs(analytics.goalChange)}%</>} from last week
                  </div>
                </div>
                <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Deep Work Hours</div>
                  <div style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 700, color: 'var(--accent-primary)' }}>{analytics.deepWorkHours}h</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>This week</div>
                </div>
                <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Current Streak</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 700, color: 'var(--accent-primary)' }}>{analytics.streak} Days <Flame size={32} /></div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Keep it up!</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: 'clamp(12px, 2vw, 24px)' }}>
                <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)', minHeight: 'clamp(300px, 40vh, 350px)' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Weekly Velocity</h3>
                  <div style={{ width: '100%', height: 'clamp(200px, 35vh, 300px)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={velocityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--surface-primary)', borderColor: 'var(--surface-border)', borderRadius: '8px', color: 'white' }}
                          itemStyle={{ color: 'white' }}
                        />
                        <Legend />
                        <Bar dataKey="goals" name="Goals Completed" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="deepWork" name="Deep Work (Hrs)" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)', minHeight: 'clamp(300px, 40vh, 350px)' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Goal Completion Rate (%)</h3>
                  <div style={{ width: '100%', height: 'clamp(200px, 35vh, 300px)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={completionData}>
                        <defs>
                          <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--surface-primary)', borderColor: 'var(--surface-border)', borderRadius: '8px', color: 'white' }}
                        />
                        <Area type="monotone" dataKey="completionRate" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 12px;
          }
          .btn-stack-mobile {
            flex-direction: column;
            width: 100%;
          }
          .btn-stack-mobile .btn-primary,
          .btn-stack-mobile .btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}