/* ==========================================================
   FIRST 10 DAYS — tiny in-browser test harness
   There's no Node or Python on this machine, so tests run in a
   page: serve the project with tools/serve.ps1 -Port 8778, open
   /tests/, and read window.__testResults (or the page itself).
   ========================================================== */

(function () {
  const TIMEOUT_MS = 5000;
  const tests = [];
  const loadErrors = [];

  // A script that fails to load or throws while loading would otherwise
  // just drop its tests silently, so report those as failures too.
  window.addEventListener('error', (e) => {
    if (e.target && e.target !== window && e.target.getAttribute) {
      loadErrors.push(`could not load ${e.target.getAttribute('src')}`);
    } else if (e.message) {
      loadErrors.push(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`);
    }
  }, true);

  // JSON with sorted keys, so objects compare by value whatever their key order.
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    }
    return String(JSON.stringify(value));
  }

  function fail(message, detail) {
    throw new Error(message ? `${message}: ${detail}` : detail);
  }

  window.test = (name, fn) => { tests.push({ name, fn }); };

  window.assert = (cond, message) => {
    if (!cond) throw new Error(message || 'assertion failed');
  };

  window.assertEqual = (actual, expected, message) => {
    const structured = (actual !== null && typeof actual === 'object') || (expected !== null && typeof expected === 'object');
    const same = structured ? stable(actual) === stable(expected) : actual === expected;
    if (!same) fail(message, `expected ${stable(expected)}, got ${stable(actual)}`);
  };

  window.assertClose = (actual, expected, tol = 1e-6, message) => {
    if (typeof actual !== 'number' || !(Math.abs(actual - expected) <= tol)) {
      fail(message, `expected ${expected} ± ${tol}, got ${stable(actual)}`);
    }
  };

  window.assertIncludes = (haystack, needle, message) => {
    if (typeof haystack !== 'string' || !haystack.includes(needle)) {
      fail(message, `expected ${stable(haystack)} to include ${stable(needle)}`);
    }
  };

  window.withStorage = (entries, fn) => {
    const saved = {};
    Object.keys(entries).forEach(k => {
      saved[k] = localStorage.getItem(k);
      localStorage.setItem(k, entries[k]);
    });
    try {
      return fn();
    } finally {
      Object.keys(saved).forEach(k => {
        if (saved[k] === null) localStorage.removeItem(k);
        else localStorage.setItem(k, saved[k]);
      });
    }
  };

  function withTimeout(fn) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    });
    return Promise.race([Promise.resolve().then(fn), timeout]).finally(() => clearTimeout(timer));
  }

  function render(lines, results) {
    const out = document.getElementById('results');
    if (!out) return;
    out.textContent = '';
    lines.forEach(line => {
      const row = document.createElement('div');
      row.className = line.ok ? 'pass' : 'fail';
      row.textContent = line.text;
      out.appendChild(row);
    });
    const total = document.createElement('div');
    total.textContent = `${results.passed} passed, ${results.failed} failed`;
    out.appendChild(total);
  }

  async function run() {
    const results = { passed: 0, failed: 0, failures: [] };
    const lines = [];

    loadErrors.forEach(message => {
      results.failed++;
      results.failures.push({ name: 'load error', message });
      lines.push({ ok: false, text: `FAIL load error — ${message}` });
    });

    for (const t of tests) {
      try {
        await withTimeout(t.fn);
        results.passed++;
        lines.push({ ok: true, text: `PASS ${t.name}` });
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        results.failed++;
        results.failures.push({ name: t.name, message });
        lines.push({ ok: false, text: `FAIL ${t.name} — ${message}` });
      }
    }

    render(lines, results);
    window.__testResults = results;
    return results;
  }

  let resolveDone;
  window.__testsDone = new Promise(resolve => { resolveDone = resolve; });
  window.addEventListener('load', () => { run().then(resolveDone); });
})();
