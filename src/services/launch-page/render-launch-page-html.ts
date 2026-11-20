/**
 * Self-contained launch page (ADR 035): no external assets, inline CSS + JS.
 * The page POSTs the hub launch endpoint, polls the run job, then redirects to webUrl + path.
 */

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** JSON for an inline <script>: no `</script>` breakout, no raw line separators. */
const toInlineJson = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');

const PAGE_STYLES = `
  :root { --bg: #f7f7f8; --card: #ffffff; --text: #18181b; --muted: #71717a; --border: #e4e4e7; --error: #b91c1c; --accent: #2563eb; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #09090b; --card: #18181b; --text: #fafafa; --muted: #a1a1aa; --border: #27272a; --error: #f87171; --accent: #60a5fa; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;
         background: var(--bg); color: var(--text); font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .card { width: 100%; max-width: 440px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
  h1 { margin: 0 0 8px; font-size: 17px; font-weight: 600; }
  p { margin: 0; color: var(--muted); }
  .row { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
  .spinner { width: 16px; height: 16px; flex: none; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error { color: var(--error); }
  .hint { margin-top: 12px; font-size: 13px; }
  .elapsed { margin-left: auto; font-variant-numeric: tabular-nums; font-size: 13px; color: var(--muted); }
`;

const PAGE_SCRIPT = `
(function () {
  var cfg = JSON.parse(document.getElementById('launch-config').textContent);
  var statusEl = document.getElementById('status');
  var elapsedEl = document.getElementById('elapsed');
  var spinnerEl = document.getElementById('spinner');
  var hintEl = document.getElementById('hint');
  var startedAt = Date.now();
  var MAX_WAIT_MS = 6 * 60 * 1000;
  var timer = setInterval(function () {
    elapsedEl.textContent = Math.round((Date.now() - startedAt) / 1000) + 's';
  }, 1000);

  function fail(message, hint) {
    clearInterval(timer);
    spinnerEl.style.display = 'none';
    statusEl.textContent = message;
    statusEl.className = 'error';
    hintEl.textContent = hint || 'Check the ' + cfg.projectName + ' terminals in Luckee Hub.';
  }

  function go(origin) {
    statusEl.textContent = 'Opening ' + cfg.projectName + '...';
    window.location.replace(origin.replace(/\\/$/, '') + cfg.path);
  }

  function readJson(response) {
    return response.json().catch(function () { return { success: false, error: 'Unexpected response (' + response.status + ')' }; });
  }

  function poll(jobId) {
    if (Date.now() - startedAt > MAX_WAIT_MS) {
      fail(cfg.projectName + ' did not start in time.');
      return;
    }
    fetch('/api/launcher/jobs/' + encodeURIComponent(jobId))
      .then(readJson)
      .then(function (body) {
        if (!body.success) { fail(body.error || 'Launch job not found.'); return; }
        var job = body.data;
        if (job.status === 'completed' && job.webUrl) { go(job.webUrl); return; }
        if (job.status === 'completed') { fail(job.message || 'Web URL not detected.'); return; }
        if (job.status === 'failed') { fail(job.message || 'Start failed.'); return; }
        if (job.message) { statusEl.textContent = job.message; }
        setTimeout(function () { poll(jobId); }, 1000);
      })
      .catch(function () { fail("Lost contact with Luckee Hub.", 'Is luckee-hub-express-server still running?'); });
  }

  fetch('/api/launcher/projects/' + encodeURIComponent(cfg.projectId) + '/launch', { method: 'POST' })
    .then(readJson)
    .then(function (body) {
      if (!body.success) { fail(body.error || 'Launch failed.'); return; }
      var result = body.data;
      if (result.status === 'ready') { go(result.webUrl); return; }
      statusEl.textContent = result.message;
      poll(result.jobId);
    })
    .catch(function () { fail("Luckee Hub isn't responding.", 'Start luckee-hub-express-server and try again.'); });
})();
`;

const renderShell = (title: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<main class="card">
${body}
</main>
</body>
</html>`;

/**
 * Launch page that finds or starts the project, then redirects to `path` on its live origin.
 */
export const renderLaunchPageHtml = (input: {
  projectId: string;
  projectName: string;
  path: string;
}): string =>
  `${renderShell(
    `Opening ${input.projectName}…`,
    `<h1>Opening ${escapeHtml(input.projectName)}</h1>
<p>Finding the running app, or starting it in Luckee Hub.</p>
<div class="row"><span class="spinner" id="spinner"></span><span id="status">Checking ${escapeHtml(input.projectName)}...</span><span class="elapsed" id="elapsed">0s</span></div>
<p class="hint" id="hint"></p>
<script type="application/json" id="launch-config">${toInlineJson(input)}</script>
<script>${PAGE_SCRIPT}</script>`,
  )}`;

/**
 * Error page for a bad launch link (unknown project, invalid path).
 */
export const renderLaunchErrorHtml = (message: string): string =>
  renderShell(
    'Launch link error',
    `<h1>Can't open this link</h1>
<p class="error">${escapeHtml(message)}</p>`,
  );
