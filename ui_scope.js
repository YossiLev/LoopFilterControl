import { getTwoRegisterSamples, getTwoRegisterStream } from "./api.js";

export function presentScopeData(data) {
  const canvas = document.getElementById("scopeCanvas");
  const ctx = canvas.getContext("2d");

  const dv = new DataView(data);
  console.log(`scope length ${dv.byteLength}`);
  const n  = (dv.byteLength - 28) / 12;
  console.log(`Nomber of samples ${n}`);
  // for (let i = 0; i < 7; i++) {
  //   console.log(`int ${dv.getInt32(i * 4, true)}`);
  // }
  const lastBatch = dv.getInt32(4, true) == 1;

  ctx.fillStyle = "#cac8c8ff";
  ctx.fillRect(0,0,800,300);

  let vecs = [[], [], []];
  for(let i=0;i<n;i++){ 
    vecs[0].push(dv.getUint32(28 + i*12 + 4, true));
    vecs[1].push(dv.getUint32(28 + i*12 + 8, true));
    if (scopeAddSelect.value === "sum") {
      vecs[2].push(vecs[0][i] + vecs[1][i]);
    } else if (scopeAddSelect.value === "diff") {
      vecs[2].push(vecs[0][i] - vecs[1][i]);
    }
  }
  const maxVecs = vecs.map(v => Math.max(...v));
  const minVecs = vecs.map(v => Math.min(...v));
  const factors = maxVecs.map((max, i) => max > minVecs[i] ? 200.0 / (max - minVecs[i]) : 0.0);

  ctx.lineWidth = 2;
  for (let ig = 0; ig < 3; ig++) {
    if (vecs[ig].length === 0) continue;
    ctx.strokeStyle = ig === 0 ? "rgba(6, 114, 6, 1)" : ig === 1 ? "rgba(0, 0, 255, 1)" : "rgba(255, 0, 0, 1)";
    ctx.beginPath();
    for(let i=0;i<n;i++){
      const sample = vecs[ig][i];
      const x = i*(800/n);
      const y = 280 - (sample - minVecs[ig]) * factors[ig];
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  console.log(`lastBatch ${lastBatch}`);

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
  const padding = 60; // Extra space for dual labels
  const paddingY = 20;

  ctx.clearRect(0, 0, W, H);
  
  // Calculate Min/Max for each dataset
  dataConfigs.forEach(config => {
    config.min = Math.min(...config.data);
    config.max = Math.max(...config.data);
  });

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

    config.data.forEach((val, i) => {
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
export function initScopeUI() {

  document.getElementById("scopeBtn").onclick = async () => {

    const r1 = parseInt(scopeSample1Select.value);
    const r2 = parseInt(scopeSample2Select.value);
    const n  = parseInt(document.getElementById("nSamples").value);

    getTwoRegisterStream(r1, r2, n, presentScopeData);
    // const data = await getTwoRegisterSamples(r1,r2,n);
    // presentScopeData(data);

  };
}
demoDraw();
