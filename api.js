import { sendBinaryBuffer, sendBinaryBufferConsistent, packU32 } from "./transport.js";

function lFormat(f) {
  switch (f) {
    case 'i': return 4;
    case 'd': return 8;
  }
  return 0;
}
function prepareBuffer(cmd, formatStr, parameters) {
  const formats = formatStr.split("");
  const lBuffer = formats.reduce((acc, f) => acc + lFormat(f), 4);
  const buffer = new ArrayBuffer(lBuffer);
  const dv = new DataView(buffer);
  let pNext = 4;
  dv.setUint32(0, cmd, true);
  formats.forEach((f, i) => {
    switch (f) {
      case 'i': dv.setUint32(pNext, parameters[i], true); break;
      case 'd': dv.setFloat64(pNext, parameters[i], true); break;
    }
    pNext += lFormat(f);
  });
  return buffer;
}

async function sendParameters(cmd, formatStr, parameters) {
  const buffer = prepareBuffer(cmd, formatStr, parameters);
  const resp = await sendBinaryBuffer(buffer);
  return new DataView(resp).getUint32(4, true);
}

let setOutputSignalLast = 1;
export async function selectOutputSignal(index) {
  // Command 0x15 = select output signal
  if (index == setOutputSignalLast) return 0;
  setOutputSignalLast = index;
  return await sendParameters(15, "i", [index]);

  // const buffer = new ArrayBuffer(8);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 21, true);
  // dv.setUint32(4, index, true);

  // const resp = await sendBinaryBuffer(buffer);
  // return new DataView(resp).getUint32(4, true);
}

let setPredictorOrderLast = - 1;
export async function setPredictorOrder(order) {
  // Command 0x02 = set predictor order
  if (order == setPredictorOrderLast) return 0;
  setPredictorOrderLast = order;
  return await sendParameters(2, "i", [order]);

  // const buffer = new ArrayBuffer(8);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 2, true);
  // dv.setUint32(4, order, true);

  // const resp = await sendBinaryBuffer(buffer);
  // return new DataView(resp).getUint32(4, true);
}
let setOutputOffsetLast = [- 1, -1];
export async function setOutputOffsets(offset1, offset2) {
  // Command 0x0c = set output offsets
  if (offset1 == setOutputOffsetLast[0] && offset2 == setOutputOffsetLast[1]) return 0;
  setOutputOffsetLast[0] = offset1;
  setOutputOffsetLast[1] = offset2;

  return await sendParameters(12, "ii", [offset1, offset2]);

  // const buffer = new ArrayBuffer(12);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 12, true);
  // dv.setUint32(4, offset1, true);
  // dv.setUint32(8, offset2, true);

  // const resp = await sendBinaryBuffer(buffer);
  // return new DataView(resp).getUint32(4, true);
}

export async function setPredictorAlpha(alpha) {
  // Command 0x03 = set predictor alpha

  return await sendParameters(3, "d", [alpha]);
  
  // const buffer = new ArrayBuffer(12);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 3, true);
  // dv.setFloat64(4, alpha, true);

  // const resp = await sendBinaryBuffer(buffer);
  // return new DataView(resp).getUint32(4, true);
}

export async function setPredictorGains(integral_gain, integral_2nd_gain, proportional_gain) {
  // Command 0x05 = set gain
  return await sendParameters(5, "iid", [integral_gain, integral_2nd_gain, proportional_gain]);

  // const buffer = new ArrayBuffer(20);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 5, true);
  // dv.setUint32(4, integral_gain, true);
  // dv.setUint32(8, integral_2nd_gain, true);
  // dv.setFloat64(12, proportional_gain, true);

  // const resp = await sendBinaryBuffer(buffer);
  // return new DataView(resp).getUint32(0, true);
}

export async function setAveragingTimeInCycles(numCycles=2) {
  // command 0x04 = set averaging time
  return await sendParameters(4, "i", [numCycles]);

  // const buffer = new ArrayBuffer(8);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 4, true);
  // dv.setUint32(4, numCycles, true);

  // const resp = await sendBinaryBuffer(buffer);
  // return new DataView(resp).getUint32(0, true);  
}

export async function setPredictor(on) {
  const cmd = packU32(on ? 16 : 15);
  return await sendBinaryBuffer(cmd);
}

export async function readRegister(index) {
  // Command 0x01 = read register
  const buffer = prepareBuffer(1, "i", [index]);

  // const buffer = new ArrayBuffer(8);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 1, true);
  // dv.setUint32(4, index, true);

  const resp = await sendBinaryBuffer(buffer);
  return new DataView(resp).getUint32(0, true);
}

export async function writeRegister(index, value) {
  const buffer = prepareBuffer(2, "ii", [index, value]);

  // const buffer = new ArrayBuffer(12);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 2, true);
  // dv.setUint32(4, index, true);
  // dv.setUint32(8, value, true);

  await sendBinaryBuffer(buffer);
}

    // COMMAND_SCAN_BEGIN                      =    24
    // COMMAND_SCAN_END                        =    25
    // ScanType(Enum): SAW_TOOTH = 1    TRIANGLE = 2     NONE = 0

export async function setScanOn(offset, frequency, amplitude, scanType) {
  return await sendParameters(24, "iiii", [offset, frequency, amplitude, scanType]);

  // const buffer = new ArrayBuffer(20);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 24, true);
  // dv.setUint32(4, offset, true);
  // dv.setUint32(8, frequency, true);
  // dv.setUint32(12, amplitude, true);
  // dv.setUint32(16, scanType, true);

  // return await sendBinaryBuffer(buffer);
}

export async function setScanOff() {
  return await sendParameters(25, "", []);

  // const buffer = new ArrayBuffer(4);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 25, true);

  // return await sendBinaryBuffer(buffer);
}

export async function dumpRegisters() {
  const cmd = packU32(8);
  return await sendBinaryBuffer(cmd);
}

export async function getTwoRegisterSamples(r1, r2, n) {
  const buffer = prepareBuffer(19, "iiid", [r1, r2, n, 0.0]);

  // const buffer = new ArrayBuffer(24);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 19, true);
  // dv.setUint32(4, r1, true);
  // dv.setUint32(8, r2, true);
  // dv.setUint32(12, n, true);
  // dv.setFloat64(16, 0.0, true);

  return await sendBinaryBuffer(buffer);
}

export function getTwoRegisterStream(r1, r2, n, cb) {
  const buffer = prepareBuffer(19, "iiid", [r1, r2, n, 0.0]);

  // const buffer = new ArrayBuffer(24);
  // const dv = new DataView(buffer);
  // dv.setUint32(0, 19, true);
  // dv.setUint32(4, r1, true);
  // dv.setUint32(8, r2, true);
  // dv.setUint32(12, n, true);
  // dv.setFloat64(16, 0.0, true);

  sendBinaryBufferConsistent(buffer, cb);
}