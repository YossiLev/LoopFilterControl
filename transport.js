import { WS_URL, TIMEOUT_MS } from "./config.js";

let ws = null;
let seq = 1;
let conSeq = 1;
const pending = new Map();
const conPending = new Map();
const connectionListeners = new Set();
let cancelConnection = null;

export function onConnectionStateChange(listener) {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}

function notifyConnection(state, error) {
  for (const listener of connectionListeners) {
    try { listener(state, error); }
    catch (err) { console.error("Connection listener failed", err); }
  }
}

export function isConnected() {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

export function packU32(x) {
  const b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, x, true);
  return b;
}

function log(message, clear = false) {
  const element = document.getElementById("log");
  if (!element) return;
  if (clear) element.textContent = "";
  element.append(document.createTextNode(message), document.createElement("br"));
  element.scrollTop = element.scrollHeight;
}

function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join(" ");
}

function makePacket(buffer, sequence, stream = false) {
  const packet = new Uint8Array(12 + buffer.byteLength);
  const header = new DataView(packet.buffer);
  header.setUint16(0, 0x5678, true);
  header.setUint16(2, sequence | (stream ? 0x8000 : 0), true);
  header.setUint32(4, 1, true);
  header.setUint32(8, buffer.byteLength, true);
  packet.set(new Uint8Array(buffer), 12);
  return packet;
}

function nextSequence(map, stream = false) {
  for (let i = 0; i < 0x8000; i++) {
    const value = (stream ? conSeq++ : seq++) & 0x7fff;
    if (!map.has(value)) return value;
  }
  throw new Error("Too many pending requests");
}

function requireSocket() {
  if (!isConnected()) throw new Error("Not connected to the FPGA bridge");
  return ws;
}

export function connect() {
  disconnect();
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(WS_URL);
    ws = socket;
    socket.binaryType = "arraybuffer";
    let opened = false;
    const timer = setTimeout(() => finish(new Error("Connection timed out")), TIMEOUT_MS);

    // Both explicit disconnect and socket failures use this cleanup path.
    function finish(error) {
      if (ws !== socket) return;
      ws = null;
      cancelConnection = null;
      clearTimeout(timer);
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(error);
      }
      pending.clear();
      conPending.clear();
      if (!opened) reject(error);
      if (socket.readyState !== WebSocket.CLOSED) socket.close();
      notifyConnection("disconnected", error);
    }
    cancelConnection = finish;
    socket.onopen = () => {
      if (ws !== socket) return;
      clearTimeout(timer);
      opened = true;
      notifyConnection("connected");
      resolve();
    };
    socket.onerror = () => finish(new Error("WebSocket connection failed"));
    socket.onclose = event => finish(new Error(`Connection closed (${event.code})`));
    socket.onmessage = event => {
      if (ws !== socket) return;
      try {
        const data = new Uint8Array(event.data);
        if (data.byteLength < 12) throw new Error("Truncated response header");
        const header = new DataView(event.data);
        log(`Rx: ${hex(data.slice(0, 40))}`);
        const sequence = header.getUint16(2, true);
        const body = event.data.slice(12);
        if (sequence & 0x8000) {
          const id = sequence & 0x7fff;
          const callback = conPending.get(id);
          if (callback && callback(body)) conPending.delete(id);
        } else {
          const request = pending.get(sequence);
          if (!request) return;
          clearTimeout(request.timer);
          pending.delete(sequence);
          request.resolve(body);
        }
      } catch (error) {
        finish(error);
      }
    };
  });
}

export function disconnect() {
  if (cancelConnection) cancelConnection(new Error("Disconnected"));
}

export async function sendBinaryBuffer(buffer) {
  const socket = requireSocket();
  const sequence = nextSequence(pending);
  const packet = makePacket(buffer, sequence);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(sequence);
      reject(new Error("Request timed out"));
    }, TIMEOUT_MS);
    pending.set(sequence, { resolve, reject, timer });
    try {
      log(`Tx: ${hex(packet)}`, true);
      socket.send(packet);
    } catch (error) {
      clearTimeout(timer);
      pending.delete(sequence);
      reject(error);
      cancelConnection?.(error);
    }
  });
}

// Returns a local cancellation function; no server-side stop command is assumed.
export function sendBinaryBufferConsistent(buffer, callback) {
  const socket = requireSocket();
  const sequence = nextSequence(conPending, true);
  const packet = makePacket(buffer, sequence, true);
  conPending.set(sequence, callback);
  try {
    log(`Tx: ${hex(packet)}`, true);
    socket.send(packet);
  } catch (error) {
    conPending.delete(sequence);
    cancelConnection?.(error);
    throw error;
  }
  return () => {
    if (conPending.get(sequence) === callback) conPending.delete(sequence);
  };
}
