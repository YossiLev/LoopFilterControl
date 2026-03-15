import { dumpRegisters } from "./api.js";
import { RegisterDump, friendlyNames, regType } from "./registers.js";


let prevDump = {}
function displayValue([key, value]) {
  const color = key in regType ? (regType[key].includes("O") ? "black" : "green") : "red";
  let tVal = value;
  if (regType[key].includes("S")) {
    tVal = `${value >> 16} # ${value & 0xffff}`; 
  }
  if (regType[key].includes("X")) {
    tVal = `${value.toString(16)}`; 
  }
  return `<div style="color: ${color};">${key}: ${tVal}</div>`
}
function displayDiff([key, value]) {
  if (regType[key].includes("O")) {
    return "";
  }
  let tVal = value;
  if (regType[key].includes("S")) {
    tVal = `${value >> 16} # ${value & 0xffff}`; 
  }
  if (regType[key].includes("X")) {
    tVal = `${value.toString(16)}`; 
  }
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

}
