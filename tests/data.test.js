test('data: ten days in order', () => { assertEqual(DAYS.map(d => d.day), [1,2,3,4,5,6,7,8,9,10]); });
test('data: video and flow fields are gone', () => {
  DAYS.forEach(d => ['videoId','videoId2','flow','intro'].forEach(k => assert(!(k in d), `day ${d.day} still has ${k}`)));
});
test('data: book name and home words', () => {
  assertEqual(BOOK_NAME, '1 John');
  assertEqual(HOME_WORDS, ['Light', 'Love']);
});
test('data: Day 1 content', () => {
  const d1 = DAYS[0];
  assertEqual(d1.words, ['Context', 'Is key']);
  assert(d1.reading.startsWith("If you haven't done today's reading yet, hit the brakes!"));
  assertIncludes(d1.study, '> CONTEXT IS KEY.');
  assertIncludes(d1.study, '[The Bible Project](https://bibleproject.com/videos/1-3-john/)');
  assertIncludes(d1.study, 'overview video for 1-3 John');
  assertEqual(d1.reflections.map(r => r.id), ['author', 'audience', 'purpose']);
  assertEqual(d1.reflectionQuestion, null);
  assertEqual(d1.speaker, 'Seth Peacock');
});
test('data: Day 1 study formats into the expected blocks', () => {
  const html = formatStudy(DAYS[0].study);
  const count = re => (html.match(re) || []).length;
  assertEqual(count(/<h2 class="study-h">/g), 2);
  assertEqual(count(/<blockquote/g), 1);
  assertEqual(count(/<ul class="study-ul">/g), 1);
  assertEqual(count(/<ol class="study-ol">/g), 1);
  assertEqual(count(/<li>/g), 5);
});
test('data: Days 2-10 have empty studies, MAPS prompts, and fall back for words and reading', () => {
  DAYS.slice(1).forEach(d => {
    assertEqual(d.study, '', `day ${d.day} study`);
    assert(d.reflections === MAPS_PROMPTS, `day ${d.day} reflections`);
    assert(!('words' in d) && !('reading' in d), `day ${d.day} fallback`);
  });
});
test('data: Days 3-10 reflection question points at the reading', () => {
  DAYS.slice(2).forEach(d => assertEqual(d.reflectionQuestion.prompt,
    "Now that you've read today's study, what's one specific way you'll put this into practice this week?"));
  assertEqual(DAYS[1].reflectionQuestion, null);
});
test('data: MAPS prompt ids unchanged (saved answers depend on them)', () => {
  assertEqual(MAPS_PROMPTS.map(p => p.id), ['meditate', 'apply', 'pray', 'share']);
});
