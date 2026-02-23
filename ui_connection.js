import { connect, disconnect } from "./transport.js";
import { setPredictor } from "./api.js";

export function initConnectionUI() {
  const status = document.getElementById("connectionStatus");

  document.getElementById("connectBtn").onclick = async () => {
    await connect();
    status.textContent = "CONNECTED";
    await setPredictor(false);
    status.textContent = "CONNECTED - PREDICTOR OFF";
  };

  document.getElementById("disconnectBtn").onclick = () => {
    disconnect();
    status.textContent = "DISCONNECTED";
  };
}
