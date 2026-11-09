// Each channel owns its tools panel; only one panel is open at a time.
export function initScopeMenus(getColor, setColor, getDisplaySettings, setDisplaySettings) {
  let active = null;

  function closeMenu(restoreFocus = false) {
    if (!active) return;
    const { button, panel } = active;
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    active = null;
    if (restoreFocus) button.focus();
  }

  for (let channel = 1; channel <= 4; channel++) {
    const button = document.getElementById(`scope${channel}MenuButton`);
    const panel = document.getElementById(`scope${channel}Menu`);
    const close = document.getElementById(`scope${channel}MenuClose`);
    const color = document.getElementById(`scope${channel}Color`);

    const gain = document.getElementById(`scope${channel}Gain`);
    const offset = document.getElementById(`scope${channel}Offset`);
    const gainValue = document.getElementById(`scope${channel}GainValue`);
    const offsetValue = document.getElementById(`scope${channel}OffsetValue`);

    function refreshDisplayControls() {
      const settings = getDisplaySettings(channel);
      gain.value = settings.gain;
      offset.value = settings.offset;
      gainValue.textContent = `${settings.gain.toFixed(1)}×`;
      offsetValue.textContent = settings.offset;
    }
    function changeDisplaySettings() {
      setDisplaySettings(channel, { gain: Number(gain.value), offset: Number(offset.value) });
      refreshDisplayControls();
    }
    gain.oninput = gain.onchange = changeDisplaySettings;
    offset.oninput = offset.onchange = changeDisplaySettings;

    button.onclick = event => {
      // The button sits inside the channel's select label.
      event.preventDefault();
      if (active?.button === button) {
        closeMenu(true);
        return;
      }
      closeMenu();
      color.value = getColor(channel);
      refreshDisplayControls();
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      active = { button, panel };
      close.focus();
    };
    close.onclick = () => closeMenu(true);
    color.oninput = () => setColor(channel, color.value);
  }

  document.addEventListener("pointerdown", event => {
    if (active && !active.panel.contains(event.target) &&
        !active.button.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && active) {
      event.preventDefault();
      closeMenu(true);
    }
  });
}
