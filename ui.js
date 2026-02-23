import { connect, disconnect, sendBinaryBuffer, packU32} from "./transport.js";
import { RegisterDump, friendlyNames, encode } from "./registers.js";

export const log = s => {
    const d = document.getElementById("log");
    d.textContent += s + "\n";
    d.scrollTop = d.scrollHeight;
};

document.getElementById("connectBtn").onclick = async () => {
    try {
        await connect();
        log("CONNECTED");
    } catch(e) {
        log("CONNECT ERROR");
    }
};

document.getElementById("disconnectBtn").onclick = () => {
    disconnect();
    log("DISCONNECTED");
};

document.getElementById("getVersionBtn").onclick = async () => {
    console.log("Getting version...");
    const r = await sendBinaryBuffer(packU32(0));
    console.log("Got version response:", r);
    log("VERSION: " + new TextDecoder().decode(r));
};

document.getElementById("predOnBtn").onclick = async () => {
    const r = await sendBinaryBuffer(packU32(16));
};

document.getElementById("predOffBtn").onclick = async () => {
    const r = await sendBinaryBuffer(packU32(15));
};

document.getElementById("rebootBtn").onclick = async () => {
    const r = await sendBinaryBuffer(packU32(99));
};

const scopeSample1Select = document.getElementById("scopeSample1Select");
scopeSample1Select.innerHTML = Object.keys(friendlyNames).map(n => `<option value="${n}">${n}</option>`).join("");
const scopeSample2Select = document.getElementById("scopeSample2Select");
scopeSample2Select.innerHTML = Object.keys(friendlyNames).map(n => `<option value="${n}">${n}</option>`).join("");