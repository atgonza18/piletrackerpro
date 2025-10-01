import emailjs from '@emailjs/browser';
import { supabase } from './supabase';

// EmailJS Configuration
// You'll need to sign up at https://www.emailjs.com and get these values
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

export interface InvitationEmailParams {
  to_email: string;
  to_name?: string;
  from_name: string;
  project_name: string;
  role: string;
  invitation_link: string;
}

// Primary method: Use Supabase Edge Function with Resend
export const sendInvitationEmail = async (params: InvitationEmailParams) => {
  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: params
    });

    if (error) {
      console.error('Edge Function error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully via Edge Function:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email via Edge Function:', error);
    return { success: false, error };
  }
};

// Fallback method: EmailJS
export const sendInvitationEmailViaEmailJS = async (params: InvitationEmailParams) => {
  // Check if EmailJS is configured
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.log('EmailJS not configured. Skipping email send.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const templateParams = {
      to_email: params.to_email,
      to_name: params.to_name || params.to_email.split('@')[0],
      from_name: params.from_name,
      project_name: params.project_name,
      role: params.role,
      invitation_link: params.invitation_link,
      // Email template will use these variables
      message_html: `
        <h2>You're invited to join ${params.project_name}!</h2>
        <p>${params.from_name} has invited you to join <strong>${params.project_name}</strong> as a <strong>${params.role}</strong> on PileTrackerPro.</p>
        <p>Click the link below to accept your invitation and create your account:</p>
        <p><a href="${params.invitation_link}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
        <p>Or copy this link: ${params.invitation_link}</p>
        <p>This invitation will expire in 7 days.</p>
      `
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
};

// Alternative: Use a simple fetch to a free email API
export const sendInvitationEmailViaAPI = async (params: InvitationEmailParams) => {
  // Using Web3Forms as a free alternative (no signup required for testing)
  const WEB3FORMS_ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '';
  
  if (!WEB3FORMS_ACCESS_KEY) {
    console.log('Web3Forms not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      to: params.to_email,
      subject: `You're invited to join ${params.project_name}`,
      from_name: 'PileTrackerPro',
      message: `
Hello,

${params.from_name} has invited you to join ${params.project_name} as a ${params.role} on PileTrackerPro.

Click here to accept your invitation:
${params.invitation_link}

This invitation will expire in 7 days.

Best regards,
PileTrackerPro Team
      `,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #3b82f6;">You're invited to join ${params.project_name}!</h2>
    
    <p>Hello,</p>
    
    <p>${params.from_name} has invited you to join <strong>${params.project_name}</strong> as a <strong>${params.role}</strong> on PileTrackerPro.</p>
    
    <div style="margin: 30px 0;">
      <a href="${params.invitation_link}" 
         style="display: inline-block; padding: 12px 30px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Accept Invitation
      </a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
      ${params.invitation_link}
    </p>
    
    <p><em>This invitation will expire in 7 days.</em></p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #6b7280;">
      This invitation was sent to ${params.to_email}. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
      `
    })
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('Email sent successfully via Web3Forms');
    return { success: true, data };
  } else {
    console.error('Failed to send email via Web3Forms:', data);
    return { success: false, error: data.message || 'Failed to send email' };
  }
};