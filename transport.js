import { WS_URL, TIMEOUT_MS } from "./config.js";

let ws = null;
let seq = 1;
let pending = new Map();
let conSeq = 1;
let conPending = new Map();

export function packU32(x) {
  const b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, x, true);
  return b;
}

function log(a, clear=false) {
    const d = document.getElementById("log");
    if (d) {
        if (clear) d.innerHTML = "";
        d.innerHTML += a + "</br>";
        d.scrollTop = d.scrollHeight;
    }
}

async function sendWithHeader(pkt) {
  // Header format: 4 bytes magic (outof which last two will be stammed with a sequence number), 4 bytes message type, 4 bytes length
  const l = pkt.length;
  const h = [0x78, 0x56, 0x34, 0x12, 1, 0, 0, 0, l & 0xff, l >> 8 & 0xff, l >> 16 & 0xff, l >> 24 & 0xff, ];
  const r = await sendPacket(new Uint8Array([...h, ...pkt]));
  //console.log(r);
  return r;
}

function sendWithHeaderConsistent(pkt, cb) {
  // Header format: 4 bytes magic (outof which last two will be stammed with a sequence number), 4 bytes message type, 4 bytes length
  const l = pkt.length;
  const h = [0x78, 0x56, 0x34, 0x12, 1, 0, 0, 0, l & 0xff, l >> 8 & 0xff, l >> 16 & 0xff, l >> 24 & 0xff, ];
  sendPacketConsistent(new Uint8Array([...h, ...pkt]), cb);
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
            log(`Rx: ${uint8ArrayToHexString(data.slice(0, 40))}`);
            const s = (data[3] << 8) | data[2];
            // console.log(`Returned s ${s}`);
            if ((s & 0x8000) == 0) {
                // console.log(`Loooking for ${s} in pending`);

                if (pending.has(s)) {
                    const dat = Array.from(data);
                    dat.splice(0, 12); // Remove header
                    pending.get(s)(dat);
                    pending.delete(s);
                } else {
                    console.log("* * * * Not found in pending")
                }
            } else {
                // console.log(`Loooking for ${s & 0x7FFF} in consistent pending`);

                if (conPending.has(s & 0x7FFF)) {
                    // console.log(`Found in consistent pending`);
                    const dat = Array.from(data);
                    // console.log(`data ${dat[0]} ${dat[1]} ${dat[2]} ${dat[3]} ${dat[4]} ${dat[5]} ${dat[6]} ${dat[7]} ${dat[8]} ${dat[9]} ${dat[10]} ${dat[11]} `)

                    dat.splice(0, 12); // Remove header
                    if (conPending.get(s & 0x7FFF)(new Uint8Array(dat).buffer)) {
                        // an end-data message reported
                        // console.log(`deleting ${s & 0x7FFF} in consistent pending`);

                        conPending.delete(s & 0x7FFF);
                    }
                } else {
                    console.log("* * * * Not found in consistent pending")
                }                
            }
        };
    });
}

export function disconnect() {
  if (ws) ws.close();
  ws = null;
}

export async function sendValue(setCode, value) {
    // const b = new ArrayBuffer(8);
    // const v = new DataView(b);
    // v.setFloat64(0, value, true);
    // const pkt = new Uint8Array(4 + 8);
    // pkt[0] = setCode & 0xFF;
    // pkt[1] = (setCode >> 8) & 0xFF;
    // pkt[2] = (setCode >> 16) & 0xFF;
    // pkt[3] = (setCode >> 24) & 0xFF;
    // pkt.set(new Uint8Array(b), 4);
    // await sendWithHeader(pkt);
}

export function sendBinaryBufferConsistent(buffer, cb) {
    sendWithHeaderConsistent(new Uint8Array(buffer), cb);
}

export async function sendBinaryBuffer(buffer) {
    const a = await sendWithHeader(new Uint8Array(buffer));
    return new Uint8Array(a).buffer;
}

async function sendPacket(pkt) {

    return new Promise((resolve, reject) => {
        // stamp every outgoing message with a sequence number, and add it to the pending map with the resolve function. 
        // When we get a response, look up the sequence number and call the resolve function with the response data.
        const s = seq++ & 0x7FFF;
        pkt[2] = s & 0xFF;
        pkt[3] = (s >> 8) & 0xFF;
        // console.log(`Putting ${s} input pending`)
        pending.set(s, resolve);

        //console.log(uint8ArrayToHexString(pkt));
        log(`Tx: ${uint8ArrayToHexString(pkt)}`, true);

        ws.send(pkt);

        // Set a timeout to reject the promise if we don't get a response in time. Also remove from pending to avoid memory leak.
        setTimeout(() => {
             if (pending.has(s)) {
                 pending.delete(s);
                 reject("Timeout");
                 console.log(`* * * * Timeout on ${s}`)
             }
        }, TIMEOUT_MS);
    });
}

function sendPacketConsistent(pkt, cb) {
    // stamp every consistent outgoing message with a sequence number, and add it to the pending map with the resolve function. 
    // When we get a response, look up the sequence number and call the resolve function with the response data.
    const s = conSeq++ & 0x7FFF;
    pkt[2] = s & 0xFF;
    pkt[3] = ((s >> 8) & 0xFF) | 0x80; // the marker 0x80 for consistent message
    //console.log(`Putting consistent ${s} input pending`)
    conPending.set(s, cb);

    //console.log(uint8ArrayToHexString(pkt));
    log(`Tx: ${uint8ArrayToHexString(pkt)}`, true);

    ws.send(pkt);
}

