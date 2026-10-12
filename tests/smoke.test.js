test('harness: equal numbers pass', () => { assertEqual(1 + 1, 2); });
test('harness: objects compare by value, any key order', () => { assertEqual({ b: 2, a: [1] }, { a: [1], b: 2 }); });
test('harness: async tests are awaited', async () => {
  const v = await new Promise(r => setTimeout(() => r(7), 10));
  assertEqual(v, 7);
});
test('harness: withStorage restores keys', () => {
  localStorage.removeItem('t:k');
  withStorage({ 't:k': 'x' }, () => assertEqual(localStorage.getItem('t:k'), 'x'));
  assertEqual(localStorage.getItem('t:k'), null);
});
