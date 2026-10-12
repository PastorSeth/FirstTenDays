/* ==========================================================
   FIRST 10 DAYS — Study text formatter
   Turns the plain-text marks used in data.js (## headings,
   * bullets, 1. numbers, > pull quotes, **bold**, [label](link))
   into HTML. Text is escaped before any mark is applied, so a
   stray < or & can never break the page, and a mark that isn't
   finished just shows up as the characters that were typed.
   ========================================================== */

/* Anything typed by a person (a student's name, the study text) goes
   through this before it lands in the page. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------- Typesetting ---------- */

// A quote right after one of these (or at the very start) opens; anywhere
// else it closes — which is also what turns don't into don’t.
const OPENING_QUOTE_CONTEXT = /[\s([{—–-]/;

function curlQuotes(text, before) {
  let out = '';
  let prev = before;
  for (const ch of text) {
    if (ch === '"' || ch === "'") {
      const opening = prev === '' || OPENING_QUOTE_CONTEXT.test(prev);
      out += ch === '"' ? (opening ? '“' : '”') : (opening ? '‘' : '’');
    } else {
      out += ch;
    }
    prev = ch;
  }
  return out;
}

/* `before` is the character just ahead of this text in the original line,
   so a quote right after a link still curls the right way. */
function typesetAfter(text, before) {
  const dashed = String(text).replace(/(\d)-(?=\d)/g, '$1–');   // 1:1-4 → 1:1–4
  return escapeHtml(curlQuotes(dashed, before));
}

/* Plain text made print-ready: en dashes in number ranges, curly quotes,
   and HTML escaped. */
function typeset(text) {
  return typesetAfter(text, '');
}

/* ---------- Inline marks: **bold** and [label](link) ---------- */

const LINK_MARK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const SAFE_LINK = /^(https?:\/\/|#\/)/i;

function emphasize(html) {
  return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function formatInline(text) {
  const source = String(text);
  let out = '';
  let last = 0;
  let match;

  LINK_MARK.lastIndex = 0;
  while ((match = LINK_MARK.exec(source)) !== null) {
    const [whole, label, url] = match;
    out += emphasize(typesetAfter(source.slice(last, match.index), source[last - 1] || ''));

    if (SAFE_LINK.test(url)) {
      // The address is only escaped, never typeset: "1-3-john" has to stay
      // exactly as written or the link breaks.
      const external = /^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : '';
      out += `<a href="${escapeHtml(url)}"${external}>${emphasize(typesetAfter(label, '['))}</a>`;
    } else {
      out += emphasize(typesetAfter(whole, source[match.index - 1] || ''));
    }
    last = match.index + whole.length;
  }

  out += emphasize(typesetAfter(source.slice(last), source[last - 1] || ''));
  return out;
}

/* ---------- Block marks: a whole day's study ---------- */

const HEADING_MARK = /^#{1,2}\s+(.+)$/;
const BULLET_MARK = /^[*-]\s+(.+)$/;
const NUMBER_MARK = /^(\d+)\.\s+(.+)$/;
const QUOTE_MARK = /^>\s+(.+)$/;

function renderGroup(group) {
  const items = group.items.map(formatInline);
  if (group.kind === 'quote') {
    return `<blockquote class="pull" data-reveal><p>${items.join('<br>')}</p></blockquote>`;
  }
  const list = items.map(item => `<li>${item}</li>`).join('');
  if (group.kind === 'ul') return `<ul class="study-ul">${list}</ul>`;
  const start = group.start !== 1 ? ` start="${group.start}"` : '';
  return `<ol class="study-ol"${start}>${list}</ol>`;
}

/* Each line of text is its own paragraph; blank lines are optional.
   Lines are trimmed first, so indenting the text inside the backticks
   (or pasting it with Windows line endings) doesn't matter. */
function formatStudy(text) {
  if (typeof text !== 'string') return '';

  const blocks = [];
  let open = null;   // the bullet list, numbered list, or quote being built

  function flush() {
    if (open) blocks.push(renderGroup(open));
    open = null;
  }

  function groupOf(kind, start) {
    if (!open || open.kind !== kind) {
      flush();
      open = { kind, start, items: [] };
    }
    return open;
  }

  text.split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if (!line) return;

    let m;
    if ((m = line.match(HEADING_MARK))) {
      flush();
      blocks.push(`<h2 class="study-h">${formatInline(m[1])}</h2>`);
    } else if ((m = line.match(BULLET_MARK))) {
      groupOf('ul').items.push(m[1]);
    } else if ((m = line.match(NUMBER_MARK))) {
      groupOf('ol', Number(m[1])).items.push(m[2]);
    } else if ((m = line.match(QUOTE_MARK))) {
      groupOf('quote').items.push(m[1]);
    } else {
      flush();
      blocks.push(`<p>${formatInline(line)}</p>`);
    }
  });

  flush();
  return blocks.join('');
}
