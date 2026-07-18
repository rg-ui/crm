import { NextRequest, NextResponse } from 'next/server';

// POST /api/integrations/test
// body: { type: 'slack' | 'github' | 'google_calendar', config: {...} }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, config } = body;

  try {
    if (type === 'slack') {
      const webhookUrl = config?.webhook_url;
      if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
        return NextResponse.json({ success: false, message: 'Invalid Slack webhook URL. It must start with https://hooks.slack.com/' });
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `✅ *StartupOS Connected!* Your Slack integration is working. Daily standups and goal updates will appear here.`,
        }),
      });

      if (res.ok || res.status === 200) {
        return NextResponse.json({ success: true, message: 'Test message sent to Slack successfully! Check your channel.' });
      } else {
        const err = await res.text();
        return NextResponse.json({ success: false, message: `Slack returned: ${err}` });
      }
    }

    if (type === 'github') {
      const token = config?.personal_access_token;
      if (!token) {
        return NextResponse.json({ success: false, message: 'Personal access token is required.' });
      }

      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (res.ok) {
        const user = await res.json();
        return NextResponse.json({ success: true, message: `Connected as @${user.login} (${user.name || 'GitHub user'})` });
      } else {
        return NextResponse.json({ success: false, message: 'Invalid GitHub token. Please check your personal access token.' });
      }
    }

    if (type === 'google_calendar') {
      const calId = config?.calendar_id;
      if (!calId) {
        return NextResponse.json({ success: false, message: 'Calendar ID is required. Find it in Google Calendar settings.' });
      }
      // Google Calendar requires OAuth — can't test without user auth flow
      return NextResponse.json({ success: true, message: `Calendar ID saved: ${calId}. OAuth connection will be enabled in next update.` });
    }

    return NextResponse.json({ success: false, message: `Unknown integration type: ${type}` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: `Connection failed: ${err.message}` });
  }
}
