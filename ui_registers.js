import { dumpRegisters } from "./api.js";
import { RegisterDump, friendlyNames, friendlyNamesSelectOrder, regType, regOutput2 } from "./registers.js";


function checkRegFlag(r, f) {
  return regType[r].split(" ").includes(f);
}
function convertRegValue(r, v) {
  let tVal = v;
  if (checkRegFlag(r, "S")) {
    tVal = `${v >> 16} # ${((v & 0xffff ) << 16) >> 16} [${v.toString(16)}]` ; 
  }
  if (checkRegFlag(r, "X")) {
    tVal = `${v.toString(16)}`; 
  }
  if (checkRegFlag(r, "SI")) {
    if (v > 2147483647) {
        v = v - 4294967296;
    }
    tVal = `${v} [${v.toString(16)}]`; 
  }
  return tVal;
}

let prevDump = {}

function displayValue([key, value], i) {
  const color = key in regType ? (checkRegFlag(key, "O") ? "black" : "green") : "red";
  let tVal = convertRegValue(key, value);
  return `<div style="color: ${color};">${i}) ${key}: ${tVal}</div>`
}
function displayDiff([key, value]) {
  let color = "lightgray";
  if (key in prevDump) {
    if (prevDump[key] != value) {
      value = prevDump[key];
      if (!checkRegFlag(key, "O")) {
        color = "red" ;
      } else {
        color = "lightblue" ;
      }
    }

    let tVal = convertRegValue(key, value);
    return `<div style="color: ${color};">${key}: ${tVal}</div>`
  }
  return "";
}

function displayConfiguration(config) {
  let output = "";

  // t* Bit [    0] *t unsigned int  reserved_0   :   1   ;
  output += `<div>reserved_0: ${config & 1}</div>`;  
  // t* Bit [    1] *t unsigned int  continuous   :   1   ;    // "1" ==> continous, "0" ==> S/W mode.
  output += `<div>continuous: ${config & 2 ? "Yes" : "No"}</div>`;
  // t* Bit [    2] *t unsigned int  input_select :   1   ;    // "0/1" ==> A/B inputs
  output += `<div>input_select: ${config & 4 ? "B" : "A"}</div>`;  
  // t* Bit [    3] *t unsigned int  pre_dither_manual_enable
  //                                              :   1   ;    // "0"   ==> normal input to dither output (= output of pid).
  //                                                           // "1"   ==> manual input to dither output (= manual register value, pid result is discarded)
  output += `<div>pre_dither_manual_enable: ${config & 8 ? "Manual" : "Normal"}</div>`;
  // t* Bit [    4] *t unsigned int  pre_dither_manual_value
  //                                              :   1   ;    // "0"   ==> dither output is 0 when pre_dither_manual_enable is "1"
  //                                                           // "1"   ==> dither output is 1 when pre_dither_manual_enable is "1"
  output += `<div>pre_dither_manual_value: ${config & 16 ? "1" : "0"}</div>`;
  // t* Bits[ 8: 4] *t unsigned int  output_precision_size
  //                                              :   5   ;    // # of bits in high precision PWM DAC shaper
  //                                                           // (essentially, the fractional # of bits to consider)
  output += `<div>output_precision_size: ${(config >> 4) & 0x1f}</div>`;
  // t* Bit [    9] *t unsigned int  adc_align_enable
  //                                              :   1   ;    // "1"   ==> input is taken from aligned ADC logic
  //                                                           // "0"   ==> input is taken straight from module input (the previous default).
  output += `<div>adc_align_enable: ${config & 512 ? "Aligned" : "Straight"}</div>`;
  // t* Bit [   10] *t unsigned int  do_delay     :   1   ;    // "1"   ==> do delay after predictor finished calculating its output.
  //                                                           //           the actual delay is delay_count*2 cycles of 200MHz.
  //                                                           //           See below the definition of the register.
  output += `<div>do_delay: ${config & 1024 ? "Yes" : "No"}</div>`;
  // t* Bit [   11] *t unsigned int  manual_dac_output_enable
  //                                              :   1   ;    // "1"   ==> o_z_n is set by manual_dac_output register
  //                                                           // "0"   ==> o_z_n is set by predictor output
  output += `<div>manual_dac_output_enable: ${config & 2048 ? "Manual" : "Predictor"}</div>`;
  // t* Bit [   12] *t unsigned int  invert_y_n   :   1   ;    // "1"   ==> invert y_n = y_input - y_reference
  output += `<div>invert_y_n: ${config & 4096 ? "Yes" : "No"}</div>`;
  // t* Bit [   13] *t unsigned int  invert_output:   1   ;    // "1"   ==> invert o_z_n = ~ o_z_n
  output += `<div>invert_output: ${config & 8192 ? "Yes" : "No"}</div>`;
  // t* Bit [   14] *t unsigned int  output_precision_enable
  //                                              :   1   ;    // "1"   ==> high precision PWM DAC shaper is running
  output += `<div>output_precision_enable: ${config & 16384 ? "Enabled" : "Disabled"}</div>`;
  // t* Bit [   15] *t unsigned int  input_averaging_enable
  //                                              :   1   ;    // "1"   ==> summing of input signals to enable higher
  //                                                           //           precision input.
  output += `<div>input_averaging_enable: ${config & 32768 ? "Enabled" : "Disabled"}</div>`;
  // t* Bits[21:16] *t unsigned int  output_shift :   6   ;    // Shifting of the output (not high precision)
  output += `<div>output_shift: ${(config >> 16) & 0x3f}</div>`;
  // t* Bits[23:22] *t unsigned int  reserved_23_22:  2   ;    //
  output += `<div>reserved_23_22: ${(config >> 22) & 0x3}</div>`;
  // t* Bits[28:24] *t unsigned int  output_precision_shift
  //                                               :  5   ;    // Bit offset of the output high precision from the calculated
  //                                                           // predictor output.
  output += `<div>output_precision_shift: ${(config >> 24) & 0x1f}</div>`;
  // t* Bit[29]     *t unsigned int  y_input_diff_enable
  //                                               :  1   ;    // Is predictor input a difference of the 2 ADC's?
  //                                                           // "1"  ===> predictor input is the difference between 2 ADC's.
  //                                                           // "0"  ===> predictor input is determined by the selected input ('input_select' above).
  output += `<div>y_input_diff_enable: ${config & 536870912 ? "Yes" : "No"}</div>`;
  // t* Bit[30]     *t unsigned int  second_integrator_output_enable
  //                                               :  1   ;    // "1"  ===> 2nd integrator output is enabled. Need to select between actual integrator
  //                                                           //           or just plain constant value given in another register.
  output += `<div>second_integrator_output_enable: ${config & 1073741824 ? "Enabled" : "Disabled"}</div>`;
  // t* Bit[31]     *t unsigned int  second_integrator_enable
  //                                               :  1   ;    // "1"  ===> 2nd integrator is enabled and accumulating (with its i2_gain).
                                                            // "0"  ===> 2nd integrator is 
  output += `<div>second_integrator_enable: ${config & 2147483648 ? "Enabled" : "Disabled"}</div>`;
  
  return output;                                         
}

function displayDitherConfiguration(config) {
  let output = "";


// struct predictor2_hw_reg_o_dither_config_3_s
// {
//     /* Bit [28: 0] */ unsigned int  unused_28_0         :   29   ;
//     /* Bit [   29] */ unsigned int  input_init_polarity :   1    ;
//     /* Bit [   30] */ unsigned int  dither_output_enable:   1    ;
//     /* Bit [   31] */ unsigned int  dither_input_enable :   1    ;
// };
  output += `<div>dither_input_enable: ${config & (1 << 31) ? "Enabled" : "Disabled"}</div>`;  
  output += `<div>dither_output_enable: ${config & (1 << 30) ? "Enabled" : "Disabled"}</div>`;  
  output += `<div>input_init_polarity: ${config & (1 << 29) ? "1" : "0"}</div>`;

  return output;                                         
}

function displayAnalysis(predictor) {
  let output = "";

  let config = predictor["o_config"];

  output += `<div style="color: black;"><div><b>Configuration analysis:${config.toString(16)}</b></div>`;
  output += displayConfiguration(config);
  output += `</div>`;

  let dither3 = predictor["o_dither_config_3"];
  output += `<div style="color: black;"><div><b>Dither 3 Configuration analysis:${dither3.toString(16)}</b></div>`;
  output += displayDitherConfiguration(dither3);
  output += `</div>`;

  return output;

}

export function initRegisterUI() {

  document.getElementById("dumpBtn").onclick = async () => {
    const data = await dumpRegisters();
    const dump = new RegisterDump(data);

    dumpOutput.innerHTML = '<table><tr><td>' +  Object.entries(dump.predictor).map(displayValue).join('') +'</td>' +
      '<td>' + Object.entries(dump.predictor).map(displayDiff).join('') + '</td>' + 
      '<td>' + displayAnalysis(dump.predictor) + '</td></tr></table>';

    // Update prevDump after displaying, so that the first time we show all values as new, and next times we show only changes.
    prevDump = dump.predictor;
  };

  const scopeSample1Select = document.getElementById("scopeSample1Select");
  
  scopeSample1Select.innerHTML = friendlyNamesSelectOrder.map(val => { 
    if (val === "") {
      return '<hr>';//'<option disabled>---</option>';
    }
    let index = Object.keys(friendlyNames).findIndex(v => v === val); return `<option value="${index}" ${index === 3 ? "selected" : ""}>${val}</option>`
  }).join("");
  //scopeSample1Select.innerHTML = Object.keys(friendlyNames).map((n, i) => `<option value="${i}" ${i === 3 ? "selected" : ""}>${n}</option>`).join("");
  const scopeSample2Select = document.getElementById("scopeSample2Select");
  scopeSample2Select.innerHTML = friendlyNamesSelectOrder.map(val => { 
    if (val === "") {
      return '<hr>';//'<option disabled>---</option>';
    }
    let index = Object.keys(friendlyNames).findIndex(v => v === val); return `<option value="${index}" ${index === 11 ? "selected" : ""}>${val}</option>`
  }).join("");
  //scopeSample2Select.innerHTML = Object.keys(friendlyNames).map((n, i) => `<option value="${i}" ${i === 11 ? "selected" : ""}>${n}</option>`).join("");
  const output2Select = document.getElementById("output2Select");
  output2Select.innerHTML = regOutput2.map((n, i) => `<option value="${i}" ${i === 1 ? "selected" : ""}>${n}</option>`).join("");      

}
