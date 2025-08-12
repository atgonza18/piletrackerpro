# Email Setup for Invitations

Choose one of these options to enable automatic email sending for invitations:

## Option 1: Web3Forms (Easiest - Free)

1. Go to https://web3forms.com/
2. Enter your email address to get an access key (no signup required)
3. Add to your `.env.local`:
```
NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=your_access_key_here
```
4. Restart your development server
5. Done! Emails will now be sent automatically

## Option 2: EmailJS (More Features - Free Tier Available)

1. Sign up at https://www.emailjs.com/
2. Create an email service (Gmail, Outlook, etc.)
3. Create an email template with these variables:
   - `{{to_email}}`
   - `{{from_name}}`
   - `{{project_name}}`
   - `{{role}}`
   - `{{invitation_link}}`
   - `{{message_html}}`

4. Get your credentials and add to `.env.local`:
```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
```
5. Restart your development server

## Option 3: Resend (Production Ready - Requires Domain)

1. Sign up at https://resend.com/
2. Verify your domain
3. Get your API key
4. Deploy the Supabase Edge Function (see INVITATION_SETUP.md)
5. Add to Supabase secrets:
```
supabase secrets set RESEND_API_KEY=your_api_key
```

## Testing

After setting up any option:
1. Go to Settings → Team Management
2. Click "Invite User"
3. Enter an email address
4. The invitation should be sent automatically!

## Troubleshooting

- Check browser console for errors
- Verify environment variables are set correctly
- Make sure to restart the dev server after adding env variables
- For Web3Forms, check your spam folder