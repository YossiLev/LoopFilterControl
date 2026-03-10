import { setPredictor, setScanOff, setScanOn } from "./api.js";
import { sendBinaryBuffer, packU32 } from "./transport.js";

function flipZoom(id, z) {
    document.getElementById("frameBoard").classList.toggle('zoomedFrame');
}
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
  };

  document.getElementById("connect").onchange = async ev => {
    if (ev.target.checked) {
        await connect();
        status.textContent = "CONNECTED";
        await setPredictor(false);
        status.textContent = "CONNECTED - PREDICTOR OFF";
    } else {
        disconnect();
        status.textContent = "DISCONNECTED";        
    }
  }

  document.getElementById("predict").onchange = async ev => {
    await setPredictor(ev.target.checked);
    status.textContent = `CONNECTED - PREDICTOR ${ev.target.checked ? "ON": "OFF"}`;
  }

  document.getElementById("scan").onchange = async ev => {
    if (ev.target.checked) {
        //await setScanOn(offset, frequency, amplitude, scanType)
        await setScanOn(0, 10, 8192, 1);
    } else {
        await setScanOff();
    }
  }


  document.getElementById("zBut").onclick = () => {
      flipZoom("frameBoard", 0.25);
  }

  //add events
  const systemCanvas = document.getElementById("systemCanvas");
  systemCanvas.addEventListener("mousedown", onMouseDown, false);
  systemCanvas.addEventListener("mouseup", onMouseUp, false);
  systemCanvas.addEventListener("mousemove", onMouseMove, false);

  var mouseDown = false;
  function onMouseDown(e) {
      mouseDown = true;
      const rect = systemCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (const item of focusItems) {
          if (item.status !== "hidden") {       
              if ((x - item.x) ** 2 + (y - item.y) ** 2 < item.radius ** 2) {
                  item.status = item.status === "active" ? "selected" : "active";
              }
          }
      }

      drawSystemCanvas(x, y);      
      e.stopPropagation();
  }
  function onMouseUp(e) {
      mouseDown = false;
      e.stopPropagation();
  }
  const focusItems = [{x: 142, y: 71, radius: 15, name: "A", status: "active"},
                      {x: 433, y: 71, radius: 15, name: "B", status: "active"},
                      {x: 614, y: 71, radius: 15, name: "C", status: "active"},
                      {x: 797, y: 71, radius: 15, name: "D", status: "active"},
                      {x: 1077, y: 71, radius: 15, name: "E", status: "active"},
                      {x: 225, y: 168, radius: 15, name: "F", status: "active"},
                      {x: 142, y: 195, radius: 15, name: "G", status: "active"},
                      {x: 797, y: 323, radius: 15, name: "H", status: "active"},
                      {x: 1077, y: 323, radius: 15, name: "I", status: "active"},
  ];
  function drawSystemCanvas(x, y) {
      const ctx = systemCanvas.getContext("2d");
      ctx.clearRect(0,0,systemCanvas.width, systemCanvas.height);
      for (const item of focusItems) {
          if (item.status !== "hidden") {       
              switch (item.status) {
                  case "active":
                      ctx.fillStyle = "rgba(14, 189, 14, 0.34)";
                      break;
                  case "selected":
                      ctx.fillStyle = "rgba(202, 34, 34, 0.58)";
                      break;
              }
              // if ((x - item.x) ** 2 + (y - item.y) ** 2 < item.radius ** 2) {
              //     ctx.fillStyle = "rgba(26, 6, 114, 0.35)";
              // }
              ctx.beginPath();
              ctx.arc(item.x, item.y, item.radius, 0, 2 * Math.PI);
              //ctx.fillStyle = "rgba(6, 114, 6, 0.35)";
              ctx.fill();
              ctx.fillStyle = "white";
              ctx.font = "16px Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(item.name, item.x, item.y);
          }
      }
      // ctx.fillStyle = "rgb(74, 114, 6)";
      // ctx.fillRect(x,y,10,10);
  }
  drawSystemCanvas(- 100, -100);
  function onMouseMove(e) {
      e.stopPropagation();
      if (!mouseDown) return;
      const rect = systemCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      drawSystemCanvas(x, y);
  }
}
