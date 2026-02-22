import { dumpRegisters } from "./api.js";
import { RegisterDump } from "./registers.js";

export function initRegisterUI() {

//   document.getElementById("readRegBtn").onclick = async () => {
//     const idx = parseInt(regAddress.value);
//     const val = await readRegister(idx);
//     regValue.value = val;
//   };

//   document.getElementById("writeRegBtn").onclick = async () => {
//     const idx = parseInt(regAddress.value);
//     const val = parseInt(regValue.value);
//     await writeRegister(idx, val);
//   };

  document.getElementById("dumpBtn").onclick = async () => {
    const data = await dumpRegisters();
    const dump = new RegisterDump(data);
    dumpOutput.textContent =
      JSON.stringify(dump.predictor, null, 2);
  };
}
