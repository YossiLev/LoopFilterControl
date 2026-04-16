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
  return await sendParameters(21, "i", [index]);

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
}

let setInputOffsetLast = -9999999;
export async function setInputOffset(offset) {
  // Command 0x0b = set output offsets
  if (offset == setInputOffsetLast) return 0;
  setInputOffsetLast = offset;

  return await sendParameters(11, "i", [offset]);
}

export async function setInputSelect(value) {
  // Command 0x0a = set input select
  return await sendParameters(10, "i", [value]);  
}

export async function setInt2IsOnSelect(i2Enabled, i2DisabledValue) {
  // Command 0x16 = set int2 is on select
  return await sendParameters(22, "ii", [i2Enabled, i2DisabledValue]);
}

export async function setDitherSelect(ditherEnabled) {
}


export async function setPredictorAlpha(alpha) {
  // Command 0x03 = set predictor alpha

  return await sendParameters(3, "d", [alpha]);
  
}

function getIntAndShift(_float) {
  //Evaluate integer and shift part which would match _float as near as possible
  //Limits are on shift value (<= 16)
  if (_float == 0) {
      return [0 ,0];
  }
  let _f = _float
  let _i = Math.floor(_f);          // integer part
  
  let _shift = 0;
  let precision = (_i / (1 << _shift)) / _float;
  //console.log(`Initial float${_float} int ${_i} shift ${_shift} precision ${precision}`);

  //  Try and evaluate best shift and integer values:
  //  >   Precision should be 95%
  //  >   Shift at most by 16 bits
  //  >   integer value has to be limited as well
  //  >   Small values fix - do not shift too much to 
  //      arrive at low gain precision
  while (Math.abs(1. - precision) > 0.05 && _shift < 17 &&  Math.abs(_i) < 0x7fff &&
          (Math.abs(_i) > 2 || _shift < 8)) {
      _f     = _f * 2.0;
      _shift = _shift + 1;
      _i     = Math.floor(_f);         // integer part
      precision = (_i / (1 << _shift)) / _float;
      //console.log(`Int ${_i} shift ${_shift} precision ${precision}`);
  }

  return [Math.floor(_i), _shift];
}

export async function setGains(p_gain, pi_corner_hz, i2_gain, averagingTimeNs) {
  // Command 0x03 = set predictor alpha
  const i_gain = 2 * Math.PI * pi_corner_hz * p_gain;
  let averagingTimeCycles = Math.ceil(averagingTimeNs / 20);

  let [p_gain_int, int_p_shift] = getIntAndShift(p_gain);
  let [i_gain_int, int_i_shift] = getIntAndShift(i_gain);
  let [i2_gain_int, int_i2_shift] = getIntAndShift(i2_gain);

  let output_shift = int_p_shift               
  let i0_shift     = int_i_shift  - int_p_shift
  let i2_shift     = int_i2_shift - int_p_shift 
  if (i0_shift < 0) {
      i0_shift = 0;
  }
  if (i2_shift < 0) {
      i2_shift = 0;
  }
  // #
  // # Now consider averaging.
  // # Since averaging is achieved by summation, the input signal is essentially amplified by it.
  // #
  let log2_cycles = Math.ceil(Math.log2(averagingTimeCycles));
  console.log(`Averaging time ${averagingTimeNs} ns, cycles ${averagingTimeCycles}, log2 ${log2_cycles}`);

  output_shift+= log2_cycles;
  i0_shift    += log2_cycles;
  i2_shift    += log2_cycles;

  console.log(`Gains ${p_gain} ${i_gain} ${i2_gain}`);
  console.log(`converted to int ${p_gain_int}(${output_shift}) ${i_gain_int}(${i0_shift}) ${i2_gain_int}(${i2_shift})`); 

  await sendParameters(9, "iii", [output_shift, i0_shift, i2_shift]);
  await sendParameters(5, "iid", [i_gain_int, i2_gain_int, p_gain_int]);
  return 1;
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