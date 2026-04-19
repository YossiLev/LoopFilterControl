import { dumpRegisters } from "./api.js";
import { RegisterDump, friendlyNames, regType, regOutput2 } from "./registers.js";


function checkRegFlag(r, f) {
  return regType[r].split(" ").includes(f);
}
function convertRegValue(r, v) {
  let tVal = v;
  if (checkRegFlag(r, "S")) {
    tVal = `${v >> 16} # ${((v & 0xffff ) << 16) >> 16}`; 
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
  const color = key in regType ? (regType[key].includes("O") ? "black" : "green") : "red";
  let tVal = convertRegValue(key, value);
  return `<div style="color: ${color};">${i}) ${key}: ${tVal}</div>`
}
function displayDiff([key, value]) {
  if (checkRegFlag(key, "O")) {
    return "";
  }
  let tVal = convertRegValue(key, value);
  return `<div style="color: purple;">${key}: ${tVal}</div>`
}
export function initRegisterUI() {

  document.getElementById("dumpBtn").onclick = async () => {
    const data = await dumpRegisters();
    const dump = new RegisterDump(data);
    let predictorDiff = {};
    Object.entries(prevDump).forEach(([key, value]) => {
      if (dump.predictor[key] != value) {
        predictorDiff[key] = value;
      }
    });
    

    dumpOutput.innerHTML = '<table><tr><td>' +  Object.entries(dump.predictor).map(displayValue).join('') +'</td>' +
      '<td>' + Object.entries(predictorDiff).map(displayDiff).join('') + '</td></tr></table>';
    prevDump = dump.predictor;
  };

  const scopeSample1Select = document.getElementById("scopeSample1Select");
  scopeSample1Select.innerHTML = Object.keys(friendlyNames).map((n, i) => `<option value="${i}" ${i === 3 ? "selected" : ""}>${n}</option>`).join("");
  const scopeSample2Select = document.getElementById("scopeSample2Select");
  scopeSample2Select.innerHTML = Object.keys(friendlyNames).map((n, i) => `<option value="${i}" ${i === 11 ? "selected" : ""}>${n}</option>`).join("");
  const output2Select = document.getElementById("output2Select");
  output2Select.innerHTML = regOutput2.map((n, i) => `<option value="${i}" ${i === 1 ? "selected" : ""}>${n}</option>`).join("");      

}
