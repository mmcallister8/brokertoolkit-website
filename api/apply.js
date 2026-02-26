// PR-based change management — creates branches + PRs with Vercel preview URLs
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mltgtiazvnxjlsznzywz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sdGd0aWF6dm54amxzem56eXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwOTUzNTksImV4cCI6MjA1NzY3MTM1OX0.CrOC4ps7hYa1fBJg8V_1wPJOaNXx7OjUlfRx67VM8wI';
const GITHUB_OWNER = 'empowerlo';
const GITHUB_REPO = 'brokertoolkit-website';
const VERCEL_PROJECT = 'brokertoolkit-website';

const gh = (path, token, opts = {}) => fetch(`https://api.github.com${path}`, {
  ...opts,
  headers: {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    ...opts.headers
  }
}).then(async r => {
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${JSON.stringify(data)}`);
  return data;
});

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
}

async function authCheck(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: { user }, error } = await sb.auth.getUser(authHeader.split(' ')[1]);
  return error ? null : user;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await authCheck(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

  const { action } = req.body;

  try {
    if (action === 'create-pr') {
      return await createPR(req.body, GITHUB_TOKEN, res);
    } else if (action === 'approve') {
      return await approvePR(req.body, GITHUB_TOKEN, res);
    } else if (action === 'reject') {
      return await rejectPR(req.body, GITHUB_TOKEN, res);
    } else if (action === 'preview-status') {
      return await getPreviewStatus(req.body, GITHUB_TOKEN, res);
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    console.error('Apply API error:', err);
    return res.status(500).json({ error: err.message });
  }
};

async function createPR(body, token, res) {
  const { path, patches, message } = body;
  if (!path || !patches?.length) return res.status(400).json({ error: 'path and patches required' });

  const repo = `${GITHUB_OWNER}/${GITHUB_REPO}`;

  // 1. Get main branch SHA
  const mainRef = await gh(`/repos/${repo}/git/ref/heads/main`, token);
  const mainSha = mainRef.object.sha;

  // 2. Create branch
  const branchName = `ac/${slugify(message || 'change')}-${Date.now().toString(36)}`;
  await gh(`/repos/${repo}/git/refs`, token, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: mainSha })
  });

  // 3. Get file or create new
  let content, fileSha;
  const isNew = body.isNewFile || (patches.length === 1 && patches[0].find === '');

  if (isNew) {
    content = patches[0].replace;
    fileSha = null;
  } else {
    const fileRes = await gh(`/repos/${repo}/contents/${path}?ref=${branchName}`, token);
    content = Buffer.from(fileRes.content, 'base64').toString('utf8');
    fileSha = fileRes.sha;
  }

  const applied = [];
  const failed = [];

  if (isNew) {
    applied.push('new file');
  } else {
    for (const patch of patches) {
      if (content.includes(patch.find)) {
        content = content.replace(patch.find, patch.replace);
        applied.push(patch.find.slice(0, 60));
      } else {
        failed.push(patch.find.slice(0, 60));
      }
    }
  }

  if (applied.length === 0) {
    await gh(`/repos/${repo}/git/refs/heads/${branchName}`, token, { method: 'DELETE' }).catch(() => {});
    return res.status(400).json({ error: 'No patches matched. File may have changed.' });
  }

  // 4. Commit
  const commitBody = {
    message: message || 'Change via Site Assistant',
    content: Buffer.from(content).toString('base64'),
    branch: branchName
  };
  if (fileSha) commitBody.sha = fileSha;

  await gh(`/repos/${repo}/contents/${path}`, token, {
    method: 'PUT',
    body: JSON.stringify(commitBody)
  });

  // 5. Create PR
  const pr = await gh(`/repos/${repo}/pulls`, token, {
    method: 'POST',
    body: JSON.stringify({
      title: `🧰 ${message || 'Site Assistant change'}`,
      head: branchName,
      base: 'main',
      body: `**Changed file:** \`${path}\`\n**Applied:** ${applied.length} patch(es)\n${failed.length ? `**Failed:** ${failed.length} patch(es)\n` : ''}\n---\n_Created by Site Assistant_`
    })
  });

  return res.json({
    success: true,
    pr_number: pr.number,
    pr_url: pr.html_url,
    branch: branchName,
    applied: applied.length,
    failed: failed.length,
    message: `PR #${pr.number} created. Vercel preview deploying…`
  });
}

async function approvePR(body, token, res) {
  const { pr_number } = body;
  if (!pr_number) return res.status(400).json({ error: 'pr_number required' });

  const repo = `${GITHUB_OWNER}/${GITHUB_REPO}`;

  await gh(`/repos/${repo}/pulls/${pr_number}/merge`, token, {
    method: 'PUT',
    body: JSON.stringify({
      merge_method: 'squash',
      commit_title: `🧰 Applied change via Site Assistant (PR #${pr_number})`
    })
  });

  const pr = await gh(`/repos/${repo}/pulls/${pr_number}`, token);
  if (pr.head?.ref) {
    await gh(`/repos/${repo}/git/refs/heads/${pr.head.ref}`, token, { method: 'DELETE' }).catch(() => {});
  }

  return res.json({
    success: true,
    merged: true,
    message: `✅ PR #${pr_number} merged. Production deploying now (~30s).`
  });
}

async function rejectPR(body, token, res) {
  const { pr_number } = body;
  if (!pr_number) return res.status(400).json({ error: 'pr_number required' });

  const repo = `${GITHUB_OWNER}/${GITHUB_REPO}`;

  await gh(`/repos/${repo}/pulls/${pr_number}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' })
  });

  const pr = await gh(`/repos/${repo}/pulls/${pr_number}`, token);
  if (pr.head?.ref) {
    await gh(`/repos/${repo}/git/refs/heads/${pr.head.ref}`, token, { method: 'DELETE' }).catch(() => {});
  }

  return res.json({
    success: true,
    closed: true,
    message: `PR #${pr_number} closed and branch deleted.`
  });
}

async function getPreviewStatus(body, token, res) {
  const { pr_number } = body;
  if (!pr_number) return res.status(400).json({ error: 'pr_number required' });

  const repo = `${GITHUB_OWNER}/${GITHUB_REPO}`;
  const pr = await gh(`/repos/${repo}/pulls/${pr_number}`, token);
  const headSha = pr.head?.sha;

  if (!headSha) return res.json({ status: 'pending', preview_url: null });

  const statuses = await gh(`/repos/${repo}/deployments?sha=${headSha}&per_page=5`, token);

  let previewUrl = null;
  let status = 'pending';

  if (statuses?.length) {
    const deployment = statuses[0];
    const deployStatuses = await gh(`/repos/${repo}/deployments/${deployment.id}/statuses`, token);
    const latest = deployStatuses?.[0];

    if (latest?.state === 'success') {
      status = 'ready';
      previewUrl = latest.environment_url || latest.target_url || deployment.payload?.url;
    } else if (latest?.state === 'failure' || latest?.state === 'error') {
      status = 'failed';
    }
  }

  if (!previewUrl && pr.head?.ref) {
    const branchSlug = pr.head.ref.replace(/\//g, '-');
    previewUrl = `https://${VERCEL_PROJECT}-git-${branchSlug}-${GITHUB_OWNER}.vercel.app`;
  }

  return res.json({ status, preview_url: previewUrl, pr_url: pr.html_url });
}
