import { sendBinaryBuffer, sendBinaryBufferConsistent, packU32 } from "./transport.js";


export async function setPredictorGains(integral_gain, integral_2nd_gain, proportional_gain) {
    // Command 0x05 = set gain
  const buffer = new ArrayBuffer(20);
  const dv = new DataView(buffer);
  dv.setUint32(0, 5, true);
  dv.setUint32(4, integral_gain, true);
  dv.setUint32(8, integral_2nd_gain, true);
  dv.setFloat64(12, proportional_gain, true);

  const resp = await sendBinaryBuffer(buffer);
  return new DataView(resp).getUint32(0, true);
}

export async function setAveragingTimeInCycles(numCycles=2) {
  // command 0x04 = set averaging time
  const buffer = new ArrayBuffer(8);
  const dv = new DataView(buffer);
  dv.setUint32(0, 4, true);
  dv.setUint32(4, numCycles, true);

  const resp = await sendBinaryBuffer(buffer);
  return new DataView(resp).getUint32(0, true);  
}

export async function setPredictor(on) {
  const cmd = packU32(on ? 16 : 15);
  return await sendBinaryBuffer(cmd);
}

export async function readRegister(index) {
  // Command 0x01 = read register
  const buffer = new ArrayBuffer(8);
  const dv = new DataView(buffer);
  dv.setUint32(0, 1, true);
  dv.setUint32(4, index, true);

  const resp = await sendBinaryBuffer(buffer);
  return new DataView(resp).getUint32(0, true);
}

export async function writeRegister(index, value) {
  const buffer = new ArrayBuffer(12);
  const dv = new DataView(buffer);
  dv.setUint32(0, 2, true);
  dv.setUint32(4, index, true);
  dv.setUint32(8, value, true);

  await sendBinaryBuffer(buffer);
}

    // COMMAND_SCAN_BEGIN                      =    24
    // COMMAND_SCAN_END                        =    25
    // ScanType(Enum): SAW_TOOTH = 1    TRIANGLE = 2     NONE = 0

export async function setScanOn(offset, frequency, amplitude, scanType) {
  const buffer = new ArrayBuffer(20);
  const dv = new DataView(buffer);
  dv.setUint32(0, 24, true);
  dv.setUint32(4, offset, true);
  dv.setUint32(8, frequency, true);
  dv.setUint32(12, amplitude, true);
  dv.setUint32(12, scanType, true);

  return await sendBinaryBuffer(buffer);
}

export async function setScanOff() {
  const buffer = new ArrayBuffer(4);
  const dv = new DataView(buffer);
  dv.setUint32(0, 25, true);

  return await sendBinaryBuffer(buffer);
}

export async function dumpRegisters() {
  const cmd = packU32(8);
  return await sendBinaryBuffer(cmd);
}

export async function getTwoRegisterSamples(r1, r2, n) {
  const buffer = new ArrayBuffer(24);
  const dv = new DataView(buffer);
  dv.setUint32(0, 19, true);
  dv.setUint32(4, r1, true);
  dv.setUint32(8, r2, true);
  dv.setUint32(12, n, true);
  dv.setFloat64(16, 0.0, true);

  return await sendBinaryBuffer(buffer);
}

export function getTwoRegisterStream(r1, r2, n, cb) {
  const buffer = new ArrayBuffer(24);
  const dv = new DataView(buffer);
  dv.setUint32(0, 19, true);
  dv.setUint32(4, r1, true);
  dv.setUint32(8, r2, true);
  dv.setUint32(12, n, true);
  dv.setFloat64(16, 0.0, true);

  sendBinaryBufferConsistent(buffer, cb);
}