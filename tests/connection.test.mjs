// Run: node --experimental-default-type=module --test tests/connection.test.mjs
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { connect, disconnect, isConnected, onConnectionStateChange,
  sendBinaryBuffer, sendBinaryBufferConsistent, packU32 } from '../transport.js';
import { setInputOffset, selectOutputSignal, setPredictorOrder, setOutputOffsets, setOutputShifts } from '../api.js';
import { handleUIAction } from '../ui.js';

const elements = new Map();
globalThis.document = { getElementById: id => elements.get(id) ?? null };
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];
  readyState = 0;
  sent = [];
  constructor() { MockWebSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
  drop() { this.readyState = 3; this.onclose?.({ code: 1006 }); }
  send(packet) {
    if (this.sendError) throw this.sendError;
    this.sent.push(packet);
  }
  reply(packet, payload = new Uint8Array(8)) {
    const response = new Uint8Array(12 + payload.byteLength);
    response.set(packet.slice(0, 12));
    new DataView(response.buffer).setUint32(8, payload.byteLength, true);
    response.set(payload, 12);
    this.onmessage?.({ data: response.buffer });
  }
}
globalThis.WebSocket = MockWebSocket;
async function open() {
  const promise = connect();
  const socket = MockWebSocket.instances.at(-1);
  socket.open();
  await promise;
  return socket;
}
afterEach(() => { disconnect(); elements.clear(); });

test('sends fail immediately while disconnected or connecting', async () => {
  await assert.rejects(sendBinaryBuffer(packU32(8)), /Not connected/);
  assert.throws(() => sendBinaryBufferConsistent(packU32(26), () => {}), /Not connected/);
  const opening = connect();
  await assert.rejects(sendBinaryBuffer(packU32(8)), /Not connected/);
  const rejected = assert.rejects(opening, /Disconnected/);
  disconnect();
  await rejected;
});

test('binary framing and out-of-order responses preserve request matching', async () => {
  const socket = await open();
  const first = sendBinaryBuffer(packU32(8));
  const second = sendBinaryBuffer(packU32(0));
  assert.deepEqual([...socket.sent[0].slice(0, 2)], [0x78, 0x56]);
  assert.equal(new DataView(socket.sent[0].buffer).getUint32(8, true), 4);
  socket.reply(socket.sent[1], new Uint8Array([2]));
  socket.reply(socket.sent[0], new Uint8Array([1]));
  assert.deepEqual([...new Uint8Array(await first)], [1]);
  assert.deepEqual([...new Uint8Array(await second)], [2]);
});

test('connection loss rejects all requests and clears streams before reconnect', async () => {
  const socket = await open();
  const events = [];
  const unsubscribe = onConnectionStateChange(state => events.push(state));
  const first = assert.rejects(sendBinaryBuffer(packU32(8)), /Connection closed/);
  const second = assert.rejects(sendBinaryBuffer(packU32(0)), /Connection closed/);
  let calls = 0;
  sendBinaryBufferConsistent(packU32(26), () => { calls++; });
  const oldMessageHandler = socket.onmessage;
  const oldCloseHandler = socket.onclose;
  socket.drop();
  await Promise.all([first, second]);
  assert.equal(isConnected(), false);
  assert.deepEqual(events, ['disconnected']);
  const replacement = await open();
  // Even already-queued events from the previous socket must be ignored.
  oldMessageHandler({ data: socket.sent[2].buffer });
  oldCloseHandler({ code: 1006 });
  assert.equal(calls, 0);
  assert.equal(isConnected(), true);
  const request = sendBinaryBuffer(packU32(8));
  replacement.reply(replacement.sent[0]);
  await request;
  unsubscribe();
});

test('explicit disconnect cleans requests and stream callbacks', async () => {
  const socket = await open();
  const rejected = assert.rejects(sendBinaryBuffer(packU32(8)), /Disconnected/);
  const cancel = sendBinaryBufferConsistent(packU32(26), () => assert.fail('stale stream'));
  disconnect();
  await rejected;
  cancel();
  assert.equal(socket.readyState, MockWebSocket.CLOSED);
});

test('failed connection and connection timeout settle the opening promise', async () => {
  let opening = connect();
  let socket = MockWebSocket.instances.at(-1);
  const rejected = assert.rejects(opening, /connection failed/);
  socket.onerror();
  await rejected;
  opening = connect();
  await assert.rejects(opening, /Connection timed out/);
  assert.equal(isConnected(), false);
});

test('request timeout rejects while keeping a usable connection', async () => {
  const socket = await open();
  await assert.rejects(sendBinaryBuffer(packU32(8)), /Request timed out/);
  const retry = sendBinaryBuffer(packU32(8));
  socket.reply(socket.sent.at(-1));
  await retry;
  assert.equal(isConnected(), true);
});

test('send exceptions reject all pending work and permit reconnect', async () => {
  const socket = await open();
  const first = assert.rejects(sendBinaryBuffer(packU32(8)), /send failed/);
  socket.sendError = new Error('send failed');
  await assert.rejects(sendBinaryBuffer(packU32(0)), /send failed/);
  await first;
  assert.equal(isConnected(), false);
  await open();
  assert.equal(isConnected(), true);
});

test('streams can be cancelled and are removed on a final batch', async () => {
  const socket = await open();
  let calls = 0;
  const cancel = sendBinaryBufferConsistent(packU32(26), () => { calls++; return false; });
  const packet = socket.sent.at(-1);
  assert.ok(packet[3] & 0x80);
  socket.reply(packet);
  cancel();
  socket.reply(packet);
  assert.equal(calls, 1);
  sendBinaryBufferConsistent(packU32(26), () => { calls++; return true; });
  const finalPacket = socket.sent.at(-1);
  socket.reply(finalPacket);
  socket.reply(finalPacket);
  assert.equal(calls, 2);
});

test('truncated responses close the connection and reject pending work', async () => {
  const socket = await open();
  const rejected = assert.rejects(sendBinaryBuffer(packU32(8)), /Truncated/);
  socket.onmessage({ data: new ArrayBuffer(2) });
  await rejected;
  assert.equal(isConnected(), false);
});

test('settings are retried after failed writes and resent after reconnect', async () => {
  let socket = await open();
  const failed = assert.rejects(setInputOffset(123), /Connection closed/);
  socket.drop();
  await failed;
  socket = await open();
  const retry = setInputOffset(123);
  assert.equal(socket.sent.length, 1);
  socket.reply(socket.sent[0]);
  await retry;
  socket = await open();
  const repeated = setInputOffset(123);
  socket.reply(socket.sent[0]);
  await repeated;
  const defaultOutput = selectOutputSignal(1);
  assert.equal(socket.sent.length, 2);
  socket.reply(socket.sent[1]);
  await defaultOutput;
});

test('confirmed duplicates are skipped for each previously cached setter', async () => {
  const socket = await open();
  for (const [setter, values, changed] of [
    [selectOutputSignal, [1], [2]],
    [setPredictorOrder, [3], [4]],
    [setInputOffset, [123], [124]],
    [setOutputOffsets, [10, 20], [10, 21]],
    [setOutputShifts, [1, 2, 3], [1, 2, 4]],
  ]) {
    const before = socket.sent.length;
    const first = setter(...values);
    assert.equal(socket.sent.length, before + 1);
    socket.reply(socket.sent.at(-1));
    await first;
    assert.equal(await setter(...values), 0);
    assert.equal(socket.sent.length, before + 1, 'confirmed duplicate must be skipped');
    const update = setter(...changed);
    assert.equal(socket.sent.length, before + 2, 'changing any parameter must send');
    socket.reply(socket.sent.at(-1));
    await update;
  }
});

test('unacknowledged values are not cached', async () => {
  const socket = await open();
  const first = setInputOffset(123);
  const second = setInputOffset(123);
  assert.equal(socket.sent.length, 2);
  socket.reply(socket.sent[0]);
  socket.reply(socket.sent[1]);
  await Promise.all([first, second]);
  await setInputOffset(123);
  assert.equal(socket.sent.length, 2);
});

test('a timed-out update remains retryable on the same connection', async () => {
  const socket = await open();
  await assert.rejects(setInputOffset(123), /Request timed out/);
  const retry = setInputOffset(123);
  assert.equal(socket.sent.length, 2);
  socket.reply(socket.sent.at(-1));
  await retry;
  await setInputOffset(123);
  assert.equal(socket.sent.length, 2);
});

test('disconnect clears confirmed values before a reconnect', async () => {
  const socket = await open();
  const update = setInputOffset(123);
  socket.reply(socket.sent[0]);
  await update;
  disconnect();
  await assert.rejects(setInputOffset(123), /Not connected/);
  const replacement = await open();
  const retry = setInputOffset(123);
  assert.equal(replacement.sent.length, 1);
  replacement.reply(replacement.sent[0]);
  await retry;
});

test('a response awaiting promise continuation cannot refill a disconnected cache', async () => {
  const socket = await open();
  const update = setInputOffset(123);
  socket.reply(socket.sent[0]);
  // Clear the session before the acknowledged write resumes after await.
  disconnect();
  const replacement = await open();
  await update;
  const retry = setInputOffset(123);
  assert.equal(replacement.sent.length, 1);
  replacement.reply(replacement.sent[0]);
  await retry;
});

test('older responses cannot overwrite a newer confirmed setting', async () => {
  const socket = await open();
  const first = setInputOffset(100);
  const second = setInputOffset(200);
  socket.reply(socket.sent[1]);
  await second;
  socket.reply(socket.sent[0]);
  await first;
  await setInputOffset(200);
  assert.equal(socket.sent.length, 2);
  const changed = setInputOffset(100);
  assert.equal(socket.sent.length, 3);
  socket.reply(socket.sent[2]);
  await changed;
});

test('UI action failures are displayed and do not escape as rejected handlers', async () => {
  const status = { textContent: '' };
  elements.set('connectionStatus', status);
  const originalError = console.error;
  console.error = () => {};
  try {
    await handleUIAction(() => sendBinaryBuffer(packU32(8)))();
    assert.match(status.textContent, /DISCONNECTED: Not connected/);
  } finally { console.error = originalError; }
});

test('scope calibration preserves raw data and recovers after disconnect', async () => {
  const { readFile } = await import('node:fs/promises');
  const labels = [];
  const points = [];
  const context = new Proxy({}, { get: (_, key) => {
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'fillText') return (text, x, y) => labels.push({ text, x, y });
    if (key === 'lineTo' || key === 'moveTo') return (x, y) => points.push({ x, y });
    return () => {};
  } });
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const [, id] of html.matchAll(/id="([^"]+)"/g)) {
    const element = { checked: false, disabled: false, value: '1', textContent: '',
      innerHTML: '', style: {}, width: 800, height: 300,
      listeners: {}, addEventListener(name, handler) { this.listeners[name] = handler; },
      setAttribute() {}, focus() {}, getContext: () => context };
    elements.set(id, element);
    globalThis[id] = element; // Browser named elements used by the existing UI.
  }
  globalThis.ResizeObserver = class { observe() {} };
  document.getElementsByClassName = () => [];
  document.addEventListener = () => {};
  document.createElement = () => ({});
  document.createTextNode = text => ({ textContent: text });
  document.head = { appendChild() {} };
  elements.get('log').append = () => {};
  const scope = await import('../ui_scope.js');
  const { initControlUI } = await import('../ui_control.js');
  initControlUI();
  const readRawTable = () => {
    elements.get('dataDisplayBtn').listeners.click();
    return elements.get('popupInfo').innerHTML;
  };
  { // slider settings redraw labels without modifying stored data
    const raw = readRawTable();
    for (let channel = 1; channel <= 4; channel++) {
      elements.get(`scope${channel}MenuButton`).onclick({ preventDefault() {} });
      const gain = elements.get(`scope${channel}Gain`);
      const offset = elements.get(`scope${channel}Offset`);
      gain.value = '2'; offset.value = '10';
      labels.length = 0;
      gain.oninput();
      assert.deepEqual(scope.getScopeDisplaySettings(channel), { gain: 2, offset: 10 });
      assert.equal(elements.get(`scope${channel}GainValue`).textContent, '2.0×');
      assert.ok(labels.length > 0, 'slider input redraws the canvas immediately');
      assert.equal(readRawTable(), raw, 'data table must still contain original samples');
      elements.get(`scope${channel}MenuButton`).onclick({ preventDefault() {} });
    }
    scope.setScopeDisplaySettings(2, { gain: 1, offset: 0 });
    assert.deepEqual(scope.getScopeDisplaySettings(1), { gain: 2, offset: 10 });
    assert.deepEqual(scope.getScopeDisplaySettings(2), { gain: 1, offset: 0 });
    scope.setScopeDisplaySettings(3, { gain: 1, offset: 0 });
    scope.setScopeDisplaySettings(4, { gain: 1, offset: 0 });
  }
  { // new samples keep channel settings, original statistics and calibrated axes
    for (let channel = 1; channel <= 4; channel++) {
      elements.get(`scope${channel}Domain`).innerHTML = 'T';
      elements.get(`scope${channel}Sign`).innerHTML = '+';
      elements.get(`scopeType${channel}Select`).value = '32S';
    }
    elements.get('scopeAddSelect').value = 'none';
    const frame = new ArrayBuffer(28 + 1024 * 16);
    const view = new DataView(frame);
    view.setInt32(4, 1, true);
    for (let sample = 0; sample < 1024; sample++) {
      for (let channel = 0; channel < 4; channel++) {
        view.setInt32(28 + sample * 16 + channel * 4, 100 * (channel + 1) + sample, true);
      }
    }
    labels.length = points.length = 0;
    scope.presentQuickScopeData(frame);
    assert.equal(labels[0].text, '210.0');
    assert.equal(labels[6].text, '2256.0');
    assert.equal(elements.get('ch1Ptp').textContent, 1023);
    assert.equal(elements.get('ch1Mean').textContent, '611.50');
    assert.ok(points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
    const raw = readRawTable();
    const previousLabels = [...labels];
    labels.length = 0;
    scope.setScopeDisplaySettings(1, { gain: 2, offset: 10 });
    assert.deepEqual(labels, previousLabels, 'repeated redraws must not compound gain/offset');
    assert.equal(readRawTable(), raw);
  }
  { // unified axes use calibrated ranges from all channels
    elements.get('unifiedLock').checked = true;
    labels.length = 0;
    scope.setScopeDisplaySettings(1, { gain: 2, offset: 10 });
    assert.equal(labels[0].text, '200.0');
    assert.equal(labels[6].text, '2256.0');
    assert.deepEqual(labels.slice(0, 7).map(label => label.text),
      labels.slice(7, 14).map(label => label.text));
    const lockedLabels = [...labels];
    const previousPoints = [...points];
    const raw = readRawTable();
    labels.length = points.length = 0;
    scope.setScopeDisplaySettings(1, { gain: 3, offset: 500 });
    assert.deepEqual(labels, lockedLabels, 'ULock with Chase off must freeze displayed axes');
    assert.notDeepEqual(points, previousPoints, 'gain/offset must move the trace inside fixed axes');
    assert.equal(readRawTable(), raw);
    elements.get('scaleChase').checked = true;
    labels.length = 0;
    elements.get('scaleChase').listeners.change();
    assert.equal(labels[6].text, '3869.0', 'Chase recalculates the displayed range');
    elements.get('scaleChase').checked = false;
    elements.get('scaleChase').listeners.change();
    labels.length = 0;
    scope.setScopeDisplaySettings(1, { gain: 1, offset: 0 });
    assert.equal(labels[6].text, '3869.0', 'disabling Chase freezes the current range');
    elements.get('unifiedLock').checked = false;
    elements.get('unifiedLock').listeners.change();
    elements.get('unifiedLock').checked = true;
    labels.length = 0;
    elements.get('unifiedLock').listeners.change();
    assert.equal(labels[0].text, '100.0');
    assert.equal(labels[6].text, '1423.0', 'unlock/relock captures a fresh common range');
    elements.get('unifiedLock').checked = false;
  }
  let socket = await open();
  scope.setScopeOn();
  const body = new Uint8Array(28);
  new DataView(body.buffer).setInt32(4, 1, true); // final batch schedules a read
  socket.reply(socket.sent[0], body);
  socket.drop();
  assert.equal(elements.get('scope').checked, false);
  assert.match(elements.get('connectionStatus').textContent, /DISCONNECTED/);
  socket = await open();
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(socket.sent.length, 0, 'old scope timer must not send on the new socket');
  scope.setScopeOn();
  assert.equal(socket.sent.length, 1);
  scope.setScopeOff();
  socket.reply(socket.sent[0], body);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(socket.sent.length, 1, 'a cancelled stream must not restart acquisition');
});
