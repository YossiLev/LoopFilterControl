import { getTwoRegisterSamples, getTwoRegisterStream } from "./api.js";


const triggerElement = document.getElementById("trigger");
const timerElement = document.getElementById("timer");

function toSigned14Bit(value) {
    // 1. Mask to 14 bits (0 to 16,383)
    let val = value;// & 0xFFFF; 
    
    // 2. Shift left by 18 (32 - 14) to reach the 32nd bit
    // 3. Shift right (>>) to sign-extend back to 14 bits
    return (val << 16) >> 16;
}

export function presentScopeData(data) {
  const canvas = document.getElementById("scopeCanvas");
  const ctx = canvas.getContext("2d");

  const dv = new DataView(data);
  // console.log(`scope length ${dv.byteLength}`);
  const n  = (dv.byteLength - 28) / 12;
  // console.log(`Nomber of samples ${n}`);
  // for (let i = 0; i < 7; i++) {
  //   console.log(`int ${dv.getInt32(i * 4, true)}`);
  // }
  const lastBatch = dv.getInt32(4, true) == 1;

  ctx.fillStyle = "#cac8c8ff";
  ctx.fillRect(0,0,800,300);

  let vecs = [[], [], []];
  for(let i=0;i<n;i++){ 
    vecs[0].push(toSigned14Bit(dv.getInt16(28 + i*12 + 4, true)));
    vecs[1].push(toSigned14Bit(dv.getInt16(28 + i*12 + 8, true)));

    if (timerElement.checked) {
      vecs[2][i] = dv.getInt32(28 + i*12, true);
    } else {
      if (scopeAddSelect.value === "sum") {
        vecs[2].push(vecs[0][i] + vecs[1][i]);
      } else if (scopeAddSelect.value === "diff") {
        vecs[2].push(vecs[0][i] - vecs[1][i]);
      }
    }
  }
  function tt(d, i) {
    return d.getUint32(28 + i*12 + 8, true).toString().padStart(11, ' ');
  }
  // for (let i = 0; i < n; i += 8) {
  //   console.log(`${tt(dv, i)} ${tt(dv, i + 1)} ${tt(dv, i + 2)} ${tt(dv, i + 3)} ${tt(dv, i + 4)} ${tt(dv, i + 5)} ${tt(dv, i + 6)} ${tt(dv, i + 7)}`);
  // }

  const dataConfigs = [{
    data: vecs[0], color: "green", width: 2
  }, 
  {
    data: vecs[1], color: "blue", width: 2
  }];
  if (timerElement.checked) {
    dataConfigs.push({data: vecs[2], color: "red", width: 1});
  }
  drawMultiScaleChart(canvas, dataConfigs);

  if (scopeStatus) {
    setTimeout(getSample, 100);
  }

  return lastBatch;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Array} dataConfigs - Array of objects: { data: [], color: string, width: number }
 */
function drawMultiScaleChart(canvas, dataConfigs) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const padding = 80; // Extra space for dual labels
  const paddingY = 20;

  ctx.clearRect(0, 0, W, H);
  
  // Calculate Min/Max for each dataset
  dataConfigs.forEach(config => {
    config.min = Math.min(...config.data);
    config.max = Math.max(...config.data);
  });
  const trigger = (dataConfigs[0].max + dataConfigs[0].min) / 2;
  const pTrigger = triggerElement.checked ? Math.max(dataConfigs[0].data.findIndex((v, i, a) => i > 0 &&v > trigger && a[i - 1] < trigger), 0): 0;

  const gridSteps = 5;

  // 1. Draw Grid Lines
  ctx.strokeStyle = "#ccc";
  for (let i = 0; i <= gridSteps; i++) {
    const y = (H - paddingY) - (i / gridSteps) * (H - 2 * paddingY);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(W - padding, y);
    ctx.stroke();
  }

  // 2. Draw Dual Y-Axes Labels
  dataConfigs.forEach((config, idx) => {
    if (idx > 0 && idx < dataConfigs.length - 1) return; // Only labels first and last for simplicity
    ctx.fillStyle = config.color;
    ctx.textAlign = idx === 0 ? "right" : "left";
    const xPos = idx === 0 ? padding - 10 : W - padding + 10;

    for (let i = 0; i <= gridSteps; i++) {
      const y = (H - paddingY) - (i / gridSteps) * (H - 2 * paddingY);
      const val = config.min + (i / gridSteps) * (config.max - config.min);
      ctx.fillText(val.toFixed(1), xPos, y);
    }
  });

  // 3. Draw Data Lines
  dataConfigs.forEach(config => {
    ctx.beginPath();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = config.width || 2;

    config.data.slice(pTrigger).forEach((val, i) => {
      const x = padding + (i / (config.data.length - 1)) * (W - 2 * padding);
      const normalizedY = (val - config.min) / (config.max - config.min);
      const y = (H - paddingY) - normalizedY * (H - 2 * paddingY);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}
function demoDraw() {
    const canvas = document.getElementById("scopeCanvas");
    const data1 = [10, 45, 30, 80, 60, 10, 45, 30, 80, 60, 10, 45, 30, 80, 60, 10, 45, 30, 80, 60, 10, 45, 30, 80, 60, 10, 45, 30, 80, 60, 10, 45, 30, 80, 60, 95];
    const data2 = [-20, -25, 50, -43, 70, -20, -25, 50, -43, 70, -20, -25, 50, -43, 70, -20, -25, 50, -43, 70, -20, -25, 50, -43, 70, -20, -25, 50, -43, 70, -20, -25, 50, -43, 70, 85]; 
    const dataConfigs = [{
      data: data1, color: "red", width: 1
    }, 
    {
      data: data2, color: "blue", width: 1
    }];
    drawMultiScaleChart(canvas, dataConfigs);
}

const scopeSample1Select = document.getElementById("scopeSample1Select");
const scopeSample2Select = document.getElementById("scopeSample2Select");

function getSample() {
  
    const r1 = parseInt(scopeSample1Select.value);
    const r2 = parseInt(scopeSample2Select.value);
    const n  = parseInt(document.getElementById("nSamples").value);

    getTwoRegisterStream(r1, r2, n, presentScopeData);
}
let scopeStatus = false;
export function setScopeOn() {
    scopeStatus = true;

    getSample();
}
export function setScopeOff() {
  scopeStatus = false;
}

demoDraw();




//"pid_magic": 288650904,
//  "pid_version": 4455,
//  "pid_live_counter": 4245199675,
/*
  "o_y_n": 4294965476,

  "o_q0_q4": 4,
  "o_q1_q5": 1114106,
  "o_q2_q6": 4,
  "o_q3_q7": 1114111,
  "o_config": 1077968898,
  "o_y_reference": 8192,
  "o_i0": 0,
  "o_z_n": 475797851,
  "o_count": 1388904769,
  "o_y_n_3": 4294965619,
  "o_delay_count": 0,
  "o_delay_counter": 0,
  "o_out_offset": 4294959104,
  "o_magic": 2579169296,
  "o_dacb_output": 1,
  "o_dither_config_1": 0,
  "o_dither_config_2": 0,
  "o_dither_config_3": 0,
  "o_dither_count_1": 0,
  "o_dither_count_2": 0,
  "o_dither_count_3": 4294959104,
  "o_2nd_out_offset": 0,
  "o_2nd_config": 0,
  "o_3rd_config": 0,
  "o_y_n_4": 4294965839,
  "o_y_n_5": 4294965858,
  "o_y_n_6": 4294965869,
  "o_y_n_7": 4294965866,
  "o_2nd_output": 0,
  "o_manual_dac_output": 0,
  "o_y_input": 4294966612,
  "o_dac_a": 6848,
  "o_dac_b": 7524,
  "o_debug_reg_1": 1164378114,
  "o_pre_dither_manual_value": 0,
  "o_current_sum_before_rebase": 1384905490,
  "o_current_sum_total_low": 1409416019,
  "o_current_sum_total_high": 4294967295,
  "o_dac_output": 1482955604




/// "pid_magic": 288650904,
//  "pid_version": 4455,
//  "pid_live_counter": 3395798202,
  "o_y_n": 914,

  "o_q0_q4": 100,
  "o_q1_q5": 1113962,
  "o_q2_q6": 100,
  "o_q3_q7": 1114087,
  "o_config": 1078558726,
  "o_count": 690301294,
  "o_y_n_3": 925,
  "o_delay_count": 0,
  "o_delay_counter": 0,
  "o_out_offset": 3640,
  "o_magic": 2579169296,
  "o_dacb_output": 1,
  "o_dither_config_1": 65546,
  "o_y_reference": 8192,
  "o_i0": 0,
  "o_z_n": 3978484,
  "o_count": 690301294,
  "o_y_n_3": 925,
  "o_delay_count": 0,
  "o_delay_counter": 0,
  "o_out_offset": 3640,
  "o_magic": 2579169296,
  "o_dacb_output": 1,
  "o_dither_config_1": 65546,
  "o_dither_config_2": 65537,
  "o_dither_config_3": 0,
  "o_dither_count_1": 0,
  "o_dither_count_2": 0,
  "o_dither_count_3": 3640,
  "o_2nd_out_offset": 0,
  "o_2nd_config": 65537,
  "o_3rd_config": 0,
  "o_y_n_4": 916,
  "o_y_n_5": 920,
  "o_y_n_6": 918,
  "o_y_n_7": 924,
  "o_2nd_output": 0,
  "o_manual_dac_output": 0,
  "o_y_input": 443,
  "o_dac_a": 13814,
  "o_dac_b": 9966,
  "o_debug_reg_1": 1164378114,
  "o_pre_dither_manual_value": 0,
  "o_current_sum_before_rebase": 4056094,
  "o_current_sum_total_low": 2032158663,
  "o_current_sum_total_high": 0,
  "o_dac_output": 3917561




o_q0_q4: 0 # 4
o_q1_q5: 16 # 65530
o_q2_q6: 0 # 4
o_q3_q7: 16 # 65535
o_config: 40408002
o_out_offset: 4294959104
o_dither_config_1: 0
o_dither_config_2: 0
o_dither_count_3: 4294959104
o_2nd_config: 0


4) o_q0_q4: 0 # 75
5) o_q1_q5: 16 # 65461
6) o_q2_q6: 0 # 25
7) o_q3_q7: 0 # 0
8) o_config: 40498006
16) o_out_offset: 3640
19) o_dither_config_1: 65546
20) o_dither_config_2: 65537
21) o_dither_config_3: 0
26) o_2nd_config: 10001

  */