(() => {
  const state = {
    config: null,
    questions: [],
    scoring: null,
    staticMode: false,
    player: "",
    currentIndex: 0,
    answers: {},
    submitting: false,
    dodgeCount: 0,
    advanceTimer: null,
    dodgeSplashTimer: null,
  };

  const SPLASH = {
    dodge: { emoji: "😏", text: "Nice try!" },
    good: { emoji: "☺️", text: "" },
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    playFab: $("play-fab"),
    overlay: $("overlay"),
    screenName: $("screen-name"),
    screenQuiz: $("screen-quiz"),
    screenResult: $("screen-result"),
    playerName: $("player-name"),
    startBtn: $("start-btn"),
    nameError: $("name-error"),
    playerTag: $("player-tag"),
    progressBar: $("progress-bar"),
    roundLabel: $("round-label"),
    questionCard: $("question-card"),
    questionEmoji: $("question-emoji"),
    questionText: $("question-text"),
    options: $("options"),
    backBtn: $("back-btn"),
    nextBtn: $("next-btn"),
    resultEmoji: $("result-emoji"),
    resultTier: $("result-tier"),
    resultScore: $("result-score"),
    resultMessage: $("result-message"),
    breakdown: $("breakdown"),
    replayBtn: $("replay-btn"),
    closeBtn: $("close-btn"),
    landingTitle: $("landing-title"),
    landingSubtitle: $("landing-subtitle"),
    hostName: $("host-name"),
    bannerHost: $("banner-host"),
    playLabel: $("play-label"),
    dodgeSplash: $("dodge-splash"),
    dodgeSplashEmoji: $("dodge-splash-emoji"),
    dodgeSplashText: $("dodge-splash-text"),
  };

  function staticAsset(path) {
    return new URL(path, document.baseURI).href;
  }

  async function init() {
    try {
      const loaded = await loadFromAPI();
      if (loaded) {
        state.staticMode = false;
      } else {
        await loadFromStaticBundle();
        state.staticMode = true;
      }
      applyConfig();
    } catch (err) {
      console.error("Failed to load game:", err);
    }

    bindEvents();
  }

  async function loadFromAPI() {
    try {
      const [configRes, questionsRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/questions"),
      ]);
      if (!configRes.ok || !questionsRes.ok) {
        return false;
      }

      state.config = await configRes.json();
      const qData = await questionsRes.json();
      state.questions = qData.questions || [];
      state.scoring = null;
      return true;
    } catch {
      return false;
    }
  }

  async function loadFromStaticBundle() {
    const res = await fetch(staticAsset("static/game-data.json"));
    if (!res.ok) {
      throw new Error("game data not found");
    }

    const data = await res.json();
    state.config = data.config;
    state.questions = data.questions || [];
    state.scoring = data.scoring || {};
  }

  function tierForScore(score, total) {
    if (total === 0) {
      return {
        title: "Thanks for playing!",
        message: "Your thoughts have been recorded.",
        emoji: "💜",
      };
    }

    const pct = (score / total) * 100;

    if (pct >= 90) {
      return {
        title: "Certified Fan",
        message: "Okay wow — you actually think I'm pretty great. I'll remember this.",
        emoji: "👑",
      };
    }
    if (pct >= 75) {
      return {
        title: "Solid Supporter",
        message: "Mostly positive vibes. I appreciate you!",
        emoji: "🙌",
      };
    }
    if (pct >= 55) {
      return {
        title: "Mixed Signals",
        message: "Interesting take… we've got some talking to do.",
        emoji: "🤔",
      };
    }
    if (pct >= 30) {
      return {
        title: "Friendly Stranger",
        message: "We should hang out more — there's a lot to discover.",
        emoji: "👋",
      };
    }
    return {
      title: "Plot Twist",
      message: "Either I'm full of surprises, or you need to stalk my stories more.",
      emoji: "🎭",
    };
  }

  function scoreLocally() {
    let score = 0;
    const breakdown = state.questions.map((q) => {
      const chosen = state.answers[q.id];
      const meta = state.scoring[`${q.id}:${chosen}`] || { label: "", positive: false };
      if (meta.positive) score++;

      return {
        questionId: q.id,
        questionText: q.text,
        emoji: q.emoji,
        chosenLabel: meta.label,
        positive: meta.positive,
      };
    });

    const total = state.questions.length;
    return {
      player: state.player,
      score,
      total,
      wrongAttempts: state.dodgeCount,
      tier: tierForScore(score, total),
      breakdown,
    };
  }

  function saveLocalResponse(record) {
    try {
      const key = "knowme_responses";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({ ...record, playedAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // ignore storage errors in static mode
    }
  }

  function applyConfig() {
    if (!state.config) return;
    const { hostName, title, subtitle, playLabel } = state.config;
    els.landingTitle.textContent = title;
    els.landingSubtitle.textContent = subtitle;
    els.hostName.textContent = hostName;
    els.bannerHost.textContent = hostName;
    els.playLabel.textContent = playLabel;
    document.title = title;
  }

  function bindEvents() {
    els.playFab.addEventListener("click", openModal);
    els.closeBtn.addEventListener("click", closeModal);
    els.overlay.addEventListener("click", (e) => {
      if (e.target === els.overlay) closeModal();
    });

    els.startBtn.addEventListener("click", startQuiz);
    els.playerName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") startQuiz();
    });

    els.backBtn.addEventListener("click", goBack);
    els.nextBtn.addEventListener("click", goNext);
    els.replayBtn.addEventListener("click", replay);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.overlay.classList.contains("hidden")) {
        closeModal();
      }
    });
  }

  function openModal() {
    resetSession();
    els.overlay.classList.remove("hidden");
    els.overlay.setAttribute("aria-hidden", "false");
    showScreen("name");
    setTimeout(() => els.playerName.focus(), 200);
  }

  function closeModal() {
    clearAdvanceTimer();
    hideEmojiSplash();
    els.overlay.classList.add("hidden");
    els.overlay.setAttribute("aria-hidden", "true");
  }

  function clearAdvanceTimer() {
    if (state.advanceTimer) {
      clearTimeout(state.advanceTimer);
      state.advanceTimer = null;
    }
  }

  function clearDodgeSplashTimer() {
    if (state.dodgeSplashTimer) {
      clearTimeout(state.dodgeSplashTimer);
      state.dodgeSplashTimer = null;
    }
  }

  function resetSession() {
    clearAdvanceTimer();
    state.player = "";
    state.currentIndex = 0;
    state.answers = {};
    state.submitting = false;
    state.dodgeCount = 0;
    els.playerName.value = "";
    els.nameError.textContent = "";
    els.nextBtn.textContent = "Next";
    els.nextBtn.disabled = true;
    els.nextBtn.classList.remove("hidden");
  }

  function showScreen(name) {
    els.screenName.classList.toggle("hidden", name !== "name");
    els.screenQuiz.classList.toggle("hidden", name !== "quiz");
    els.screenResult.classList.toggle("hidden", name !== "result");
  }

  function startQuiz() {
    const name = els.playerName.value.trim();
    if (!name) {
      els.nameError.textContent = "Come on, don't be shy — enter your name!";
      els.playerName.focus();
      return;
    }

    state.player = name;
    els.nameError.textContent = "";
    els.playerTag.textContent = `Playing as ${name}`;
    showScreen("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    clearAdvanceTimer();
    const q = state.questions[state.currentIndex];
    const total = state.questions.length;
    const pct = ((state.currentIndex + 1) / total) * 100;

    els.progressBar.style.width = `${pct}%`;
    els.roundLabel.textContent = `Question ${state.currentIndex + 1} of ${total}`;
    els.questionEmoji.textContent = q.emoji;
    els.questionText.textContent = q.text;

    hideEmojiSplash();

    if (q.style === "binary") {
      renderBinaryQuestion(q);
      els.nextBtn.classList.add("hidden");
    } else {
      renderGridQuestion(q);
      els.nextBtn.classList.remove("hidden");
      els.nextBtn.disabled = !state.answers[q.id];
      els.nextBtn.textContent =
        state.currentIndex === total - 1 ? "See Results" : "Next";
    }

    els.backBtn.classList.toggle("hidden", state.currentIndex === 0);

    els.questionCard.style.animation = "none";
    void els.questionCard.offsetWidth;
    els.questionCard.style.animation = "";
  }

  function renderBinaryQuestion(q) {
    els.options.className = "options options-binary";
    els.options.innerHTML = "";

    const anchor = document.createElement("div");
    anchor.className = "binary-anchor";
    els.options.appendChild(anchor);

    const dodgeSlot = document.createElement("div");
    dodgeSlot.className = "dodge-slot";

    let goodBtn = null;
    let evasiveBtn = null;

    q.options.forEach((opt, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option option-binary";
      btn.textContent = opt.label;
      btn.dataset.id = opt.id;

      if (opt.evasive) {
        btn.classList.add("option-evasive", "option-negative");
        evasiveBtn = btn;
      } else {
        btn.classList.add("option-positive");
        goodBtn = btn;
        if (index === 0) btn.classList.add("option-left");
        else btn.classList.add("option-right");
      }

      if (state.answers[q.id] === opt.id) {
        btn.classList.add("selected");
      }

      if (!opt.evasive) {
        btn.addEventListener("click", () => selectBinaryOption(q.id, opt.id));
      }

      anchor.appendChild(btn);
    });

    anchor.appendChild(dodgeSlot);

    if (evasiveBtn && goodBtn) {
      requestAnimationFrame(() => {
        attachEvasive(evasiveBtn, els.options, goodBtn);
      });
    } else {
      dodgeSlot.remove();
    }
  }

  function renderGridQuestion(q) {
    els.options.className = "options";
    els.options.innerHTML = "";

    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.textContent = opt.label;
      btn.dataset.id = opt.id;

      if (state.answers[q.id] === opt.id) {
        btn.classList.add("selected");
      }

      btn.addEventListener("click", () => selectOption(q.id, opt.id));
      els.options.appendChild(btn);
    });
  }

  function attachEvasive(btn, container, goodBtn) {
    const goodZone = captureZone(container, goodBtn);
    let lastPos = null;

    const dodge = (e) => {
      e.preventDefault();
      e.stopPropagation();

      state.dodgeCount++;
      showEmojiSplash(SPLASH.dodge.emoji, SPLASH.dodge.text);

      const pos = findDodgePosition(container, btn, goodZone, lastPos);
      lastPos = pos;

      btn.style.position = "absolute";
      btn.style.width = `${btn.offsetWidth}px`;
      btn.style.left = `${pos.x}px`;
      btn.style.top = `${pos.y}px`;
      btn.style.transform = `rotate(${pos.rotate}deg)`;
    };

    btn.addEventListener("mouseenter", dodge);
    btn.addEventListener("click", dodge);
    btn.addEventListener("touchstart", dodge, { passive: false });
  }

  function captureZone(container, el) {
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const buffer = 16;

    return {
      left: elRect.left - containerRect.left - buffer,
      top: elRect.top - containerRect.top - buffer,
      right: elRect.right - containerRect.left + buffer,
      bottom: elRect.bottom - containerRect.top + buffer,
    };
  }

  function findDodgePosition(container, evasiveBtn, goodZone, lastPos) {
    const pad = 8;
    const minMove = 48;
    const btnW = evasiveBtn.offsetWidth || 120;
    const btnH = evasiveBtn.offsetHeight || 52;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const avoid = goodZone;

    const overlapsGood = (x, y) => {
      const right = x + btnW;
      const bottom = y + btnH;
      return !(
        right < avoid.left ||
        x > avoid.right ||
        bottom < avoid.top ||
        y > avoid.bottom
      );
    };

    const tooCloseToLast = (x, y) => {
      if (!lastPos) return false;
      return Math.hypot(x - lastPos.x, y - lastPos.y) < minMove;
    };

    const maxX = Math.max(containerW - btnW - pad, pad);
    const maxY = Math.max(containerH - btnH - pad, pad);

    // Prefer the right half (where the negative button lives)
    const minX = Math.max(avoid.right + pad, pad);

    for (let i = 0; i < 50; i++) {
      const useRightHalf = Math.random() > 0.2;
      const x = useRightHalf
        ? minX + Math.random() * Math.max(maxX - minX, 0)
        : pad + Math.random() * (maxX - pad);
      const y = pad + Math.random() * (maxY - pad);

      if (!overlapsGood(x, y) && !tooCloseToLast(x, y)) {
        return { x, y, rotate: Math.random() * 16 - 8 };
      }
    }

    // Fallback corners farthest from good button
    const candidates = [
      { x: maxX, y: pad },
      { x: maxX, y: maxY },
      { x: minX, y: pad },
      { x: minX, y: maxY },
      { x: maxX, y: (maxY - pad) / 2 },
      { x: minX, y: (maxY - pad) / 2 },
    ];

    const goodCenterX = (avoid.left + avoid.right) / 2;
    const goodCenterY = (avoid.top + avoid.bottom) / 2;

    let best = null;
    let bestScore = -1;

    for (const c of candidates) {
      if (overlapsGood(c.x, c.y)) continue;

      const cx = c.x + btnW / 2;
      const cy = c.y + btnH / 2;
      const distFromGood = Math.hypot(cx - goodCenterX, cy - goodCenterY);
      const distFromLast = lastPos
        ? Math.hypot(c.x - lastPos.x, c.y - lastPos.y)
        : minMove;

      const score = distFromGood + (distFromLast >= minMove ? 100 : distFromLast);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }

    if (best) {
      return { x: best.x, y: best.y, rotate: Math.random() * 16 - 8 };
    }

    return {
      x: maxX,
      y: pad + Math.random() * (maxY - pad),
      rotate: Math.random() * 16 - 8,
    };
  }

  function showEmojiSplash(emoji, text, duration = 900) {
    clearEmojiSplashTimer();
    els.dodgeSplashEmoji.textContent = emoji;
    els.dodgeSplashText.textContent = text;
    els.dodgeSplashText.classList.toggle("hidden", !text);

    els.dodgeSplash.classList.remove("hidden");
    els.dodgeSplash.setAttribute("aria-hidden", "false");

    const content = els.dodgeSplash.querySelector(".dodge-splash-content");
    content.style.animation = "none";
    void content.offsetWidth;
    content.style.animation = "";

    requestAnimationFrame(() => els.dodgeSplash.classList.add("visible"));

    state.dodgeSplashTimer = setTimeout(hideEmojiSplash, duration);
  }

  function hideEmojiSplash() {
    clearEmojiSplashTimer();
    els.dodgeSplash.classList.remove("visible");
    els.dodgeSplash.classList.add("hidden");
    els.dodgeSplash.setAttribute("aria-hidden", "true");
  }

  function clearEmojiSplashTimer() {
    clearDodgeSplashTimer();
  }

  function selectBinaryOption(questionId, optionId) {
    selectOption(questionId, optionId);

    els.options.querySelectorAll(".option-positive").forEach((el) => {
      el.classList.toggle("selected", el.dataset.id === optionId);
      el.disabled = true;
    });

    showEmojiSplash(SPLASH.good.emoji, SPLASH.good.text, 900);

    clearAdvanceTimer();
    state.advanceTimer = setTimeout(() => {
      goNext();
    }, 950);
  }

  function selectOption(questionId, optionId) {
    state.answers[questionId] = optionId;
    els.nextBtn.disabled = false;
  }

  function goBack() {
    clearAdvanceTimer();
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderQuestion();
    }
  }

  async function goNext() {
    clearAdvanceTimer();
    const q = state.questions[state.currentIndex];
    if (!state.answers[q.id]) return;

    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex++;
      renderQuestion();
      return;
    }

    await submitAnswers();
  }

  async function submitAnswers() {
    if (state.submitting) return;
    state.submitting = true;

    try {
      if (state.staticMode) {
        const data = scoreLocally();
        saveLocalResponse(data);
        showResults(data);
        return;
      }

      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: state.player,
          answers: state.answers,
          wrongAttempts: state.dodgeCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      showResults(data);
    } catch (err) {
      els.nameError.textContent = err.message;
      showScreen("name");
    } finally {
      state.submitting = false;
    }
  }

  function showResults(data) {
    els.resultEmoji.textContent = data.tier.emoji;
    els.resultTier.textContent = data.tier.title;
    els.resultScore.textContent = `${data.score} / ${data.total} positive vibes`;

    let message = data.tier.message;
    const wrongAttempts = data.wrongAttempts ?? state.dodgeCount;
    if (wrongAttempts > 0) {
      message += ` (You tried to pick the wrong answer ${wrongAttempts} time${wrongAttempts === 1 ? "" : "s"} 😂)`;
    }
    els.resultMessage.textContent = message;

    els.breakdown.innerHTML = "";
    data.breakdown.forEach((item) => {
      const div = document.createElement("div");
      div.className = `breakdown-item ${item.positive ? "positive" : "neutral"}`;
      div.innerHTML = `
        <div class="breakdown-q">${item.emoji} ${item.questionText}</div>
        <div class="breakdown-detail">
          You said: <strong>${item.chosenLabel || "—"}</strong>
        </div>
      `;
      els.breakdown.appendChild(div);
    });

    showScreen("result");
  }

  function replay() {
    resetSession();
    showScreen("name");
    els.playerName.focus();
  }

  init();
})();
