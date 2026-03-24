import { selectOutputSignal, setOutputOffsets, setPredictor, setPredictorAlpha, setPredictorOrder, setScanOff, setScanOn } from "./api.js";
import { sendBinaryBuffer, packU32, connect, disconnect } from "./transport.js";
import { setScopeOn, setScopeOff} from "./ui_scope.js";

function flipZoom(id, z) {
    document.getElementById("frameBoard").classList.toggle('zoomedFrame');
}
export function initControlUI() {
  const status = document.getElementById("connectionStatus");

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
        try {
            await connect();
            status.textContent = "CONNECTED";
            await setPredictor(false);
            status.textContent = "CONNECTED - PREDICTOR OFF";
            document.getElementById("predict").checked = false;
        } catch(er) {
            ev.target.checked = false;
            status.textContent = `CONNECTION ERROR`;
        }        
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

  document.getElementById("scope").onchange = async ev => {
    if (ev.target.checked) {
        setScopeOn();
    } else {
        setScopeOff();
    }
  }

  document.getElementById("zBut").onclick = () => {
      flipZoom("frameBoard", 0.25);
  }

  async function handleOrder(ev) {
    const valueStr = ev.target.value;
    console.log(`Order change to ${valueStr}`);
    const value = parseInt(valueStr);
    if (value >= 1 & value < 9) {
      const rc = await setPredictorOrder(value);
      console.log(`order set rc = ${rc}`);
    }
  }
  document.getElementById("paramOrder").onchange = handleOrder;
  document.getElementById("paramOrder").oninput = handleOrder;

  async function handleOutputOfsets(ev) {
    const valueStr1 = document.getElementById("paramOutputOffset1").value;
    const valueStr2 = document.getElementById("paramOutputOffset2").value;
    console.log(`Ourput offsets change to ${valueStr1} ${valueStr2}`);
    const value1 = parseInt(valueStr1);
    const value2 = parseInt(valueStr2);
    const rc = await setOutputOffsets(value1, value2);
    console.log(`Ourput offsets set rc = ${rc}`);
  }
  document.getElementById("paramOutputOffset1").onchange = handleOutputOfsets;
  document.getElementById("paramOutputOffset1").oninput = handleOutputOfsets;
  document.getElementById("paramOutputOffset2").onchange = handleOutputOfsets;
  document.getElementById("paramOutputOffset2").oninput = handleOutputOfsets;

  document.getElementById("paramAlpha").onchange = async ev => {
    const valueStr = ev.target.value;
    console.log(`Alpha change to ${valueStr}`);
    const value = parseFloat(valueStr);
    if (value >= 0.999999 & value < 5.0) {
      const rc = await setPredictorAlpha(value);
      console.log(`alpha set rc = ${rc}`);
    }
  }

  document.getElementById("output2Select").onchange = async ev => {
    const value = ev.target.value;
    console.log(`output2Select = ${value}`);
    const rc = await selectOutputSignal(value);
    console.log(`order set rc = ${rc}`);
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
                  if (item.status === "active") {
                    const prevItem = focusItems.find(it => it.status === "selected" && it.selectIndex == selectIndex);
                    if (prevItem) {
                        prevItem.status = "active";
                    }
                    item.status = "selected";
                    item.selectIndex = selectIndex;
                    selectIndex = 1 - selectIndex;
                  } else {
                    item.status = "active";
                  }
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
  const focusItems = [{x: 130.5, y: 59, radius: 14, name: "A", status: "active"},
                      {x: 289, y: 59, radius: 14, name: "B", status: "active"},
                      {x: 599, y: 59, radius: 14, name: "C", status: "active"},
                      {x: 786.5, y: 59, radius: 14, name: "D", status: "active"},
                      {x: 1075, y: 59, radius: 15, name: "E", status: "active"},
                      {x: 374, y: 158, radius: 15, name: "F", status: "active"},
                      {x: 130, y: 185, radius: 15, name: "G", status: "active"},
                      {x: 786, y: 313, radius: 15, name: "H", status: "active"},
                      {x: 1075, y: 313, radius: 15, name: "I", status: "active"},
  ];
  let selectIndex = 0;
  function drawSystemCanvas(x, y) {
      const ctx = systemCanvas.getContext("2d");
      ctx.clearRect(0,0,systemCanvas.width, systemCanvas.height);
      for (const item of focusItems) {
          if (item.status !== "hidden") {       
              switch (item.status) {
                  case "active":
                      ctx.fillStyle = "rgba(243, 241, 99, 0.45)";
                      break;
                  case "selected":
                      if (item.selectIndex == 0) {
                        ctx.fillStyle = "rgba(16, 202, 10, 0.58)";
                      } else {
                        ctx.fillStyle = "rgba(93, 34, 231, 0.58)";
                      }
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
