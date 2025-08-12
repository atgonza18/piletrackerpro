// Supabase Edge Function to send project invitation emails
// Deploy with: supabase functions deploy send-invitation-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationRequest {
  email: string
  inviterName: string
  projectName: string
  role: string
  invitationLink: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify the user is authenticated
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { email, inviterName, projectName, role, invitationLink }: InvitationRequest = await req.json()

    // HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're invited to join ${projectName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">PileTrackerPro</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e1e4e8; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #24292e; margin-top: 0;">You're invited to join ${projectName}!</h2>
          
          <p style="font-size: 16px; color: #586069;">
            Hi there,
          </p>
          
          <p style="font-size: 16px; color: #586069;">
            ${inviterName} has invited you to join <strong>${projectName}</strong> as a <strong>${role}</strong> on PileTrackerPro.
          </p>
          
          <p style="font-size: 16px; color: #586069;">
            PileTrackerPro is a comprehensive pile tracking application for construction and foundation projects. Click the button below to accept your invitation and create your account.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="font-size: 14px; color: #586069;">
            Or copy and paste this link into your browser:
          </p>
          
          <p style="font-size: 14px; word-break: break-all; background: #f6f8fa; padding: 10px; border-radius: 6px; color: #0366d6;">
            ${invitationLink}
          </p>
          
          <p style="font-size: 14px; color: #586069; margin-top: 30px;">
            This invitation will expire in 7 days. If you have any questions, please contact ${inviterName} or your project administrator.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e1e4e8; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #959da5; text-align: center;">
            This invitation was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
    `

    // Plain text fallback
    const textContent = `
You're invited to join ${projectName}!

Hi there,

${inviterName} has invited you to join ${projectName} as a ${role} on PileTrackerPro.

PileTrackerPro is a comprehensive pile tracking application for construction and foundation projects.

Accept your invitation by clicking this link:
${invitationLink}

This invitation will expire in 7 days. If you have any questions, please contact ${inviterName} or your project administrator.

This invitation was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.
    `

    // Send email using Resend API (you need to set up Resend and add the API key to your environment variables)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'PileTrackerPro <noreply@piletrackerpro.com>',
          to: [email],
          subject: `You're invited to join ${projectName}`,
          html: htmlContent,
          text: textContent,
        }),
      })

      if (!res.ok) {
        const error = await res.text()
        console.error('Resend API error:', error)
        throw new Error('Failed to send email')
      }

      const data = await res.json()
      
      return new Response(
        JSON.stringify({ success: true, messageId: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      // If Resend is not configured, return success but log that email wasn't actually sent
      console.log('RESEND_API_KEY not configured. Email not sent.')
      console.log('Would have sent invitation to:', email)
      console.log('Invitation link:', invitationLink)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Invitation created (email service not configured)',
          invitationLink 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
  } catch (error) {
    console.error('Error in send-invitation-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})