import { setPredictor } from "./api.js";
import { sendBinaryBuffer, packU32 } from "./transport.js";

export function initControlUI() {
  const status = document.getElementById("connectionStatus");

  document.getElementById("predOnBtn").onclick = async () => {
    await setPredictor(true);
    status.textContent = "CONNECTED - PREDICTOR ON";
  };

  document.getElementById("predOffBtn").onclick = async () => {
    await setPredictor(false);
    status.textContent = "CONNECTED - PREDICTOR OFF";
  };

  document.getElementById("rebootBtn").onclick = async () => {
      await sendBinaryBuffer(packU32(99));
  };  

  document.getElementById("getVersionBtn").onclick = async () => {
      console.log("Getting version...");
      const r = await sendBinaryBuffer(packU32(0));
      const vIndex = status.textContent.indexOf("VERSION:");
      if (vIndex !== -1) {
        status.textContent = status.textContent.substring(0, vIndex) + "VERSION: " + new TextDecoder().decode(r);
      } else {
        status.textContent += "  VERSION: " + new TextDecoder().decode(r);
      }
      //log("VERSION: " + new TextDecoder().decode(r));
  };
}
