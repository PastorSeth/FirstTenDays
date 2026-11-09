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
const OPENING_QUOTE_CONTEXT = /[\s([{—–=-]/;

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
function typesetPlain(text, before) {
  const dashed = String(text).replace(/(\d)-(?=\d)/g, '$1–');   // 1:1-4 → 1:1–4
  return curlQuotes(dashed, before);
}

function typesetAfter(text, before) {
  return escapeHtml(typesetPlain(text, before));
}

/* Plain text made print-ready: en dashes in number ranges, curly quotes,
   and HTML escaped. */
function typeset(text) {
  return typesetAfter(text, '');
}

/* ---------- Inline marks: **bold**, _italic_, ==highlight==,
   {{word|definition}} and [label](link) ---------- */

const LINK_MARK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const SAFE_LINK = /^(https?:\/\/|#\/)/i;

/* A highlighter stroke that sweeps across word by word, so it can wrap
   onto a second line and still fill in order. */
function highlight(inner) {
  const words = inner.split(' ');
  const spans = words.map((word, i) =>
    `<span class="hl-w" style="--i:${i}">${word}${i < words.length - 1 ? ' ' : ''}</span>`);
  return `<mark class="hl" data-fx style="--n:${words.length}">${spans.join('')}</mark>`;
}

/* Runs on text that's already escaped, so everything it adds is markup
   and everything the person typed stays text. */
function emphasize(html) {
  return html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])_([^_\n]+?)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/==(.+?)==/g, (all, inner) => highlight(inner))
    .replace(/\{\{([^{}|\n]+)\|([^{}\n]+)\}\}/g,
      '<button type="button" class="vocab" data-def="$2">$1</button>');
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

/* ---------- Effects: ::: blocks ----------
   A line like "::: stack" starts an effect and a line of just ":::" ends
   it. "::: video ID" and "::: trinity" stand on one line by themselves.
   An effect name this file doesn't know shows up as the typed text. */

const BLOCK_OPEN = /^:::\s*([a-z]+)\s*(.*)$/i;
const BLOCK_CLOSE = /^:::$/;
const PANEL_MARK = /^\+\s+(.+)$/;

/* Splits lines into the part before the first "+ Title" line and one
   section per title. */
function sections(lines) {
  const intro = [];
  const parts = [];
  lines.forEach(line => {
    const m = line.match(PANEL_MARK);
    if (m) parts.push({ title: m[1], lines: [] });
    else (parts.length ? parts[parts.length - 1].lines : intro).push(line);
  });
  return { intro, parts };
}

/* Wraps each visible letter of some formatted HTML in its own span,
   leaving tags whole and counting an entity like &amp; as one letter. */
function wrapChars(html) {
  let out = '';
  let n = 0;
  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      out += html.slice(i, end + 1);
      i = end;
    } else {
      let ch = html[i];
      if (ch === '&') {
        const end = html.indexOf(';', i);
        ch = html.slice(i, end + 1);
        i = end;
      }
      out += `<span class="ch" style="--i:${n}">${ch}</span>`;
      n++;
    }
  }
  return { html: out, count: n };
}

const PERSONS = [
  { id: 'father', name: 'Father', x: 62, y: 62 },
  { id: 'son', name: 'Son', x: 258, y: 62 },
  { id: 'spirit', name: 'Holy Spirit', x: 160, y: 246 }
];
const GOD = { x: 160, y: 134 };

function personCaption(p) {
  const others = PERSONS.filter(o => o !== p).map(o => `the ${o.name}`);
  return `The ${p.name} is God. The ${p.name} is not ${others[0]}, and not ${others[1]}.`;
}

/* The Shield of the Trinity: three persons, each fully God, none the
   same as another. Tapping a person picks out their lines. */
function trinityHtml() {
  const line = (a, b, cls, label, lx, ly) =>
    `<line class="tri-link ${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>` +
    `<text class="tri-label ${cls}" x="${lx}" y="${ly}">${label}</text>`;
  const [f, s, h] = PERSONS;
  const links =
    line(f, s, 'is-not with-father with-son', 'is not', 160, 56) +
    line(s, h, 'is-not with-son with-spirit', 'is not', 226, 160) +
    line(h, f, 'is-not with-spirit with-father', 'is not', 94, 160) +
    line(f, GOD, 'is with-father', 'is', 108, 104) +
    line(s, GOD, 'is with-son', 'is', 212, 104) +
    line(h, GOD, 'is with-spirit', 'is', 172, 196);
  const nodes = PERSONS.map(p =>
    `<g class="tri-node" data-person="${p.id}" data-caption="${personCaption(p)}" role="button" tabindex="0" aria-label="${p.name}">` +
    `<circle cx="${p.x}" cy="${p.y}" r="38"/><text x="${p.x}" y="${p.y}">${p.name === 'Holy Spirit' ? '<tspan x="160" dy="-0.45em">Holy</tspan><tspan x="160" dy="1.05em">Spirit</tspan>' : p.name}</text></g>`).join('');
  const god = `<g class="tri-god" role="button" tabindex="0" aria-label="God: show all three"><circle cx="${GOD.x}" cy="${GOD.y}" r="34"/><text x="${GOD.x}" y="${GOD.y}">God</text></g>`;
  return `<div class="fx-trinity" data-fx data-focus="">` +
    `<svg viewBox="0 0 320 300" role="img" aria-label="The Shield of the Trinity">${links}${god}${nodes}</svg>` +
    `<p class="tri-caption" aria-live="polite">Tap Father, Son, or Holy Spirit.</p>` +
    `<p class="sr-only">The Father is God, the Son is God, and the Holy Spirit is God. The Father is not the Son, the Son is not the Holy Spirit, and the Holy Spirit is not the Father.</p>` +
    `</div>`;
}

/* The red-pencil line: one span per word, so it can follow the phrase
   from one line onto the next. */
function pencilWords(phrase) {
  const words = phrase.split(' ').map((w, i) => `<span class="pw" style="--i:${i}">${escapeHtml(w)}</span>`);
  return `<span class="pencil">${words.join(' ')}</span>`;
}

/* A typewriter quote with its first `k` letters typed. The rest is there
   but invisible, so the page never changes height as it types. `start`
   and `end` mark the pencil-line phrase (-1 when there isn't one). */
function typewriterHtml(full, start, end, k) {
  let typed;
  if (start < 0 || k <= start) {
    typed = escapeHtml(full.slice(0, k));
  } else {
    typed = escapeHtml(full.slice(0, start));
    typed += k >= end
      ? pencilWords(full.slice(start, end))
      : `<span class="pencil">${escapeHtml(full.slice(start, k))}</span>`;
    if (k > end) typed += escapeHtml(full.slice(end, k));
  }
  return `<span class="tw-typed">${typed}</span><span class="tw-caret" aria-hidden="true"></span>` +
    `<span class="tw-untyped">${escapeHtml(full.slice(k))}</span>`;
}

// A signature picture has to be a file on this site, like images/name.webp.
const SIGNATURE_PICTURE = /^[\w-]+(\/[\w-]+)*\.(webp|png|jpe?g|svg)$/i;

const BLOCKS = {
  // A quote typed onto a sheet of paper as it's read. "==words==" get a red
  // pencil line once it's all typed, and "Name | picture" signs it.
  typewriter(lines, arg) {
    const [name = '', picture = ''] = arg.split('|').map(s => s.trim());
    const raw = lines.join(' ');
    const m = raw.match(/==(.+?)==/);
    const before = m ? raw.slice(0, m.index) : raw;
    const phrase = m ? m[1] : '';
    const after = m ? raw.slice(m.index + m[0].length) : '';
    const plainBefore = typesetPlain(before, '');
    const plainPhrase = typesetPlain(phrase, before.slice(-1));
    const plainAfter = typesetPlain(after, (phrase || before).slice(-1));
    const full = plainBefore + plainPhrase + plainAfter;
    const start = m ? plainBefore.length : -1;
    const end = m ? start + plainPhrase.length : -1;
    const mark = m ? ` data-mark-start="${start}" data-mark-end="${end}"` : '';
    const sign = SIGNATURE_PICTURE.test(picture)
      ? `<img class="tw-signature" src="${escapeHtml(picture)}" alt="${escapeHtml(name)}">`
      : (name ? `<p class="tw-name">${typeset(name)}</p>` : '');
    return `<figure class="fx-typewriter is-done" data-typewriter><div class="tw-page">` +
      `<p class="tw-text" aria-hidden="true" data-text="${escapeHtml(full)}"${mark}>${typewriterHtml(full, start, end, full.length)}</p>` +
      `<p class="sr-only">${escapeHtml(full)}</p>${sign}</div></figure>`;
  },

  // Two or more tabbed panels, one showing at a time: "+ Title" starts each.
  swap(lines) {
    const { intro, parts } = sections(lines);
    if (parts.length < 2) return formatStudy(lines.join('\n'));
    const tabs = parts.map((p, i) =>
      `<button type="button" class="swap-tab" aria-pressed="${i === 0}" data-panel="${i}">${typeset(p.title)}</button>`).join('');
    const panels = parts.map((p, i) =>
      `<div class="swap-panel${i === 0 ? ' is-on' : ''}" data-panel="${i}"${i === 0 ? '' : ' aria-hidden="true"'}>${formatStudy(p.lines.join('\n'))}</div>`).join('');
    return `${formatStudy(intro.join('\n'))}<div class="fx-swap" data-fx><div class="swap-tabs">${tabs}</div><div class="swap-panels">${panels}</div></div>`;
  },

  // A Bible verse, set apart, with its reference underneath.
  scripture(lines, ref) {
    return `<blockquote class="scripture"><p>${lines.map(formatInline).join('<br>')}</p>${ref ? `<cite>${typeset(ref)}</cite>` : ''}</blockquote>`;
  },

  // A long quote that lights up word by word as it's scrolled through.
  reveal(lines, who) {
    const words = typeset(lines.join(' ')).split(/\s+/).filter(Boolean);
    const spans = words.map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');
    return `<blockquote class="fx-reveal" data-scrub style="--n:${words.length}"><p>${spans}</p>${who ? `<cite>${typeset(who)}</cite>` : ''}</blockquote>`;
  },

  // Key words broken down one at a time: "+ WORD", then what it means.
  terms(lines) {
    const { intro, parts } = sections(lines);
    const terms = parts.map(p => {
      const word = typeset(p.title);
      return `<div class="term" data-fx><p class="term-word"><span class="term-outline">${word}</span>` +
        `<span class="term-mask" aria-hidden="true"><span class="term-solid">${word}</span></span></p>` +
        `<div class="term-body">${formatStudy(p.lines.join('\n'))}</div></div>`;
    }).join('');
    return `${formatStudy(intro.join('\n'))}<div class="fx-terms">${terms}</div>`;
  },

  // Each line types itself out, letter by letter.
  type(lines) {
    return lines.map(line => {
      const inner = formatInline(line);
      const chars = wrapChars(inner);
      return `<p class="fx-type" data-fx style="--n:${chars.count}"><span class="sr-only">${inner}</span>` +
        `<span class="type-chars" aria-hidden="true">${chars.html}</span></p>`;
    }).join('');
  },

  // Big words stamped down one line at a time.
  stack(lines) {
    return `<div class="fx-stack" data-fx>${lines.map((l, i) =>
      `<p class="stack-line" style="--i:${i}">${formatInline(l)}</p>`).join('')}</div>`;
  },

  // A dark panel that fills with light as its lines arrive.
  light(lines) {
    return `<div class="fx-light" data-fx><div class="light-glow" aria-hidden="true"></div>` +
      `<div class="light-body">${formatStudy(lines.join('\n'))}</div></div>`;
  }
};

const ONE_LINE_BLOCKS = {
  video(id) {
    if (!/^[\w-]{11}$/.test(id)) return null;
    return `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video" loading="lazy" ` +
      `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  },
  trinity() {
    return trinityHtml();
  }
};

/* ---------- Block marks: a whole day's study ---------- */

const HEADING_MARK = /^#{1,2}\s+(.+)$/;
const BULLET_MARK = /^[*-]\s+(.+)$/;
const SUB_BULLET_MARK = /^--\s+(.+)$/;
const NUMBER_MARK = /^(\d+)\.\s+(.+)$/;
const QUOTE_MARK = /^>\s+(.+)$/;

function renderGroup(group) {
  if (group.kind === 'quote') {
    return `<blockquote class="pull" data-reveal><p>${group.items.map(item => formatInline(item.text)).join('<br>')}</p></blockquote>`;
  }
  const list = group.items.map(item => {
    const subs = item.subs.length
      ? `<ul class="study-ul study-ul--sub">${item.subs.map(s => `<li>${formatInline(s)}</li>`).join('')}</ul>`
      : '';
    return `<li>${formatInline(item.text)}${subs}</li>`;
  }).join('');
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

  const lines = text.split(/\r?\n/).map(raw => raw.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    let m = line.match(BLOCK_OPEN);
    if (m) {
      const name = m[1].toLowerCase();
      const arg = m[2].trim();
      if (Object.prototype.hasOwnProperty.call(ONE_LINE_BLOCKS, name)) {
        const html = ONE_LINE_BLOCKS[name](arg);
        if (html) {
          flush();
          blocks.push(html);
          continue;
        }
      } else if (Object.prototype.hasOwnProperty.call(BLOCKS, name)) {
        let end = i + 1;
        while (end < lines.length && !BLOCK_CLOSE.test(lines[end])) end++;
        flush();
        blocks.push(BLOCKS[name](lines.slice(i + 1, end).filter(Boolean), arg));
        i = end;
        continue;
      }
    }

    if ((m = line.match(HEADING_MARK))) {
      flush();
      blocks.push(`<h2 class="study-h">${formatInline(m[1])}</h2>`);
    } else if ((m = line.match(SUB_BULLET_MARK))) {
      if (open && open.kind === 'ul' && open.items.length) open.items[open.items.length - 1].subs.push(m[1]);
      else groupOf('ul').items.push({ text: m[1], subs: [] });
    } else if ((m = line.match(BULLET_MARK))) {
      groupOf('ul').items.push({ text: m[1], subs: [] });
    } else if ((m = line.match(NUMBER_MARK))) {
      groupOf('ol', Number(m[1])).items.push({ text: m[2], subs: [] });
    } else if ((m = line.match(QUOTE_MARK))) {
      groupOf('quote').items.push({ text: m[1], subs: [] });
    } else {
      flush();
      blocks.push(`<p>${formatInline(line)}</p>`);
    }
  }

  flush();
  return blocks.join('');
}
