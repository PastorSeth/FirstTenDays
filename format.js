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
   onto a second line and still fill in order.

   Inside it, [circle]…[/circle], [underline]…[/underline],
   [squiggle]…[/squiggle] and [double]…[/double] mark words for a red pen
   to go over once the highlighter is done (app.js draws them). The marked
   words get a .pen-t span saying which mark they belong to. */
const PEN_TAG = /\[(\/?)(circle|underline|squiggle|double)\]/g;

function highlight(inner) {
  const kinds = [];
  const words = [[]];
  let pen = -1;
  let last = 0;
  const add = text => text.split(' ').forEach((piece, i) => {
    if (i) words.push([]);
    if (piece) words[words.length - 1].push({ text: piece, pen });
  });

  PEN_TAG.lastIndex = 0;
  let tag;
  while ((tag = PEN_TAG.exec(inner)) !== null) {
    add(inner.slice(last, tag.index));
    last = tag.index + tag[0].length;
    if (tag[1]) pen = -1;
    else { kinds.push(tag[2]); pen = kinds.length - 1; }
  }
  add(inner.slice(last));

  const spans = words.map((pieces, i) => {
    const word = pieces.map(p => (p.pen < 0 ? p.text : `<span class="pen-t" data-pen="${p.pen}">${p.text}</span>`)).join('');
    return `<span class="hl-w" style="--i:${i}">${word}${i < words.length - 1 ? ' ' : ''}</span>`;
  });
  const pens = kinds.length ? ` data-pen="${kinds.join(' ')}"` : '';
  return `<mark class="hl" data-fx${pens} style="--n:${words.length}">${spans.join('')}</mark>`;
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

// The "again" arrow on an echo's button, and the pen underline under a
// bold echo word (two quick strokes, drawn left to right).
const ECHO_ICON = '<svg class="echo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
const ECHO_UNDERLINE = '<svg class="echo-underline" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
  '<path pathLength="1" d="M2,6 C28,2 70,9 98,4"/><path pathLength="1" d="M5,15 C34,11 66,17 95,12"/></svg>';

/* Day 5's Gospel bridge, drawn like a sketch on a napkin: God's cliff on the
   right, ours on the left, the pit of sin between, the cross spanning it,
   and a person who walks across in faith. The lines were roughened by hand
   once (so they wobble the same on every visit) and are kept here as they
   are. Each line and label has a data-at window: the stretch of the scroll,
   from 0 (GOD begins) to 4 (RESPONSE ends), over which app.js draws it. */
const BRIDGE_SUMMARY = 'The Gospel bridge: God on one side and man on the other, with sin as the gap between them, and the cross of Jesus bridging it so that a person can cross over to God in faith.';
const BRIDGE_ART =`
  <path d="M252.1,228.0L251.5,225.0L250.9,222.0L250.7,219.1L250.8,216.1L251.0,213.1L251.1,210.1L251.0,207.1L250.7,204.1L250.5,201.1L250.5,198.1L250.8,195.1L251.4,192.2L251.8,189.2L252.1,186.2L252.1,183.2L252.0,180.2L252.0,177.2L252.3,174.2L252.7,171.2L253.1,168.3L253.3,165.3L253.1,162.3L252.8,159.3L252.4,156.3L252.1,153.3L252.1,150.3L252.1,147.3L252.0,144.3L251.5,141.4L251.0,138.4L250.9,135.3L251.6,132.3L252.9,129.5L254.9,127.1L257.3,125.1L259.8,123.3L262.4,121.7L265.2,120.3L268.2,119.4L271.2,119.0L274.3,119.1L277.4,119.5L280.3,119.7L283.3,119.7L286.3,119.6L289.3,119.5L292.3,119.7L295.3,120.1L298.3,120.6L301.3,121.0L304.2,121.1L307.2,120.9L310.2,120.6L313.2,120.5L316.2,120.6L319.2,120.8L322.2,120.9L325.2,120.8L328.1,120.4L331.1,119.9L334.1,119.4L337.1,119.2L340.1,119.2L343.1,119.3L346.1,119.2L349.0,118.8L352.0,118.3L354.9,117.8L357.9,117.6" pathLength="1" data-at="0,0.45"/><path class="again" d="M252.3,228.0L253.0,225.0L253.0,222.0L252.7,219.0L252.5,216.0L252.9,213.1L253.5,210.1L253.7,207.1L253.2,204.1L252.4,201.1L251.8,198.1L251.7,195.1L251.9,192.2L251.8,189.2L251.2,186.2L250.4,183.2L249.9,180.2L250.2,177.2L250.8,174.2L251.1,171.2L251.0,168.3L250.7,165.3L250.8,162.3L251.5,159.3L252.4,156.3L252.8,153.3L252.7,150.3L252.2,147.3L252.1,144.3L252.3,141.3L252.9,138.5L253.3,135.9L253.5,133.1L254.0,130.2L255.4,127.5L257.6,125.5L260.1,123.9L262.7,122.3L265.3,120.5L268.1,119.0L271.2,118.3L274.3,118.4L277.3,118.9L280.3,119.0L283.3,118.7L286.3,118.5L289.3,118.8L292.3,119.7L295.3,120.6L298.3,121.0L301.3,120.9L304.2,120.6L307.2,120.8L310.2,121.4L313.2,121.8L316.2,121.6L319.2,120.9L322.2,120.1L325.2,119.8L328.1,119.9L331.1,119.9L334.1,119.5L337.1,118.6L340.1,117.9L343.0,117.8L346.0,118.2L349.0,118.6L352.0,118.6L355.0,118.1L357.9,117.8" pathLength="1" data-at="0.158,0.563"/>
  <g class="red rays">
  <path d="M295.6,69.0 Q288.7,69.9 281.8,70.1" pathLength="1" data-at="0.440,0.490"/>
  <path d="M297.9,56.2 Q293.8,50.5 288.8,45.7" pathLength="1" data-at="0.500,0.550"/>
  <path d="M317.0,46.3 Q316.8,39.7 318.1,33.1" pathLength="1" data-at="0.560,0.610"/>
  <path d="M337.1,58.8 Q344.4,52.9 350.7,46.0" pathLength="1" data-at="0.620,0.670"/>
  <path d="M337.7,69.6 Q344.9,68.5 352.1,68.6" pathLength="1" data-at="0.680,0.730"/>
  </g>
  <text class="hand" x="318" y="85" data-at="0.22,0.42" font-size="34.5">GOD</text>
  <text class="hand" x="306" y="146" data-at="0.75,0.83" font-size="18.4">Perfect</text>
  <text class="hand" x="306" y="166" data-at="0.84,0.91" font-size="18.4">Just</text>
  <text class="hand" x="306" y="186" data-at="0.92,0.99" font-size="18.4">Holy</text>
  <path d="M1.9,120.3L5.0,120.4L8.0,120.8L11.1,121.2L14.1,121.4L17.1,121.3L20.1,121.1L23.1,120.9L26.2,121.0L29.2,121.3L32.2,121.6L35.2,121.5L38.2,121.2L41.3,120.7L44.3,120.3L47.3,120.2L50.3,120.3L53.3,120.5L56.4,120.4L59.4,120.0L62.4,119.6L65.4,119.3L68.4,119.4L71.4,119.7L74.5,120.0L77.5,120.1L80.5,119.9L83.5,119.5L86.5,119.5L89.6,120.0L92.4,121.0L95.1,122.3L97.6,123.7L100.0,125.2L102.2,127.0L104.0,129.3L105.2,131.9L105.9,134.8L106.4,137.6L107.0,140.5L107.7,143.5L108.4,146.5L108.9,149.5L109.1,152.5L109.1,155.5L109.0,158.5L109.2,161.6L109.6,164.6L110.0,167.6L110.1,170.6L109.9,173.7L109.4,176.7L108.9,179.7L108.7,182.7L108.7,185.7L108.7,188.8L108.6,191.8L108.1,194.8L107.5,197.8L107.1,200.8L107.0,203.8L107.2,206.9L107.6,209.9L107.7,212.9L107.7,216.0L107.6,219.0L107.7,222.0L108.1,225.0L108.9,228.0" pathLength="1" data-at="1,1.3"/><path class="again" d="M1.9,119.9L4.9,119.3L7.9,118.8L11.0,118.9L14.0,119.5L17.1,120.1L20.1,120.5L23.1,120.4L26.2,120.2L29.2,120.3L32.2,120.8L35.2,121.6L38.2,122.2L41.2,122.2L44.3,121.9L47.3,121.5L50.3,121.6L53.3,122.0L56.3,122.4L59.4,122.3L62.4,121.7L65.4,120.9L68.4,120.3L71.5,120.3L74.5,120.4L77.5,120.3L80.5,119.7L83.4,118.8L86.5,118.1L89.8,118.1L92.9,119.0L95.8,120.4L98.6,121.9L101.4,123.5L103.9,125.5L105.8,128.2L106.8,131.3L107.0,134.5L107.1,137.5L107.3,140.5L107.7,143.5L108.0,146.5L107.9,149.5L107.3,152.5L106.8,155.6L106.6,158.6L107.0,161.6L107.6,164.6L107.9,167.6L107.7,170.6L107.4,173.6L107.3,176.6L107.7,179.7L108.4,182.7L109.1,185.7L109.3,188.8L109.1,191.8L108.8,194.8L108.9,197.8L109.5,200.8L110.1,203.9L110.4,206.9L110.1,209.9L109.6,212.9L109.2,215.9L109.3,218.9L109.7,221.9L110.0,224.9L109.9,227.9" pathLength="1" data-at="1.105,1.375"/>
  <text class="hand" x="27" y="77" data-at="1.45,1.65" font-size="23">MAN</text>
  <path class="pit" d="M114.2,145.4 Q119.7,150.0 125.7,154.3" pathLength="1" data-at="1.620,1.670"/>
  <path class="pit" d="M245.3,149.5 Q239.5,154.5 234.2,159.9" pathLength="1" data-at="1.690,1.740"/>
  <path class="pit" d="M112.8,165.1 Q119.1,172.2 126.3,178.5" pathLength="1" data-at="1.760,1.810"/>
  <path class="pit" d="M247.8,173.7 Q240.6,179.8 233.5,186.0" pathLength="1" data-at="1.830,1.880"/>
  <text class="hand red" x="142" y="212" data-at="1.9,2" font-size="34.5">SIN</text>
  <path class="red thick" d="M175.1,229.0L175.1,226.0L175.2,223.0L175.2,220.0L175.1,217.0L175.0,214.0L174.9,211.0L174.9,208.0L174.9,205.0L174.9,202.0L174.8,199.0L174.7,195.9L174.7,192.9L174.8,189.9L174.9,186.9L174.9,183.9L174.8,180.9L174.8,177.9L174.8,174.9L175.0,171.9L175.1,168.9L175.1,165.9L175.1,162.9L175.1,159.9L175.1,156.9L175.3,153.9L175.3,150.9L175.3,147.9L175.2,144.9L175.1,141.9L175.1,138.9L175.2,135.8L175.2,132.8L175.1,129.8L174.9,126.8L173.8,125.1L170.8,125.1L167.8,125.1L164.8,125.1L161.8,125.2L158.8,125.3L155.8,125.3L152.8,125.2L149.8,125.1L146.8,125.1L143.8,125.2L140.8,125.2L137.8,125.1L134.8,125.0L131.8,124.9L128.8,124.9L125.8,124.9L122.7,124.9L119.7,124.8L116.7,124.7L113.7,124.7L110.7,124.7L107.7,124.8L106.1,123.7L106.2,120.7L106.2,117.7L106.2,114.7L106.3,112.1L109.3,111.9L112.3,111.9L115.3,111.9L118.3,111.9L121.3,111.9L124.3,111.8L127.3,111.7L130.3,111.7L133.3,111.8L136.3,111.9L139.4,111.8L142.4,111.8L145.4,111.8L148.4,111.9L151.4,112.0L154.4,112.1L157.4,112.1L160.4,112.1L163.4,112.1L166.4,112.2L169.4,112.3L172.4,112.3L175.2,111.6L175.2,108.6L175.1,105.6L175.2,102.6L175.2,99.6L175.2,96.6L175.0,93.6L174.9,90.6L174.9,87.5L174.9,84.5L175.0,81.5L174.9,78.5L174.7,75.5L174.7,72.5L174.7,69.5L174.8,66.5L174.9,63.5L176.5,61.8L179.5,61.8L182.5,61.8L185.5,61.9L186.0,64.5L185.9,67.5L185.9,70.5L186.0,73.5L185.9,76.5L185.8,79.5L185.7,82.5L185.7,85.5L185.8,88.6L185.9,91.6L185.8,94.6L185.8,97.6L185.8,100.6L185.8,103.6L186.0,106.6L186.1,109.6L186.6,111.9L189.6,112.0L192.6,112.0L195.6,111.9L198.6,111.7L201.6,111.7L204.6,111.7L207.6,111.8L210.6,111.9L213.6,111.8L216.6,111.8L219.6,111.8L222.7,111.9L225.7,112.0L228.7,112.1L231.7,112.0L234.7,112.0L237.7,112.1L240.7,112.2L243.7,112.3L246.7,112.3L249.7,112.2L252.7,112.1L253.8,113.7L253.8,116.7L253.8,119.7L253.9,122.7L253.3,125.0L250.3,125.1L247.3,125.1L244.3,125.0L241.3,125.1L238.3,125.2L235.2,125.3L232.2,125.3L229.2,125.2L226.2,125.2L223.2,125.2L220.2,125.2L217.2,125.3L214.2,125.2L211.2,125.1L208.2,125.0L205.2,124.9L202.2,125.0L199.2,125.0L196.2,124.9L193.2,124.8L190.2,124.7L187.2,124.7L185.8,126.8L185.9,129.8L185.8,132.8L185.7,135.8L185.8,138.9L185.9,141.9L186.0,144.9L186.1,147.9L186.0,150.9L186.0,153.9L186.1,156.9L186.2,159.9L186.3,162.9L186.3,165.9L186.2,168.9L186.2,171.9L186.2,174.9L186.2,177.9L186.3,180.9L186.2,183.9L186.0,186.9L186.0,189.9L186.0,192.9L186.0,195.9L186.0,199.0L185.9,202.0L185.7,205.0L185.7,208.0L185.8,211.0L185.8,214.0L185.8,217.0L185.8,220.0L185.7,223.0L185.8,226.0L185.9,229.0" pathLength="1" data-at="2,2.7"/>
  <text class="hand" x="180" y="52" data-at="2.6,2.9" font-size="27.6">JESUS</text>
  <text class="hand" x="54" y="164" data-at="3,3.2" font-size="20.7">RESPONSE</text>
  <text class="hand red" x="54" y="186" data-at="3.22,3.4" font-size="23">in faith</text>
  <path class="red faith" d="M71.9,142.0L72.5,139.0L73.3,136.2L74.3,133.3L75.4,130.6L76.6,127.8L77.7,125.1L79.0,122.4L80.4,119.8L82.0,117.3L83.7,114.8L85.5,112.5L87.3,110.1L89.2,107.8L91.1,105.5L93.3,103.4L95.5,101.4L97.9,99.6L100.4,97.9L102.9,96.2L105.4,94.5L108.0,93.0L110.7,91.8L113.5,90.7L116.4,89.8L119.2,88.9L122.1,88.0L125.0,87.3L127.9,86.6L130.8,86.0L133.8,85.6L136.8,85.1L139.7,84.6L142.6,84.0L145.5,83.4L148.5,82.9L151.5,82.5L154.4,82.2L157.4,81.9L160.4,81.4L163.3,81.0L166.3,80.6L169.3,80.3L172.3,80.2L175.3,80.2L178.3,80.1L181.2,80.0L184.2,79.8L187.2,79.8L190.2,80.0L193.2,80.2L196.2,80.5L199.2,80.7L202.2,80.8L205.1,81.0L208.1,81.2L211.1,81.6L214.1,82.0L217.0,82.4L220.0,82.7L223.0,82.9L226.0,83.1L228.9,83.4L231.9,83.9L234.8,84.4L237.8,84.9L240.8,85.2L243.7,85.6L246.7,86.1L249.6,86.8L252.5,87.7L255.4,88.6L258.2,89.5L261.1,90.3L263.9,91.3L266.7,92.4L269.4,93.8L272.0,95.2L274.6,96.7L277.2,98.2L279.7,99.7L282.2,101.4L284.6,103.2L286.8,105.2L288.9,107.2L291.0,109.3L293.1,111.5L295.1,113.7L297.0,116.0" pathLength="1" data-at="3,3.45"/>
  <path class="red faith" d="M297.0,104.0 Q297.1,110.4 296.9,116.8" pathLength="1" data-at="3.450,3.486"/><path class="red faith" d="M298.1,116.4 Q292.6,113.4 287.1,110.5" pathLength="1" data-at="3.486,3.520"/>
  <g data-who data-lift="8">
  <path class="head" d="M55.0,79.1L57.9,79.6L60.2,81.3L61.6,83.9L61.7,86.8L60.7,89.4L58.8,91.4L56.3,92.5L53.5,92.6L50.8,91.5L48.9,89.3L48.2,86.5L48.5,83.7L49.9,81.1L52.3,79.3L55.3,78.7L58.3,79.3L60.7,81.3" pathLength="1" data-at="1.3,1.42"/>
  <path d="M55.4,90.8 Q55.4,102.6 55.6,114.5" pathLength="1" data-at="1.420,1.500"/><path d="M44.9,103.4 Q55.2,103.0 65.5,102.2" pathLength="1" data-at="1.480,1.550"/>
  <path d="M56.6,112.0 Q52.3,116.3 48.0,120.8" pathLength="1" data-at="1.530,1.580"/><path d="M53.5,111.7 Q58.0,116.4 62.2,121.4" pathLength="1" data-at="1.560,1.610"/>
  </g>
`;
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

  // A dark box with a heading (the words after "together") over one card
  // per line. The cards start scattered and line up as the box scrolls in.
  together(lines, heading) {
    const head = heading ? `<h3 class="together-head">${typeset(heading)}</h3>` : '';
    const cards = lines.map(l => `<div class="together-card">${formatInline(l)}</div>`).join('');
    return `<div class="fx-together" data-together>${head}<div class="together-cards">${cards}</div></div>`;
  },

  // One dark card per line. The part after " | " stays hidden until the
  // student presses and holds the light; words after "hold" are added in
  // orange to every answer.
  hold(lines, refrain) {
    const ring = '<span class="hold-ring" aria-hidden="true"><svg viewBox="0 0 58 58"><circle class="hold-track" cx="29" cy="29" r="25"/>' +
      '<circle class="hold-fill" cx="29" cy="29" r="25"/></svg><span class="hold-core"></span></span>';
    const tail = refrain ? ` <span class="hold-refrain">${typeset(refrain)}</span>` : '';
    const cards = lines.map(line => {
      const cut = line.indexOf(' | ');
      const lead = cut < 0 ? '' : line.slice(0, cut).trim();
      const answer = cut < 0 ? line : line.slice(cut + 3).trim();
      return `<div class="hold-card">${lead ? `<p class="hold-lead">${formatInline(lead)}</p>` : ''}` +
        `<p class="hold-answer" aria-hidden="true">${formatInline(answer)}${tail}</p>` +
        `<button type="button" class="hold-btn">${ring}<span class="hold-label">Press and hold</span></button></div>`;
    }).join('');
    return `<div class="fx-hold">${cards}</div>`;
  },

  // A card with two sides that flips over when tapped: "+ Title" starts
  // each side (the first two are used). Text after "flip" is shown in big
  // type on both sides.
  flip(lines, phrase) {
    const { intro, parts } = sections(lines);
    if (parts.length < 2) return formatStudy(lines.join('\n'));
    const big = phrase ? `<p class="flip-phrase">${typeset(phrase)}</p>` : '';
    const turn = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>';
    const second = typeset(parts[1].title);
    const face = (part, side, hint, hidden) =>
      `<div class="flip-face flip-${side}"${hidden ? ' aria-hidden="true"' : ''}>${big}` +
      `<div class="flip-body"><span class="flip-label">${typeset(part.title)}</span>${formatStudy(part.lines.join('\n'))}</div>` +
      `<p class="flip-hint">${turn}${hint}</p></div>`;
    return `${formatStudy(intro.join('\n'))}<div class="fx-flip" role="button" tabindex="0" aria-pressed="false">` +
      `<div class="flip-inner">` +
      face(parts[0], 'front', `Tap to see ${second.charAt(0).toLowerCase()}${second.slice(1)}`, false) +
      face(parts[1], 'back', 'Tap to flip back', true) +
      `</div></div>`;
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

  /* Day 5's Gospel bridge: four parts, "+ GOD", "+ MAN", "+ JESUS" and
     "+ RESPONSE", scroll up under a drawing that stays at the top of the
     screen and builds a piece with each (app.js). In a part, a line like
     "> Isaiah 6:5 | the verse" is its verse, shown as scripture. */
  bridge(lines) {
    const { parts } = sections(lines);
    const verse = /^>\s+(.+?)\s*\|\s*(.+)$/;
    const body = partLines => {
      let html = '';
      let run = [];
      const flushRun = () => { if (run.length) html += formatStudy(run.join('\n')); run = []; };
      partLines.forEach(line => {
        const m = line.match(verse);
        if (m) { flushRun(); html += BLOCKS.scripture([m[2]], m[1]); } else run.push(line);
      });
      flushRun();
      return html;
    };
    const steps = parts.map(p => `<li>${typeset(p.title)}</li>`).join('');
    const sectionsHtml = parts.map((p, i) => `<section class="bridge-part"><h3 class="bridge-title">` +
      `<span class="bridge-n">${i + 1} of ${parts.length}</span>${typeset(p.title)}</h3>${body(p.lines)}</section>`).join('');
    return `<div class="fx-bridge" data-bridge><div class="bridge-stage">` +
      `<svg class="bridge-art" viewBox="0 0 360 232" role="img" aria-label="${BRIDGE_SUMMARY}">${BRIDGE_ART}</svg>` +
      `<ol class="bridge-steps" aria-hidden="true">${steps}</ol></div>${sectionsHtml}</div>`;
  },

  // Key words broken down one at a time: "+ WORD", then what it means.
  terms(lines) {
    const { intro, parts } = sections(lines);
    const terms = parts.map(p => {
      const word = typeset(p.title);
      return `<div class="term" data-fx="middle"><p class="term-word"><span class="term-outline">${word}</span>` +
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

  /* A line typed out big, the next line said normally with a button under
     it, and a correction: the button backspaces the big line back to where
     the two differ and types the correction in its place (app.js). The
     title after "::: retype" is the button's label. */
  retype(lines, label) {
    const [first = '', say = '', next = ''] = lines;
    const typed = BLOCKS.type([first]).replace('<span class="sr-only">', '<span class="sr-only" aria-live="polite">');
    return `<div class="fx-retype" data-retype>${typed}<p class="retype-say">${formatInline(say)}</p>` +
      `<button type="button" class="retype-btn btn-pill">${typeset(label || 'Make it clearer')}</button>` +
      `<template class="retype-next">${formatInline(next)}</template></div>`;
  },

  /* Big words said again and again (Day 9's GOD ANSWERS PRAYER). The first
     ::: echo gathers in as it scrolls up the screen. Each one after it
     waits behind a button labelled with the words after "::: echo"
     (anything after a "|" is a line said first, like "Dear friend,"),
     gathers in when it's tapped, and leaves echoes behind its words: one
     black echo the second time, orange ones after that, and for a word in
     **bold** an extra echo and a pen underline. app.js runs it. */
  echo(lines, header, nth = 0) {
    const [label, intro] = String(header || '').split('|').map(s => s.trim());
    const orange = nth >= 2;
    const rows = lines.map((line, i) => {
      const key = line.match(/^\*\*(.+)\*\*$/);
      const plain = typeset(key ? key[1] : line);
      const count = nth === 0 ? 0 : (key && orange ? 2 : 1);
      const gather = [3, 2, 1].map(g => `<span class="echo-gather" style="--g:${g}" aria-hidden="true">${plain}</span>`).join('');
      const echoes = Array.from({ length: count }, (_, j) =>
        `<span class="echo-ghost" style="--k:${count - j}" aria-hidden="true">${plain}</span>`).join('');
      const solid = key ? `<strong class="echo-key">${plain}${orange ? ECHO_UNDERLINE : ''}</strong>` : formatInline(line);
      return `<p class="echo-ln" style="--i:${i}">${gather}${echoes}<span class="echo-solid">${solid}</span></p>`;
    }).join('');
    const words = `<div class="echo-words">${rows}</div>`;
    const cls = `fx-echo${orange ? ' fx-echo--orange' : ''}`;
    if (nth === 0) return `<div class="${cls} echo-first" data-echo-scrub style="--n:${lines.length}">${words}</div>`;
    return `<div class="${cls}" style="--n:${lines.length}">` +
      `<button type="button" class="echo-btn btn-pill btn-pill--accent">${ECHO_ICON}${typeset(label || 'Again!')}</button>` +
      `<div class="echo-reveal" hidden>${intro ? `<p class="echo-intro">${formatInline(intro)}</p>` : ''}${words}</div></div>`;
  },

  // A soft sign-off at the end of a study, set apart and a little larger.
  closing(lines) {
    return `<div class="fx-closing" data-fx>${lines.map(l => `<p>${formatInline(l)}</p>`).join('')}</div>`;
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
  const seen = {};   // how many of each effect so far (::: echo changes each time)
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
        const nth = seen[name] || 0;
        seen[name] = nth + 1;
        blocks.push(BLOCKS[name](lines.slice(i + 1, end).filter(Boolean), arg, nth));
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
