test('data: ten days in order', () => { assertEqual(DAYS.map(d => d.day), [1,2,3,4,5,6,7,8,9,10]); });
test('data: video and flow fields are gone', () => {
  DAYS.forEach(d => ['videoId','videoId2','flow','intro','reflectionQuestion'].forEach(k => assert(!(k in d), `day ${d.day} still has ${k}`)));
});
test('data: book name and home words', () => {
  assertEqual(BOOK_NAME, '1 John');
  assertEqual(HOME_WORDS, ['Light', 'Love']);
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
test('data: each written lesson has its own effect', () => {
  const effects = { 3: '::: typewriter', 4: '::: terms', 6: '==', 7: '::: type', 8: '::: trinity', 9: '::: stack' };
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
