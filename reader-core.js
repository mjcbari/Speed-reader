(function () {
  const MAX_WORDS = 10000;

  const sampleText = `Welcome to Speed Reader. Paste any text you want to practice with, then choose the speed and how many words appear at one time.

Speed reading works best when the screen is calm, the text is easy to see, and the pace is comfortable enough that your brain can follow the meaning. Start slowly, then raise the speed little by little.

Kids can use a bigger font and fewer words at once. Older readers can try two, three, or four words at a time when the single-word pace starts to feel easy.`;

  function normalizeWords(text) {
    return text.trim().split(/\s+/).filter(Boolean);
  }

  function clampNumber(value, min, max) {
    const number = Number(value);
    if (Number.isNaN(number)) return min;
    return Math.min(Math.max(number, min), max);
  }

  function limitTextToWords(text) {
    const words = normalizeWords(text);
    if (words.length <= MAX_WORDS) {
      return { text, words, trimmed: false };
    }

    return {
      text: words.slice(0, MAX_WORDS).join(" "),
      words: words.slice(0, MAX_WORDS),
      trimmed: true
    };
  }

  function stripClosingMarks(word) {
    return word.replace(/[)"'\]\}]+$/g, "");
  }

  function wordRecords(text) {
    const matches = [...text.matchAll(/\S+/g)];
    return matches.map((match, index) => {
      const raw = match[0];
      const clean = stripClosingMarks(raw);
      const next = matches[index + 1];
      const gap = text.slice(match.index + raw.length, next ? next.index : text.length);

      return {
        text: raw,
        commaPause: /[,;:]$/.test(clean),
        sentencePause: /[.!?]$/.test(clean),
        paragraphPause: /\n\s*\n/.test(gap)
      };
    });
  }

  function pauseKindForRecords(records) {
    if (records.some((record) => record.paragraphPause)) return "paragraph";
    const last = records[records.length - 1];
    if (!last) return "none";
    if (last.sentencePause) return "sentence";
    if (last.commaPause) return "comma";
    return "none";
  }

  function makeUnit(records, startWordIndex) {
    return {
      text: records.map((record) => record.text).join(" "),
      wordCount: records.length,
      endWordIndex: startWordIndex + records.length,
      pauseKind: pauseKindForRecords(records)
    };
  }

  function buildWordUnits(records, chunkSize) {
    const units = [];
    for (let index = 0; index < records.length; index += chunkSize) {
      units.push(makeUnit(records.slice(index, index + chunkSize), index));
    }
    return units;
  }

  function buildPhraseUnits(records) {
    const units = [];
    let start = 0;
    let bucket = [];

    records.forEach((record, index) => {
      bucket.push(record);
      const shouldBreak = record.commaPause || record.sentencePause || record.paragraphPause || bucket.length >= 12;
      if (shouldBreak) {
        units.push(makeUnit(bucket, start));
        start = index + 1;
        bucket = [];
      }
    });

    if (bucket.length) units.push(makeUnit(bucket, start));
    return units;
  }

  function buildSentenceUnits(records) {
    const units = [];
    let start = 0;
    let bucket = [];

    records.forEach((record, index) => {
      bucket.push(record);
      const shouldBreak = record.sentencePause || record.paragraphPause || bucket.length >= 35;
      if (shouldBreak) {
        units.push(makeUnit(bucket, start));
        start = index + 1;
        bucket = [];
      }
    });

    if (bucket.length) units.push(makeUnit(bucket, start));
    return units;
  }

  function buildUnits(text, mode, chunkSize) {
    const records = wordRecords(text);
    if (!records.length) return [];
    if (mode === "phrase") return buildPhraseUnits(records);
    if (mode === "sentence") return buildSentenceUnits(records);
    return buildWordUnits(records, clampNumber(chunkSize, 1, 10));
  }

  function unitDelayMs(unit, wpm) {
    if (!unit) return 120;

    const wordMs = 60000 / clampNumber(wpm, 50, 1000);
    const base = Math.max(120, wordMs * Math.max(unit.wordCount, 1));
    const bonusMap = {
      none: 0,
      comma: wordMs * 1.2,
      sentence: wordMs * 2.2,
      paragraph: wordMs * 3.4
    };

    return Math.round(base + (bonusMap[unit.pauseKind] || 0));
  }

  function modeLabel(mode) {
    if (mode === "phrase") return "Phrase";
    if (mode === "sentence") return "Sentence";
    return "Word";
  }

  window.SpeedReaderCore = {
    MAX_WORDS,
    sampleText,
    normalizeWords,
    clampNumber,
    limitTextToWords,
    buildUnits,
    unitDelayMs,
    modeLabel
  };
})();
