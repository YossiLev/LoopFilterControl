import { sendBinaryBuffer, packU32 } from "./transport.js";


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
