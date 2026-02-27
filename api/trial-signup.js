module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, firstName, lastName, companyName } = req.body || {};

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: 'email, firstName, and lastName are required' });
  }

  const apiKey = process.env.TRIAL_SIGNUP_API_KEY;
  if (!apiKey) {
    console.error('TRIAL_SIGNUP_API_KEY is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const payload = {
    email: String(email).trim(),
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    companyName: companyName ? String(companyName).trim() : ''
  };

  try {
    const upstream = await fetch('https://my.brokertoolkit.app/api/trial-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!upstream.ok) {
      console.error('Trial signup upstream failed', upstream.status, data);
      return res.status(upstream.status).json({
        error: 'Trial signup failed',
        upstreamStatus: upstream.status,
        details: data
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Trial signup proxy error:', err.message);
    return res.status(502).json({ error: 'Unable to submit trial signup' });
  }
};
