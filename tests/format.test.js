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
