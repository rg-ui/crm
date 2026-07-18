import Link from 'next/link';

const features = [
  {
    title: 'Track Goals & OKRs',
    desc: 'Set daily goals, track company OKRs, and measure progress across all your workspaces.',
  },
  {
    title: 'AI Executive Brief',
    desc: 'Get a daily AI-generated summary of your most important updates, standups, and blockers.',
  },
  {
    title: 'Team Dashboard',
    desc: 'See what everyone is working on, check morale, and stay aligned as a team.',
  },
  {
    title: 'Calendar & Analytics',
    desc: 'Visualize your weekly velocity, deep work hours, and goal completion trends.',
  },
  {
    title: 'Expense Tracking',
    desc: 'Log and categorize expenses with spending breakdowns and budget controls.',
  },
  {
    title: 'Integrations',
    desc: 'Connect Slack, GitHub, and Google to automate your workflow.',
  },
];

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      backgroundImage: `
        radial-gradient(ellipse 60% 50% at 50% -20%, rgba(198, 244, 50, 0.06) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 100% 100%, rgba(198, 244, 50, 0.03) 0%, transparent 50%),
        linear-gradient(180deg, #0E1015 0%, #161920 100%)
      `,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <nav style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 32px',
      }}>
        <div style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--accent-primary)' }}>StartupOS</div>
        <Link
          href="/login"
          style={{
            padding: '10px 24px',
            borderRadius: '99px',
            background: 'var(--accent-primary)',
            color: '#0E1015',
            fontWeight: 700,
            fontSize: '0.875rem',
            transition: 'all 0.2s',
          }}
        >
          Sign In
        </Link>
      </nav>

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '80px 32px',
        maxWidth: '1200px',
        width: '100%',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '24px',
          marginBottom: '80px',
        }}>
          <div style={{
            background: 'rgba(198, 244, 50, 0.1)',
            border: '1px solid rgba(198, 244, 50, 0.2)',
            padding: '8px 20px',
            borderRadius: '99px',
            color: 'var(--accent-primary)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}>
            Your all-in-one startup workspace
          </div>
          <h1 style={{
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            maxWidth: '800px',
          }}>
            Run your startup
            <br />
            <span style={{ color: 'var(--accent-primary)' }}>like an OS</span>
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)',
            maxWidth: '600px',
            lineHeight: 1.6,
          }}>
            Track goals, manage teams, and stay on top of everything — 
            all in one place. Built for founders who ship.
          </p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              href="/login"
              style={{
                padding: '16px 40px',
                borderRadius: '99px',
                background: 'var(--accent-primary)',
                color: '#0E1015',
                fontWeight: 700,
                fontSize: '1.125rem',
                boxShadow: '0 8px 24px rgba(198, 244, 50, 0.25)',
                transition: 'all 0.2s',
              }}
            >
              Get Started
            </Link>
            <Link
              href="/login"
              style={{
                padding: '16px 40px',
                borderRadius: '99px',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '1.125rem',
                transition: 'all 0.2s',
              }}
            >
              Sign In
            </Link>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
          width: '100%',
        }}>
          {features.map((f) => (
            <div
              key={f.title}
              className="glass-card"
              style={{
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <footer style={{
          marginTop: '120px',
          padding: '40px 0',
          width: '100%',
          textAlign: 'center',
          borderTop: '1px solid var(--surface-border)',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
        }}>
          &copy; {new Date().getFullYear()} StartupOS. Built for startup teams.
        </footer>
      </main>
    </div>
  );
}
