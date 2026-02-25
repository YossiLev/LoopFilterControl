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

  //add events
  const systemCanvas = document.getElementById("systemCanvas");
  systemCanvas.addEventListener("mousedown", onMouseDown, false);
  systemCanvas.addEventListener("mouseup", onMouseUp, false);
  systemCanvas.addEventListener("mousemove", onMouseMove, false);

  var mouseDown = false;
  function onMouseDown(e) {
      mouseDown = true;
      e.stopPropagation();
  }
  function onMouseUp(e) {
      mouseDown = false;
      e.stopPropagation();
  }
  function drawSystemCanvas(x, y) {
      const ctx = systemCanvas.getContext("2d");
      ctx.fillStyle = "rgba(6, 114, 6, 1)";
      ctx.clearRect(0,0,systemCanvas.width, systemCanvas.height);
      ctx.fillRect(x,y,10,10);
  }
  function onMouseMove(e) {
      e.stopPropagation();
      if (!mouseDown) return;
      // Get the position and size of the canvas relative to the viewport
      const rect = systemCanvas.getBoundingClientRect();

      // Calculate the X and Y coordinates relative to the canvas
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      drawSystemCanvas(x, y);
      console.log(x, y);

  }
}
