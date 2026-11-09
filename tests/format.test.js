test('format: escapeHtml escapes markup characters', () => {
  assertEqual(escapeHtml(`<b>&"'`), '&lt;b&gt;&amp;&quot;&#39;');
});
test('format: typeset curls quotes and apostrophes', () => {
  assertEqual(typeset(`"Hi," she said. Don't stop.`), '“Hi,” she said. Don’t stop.');
  assertEqual(typeset(`students' notes`), 'students’ notes');
  assertEqual(typeset(`'quoted'`), '‘quoted’');
});
test('format: typeset turns digit-hyphen-digit into an en dash only', () => {
  assertEqual(typeset('1 John 1:1-4'), '1 John 1:1–4');
  assertEqual(typeset('well-known'), 'well-known');
});
test('format: typeset escapes HTML', () => { assertEqual(typeset('<script>'), '&lt;script&gt;'); });
test('format: inline bold, and unclosed bold stays literal', () => {
  assertEqual(formatInline('a **big** deal'), 'a <strong>big</strong> deal');
  assertEqual(formatInline('a **big deal'), 'a **big deal');
});
test('format: external link opens in a new tab', () => {
  assertEqual(formatInline('[The Bible Project](https://bibleproject.com/videos/1-3-john/)'),
    '<a href="https://bibleproject.com/videos/1-3-john/" target="_blank" rel="noopener">The Bible Project</a>');
});
test('format: internal link stays in the app', () => {
  assertEqual(formatInline('[Resources](#/resources)'), '<a href="#/resources">Resources</a>');
});
test('format: unsafe link scheme renders as text', () => {
  const out = formatInline('[x](javascript:alert(1))');
  assert(!out.includes('<a'), out);
  assertIncludes(out, '[x](javascript:alert(1))');
});
test('format: study headings, paragraphs, lists, pull quote', () => {
  assertEqual(formatStudy('## Making Sense of It\nFirst line.\nSecond line.\n* one\n* two\n1. a\n2. b\n> CONTEXT IS KEY.'),
    '<h2 class="study-h">Making Sense of It</h2><p>First line.</p><p>Second line.</p>' +
    '<ul class="study-ul"><li>one</li><li>two</li></ul><ol class="study-ol"><li>a</li><li>b</li></ol>' +
    '<blockquote class="pull" data-reveal><p>CONTEXT IS KEY.</p></blockquote>');
});
test('format: dash bullets, numbered start, inline marks in items', () => {
  assertEqual(formatStudy('- a\n3. c\n4. d'), '<ul class="study-ul"><li>a</li></ul><ol class="study-ol" start="3"><li>c</li><li>d</li></ol>');
  assertEqual(formatStudy('* **Today:** good'), '<ul class="study-ul"><li><strong>Today:</strong> good</li></ul>');
});
test('format: consecutive quote lines join with a line break', () => {
  assertEqual(formatStudy('> CONTEXT\n> IS KEY.'), '<blockquote class="pull" data-reveal><p>CONTEXT<br>IS KEY.</p></blockquote>');
});
test('format: blank lines collapse and non-strings give empty output', () => {
  assertEqual(formatStudy('A\n\n\nB'), '<p>A</p><p>B</p>');
  assertEqual(formatStudy(undefined), '');
  assertEqual(formatStudy(null), '');
});
test('format: never throws on broken marks', () => {
  ['**', '[unclosed(link', '> ', '##', '* ', '1.'].forEach(s => formatStudy(s));
});
test('format: indented and CRLF study text still finds marks', () => {
  assertEqual(formatStudy('    ## Title\r\n    * item\r\n    Text'),
    '<h2 class="study-h">Title</h2><ul class="study-ul"><li>item</li></ul><p>Text</p>');
});
test('format: link URLs are never typeset', () => {
  assertIncludes(formatInline('[Video](https://example.com/a-1-3-b?q="x")'), 'href="https://example.com/a-1-3-b?q=&quot;x&quot;"');
});
test('format: _italic_, but not inside words or link addresses', () => {
  assertEqual(formatInline('read it _slowly_ now'), 'read it <em>slowly</em> now');
  assertEqual(formatInline('(AKA your _flesh_)'), '(AKA your <em>flesh</em>)');
  assertEqual(formatInline('snake_case_name'), 'snake_case_name');
  assertIncludes(formatInline('[x](https://a.com/b_c_d)'), 'href="https://a.com/b_c_d"');
});
test('format: ==highlight== wraps each word for the marker sweep', () => {
  const out = formatInline('Verse 4: =="Sin is lawlessness"==');
  assertIncludes(out, '<mark class="hl" data-fx style="--n:3">');
  assertIncludes(out, '<span class="hl-w" style="--i:0">“Sin </span>');
  assertIncludes(out, '<span class="hl-w" style="--i:2">lawlessness”</span>');
  assertEqual(formatInline('a ==b'), 'a ==b');
});
test('format: {{term|definition}} becomes a tappable church-vocab word', () => {
  assertEqual(formatInline('are {{mutually exclusive|You can only pick one.}} here'),
    'are <button type="button" class="vocab" data-def="You can only pick one.">mutually exclusive</button> here');
  assertEqual(formatInline('{{no definition}}'), '{{no definition}}');
});
test('format: -- lines nest under the bullet above', () => {
  const out = formatStudy('* Worship\n-- even when\n-- even if\n* Groups');
  assertEqual(out, '<ul class="study-ul"><li>Worship<ul class="study-ul study-ul--sub"><li>even when</li><li>even if</li></ul></li><li>Groups</li></ul>');
  assertEqual(formatStudy('-- alone'), '<ul class="study-ul"><li>alone</li></ul>');
});
test('format: ::: swap makes tabs with one panel showing', () => {
  const out = formatStudy('::: swap\n+ My context\nOld meaning\n+ Students\' context\nNew meaning\n:::\nAfter');
  assertIncludes(out, '<div class="fx-swap" data-fx>');
  assertIncludes(out, '<button type="button" class="swap-tab" aria-pressed="true" data-panel="0">My context</button>');
  assertIncludes(out, '<button type="button" class="swap-tab" aria-pressed="false" data-panel="1">Students’ context</button>');
  assertIncludes(out, '<div class="swap-panel is-on" data-panel="0"><p>Old meaning</p></div>');
  assertIncludes(out, '<div class="swap-panel" data-panel="1" aria-hidden="true"><p>New meaning</p></div>');
  assert(out.endsWith('<p>After</p>'), out);
});
test('format: ::: scripture shows the verse with its reference', () => {
  assertEqual(formatStudy('::: scripture Romans 6:1-2\n"Shall we go on sinning?"\n:::'),
    '<blockquote class="scripture"><p>“Shall we go on sinning?”</p><cite>Romans 6:1–2</cite></blockquote>');
});
test('format: ::: reveal splits a quote into words for the scroll reveal', () => {
  const out = formatStudy('::: reveal C.S. Lewis\n"When I first"\n:::');
  assertEqual(out, '<blockquote class="fx-reveal" data-scrub style="--n:3"><p>'
    + '<span class="w" style="--i:0">“When</span> <span class="w" style="--i:1">I</span> <span class="w" style="--i:2">first”</span>'
    + '</p><cite>C.S. Lewis</cite></blockquote>');
});
test('format: ::: terms gives each term a giant filling word', () => {
  const out = formatStudy('::: terms\n+ LUST\nAnything that pulls us away.\n+ FLESH\nOur old self.\n:::');
  assertEqual((out.match(/<div class="term" data-fx="middle">/g) || []).length, 2);
  assertIncludes(out, '<p class="term-word"><span class="term-outline">LUST</span><span class="term-mask" aria-hidden="true"><span class="term-solid">LUST</span></span></p>');
  assertIncludes(out, '<div class="term-body"><p>Our old self.</p></div>');
});
test('format: ::: type wraps each letter, keeps a readable copy', () => {
  const out = formatStudy('::: type\nGod has **YOU**\n:::');
  assertIncludes(out, '<p class="fx-type" data-fx style="--n:11">');
  assertIncludes(out, '<span class="sr-only">God has <strong>YOU</strong></span>');
  assertIncludes(out, '<span class="ch" style="--i:0">G</span>');
  assertIncludes(out, '<strong><span class="ch" style="--i:8">Y</span>');
});
test('format: ::: stack stamps one line at a time', () => {
  assertEqual(formatStudy('::: stack\nGOD\n**YOUR**\n:::'),
    '<div class="fx-stack" data-fx><p class="stack-line" style="--i:0">GOD</p><p class="stack-line" style="--i:1"><strong>YOUR</strong></p></div>');
});
test('format: ::: light wraps its lines in the darkness-to-light panel', () => {
  const out = formatStudy('::: light\nOne\nTwo\n:::');
  assertEqual(out, '<div class="fx-light" data-fx><div class="light-glow" aria-hidden="true"></div><div class="light-body"><p>One</p><p>Two</p></div></div>');
});
test('format: one-line ::: video and ::: trinity', () => {
  assertEqual(formatStudy('::: video eAvYmE2YYIU'),
    '<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/eAvYmE2YYIU" title="Video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>');
  assertEqual(formatStudy('::: video not a real id!'), '<p>::: video not a real id!</p>');
  const shield = formatStudy('::: trinity');
  assertIncludes(shield, '<div class="fx-trinity" data-fx');
  ['father', 'son', 'spirit'].forEach(p => assertIncludes(shield, `data-person="${p}"`));
});
test('format: unknown or unclosed ::: blocks never break the page', () => {
  assertEqual(formatStudy('::: sparkle\nHello'), '<p>::: sparkle</p><p>Hello</p>');
  assertIncludes(formatStudy('::: stack\nGOD'), '<p class="stack-line" style="--i:0">GOD</p>');
});
test('format: ::: typewriter keeps the full quote, marks the pencil line, and signs it', () => {
  const out = formatStudy('::: typewriter C.S. Lewis | images/cs-lewis-signature.webp\n"Not fit to ==clean those boots== at all"\n:::');
  const box = document.createElement('div');
  box.innerHTML = out;
  const tw = box.querySelector('.fx-typewriter[data-typewriter]');
  assert(tw, 'typewriter block');
  const text = tw.querySelector('.tw-text');
  assertEqual(text.dataset.text, '“Not fit to clean those boots at all”');
  assertEqual(text.dataset.text.slice(+text.dataset.markStart, +text.dataset.markEnd), 'clean those boots');
  assertEqual(tw.querySelector('.sr-only').textContent, '“Not fit to clean those boots at all”');
  const sig = tw.querySelector('img.tw-signature');
  assertEqual([sig.getAttribute('src'), sig.getAttribute('alt')], ['images/cs-lewis-signature.webp', 'C.S. Lewis']);
});
test('format: ::: typewriter only uses a signature picture from the site itself', () => {
  ['javascript:alert(1)', 'https://example.com/x.png', '../secret.png', 'images/x.exe'].forEach(src => {
    const out = formatStudy(`::: typewriter C.S. Lewis | ${src}\nQuote\n:::`);
    assert(!out.includes('<img'), src);
    assertIncludes(out, '<p class="tw-name">C.S. Lewis</p>');
  });
  assert(!formatStudy('::: typewriter\nQuote\n:::').includes('tw-name'), 'no name, no signature');
});
test('format: ::: closing sets a soft sign-off apart', () => {
  assertEqual(formatStudy('::: closing\nDear friend,\nGod answers prayer.\n:::'),
    '<div class="fx-closing" data-fx><p>Dear friend,</p><p>God answers prayer.</p></div>');
});
test('format: ::: flip makes a two-sided card, with the phrase on both sides', () => {
  const box = document.createElement('div');
  box.innerHTML = formatStudy('::: flip "Ate, and left no crumbs."\n+ My context\nOld meaning\n+ Students\' context\nNew meaning\n:::');
  const card = box.querySelector('.fx-flip');
  assertEqual([card.getAttribute('role'), card.getAttribute('tabindex'), card.getAttribute('aria-pressed')], ['button', '0', 'false']);
  const [front, back] = card.querySelectorAll('.flip-face');
  assert(front.classList.contains('flip-front') && back.classList.contains('flip-back'), 'front and back');
  assertEqual([...card.querySelectorAll('.flip-phrase')].map(p => p.textContent), ['“Ate, and left no crumbs.”', '“Ate, and left no crumbs.”']);
  assertEqual([front.querySelector('.flip-label').textContent, back.querySelector('.flip-label').textContent], ['My context', 'Students’ context']);
  assertEqual(front.querySelector('.flip-body p').textContent, 'Old meaning');
  assertEqual(back.getAttribute('aria-hidden'), 'true');
  assertIncludes(front.querySelector('.flip-hint').textContent, 'Tap to see students’ context');
  assertIncludes(back.querySelector('.flip-hint').textContent, 'Tap to flip back');
});
test('format: ::: flip with fewer than two sides is just the text', () => {
  assertEqual(formatStudy('::: flip\n+ Only one\nText\n:::'), '<p>+ Only one</p><p>Text</p>');
});
test('format: ::: hold makes a card per line, with the answer hidden until it is held', () => {
  const box = document.createElement('div');
  box.innerHTML = formatStudy('::: hold Embrace the light!\nSometimes this is scary | But God is good.\nOnly an answer\n:::');
  const cards = box.querySelectorAll('.fx-hold .hold-card');
  assertEqual(cards.length, 2);
  assertEqual(cards[0].querySelector('.hold-lead').textContent, 'Sometimes this is scary');
  const answer = cards[0].querySelector('.hold-answer');
  assertEqual(answer.getAttribute('aria-hidden'), 'true');
  assertEqual(answer.textContent, 'But God is good. Embrace the light!');
  assertEqual(answer.querySelector('.hold-refrain').textContent, 'Embrace the light!');
  assertEqual(cards[0].querySelector('button.hold-btn .hold-label').textContent, 'Press and hold');
  assert(!cards[1].querySelector('.hold-lead'), 'a line without | is all answer');
  assertEqual(cards[1].querySelector('.hold-answer').textContent, 'Only an answer Embrace the light!');
});
test('format: ::: together puts a heading over cards that come together', () => {
  const box = document.createElement('div');
  box.innerHTML = formatStudy("::: together We are united\nEven when the music isn't my style\nEven if I don't like singing\n:::");
  const fx = box.querySelector('.fx-together[data-together]');
  assert(fx, 'together block');
  assertEqual(fx.querySelector('.together-head').textContent, 'We are united');
  assertEqual([...fx.querySelectorAll('.together-card')].map(c => c.textContent), ['Even when the music isn’t my style', 'Even if I don’t like singing']);
});
