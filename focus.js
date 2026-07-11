Exit code: 0
Wall time: 1.3 seconds
Output:
const FocusCore = window.SpeedReaderCore;

const storedPayload = localStorage.getItem("speedReaderFocusPayload");
const payload = storedPayload ? JSON.parse(storedPayload) : {
  text: FocusCore.sampleText,
  wpm: 300,
  chunkSize: 1,
  mode: "word",
  backgroundColor: "#000000",
  textColor: "#ffffff",
  font: "Inter, Arial, sans-serif",
  fontSize: "clamp(2.7rem, 8vw, 6rem)"
};

const focusElements = {
  stage: document.querySelector("#focusStage"),
  text: document.querySelector("#focusText"),
  playButton: document.querySelector("#focusPlayButton"),
  playText: document.querySelector("#focusPlayText"),
  playIcon: document.querySelector("#focusPlayIcon"),
  backButton: document.querySelector("#focusBackButton"),
  forwardButton: document.querySelector("#focusForwardButton"),
  resetButton: document.querySelector("#focusResetButton"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
  progressFill: document.querySelector("#focusProgressFill"),
  position: document.querySelector("#focusPosition"),
  wpm: document.querySelector("#focusWpm"),
  mode: document.querySelector("#focusMode"),
  progress: document.querySelector("#focusProgress")
};

const focusWords = FocusCore.normalizeWords(payload.text);
const focusUnits = FocusCore.buildUnits(payload.text, payload.mode, payload.chunkSize);
let focusIndex = 0;
let focusTimer = null;
let focusPlaying = false;

function applyFocusTheme() {
  focusElements.stage.style.backgroundColor = payload.backgroundColor || "#000000";
  focusElements.stage.style.color = payload.textColor || "#ffffff";
  focusElements.text.style.fontFamily = payload.font || "Inter, Arial, sans-serif";
  focusElements.text.style.fontSize = payload.fontSize || "clamp(2.7rem, 8vw, 6rem)";
}

function updateFocusDisplay() {
  const unit = focusUnits[focusIndex] || null;
  const progress = unit && focusWords.length ? Math.min((unit.endWordIndex / focusWords.length) * 100, 100) : 0;

  focusElements.text.textContent = unit ? unit.text : "No text loaded";
  focusElements.progressFill.style.width = `${progress}%`;
  focusElements.position.textContent = unit ? `Word ${unit.endWordIndex} of ${focusWords.length}` : `Word 0 of ${focusWords.length}`;
  focusElements.wpm.textContent = payload.wpm || 300;
  focusElements.mode.textContent = FocusCore.modeLabel(payload.mode);
  focusElements.progress.textContent = `${Math.round(progress)}%`;
}

function setFocusPlayButton() {
  focusElements.playButton.classList.toggle("is-playing", focusPlaying);
  focusElements.playButton.setAttribute("aria-label", focusPlaying ? "Pause reading" : "Start reading");
  focusElements.playText.textContent = focusPlaying ? "Pause" : "Start";
  focusElements.playIcon.innerHTML = focusPlaying
    ? '<path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z"></path>'
    : '<path d="M8 5v14l11-7L8 5Z"></path>';
}

function stopFocusReading() {
  window.clearTimeout(focusTimer);
  focusTimer = null;
  focusPlaying = false;
  setFocusPlayButton();
}

function scheduleFocusTick() {
  const unit = focusUnits[focusIndex];
  focusTimer = window.setTimeout(() => {
    focusIndex += 1;
    if (focusIndex >= focusUnits.length) {
      focusIndex = Math.max(focusUnits.length - 1, 0);
      updateFocusDisplay();
      stopFocusReading();
      return;
    }

    updateFocusDisplay();
    scheduleFocusTick();
  }, FocusCore.unitDelayMs(unit, payload.wpm || 300));
}

function startFocusReading() {
  if (!focusUnits.length) return;
  if (focusIndex >= focusUnits.length - 1) focusIndex = 0;
  focusPlaying = true;
  setFocusPlayButton();
  updateFocusDisplay();
  scheduleFocusTick();
}

function toggleFocusReading() {
  if (focusPlaying) {
    stopFocusReading();
  } else {
    startFocusReading();
  }
}

function moveFocus(direction) {
  focusIndex = FocusCore.clampNumber(focusIndex + direction, 0, Math.max(focusUnits.length - 1, 0));
  updateFocusDisplay();
}

function resetFocus() {
  stopFocusReading();
  focusIndex = 0;
  updateFocusDisplay();
}

applyFocusTheme();
updateFocusDisplay();

focusElements.playButton.addEventListener("click", toggleFocusReading);
focusElements.backButton.addEventListener("click", () => moveFocus(-1));
focusElements.forwardButton.addEventListener("click", () => moveFocus(1));
focusElements.resetButton.addEventListener("click", resetFocus);
focusElements.fullscreenButton.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    toggleFocusReading();
  }

  if (event.key === "ArrowLeft") moveFocus(-1);
  if (event.key === "ArrowRight") moveFocus(1);
});

