// Vercel serverless function: check HQ RBAC permission for website admin access
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mltgtiazvnxjlsznzywz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sdGd0aWF6dm54amxzem56eXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwOTUzNTksImV4cCI6MjA1NzY3MTM1OX0.CrOC4ps7hYa1fBJg8V_1wPJOaNXx7OjUlfRx67VM8wI';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token } = req.body || {};
  if (!access_token) {
    return res.status(400).json({ error: 'Missing access_token' });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: { user }, error: authError } = await sb.auth.getUser(access_token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid session', allowed: false });
  }

  const RBAC_SECRET = process.env.RBAC_API_SECRET;
  if (!RBAC_SECRET) {
    console.error('RBAC_API_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error', allowed: false });
  }

  try {
    const rbacRes = await fetch(
      `https://hq.empowerlo.com/api/rbac/check?user_id=${user.id}&module=website-admin.broker-toolkit`,
      { headers: { Authorization: `Bearer ${RBAC_SECRET}` } }
    );

    if (!rbacRes.ok) {
      console.error('RBAC API error:', rbacRes.status);
      return res.status(502).json({ error: 'RBAC check failed', allowed: false });
    }

    const result = await rbacRes.json();
    return res.status(200).json({ allowed: result.allowed === true });
  } catch (err) {
    console.error('RBAC check error:', err.message);
    return res.status(502).json({ error: 'RBAC check failed', allowed: false });
  }
};
