import { WS_URL, TIMEOUT_MS } from "./config.js";


let ws = null;
let seq = 1;
let pending = new Map();

export function packU32(x) {
  const b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, x, true);
  return b;
}

function log(a) {
    const d = document.getElementById("log");
    if (d) {
        d.textContent += a + "\n";
        d.scrollTop = d.scrollHeight;
    }
}

export function disconnect() {
  if (ws) ws.close();
  ws = null;
}

async function sendWithHeader(pkt) {
  const l = pkt.length;
  const h = [0x78, 0x56, 0x34, 0x12, 1, 0, 0, 0, l & 0xff, l >> 8 & 0xff, l >> 16 & 0xff, l >> 24 & 0xff, ];
  const r = await sendPacket(new Uint8Array([...h, ...pkt]));
  //console.log(r);
  return r;
}

export async function sendBinaryBuffer(buffer) {
    const a = await sendWithHeader(new Uint8Array(buffer));
    return new Uint8Array(a).buffer;
}

function uint8ArrayToHexString(uint8Array) {
  let hexString = "";
  for (const byte of uint8Array) {
    // Convert the byte to a hex string and pad with a leading zero if necessary
    hexString += byte.toString(16).padStart(2, "0") + " ";
  }
  return hexString;
}

export async function connect() {
    return new Promise((resolve, reject) => {
        ws = new WebSocket(WS_URL);
        ws.binaryType = "arraybuffer";
        ws.onopen = resolve;
        ws.onerror = reject;
        ws.onmessage = ev => {
            const data = new Uint8Array(ev.data);
            //console.log("Response ", uint8ArrayToHexString(data));
            log(`Rx: ${uint8ArrayToHexString(data)}`);
            const s = (data[3] << 8) | data[2];
            console.log(`Loooking for ${s} in pending`);

            if (pending.has(s)) {
                const dat = Array.from(data);
                dat.splice(0, 12); // Remove header
                pending.get(s)(dat);
                pending.delete(s);
            } else {
                console.log("* * * * Not found in pending")
            }
        };
    });
}

export async function sendPacket(pkt) {

    return new Promise((resolve, reject) => {
        const s = seq++ & 0xFFFF;
        pkt[2] = s & 0xFF;
        pkt[3] = (s >> 8) & 0xFF;
        console.log(`Putting ${s} input pending`)
        pending.set(s, resolve);

        console.log(uint8ArrayToHexString(pkt));

        log(`Tx: ${uint8ArrayToHexString(pkt)}`);

        ws.send(pkt);

        setTimeout(() => {
             if (pending.has(s)) {
                 pending.delete(s);
                 reject("Timeout");
                 console.log(`* * * * Timeout on ${s}`)
             }
        }, TIMEOUT_MS);
    });
}

