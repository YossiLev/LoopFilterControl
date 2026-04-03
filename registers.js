// registers.js

export class Register {
    constructor(name, addr, signed=false, scale=1) {
        this.name = name;
        this.addr = addr;
        this.signed = signed;
        this.scale = scale;
    }

    decode(raw) {
        let v = raw >>> 0;
        if (this.signed && (v & 0x80000000))
            v = v - 0x100000000;
        return v * this.scale;
    }

    encode(val) {
        return Math.round(val / this.scale) >>> 0;
    }
}

// === PID REGISTERS ===
// (replace/add according to your registers.py)

export const PID_KP = new Register("KP", 0x24, true, 1/65536);
export const PID_KI = new Register("KI", 0x28, true, 1/65536);
export const PID_KD = new Register("KD", 0x2C, true, 1/65536);

export const PID_SETPOINT = new Register("SETPOINT", 0x10, true, 1/65536);
export const PID_FEEDBACK = new Register("FEEDBACK", 0x14, true, 1/65536);
export const PID_ERROR = new Register("ERROR", 0x18, true, 1/65536);

export const ALL_REGS = [
    PID_KP, PID_KI, PID_KD,
    PID_SETPOINT, PID_FEEDBACK, PID_ERROR
];

export function decode(reg, raw) {
    if (reg.signed && raw & 0x80000000) raw -= 0x100000000;
    return raw * reg.scale;
}

export function encode(reg, val) {
    return Math.round(val / reg.scale);
}

// registers.js
// Auto-ported from registers.py (FPGA ABI safe)

export const regNames = [
 'pid magic',
 'pid version',
 'pid live counter',
 'input (o_y_n)',
 'q0, q4 (o_q0_q4)',
 'q1, q5 (o_q1_q5)',
 'q2, q6 (o_q2_q6)',
 'q3, q7 (o_q3_q7)',
 'configuration (o_config)',
 'y ref (o_y_reference)',
 'i0 (o_i0)',
 'output (o_z_n)',
 'counter (o_count)',
 '3rd prev input(o_y_n_3)',
 'averaging size (o_delay_count)',
 'averaging counter (o_delay_counter)',
 'out ref (o_out_offset)',
 'special value (o_magic)',
 'DACB selection bits (o_dacb_output)',
 'o_dither_config_1',
 'o_dither_config_2',
 'o_dither_config_3',
 'o_dither_count_1',
 'o_dither_count_2',
 'o_dither_count_3',
 'o_2nd_out_offset',
 'o_2nd_config',
 'o_3rd_config',
 'o_y_n_4',
 'o_y_n_5',
 'o_y_n_6',
 'o_y_n_7',
 '2nd integration output (o_2nd_output)',
 'manual DAC output (o_manual_dac_output)',
 'raw input (o_y_input)',
 'dac a output',
 'dac b output',
 'debug reg 1',
 'pre-dither manual value',
 'current sum before rebase',
 'current sum total low 32bits',
 'current sum total high 16bits',
 'dac output'
];

export const numRegs = regNames.length;
export const dumpEntrySize = 8;
export const expectedDumpBytes = numRegs * dumpEntrySize;

export const friendlyNames = {
 'pid magic':'pid_magic',
 'pid version':'pid_version',
 'pid live counter':'pid_live_counter',
 'input (o_y_n)':'o_y_n',
 'q0, q4 (o_q0_q4)':'o_q0_q4',
 'q1, q5 (o_q1_q5)':'o_q1_q5',
 'q2, q6 (o_q2_q6)':'o_q2_q6',
 'q3, q7 (o_q3_q7)':'o_q3_q7',
 'configuration (o_config)':'o_config',
 'y ref (o_y_reference)':'o_y_reference',
 'i0 (o_i0)':'o_i0',
 'output (o_z_n)':'o_z_n',
 'counter (o_count)':'o_count',
 '3rd prev input(o_y_n_3)':'o_y_n_3',
 'averaging size (o_delay_count)':'o_delay_count',
 'averaging counter (o_delay_counter)':'o_delay_counter',
 'out ref (o_out_offset)':'o_out_offset',
 'special value (o_magic)':'o_magic',
 'DACB selection bits (o_dacb_output)':'o_dacb_output',
 'o_dither_config_1':'o_dither_config_1',
 'o_dither_config_2':'o_dither_config_2',
 'o_dither_config_3':'o_dither_config_3',
 'o_dither_count_1':'o_dither_count_1',
 'o_dither_count_2':'o_dither_count_2',
 'o_dither_count_3':'o_dither_count_3',
 'o_2nd_out_offset':'o_2nd_out_offset',
 'o_2nd_config':'o_2nd_config',
 'o_3rd_config':'o_3rd_config',
 'o_y_n_4':'o_y_n_4',
 'o_y_n_5':'o_y_n_5',
 'o_y_n_6':'o_y_n_6',
 'o_y_n_7':'o_y_n_7',
 '2nd integration output (o_2nd_output)':'o_2nd_output',
 'manual DAC output (o_manual_dac_output)':'o_manual_dac_output',
 'raw input (o_y_input)':'o_y_input',
 'dac a output':'o_dac_a',
 'dac b output':'o_dac_b',
 'debug reg 1':'o_debug_reg_1',
 'pre-dither manual value':'o_pre_dither_manual_value',
 'current sum before rebase':'o_current_sum_before_rebase',
 'current sum total low 32bits':'o_current_sum_total_low',
 'current sum total high 16bits':'o_current_sum_total_high',
 'dac output':'o_dac_output'
};

export const regType = {
 'pid_magic': "O",
 'pid_version': "O",
 'pid_live_counter': "O",
 'o_y_n': "O",
 'o_q0_q4': "S",
 'o_q1_q5': "S",
 'o_q2_q6': "S",
 'o_q3_q7': "S",
 'o_config': "X",
 'o_y_reference': "",
 'o_i0': "",
 'o_z_n': "O SI",
 'o_count': "O",
 'o_y_n_3': "O",
 'o_delay_count': "",
 'o_delay_counter': "",
 'o_out_offset': "SI",
 'o_magic': "O",
 'o_dacb_output': "",
 'o_dither_config_1': "",
 'o_dither_config_2': "",
 'o_dither_config_3': "",
 'o_dither_count_1': "SI",
 'o_dither_count_2': "SI",
 'o_dither_count_3': "SI",
 'o_2nd_out_offset': "",
 'o_2nd_config': "X",
 'o_3rd_config': "X",
 'o_y_n_4': "O",
 'o_y_n_5': "O",
 'o_y_n_6': "O",
 'o_y_n_7': "O",
 'o_2nd_output': "",
 'o_manual_dac_output': "",
 'o_y_input': "O SI",
 'o_dac_a': "O",
 'o_dac_b': "O",
 'o_debug_reg_1': "",
 'o_pre_dither_manual_value': "",
 'o_current_sum_before_rebase': "O SI",
 'o_current_sum_total_low': "O SI",
 'o_current_sum_total_high': "O SI",
 'o_dac_output': "O",  
}

export const regInput = {
  'o_y_reference': "Input offset (ADC units) 8192",
  'o_out_offset': "Output oset (DAC units) 3640",


}

export const regOutput2 = [
          'ADC_DA',
        '0x2000 (const)',
        'input (o_y_n)',
        'prev input (o_y_n_1)',
        '2nd prev input (o_y_n_2)',
        '3rd prev input (o_y_n_3)',
        '4th prev input (o_y_n_4)',
        'output (o_z_n)',
        '5th prev input (o_y_n_5)',
        'counter (o_count)',
        '6th prev input (o_y_n_6)',
        '7th prev input (o_y_n_7)',
        'o_dither_input_counter',
        'output no integral (o_z_n_no_integral)',
        'raw input (o_y_input)',
        'integration sum (o_integral_sum)',
        '2nd integration (o_2nd_integral)',
        '0 (const)'
];

export class Config {
  constructor(w=0){
    this.continuous   = (w>>1)&1;
    this.inputSelect = (w>>2)&1;
    this.invertInput = (w>>11)&1;
    this.invertOutput= (w>>13)&1;
    this.outputShift= (w>>16)&0x3F;
  }
}

export class DACB {
  constructor(w=0){
    this.adc     = (w>>0)&1;
    this.output  = (w>>7)&1;
    this.input   = (w>>2)&1;
    this.counter = (w>>9)&1;
  }
}

export class Predictor {
  constructor(){
    for(const k of Object.values(friendlyNames)) this[k]=0;
  }
}

export class RegisterDump {
  constructor(buffer){
    this.predictor = new Predictor();
    this.addresses = new Predictor();
    this.unpack(buffer);
  }

  unpack(buffer){
    const headerLength = 8;
    if(buffer.byteLength !== expectedDumpBytes + headerLength) {
      console.log(`Unpacking register dump of ${buffer.byteLength} bytes, expected ${expectedDumpBytes} bytes`);
      throw "Bad register dump size";
    }
  
    const dv = new DataView(buffer);

    let values=[], addrs=[];
    for(let i=0;i<numRegs;i++){
      addrs.push(dv.getUint32(headerLength + i*8,true));
      values.push(dv.getUint32(headerLength + i*8+4,true));
    }

    regNames.forEach((n,i)=>{
      const k = friendlyNames[n];
      this.predictor[k]=values[i];
      this.addresses[k]=addrs[i];
    });

    this.config = new Config(this.predictor.o_config);
    this.dacb   = new DACB(this.predictor.o_dacb_output);

    this.q0 =  this.predictor.o_q0_q4 & 0xFFFF;
    this.q4 = (this.predictor.o_q0_q4>>16)&0xFFFF;
  }
}
