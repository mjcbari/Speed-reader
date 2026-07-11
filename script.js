Exit code: 0
Wall time: 1.3 seconds
Output:
const Core = window.SpeedReaderCore;

const elements = {
  sourceText: document.querySelector("#sourceText"),
  displayText: document.querySelector("#displayText"),
  readerStage: document.querySelector("#readerStage"),
  playButton: document.querySelector("#playButton"),
  playButtonText: document.querySelector("#playButtonText"),
  playIcon: document.querySelector("#playIcon"),
  backButton: document.querySelector("#backButton"),
  forwardButton: document.querySelector("#forwardButton"),
  resetButton: document.querySelector("#resetButton"),
  focusButton: document.querySelector("#focusButton"),
  sampleButton: document.querySelector("#sampleButton"),
  pasteButton: document.querySelector("#pasteButton"),
  uploadButton: document.querySelector("#uploadButton"),
  fileInput: document.querySelector("#fileInput"),
  progressFill: document.querySelector("#progressFill"),
  positionText: document.querySelector("#positionText"),
  currentWpm: document.querySelector("#currentWpm"),
  currentChunk: document.querySelector("#currentChunk"),
  chunkLabel: document.querySelector("#chunkLabel"),
  currentMode: document.querySelector("#currentMode"),
  currentProgress: document.querySelector("#currentProgress"),
  textStats: document.querySelector("#textStats"),
  limitMessage: document.querySelector("#limitMessage"),
  wpmRange: document.querySelector("#wpmRange"),
  wpmInput: document.querySelector("#wpmInput"),
  chunkRange: document.querySelector("#chunkRange"),
  chunkInput: document.querySelector("#chunkInput"),
  backgroundColor: document.querySelector("#backgroundColor"),
  textColor: document.querySelector("#textColor"),
  fontSelect: document.querySelector("#fontSelect"),
  fontSizeSelect: document.querySelector("#fontSizeSelect"),
  modeInputs: [...document.querySelectorAll('input[name="readingMode"]')]
};

let words = [];
let units = [];
let currentUnitIndex = 0;
let timer = null;
let isPlaying = false;

function getReadingMode() {
  return elements.modeInputs.find((input) => input.checked)?.value || "word";
}

function getChunkSize() {
  return Core.clampNumber(elements.chunkInput.value, 1, 10);
}

function getWpm() {
  return Core.clampNumber(elements.wpmInput.value, 50, 1000);
}

function showMessage(message) {
  elements.limitMessage.textContent = message;
}

function enforceWordLimit() {
  const result = Core.limitTextToWords(elements.sourceText.value);
  if (result.trimmed) {
    elements.sourceText.value = result.text;
    showMessage("Text was trimmed to the 1000 word limit.");
  } else {
    showMessage("");
  }

  return result.words;
}

function rebuildUnits(keepPosition = false) {
  const previousIndex = currentUnitIndex;
  words = enforceWordLimit();
  units = Core.buildUnits(elements.sourceText.value, getReadingMode(), getChunkSize());
  currentUnitIndex = keepPosition ? Math.min(previousIndex, Math.max(units.length - 1, 0)) : 0;
  updateStats();
  updateModeState();
  updateDisplay();
}

function updateStats() {
  const count = words.length;
  const remaining = Math.max(Core.MAX_WORDS - count, 0);
  const characters = elements.sourceText.value.length;
  elements.textStats.textContent = `${characters} characters | ${count} words | ${remaining} words remaining`;
}

function updateModeState() {
  const mode = getReadingMode();
  const isWordMode = mode === "word";
  elements.chunkRange.disabled = !isWordMode;
  elements.chunkInput.disabled = !isWordMode;
  elements.chunkRange.parentElement.classList.toggle("is-disabled", !isWordMode);
}

function getCurrentUnit() {
  return units[currentUnitIndex] || null;
}

function updateDisplay() {
  const unit = getCurrentUnit();
  const mode = getReadingMode();
  const progress = unit && words.length ? Math.min((unit.endWordIndex / words.length) * 100, 100) : 0;

  elements.displayText.textContent = unit ? unit.text : "Ready?";
  elements.progressFill.style.width = `${progress}%`;
  elements.positionText.textContent = unit ? `Word ${unit.endWordIndex} of ${words.length}` : `Word 0 of ${words.length}`;
  elements.currentWpm.textContent = getWpm();
  elements.currentMode.textContent = Core.modeLabel(mode);

  if (mode === "word") {
    const chunkSize = getChunkSize();
    elements.currentChunk.textContent = chunkSize;
    elements.chunkLabel.textContent = chunkSize === 1 ? "word" : "words";
  } else {
    elements.currentChunk.textContent = Core.modeLabel(mode);
    elements.chunkLabel.textContent = "mode";
  }

  elements.currentProgress.textContent = `${Math.round(progress)}%`;
}

function setPlayButton() {
  elements.playButton.classList.toggle("is-playing", isPlaying);
  elements.playButton.setAttribute("aria-label", isPlaying ? "Pause reading" : "Start reading");
  elements.playButtonText.textContent = isPlaying ? "Pause" : "Start";
  elements.playIcon.innerHTML = isPlaying
    ? '<path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z"></path>'
    : '<path d="M8 5v14l11-7L8 5Z"></path>';
}

function stopReading() {
  window.clearTimeout(timer);
  timer = null;
  isPlaying = false;
  setPlayButton();
}

function scheduleNextTick() {
  const unit = getCurrentUnit();
  const delay = Core.unitDelayMs(unit, getWpm());

  timer = window.setTimeout(() => {
    currentUnitIndex += 1;

    if (currentUnitIndex >= units.length) {
      currentUnitIndex = Math.max(units.length - 1, 0);
      updateDisplay();
      stopReading();
      return;
    }

    updateDisplay();
    scheduleNextTick();
  }, delay);
}

function startReading() {
  rebuildUnits(true);
  if (!units.length) {
    showMessage("Paste some text first, or use the sample.");
    elements.sourceText.focus();
    return;
  }

  if (currentUnitIndex >= units.length - 1) currentUnitIndex = 0;
  isPlaying = true;
  setPlayButton();
  updateDisplay();
  scheduleNextTick();
}

function toggleReading() {
  if (isPlaying) {
    stopReading();
  } else {
    startReading();
  }
}

function moveByUnits(direction) {
  currentUnitIndex = Core.clampNumber(currentUnitIndex + direction, 0, Math.max(units.length - 1, 0));
  updateDisplay();
}

function resetReader() {
  stopReading();
  currentUnitIndex = 0;
  updateDisplay();
}

function applyReaderTheme() {
  document.documentElement.style.setProperty("--reader-bg", elements.backgroundColor.value);
  document.documentElement.style.setProperty("--reader-text", elements.textColor.value);
  document.documentElement.style.setProperty("--reader-font", elements.fontSelect.value);
  document.documentElement.style.setProperty("--reader-size", elements.fontSizeSelect.value);
  elements.readerStage.style.backgroundColor = elements.backgroundColor.value;
  elements.readerStage.style.color = elements.textColor.value;
  elements.displayText.style.fontFamily = elements.fontSelect.value;
  elements.displayText.style.fontSize = elements.fontSizeSelect.value;
}

function wireControlPair(range, input, min, max, onChange) {
  range.addEventListener("input", () => {
    input.value = range.value;
    onChange();
  });

  input.addEventListener("change", () => {
    const value = Core.clampNumber(input.value, min, max);
    range.value = value;
    input.value = value;
    onChange();
  });
}

async function pasteFromClipboard() {
  try {
    if (!navigator.clipboard?.readText) {
      showMessage("Clipboard access is blocked here. Use Ctrl+V instead.");
      return;
    }

    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      showMessage("Clipboard is empty.");
      return;
    }

    stopReading();
    elements.sourceText.value = text;
    rebuildUnits(false);
    showMessage("Clipboard text pasted.");
  } catch (error) {
    showMessage("Clipboard access was blocked. Use Ctrl+V instead.");
  }
}

function handleFile(file) {
  if (!file) return;

  stopReading();
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    showMessage("PDF upload needs a PDF text parser. Please upload a .txt file in this offline version.");
    return;
  }

  if (!name.endsWith(".txt") && file.type && file.type !== "text/plain") {
    showMessage("Please upload a plain .txt file.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    elements.sourceText.value = String(reader.result || "");
    rebuildUnits(false);
    showMessage(`Loaded ${file.name}.`);
  });
  reader.addEventListener("error", () => {
    showMessage("Could not read that file.");
  });
  reader.readAsText(file);
}

function openFocusWindow() {
  rebuildUnits(true);
  if (!units.length) {
    showMessage("Add text before opening the focus window.");
    return;
  }

  const payload = {
    text: elements.sourceText.value,
    wpm: getWpm(),
    chunkSize: getChunkSize(),
    mode: getReadingMode(),
    backgroundColor: elements.backgroundColor.value,
    textColor: elements.textColor.value,
    font: elements.fontSelect.value,
    fontSize: elements.fontSizeSelect.value
  };

  localStorage.setItem("speedReaderFocusPayload", JSON.stringify(payload));
  const width = Math.max(window.screen.availWidth || 1200, 900);
  const height = Math.max(window.screen.availHeight || 760, 640);
  const focusWindow = window.open("focus.html", "SpeedReaderFocus", `popup=yes,width=${width},height=${height},left=0,top=0`);

  if (!focusWindow) {
    showMessage("The focus window was blocked. Allow pop-ups for this page and try again.");
  }
}

elements.sourceText.value = Core.sampleText;
rebuildUnits();
applyReaderTheme();

wireControlPair(elements.wpmRange, elements.wpmInput, 50, 1000, () => {
  updateDisplay();
  if (isPlaying) {
    window.clearTimeout(timer);
    scheduleNextTick();
  }
});

wireControlPair(elements.chunkRange, elements.chunkInput, 1, 10, () => {
  rebuildUnits(true);
  if (isPlaying) {
    window.clearTimeout(timer);
    scheduleNextTick();
  }
});

elements.modeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    rebuildUnits(false);
    if (isPlaying) {
      window.clearTimeout(timer);
      scheduleNextTick();
    }
  });
});

elements.sourceText.addEventListener("input", () => {
  const wasPlaying = isPlaying;
  if (wasPlaying) stopReading();
  rebuildUnits(false);
});

elements.playButton.addEventListener("click", toggleReading);
elements.backButton.addEventListener("click", () => moveByUnits(-1));
elements.forwardButton.addEventListener("click", () => moveByUnits(1));
elements.resetButton.addEventListener("click", resetReader);
elements.focusButton.addEventListener("click", openFocusWindow);
elements.pasteButton.addEventListener("click", pasteFromClipboard);
elements.uploadButton.addEventListener("click", () => elements.fileInput.click());
elements.fileInput.addEventListener("change", () => handleFile(elements.fileInput.files[0]));
elements.sampleButton.addEventListener("click", () => {
  stopReading();
  elements.sourceText.value = Core.sampleText;
  rebuildUnits(false);
  showMessage("");
});

[elements.backgroundColor, elements.textColor, elements.fontSelect, elements.fontSizeSelect].forEach((control) => {
  control.addEventListener("input", applyReaderTheme);
  control.addEventListener("change", applyReaderTheme);
});

window.addEventListener("keydown", (event) => {
  const activeElement = document.activeElement;
  const isTyping = activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
  if (isTyping) return;

  if (event.code === "Space") {
    event.preventDefault();
    toggleReading();
  }

  if (event.key === "ArrowLeft") moveByUnits(-1);
  if (event.key === "ArrowRight") moveByUnits(1);
});

