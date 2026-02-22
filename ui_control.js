import { setPredictor } from "./api.js";

export function initControlUI() {

  document.getElementById("predOnBtn").onclick = async () => {
    await setPredictor(true);
  };

  document.getElementById("predOffBtn").onclick = async () => {
    await setPredictor(false);
  };


}
