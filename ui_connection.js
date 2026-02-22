import { connect, disconnect } from "./transport.js";

export function initConnectionUI() {
  const status = document.getElementById("connectionStatus");

  document.getElementById("connectBtn").onclick = async () => {
    await connect();
    status.textContent = "CONNECTED";
  };

  document.getElementById("disconnectBtn").onclick = () => {
    disconnect();
    status.textContent = "DISCONNECTED";
  };
}
