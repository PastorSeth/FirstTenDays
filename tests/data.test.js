test('data: ten days in order', () => { assertEqual(DAYS.map(d => d.day), [1,2,3,4,5,6,7,8,9,10]); });
test('data: video and flow fields are gone', () => {
  DAYS.forEach(d => ['videoId','videoId2','flow','intro','reflectionQuestion'].forEach(k => assert(!(k in d), `day ${d.day} still has ${k}`)));
});
test('data: book name and home words', () => {
  assertEqual(BOOK_NAME, '1 John');
  assertEqual(HOME_WORDS, ['Into', 'The light']);
});
test('data: Day 1 teaches first, then asks the three context questions with hints', () => {
  const d1 = DAYS[0];
  assertEqual(d1.words, ['Context', 'Is key']);
  assert(!('reading' in d1), 'Day 1 uses the standard Read box');
  assertIncludes(d1.study, 'hit the brakes');
  assertIncludes(d1.study, '> CONTEXT IS KEY.');
  assertIncludes(d1.study, '::: flip "Ate, and left no crumbs."');
  assertIncludes(d1.study, '::: video l3QkE6nKylM');
  assert(!d1.reflectFirst, 'study comes first');
  assertEqual(d1.reflectTitle, 'Context');
  assertEqual(d1.reflections.map(r => r.id), ['author', 'audience', 'purpose']);
  d1.reflections.forEach(r => assert(r.hint, `${r.id} has a hint`));
  assertEqual(d1.speaker, 'Seth Peacock');
});
test('data: Day 2 teaches first, then MAPS with its own questions', () => {
  const d2 = DAYS[1];
  assertEqual(d2.words, ['Word', 'Of God']);
  assertIncludes(d2.study, '::: hold Embrace the light!');
  assertIncludes(d2.study, '::: scripture Romans 6:1-2');
  assert(!d2.reflectFirst, 'study comes first');
  assertEqual(d2.reflectTitle, 'MAPS');
  assertEqual(d2.reflections.map(r => r.id), ['meditate', 'apply', 'pray', 'share']);
  d2.reflections.forEach(r => assert(r.question, `${r.id} has a Day 2 question`));
});
test('data: Days 3-10 read, then MAPS, then the study, then application questions', () => {
  DAYS.slice(2).forEach(d => {
    assert(d.reflectFirst, `day ${d.day} puts MAPS first`);
    assertEqual(d.reflectTitle, 'MAPS', `day ${d.day}`);
    assert(d.reflections === MAPS_PROMPTS, `day ${d.day} reflections`);
    assert(d.questions.length > 0, `day ${d.day} questions`);
    assertEqual(new Set(d.questions.map(q => q.id)).size, d.questions.length, `day ${d.day} question ids are unique`);
  });
});
test('data: Day 7 types "That\'s why…" big, then corrects it to YOU', () => {
  const s = DAYS.find(d => d.day === 7).study;
  assertIncludes(s, "There are all kinds of lies being spoken all around you.\n::: retype Tap here to fix the mistake\n");
  assertIncludes(s, "\nThat's why God has positioned Christians **all through the world** to be a voice of truth.\nActually… Let me make myself a little more clear.\nThat's why God has positioned **YOU** in this world to be a voice of truth!\n:::");
  assert(!s.includes('So, God has positioned'), 'the old "So," sentence is gone');
});
test('data: each written lesson has its own effect', () => {
  const effects = { 3: '::: typewriter', 4: '::: terms', 6: '==', 7: '::: retype', 8: '::: trinity', 9: '::: stack' };
  Object.keys(effects).forEach(day => {
    const d = DAYS[day - 1];
    assertIncludes(d.study, effects[day], `day ${day}`);
    assertEqual(d.words.length, 2, `day ${day} header words`);
  });
  assertEqual(DAYS[8].questions[0].type, 'scale');
  assertEqual(DAYS[4].study, '');
  assertEqual(DAYS[9].study, '');
});
test('data: notes to self stay off the site, and every effect is spelled right', () => {
  DAYS.forEach(d => {
    ['gimmick', 'visual effect', 'Header Text', '???'].forEach(note =>
      assert(!d.study.toLowerCase().includes(note.toLowerCase()), `day ${d.day} has "${note}"`));
    assert(!formatStudy(d.study).includes('<p>:::'), `day ${d.day} has an effect that didn't render`);
  });
});
test('data: MAPS prompt ids unchanged (saved answers depend on them)', () => {
  assertEqual(MAPS_PROMPTS.map(p => p.id), ['meditate', 'apply', 'pray', 'share']);
});
test('data: Day 7 gives the story question a large box', () => {
  assertEqual(DAYS[6].questions[0].size, 'large');
});
test('data: Day 9 ends with a soft "Dear friend, God answers prayer."', () => {
  assert(DAYS[8].study.trim().endsWith('::: closing\nDear friend,\nGod answers prayer.\n:::'), 'closing block at the end');
});
test('data: Day 4 says what I do before "I remind myself… JESUS. IS. BETTER."', () => {
  const s = DAYS[3].study;
  const ask = s.indexOf("So what do I do when I don't feel like it?");
  const act = s.indexOf('_I make sure my actions reflect what I KNOW about Jesus, not what I FEEL in my flesh._');
  const remind = s.indexOf('I remind myself…');
  const better = s.indexOf('> JESUS. IS. BETTER.');
  assert(ask >= 0 && ask < act && act < remind && remind < better, `order ${[ask, act, remind, better]}`);
  assert(s.trim().endsWith('> JESUS. IS. BETTER.'), 'the study ends on JESUS. IS. BETTER.');
});
test('data: Day 8 shows the Trinity shield right after the underlining instruction', () => {
  const lines = DAYS[7].study.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const read = lines.findIndex(l => l.startsWith('Go back and read 1 John 4:13-14.'));
  assertEqual(lines[read + 1], '::: trinity');
  assertEqual(lines.filter(l => l === '::: trinity').length, 1);
});
test('data: Day 3 brings its five "Even…" lines together under one heading', () => {
  const s = DAYS[2].study;
  assertIncludes(s, '::: together We are united in worship and study');
  assertIncludes(s, '**Small groups** filled with fellow believers are so powerful!');
  assert(!s.includes('\n-- '), 'no sub-bullets left');
});
test('data: Day 6 marks up its verses in red pen', () => {
  const s = DAYS.find(d => d.day === 6).study;
  assertIncludes(s, '=="Sin is [circle]lawlessness[/circle]"==');
  assertIncludes(s, '=="[circle]No one[/circle] [underline]who lives in him[/underline] [squiggle]keeps on sinning.[/squiggle] No one');
  assertIncludes(s, '=="Do not let [double]anyone[/double] lead you astray"==');
  assertIncludes(s, '=="[underline]Do not be surprised[/underline]… if the world [circle]hates[/circle] you"==');
});
