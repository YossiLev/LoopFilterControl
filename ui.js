import { isConnected } from "./transport.js";

// Catch rejected hardware actions at the UI boundary, while API callers still
// receive normal rejected promises and can choose their own recovery behavior.
export function handleUIAction(action) {
  return async (...args) => {
    try {
      return await action(...args);
    } catch (error) {
      const status = document.getElementById("connectionStatus");
      if (status) status.textContent = `${isConnected() ? "COMMAND FAILED" : "DISCONNECTED"}: ${error.message ?? error}`;
      console.error("Hardware command failed", error);
    }
  };
}
