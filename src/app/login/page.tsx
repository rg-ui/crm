"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    // Simulate auth — will be replaced with Supabase Auth later
    setTimeout(() => {
      router.push('/dashboard');
    }, 800);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      backgroundImage: `
        radial-gradient(ellipse 60% 50% at 50% -20%, rgba(198, 244, 50, 0.06) 0%, transparent 50%),
        linear-gradient(180deg, #0E1015 0%, #161920 100%)
      `,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <Link
        href="/"
        style={{
          position: 'absolute',
          top: '24px',
          left: '32px',
          fontWeight: 900,
          fontSize: '1.5rem',
          color: 'var(--accent-primary)',
          textDecoration: 'none',
        }}
      >
        StartupOS
      </Link>

      <div
        className="glass-panel"
        style={{
          width: 'min(420px, 100%)',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            {mode === 'login' ? 'Sign in to continue to StartupOS' : 'Get started with StartupOS'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label" style={{ marginBottom: '6px' }}>Email</label>
            <input
              type="email"
              placeholder="you@startup.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              autoFocus
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label" style={{ marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !email.trim() || !password.trim()}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '1rem',
              marginTop: '8px',
              opacity: (loading || !email.trim() || !password.trim()) ? 0.5 : 1,
            }}
          >
            {loading ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
