import { dumpRegisters } from "./api.js";
import { RegisterDump, friendlyNames } from "./registers.js";

export function initRegisterUI() {

  document.getElementById("dumpBtn").onclick = async () => {
    const data = await dumpRegisters();
    const dump = new RegisterDump(data);
    dumpOutput.textContent =
      JSON.stringify(dump.predictor, null, 2);
  };

  const scopeSample1Select = document.getElementById("scopeSample1Select");
  scopeSample1Select.innerHTML = Object.keys(friendlyNames).map((n, i) => `<option value="${i}" ${i === 3 ? "selected" : ""}>${n}</option>`).join("");
  const scopeSample2Select = document.getElementById("scopeSample2Select");
  scopeSample2Select.innerHTML = Object.keys(friendlyNames).map((n, i) => `<option value="${i}" ${i === 11 ? "selected" : ""}>${n}</option>`).join("");

}
