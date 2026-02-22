import { connect, disconnect, sendBinaryBuffer, packU32} from "./transport.js";
import { RegisterDump, PID_KP, friendlyNames, encode } from "./registers.js";

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
    const r = await sendBinaryBuffer(packU32(0));
    console.log("returned on get version");
};

document.getElementById("predOnBtn").onclick = async () => {
    const r = await sendBinaryBuffer(packU32(16));
    console.log("returned on predOn");
};

document.getElementById("predOffBtn").onclick = async () => {
    const r = await sendBinaryBuffer(packU32(15));
    console.log("returned on predOff");
};

document.getElementById("rebootBtn").onclick = async () => {
    const r = await sendBinaryBuffer(packU32(99));
    console.log("returned on reboot");
};

// document.getElementById("getReg").onclick = async () => {
//     const r = await sendBinaryBuffer(packU32(99);
//     console.log("returned on getReg");
//     const addrs = [];
//     const vals =[];
//     for (let i = 0; i < r.length - 7; i += 8) {
//         const addr = r[i] | (r[i + 1] << 8) | (r[i + 2] << 16) | (r[i + 3] << 24);
//         const val =  r[i + 4] | (r[i + 5] << 8) | (r[i + 6] << 16) | (r[i + 7] << 24);
//         console.log(`${i / 8} ${addr} ${val}`);
//         addrs.push(addr);
//         vals.push(val);
//     }

//     let dump = new RegisterDump(addrs, vals);

//     console.log(dump.predictor.o_y_n, dump.predictor.o_z_n, dump.config.outputShift, dump.dacb.output, dump.q0);
// };

// document.getElementById("read").onclick = async () => {
//     try {
//         let addr = parseInt(document.getElementById("addr").value);
//         let raw = await readReg(addr);
//         document.getElementById("value").value = "0x" + (raw>>>0).toString(16);
//         log(`Read 0x${addr.toString(16)} = ${raw}`);
//     } catch(e) {
//         log("READ FAILED");
//     }
// };

// const kp = document.getElementById("kp");
// kp.oninput = async () => {
//     let v = parseFloat(kp.value);
//     document.getElementById("kp_val").textContent = v.toFixed(3);
//     try {
//         await writeReg(PID_KP.addr, PID_KP.encode(v));
//     } catch(e) {
//         log("KP WRITE FAILED");
//     }
// };

const scopeSample1Select = document.getElementById("scopeSample1Select");
scopeSample1Select.innerHTML = Object.keys(friendlyNames).map(n => `<option value="${n}">${n}</option>`).join("");
const scopeSample2Select = document.getElementById("scopeSample2Select");
scopeSample2Select.innerHTML = Object.keys(friendlyNames).map(n => `<option value="${n}">${n}</option>`).join("");