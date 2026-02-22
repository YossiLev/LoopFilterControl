import { getTwoRegisterSamples } from "./api.js";

export function initScopeUI() {

  const canvas = document.getElementById("scopeCanvas");
  const ctx = canvas.getContext("2d");

  document.getElementById("scopeBtn").onclick = async () => {

    const r1 = parseInt(scopeReg1.value);
    const r2 = parseInt(scopeReg2.value);
    const n  = parseInt(scopeSamples.value);
    

    const data = await getTwoRegisterSamples(r1,r2,n);
    const dv = new DataView(data);

    ctx.fillStyle = "#cac8c8ff";
    ctx.fillRect(0,0,800,300);

    let vecs = [[], []];
    for(let i=0;i<n;i++){ 
      vecs[0].push(dv.getUint32(28 + i*12 + 4, true));
      vecs[1].push(dv.getUint32(28 + i*12 + 8, true));
    }
    const maxVecs = vecs.map(v => Math.max(...v));
    const minVecs = vecs.map(v => Math.min(...v));
    const factors = maxVecs.map((max, i) => max > minVecs[i] ? 200.0 / (max - minVecs[i]) : 0.0);
 
    ctx.lineWidth = 2;
    for (let ig = 0; ig < 2; ig++) {
      ctx.strokeStyle = ig === 0 ? "rgba(6, 114, 6, 1)" : "#00f";
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

  };
}
