import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../analytics.js', import.meta.url), 'utf8');
function run({ id = '', hostname = 'shanyu2015.com', pathname = '/', search = '', referrer = '' } = {}) {
  const scripts = [], listeners = {}, observed = [];
  let callback;
  const window = { SHANYU_GA4_ID: id };
  class IntersectionObserver {
    constructor(fn) { callback = fn; }
    observe(el) { observed.push(el); }
    unobserve() {}
  }
  window.IntersectionObserver = IntersectionObserver;
  const document = {
    referrer, createElement: () => ({}), head: { append: value => scripts.push(value) },
    addEventListener: (event, fn) => { listeners[event] = fn; },
    querySelectorAll: () => [{ dataset: { roomView: 'cabin', placement: 'comparison' } }]
  };
  vm.runInNewContext(source, { window, document, location: { hostname, pathname, search }, URL, URLSearchParams, IntersectionObserver });
  return { window, scripts, observed, callback,
    commands: () => Array.from(window.dataLayer || [], args => Array.from(args)),
    click: dataset => listeners.click({ target: { closest: () => ({ dataset }) } }) };
}

test('unconfigured collection loads no Google script or tracking listeners', () => {
  const result = run();
  assert.equal(result.window.shanyuAnalyticsStatus, 'pending_configuration');
  assert.equal(result.scripts.length, 0);
  assert.equal(result.commands().length, 0);
});
test('a valid ID is disabled on previews and look-alike domains', () => {
  for (const hostname of ['localhost', '127.0.0.1', 'shanyu2015.com.example.com']) {
    const result = run({ id: 'G-TEST123456', hostname });
    assert.equal(result.window.shanyuAnalyticsStatus, 'disabled_preview');
    assert.equal(result.scripts.length, 0);
  }
});
test('production initializes exactly one manual pageview with sanitized context', () => {
  const result = run({ id: 'G-TEST123456', pathname: '/cabin.html', search: '?email=private@example.com#secret', referrer: 'https://google.com/search?q=private@example.com' });
  const commands = result.commands();
  assert.equal(commands.filter(row => row[0] === 'event' && row[1] === 'page_view').length, 1);
  assert.equal(commands.find(row => row[0] === 'config')[2].send_page_view, false);
  assert.equal(commands.at(-1)[2].page_location, 'https://shanyu2015.com/cabin.html');
  assert.equal(commands.at(-1)[2].page_referrer, 'https://google.com');
  assert.equal(commands.at(-1)[2].send_to, 'G-TEST123456');
  assert.ok(!JSON.stringify(commands).includes('private@'));
  assert.equal(result.scripts.length, 1);
});
test('only named campaigns are retained and unknown URL paths are removed', () => {
  const result = run({ id: 'G-TEST123456', pathname: '/private@example.com', search: '?utm_source=google&utm_medium=organic&utm_campaign=business_profile&utm_term=private@example.com' });
  const params = result.commands().at(-1)[2];
  assert.equal(params.page_location, 'https://shanyu2015.com/');
  assert.equal(params.campaign_source, 'google');
  assert.equal(params.campaign_name, 'business_profile');
  assert.ok(!JSON.stringify(result.commands()).includes('private@'));
});
test('LINE and phone clicks retain controlled room and placement, not user text', () => {
  const result = run({ id: 'G-TEST123456' });
  result.click({ track: 'line_click', room: 'cabin', placement: 'landing-hero', message: 'private@example.com' });
  const command = result.commands().at(-1);
  assert.equal(command[1], 'line_click');
  assert.equal(command[2].room, 'cabin');
  assert.equal(command[2].placement, 'landing-hero');
  assert.equal(command[2].send_to, 'G-TEST123456');
  result.click({ track: 'phone_click', room: 'private@example.com', placement: 'private@example.com' });
  assert.equal(result.commands().at(-1)[2].room, 'all');
  assert.equal(result.commands().at(-1)[2].placement, 'other');
  const count = result.commands().length;
  result.click({ track: 'private@example.com' });
  assert.equal(result.commands().length, count);
  assert.ok(!JSON.stringify(result.commands()).includes('private@'));
});
test('room views require 50% visibility and deduplicate the same room', () => {
  const result = run({ id: 'G-TEST123456' });
  const target = result.observed[0];
  result.callback([{ target, isIntersecting: true, intersectionRatio: .2 }]);
  assert.equal(result.commands().filter(row => row[1] === 'room_view').length, 0);
  result.callback([{ target, isIntersecting: true, intersectionRatio: .6 }]);
  result.callback([{ target, isIntersecting: true, intersectionRatio: 1 }]);
  assert.equal(result.commands().filter(row => row[1] === 'room_view').length, 1);
});
