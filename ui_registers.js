import { dumpRegisters } from "./api.js";
import { RegisterDump } from "./registers.js";

export function initRegisterUI() {

  document.getElementById("dumpBtn").onclick = async () => {
    const data = await dumpRegisters();
    const dump = new RegisterDump(data);
    dumpOutput.textContent =
      JSON.stringify(dump.predictor, null, 2);
  };
}
