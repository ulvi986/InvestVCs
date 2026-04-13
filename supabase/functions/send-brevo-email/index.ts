import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_SENDER_NAME = 'InvestVCs'
const DEFAULT_SENDER_EMAIL = 'u.sharifzade2007@gmail.com'

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { to, subject, message, senderName, senderEmail } = await req.json()

    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isValidEmail(to)) {
      return new Response(JSON.stringify({ error: 'Invalid recipient email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const safeSubject = escapeHtml(subject)
    const safeMessage = escapeHtml(message)
    const safeSenderName = senderName ? escapeHtml(senderName) : 'Platform user'
    const safeSenderEmail = senderEmail && isValidEmail(senderEmail) ? senderEmail : null

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: DEFAULT_SENDER_NAME,
          email: DEFAULT_SENDER_EMAIL,
        },
        to: [{ email: to }],
        replyTo: safeSenderEmail
          ? {
              email: safeSenderEmail,
              name: senderName || DEFAULT_SENDER_NAME,
            }
          : undefined,
        subject,
        textContent: [
          `Subject: ${subject}`,
          `From: ${senderName || 'Platform user'}${safeSenderEmail ? ` <${safeSenderEmail}>` : ''}`,
          '',
          message,
        ].join('\n'),
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#6366f1;">${safeSubject}</h2>
          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
            <strong>From:</strong> ${safeSenderName}${safeSenderEmail ? ` &lt;${safeSenderEmail}&gt;` : ''}
          </p>
          <p style="white-space:pre-wrap;line-height:1.6;color:#333;">${safeMessage}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
          <p style="font-size:12px;color:#999;">Sent via InvestVCs Platform. Use reply in your email app to answer directly.</p>
        </div>`,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Brevo API error:', data)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, messageId: data.messageId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
