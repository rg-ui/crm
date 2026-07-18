import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const { data, error } = await getSupabaseAdmin()
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return NextResponse.json(data || null);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, full_name, email, avatar_url, role_title, skills } = body;

  if (!id || !full_name) {
    return NextResponse.json({ error: 'id and full_name are required' }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('profiles')
      .upsert({
        id,
        full_name,
        email,
        avatar_url,
        role_title,
        skills: skills || [],
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Send real invite email via Resend
    let emailStatus = 'not_sent';
    if (email && resend) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const appName = 'StartupOS';

        const result = await resend.emails.send({
          from: `${appName} <${fromEmail}>`,
          to: [email],
          subject: `You've been invited to join ${appName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>You're Invited to StartupOS</title>
            </head>
            <body style="margin:0;padding:0;background-color:#0E1015;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:600px;margin:40px auto;background:#1A1C23;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
                <div style="background:linear-gradient(135deg,#0E1015 0%,#1A1C23 100%);padding:40px;text-align:center;border-bottom:1px solid rgba(198,244,50,0.2);">
                  <div style="display:inline-block;background:#C6F432;border-radius:16px;padding:10px 22px;margin-bottom:20px;">
                    <span style="font-size:18px;font-weight:900;color:#0E1015;">StartupOS</span>
                  </div>
                  <h1 style="color:#fff;font-size:26px;font-weight:700;margin:0;">You're Invited! 🎉</h1>
                  <p style="color:rgba(255,255,255,0.5);font-size:15px;margin:10px 0 0;">Someone added you to their workspace</p>
                </div>
                <div style="padding:36px 40px;">
                  <p style="color:rgba(255,255,255,0.8);font-size:16px;line-height:1.6;margin:0 0 20px;">
                    Hey <strong style="color:#fff;">${full_name}</strong>,
                  </p>
                  <p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.7;margin:0 0 28px;">
                    You've been added to a team on <strong style="color:#C6F432;">StartupOS</strong> — your all-in-one startup workspace for tracking goals, managing teams, and staying productive.
                  </p>
                  <div style="background:rgba(198,244,50,0.06);border:1px solid rgba(198,244,50,0.2);border-radius:16px;padding:20px 24px;margin:0 0 28px;">
                    <div style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Your Details</div>
                    <div style="color:#fff;font-size:17px;font-weight:600;">${full_name}</div>
                    <div style="color:#C6F432;font-size:14px;margin-top:4px;">${role_title || 'Team Member'}</div>
                    <div style="color:rgba(255,255,255,0.35);font-size:13px;margin-top:4px;">${email}</div>
                  </div>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/team"
                       style="display:inline-block;background:#C6F432;color:#0E1015;font-size:16px;font-weight:700;padding:15px 38px;border-radius:99px;text-decoration:none;">
                      View Team Dashboard →
                    </a>
                  </div>
                  <p style="color:rgba(255,255,255,0.25);font-size:12px;line-height:1.6;margin:28px 0 0;text-align:center;">
                    If you weren't expecting this, you can safely ignore this email.
                  </p>
                </div>
                <div style="background:rgba(0,0,0,0.3);padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
                  <p style="color:rgba(255,255,255,0.2);font-size:12px;margin:0;">© ${new Date().getFullYear()} StartupOS. Built for startup teams.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        if (result.error) {
          console.error('[Email] Resend error:', result.error);
          emailStatus = 'failed';
        } else {
          emailStatus = 'sent';
          console.log(`[Email] Invite sent to ${email} | ID: ${result.data?.id}`);
        }
      } catch (emailErr: any) {
        console.error('[Email] Failed to send invite:', emailErr.message);
        emailStatus = 'failed';
      }
    } else if (email && !resend) {
      console.log(`[Email] RESEND_API_KEY not configured. Would have sent invite to: ${email}`);
      emailStatus = 'simulated';
    }

    return NextResponse.json({ ...data, emailStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, full_name, email, avatar_url, role_title, skills } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (role_title !== undefined) updates.role_title = role_title;
    if (skills !== undefined) updates.skills = skills;

    const { data, error } = await getSupabaseAdmin()
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

