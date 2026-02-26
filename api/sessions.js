// Chat sessions CRUD — stores conversation history in Supabase
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mltgtiazvnxjlsznzywz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sdGd0aWF6dm54amxzem56eXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwOTUzNTksImV4cCI6MjA1NzY3MTM1OX0.CrOC4ps7hYa1fBJg8V_1wPJOaNXx7OjUlfRx67VM8wI';

const SITE = 'broker-toolkit';

function getAuth(req) {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.split(' ')[1] : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = getAuth(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid session' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('admin_chat_sessions')
        .select('id, title, page_path, model, updated_at')
        .eq('site', SITE)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return res.json({ sessions: data });
    }

    if (req.method === 'POST') {
      const { id, title, messages, page_path, model } = req.body;
      if (id) {
        const { error } = await sb
          .from('admin_chat_sessions')
          .update({ title, messages, page_path, model, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        return res.json({ id });
      } else {
        const { data, error } = await sb
          .from('admin_chat_sessions')
          .insert({ user_id: user.id, site: SITE, title, messages, page_path, model })
          .select('id')
          .single();
        if (error) throw error;
        return res.json({ id: data.id });
      }
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      const { data, error } = await sb
        .from('admin_chat_sessions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return res.json({ session: data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await sb
        .from('admin_chat_sessions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
