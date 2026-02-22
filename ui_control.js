import { connect, disconnect } from "./transport.js";
import { setPredictor } from "./api.js";

export function initControlUI() {
  //const status = document.getElementById("connectionStatus");

  document.getElementById("predOnBtn").onclick = async () => {
    await setPredictor(true);
    // status.textContent = "CONNECTED";
  };

  document.getElementById("predOffBtn").onclick = async () => {
    await setPredictor(false);
  };

  document.getElementById("disconnectBtn").onclick = () => {
    disconnect();
    // status.textContent = "DISCONNECTED";
  };
}
