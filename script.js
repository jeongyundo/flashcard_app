// script.js
// ----------------------------------------------------
// ① 전역 변수
let allWords = []; // JSON에서 로드한 모든 단어
let words = []; // 현재 학습 중인 단어 세트
let idx = 0; // 현재 카드 인덱스
let revealStep = 0; // 0:뜻 숨김, 1:뜻, 2:설명
let currentMode = null; // 'full' 또는 'random'

// ② DOM 참조
// 모드 선택 화면 요소
const modeSelectorEl = document.getElementById("mode-selector");
const fullModeBtnEl = document.getElementById("fullModeBtn");
const randomModeBtnEl = document.getElementById("randomModeBtn");
const totalCountEl = document.getElementById("total-count");
const backToModeBtnEl = document.getElementById("backToModeBtn");

// 학습 화면 요소
const studyContainerEl = document.getElementById("study-container");
const wordEl = document.getElementById("word");
const transEl = document.getElementById("translation");
const explEl = document.getElementById("explanation");
const counterEl = document.getElementById("counter");
const revealBtn = document.getElementById("revealBtn");
const correctBtn = document.getElementById("correctBtn");
const wrongBtn = document.getElementById("wrongBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// 통계 관련 DOM 요소
const statsCorrectEl = document.getElementById("stats-correct");
const statsWrongEl = document.getElementById("stats-wrong");
const statsTotalEl = document.getElementById("stats-total");
const resetStatsBtn = document.getElementById("resetStatsBtn");

// ③ 앱 시작 ------------------------------------------
init(); // 가장 아래쪽까지 읽힌 뒤 실행됨( defer 덕분 )

async function init() {
  try {
    // (1) JSON 파일 로드
    const res = await fetch("vocabulary_processed.json");
    if (!res.ok) throw new Error("JSON 파일을 불러오지 못했습니다.");
    allWords = await res.json();

    if (!Array.isArray(allWords) || allWords.length === 0)
      throw new Error("단어 배열이 비어 있습니다.");

    // 총 단어 수 표시
    totalCountEl.textContent = `총 ${allWords.length}개 단어`;

    // (2) 이벤트 리스너 연결
    attachEvents();

    // 모드 선택 화면 표시
    showModeSelector();
  } catch (err) {
    alert(
      err.message +
        "\n\nTIP: 파일을 file:// 로 열면 fetch가 막힙니다.\n" +
        "   ⇒ 로컬 서버를 하나 띄워 주세요.\n" +
        '      (예: "npx serve" 또는 "python -m http.server")'
    );
    console.error(err);
  }
}

// ④ 이벤트 -------------------------------------------
function attachEvents() {
  // 모드 선택 이벤트
  fullModeBtnEl.addEventListener("click", () => startMode("full"));
  randomModeBtnEl.addEventListener("click", () => startMode("random"));
  backToModeBtnEl.addEventListener("click", showModeSelector);

  // 기존 이벤트
  revealBtn.addEventListener("click", revealHandler);
  correctBtn.addEventListener("click", () => storeAnswer(true));
  wrongBtn.addEventListener("click", () => storeAnswer(false));
  prevBtn.addEventListener("click", () => move(-1));
  nextBtn.addEventListener("click", () => move(1));
  resetStatsBtn.addEventListener("click", resetStats);

  document.addEventListener("keydown", (e) => {
    if (modeSelectorEl.style.display === "none") {
      // 학습 모드일 때만 키보드 이벤트 처리
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    }
  });

  // 스와이프 이벤트 추가
  const cardElement = document.getElementById("card");
  cardElement.addEventListener("touchstart", handleTouchStart, {
    passive: true,
  });
  cardElement.addEventListener("touchend", handleTouchEnd, { passive: true });
}

// ⑤ 모드 관련 함수 -----------------------------------
function showModeSelector() {
  // 모드 선택 화면 표시, 학습 화면 숨김
  modeSelectorEl.style.display = "block";
  studyContainerEl.style.display = "none";

  // 현재 모드 초기화
  currentMode = null;
}

function startMode(mode) {
  currentMode = mode;

  // 선택된 모드에 따라 단어 세트 설정
  if (mode === "full") {
    // 전체 단어 사용
    words = [...allWords];
  } else if (mode === "random") {
    // 30개 랜덤 선택
    words = getRandomWords(allWords, 30);
  }

  // 인덱스 초기화 및 첫 카드 렌더링
  idx = 0;
  renderCard();
  updateStats();

  // 모드 선택 화면 숨김, 학습 화면 표시
  modeSelectorEl.style.display = "none";
  studyContainerEl.style.display = "block";
}

// 배열에서 랜덤하게 n개 아이템 선택하는 함수
function getRandomWords(array, n) {
  // 원본 배열 복사
  const shuffled = [...array];

  // 배열 섞기 (Fisher-Yates 알고리즘)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 앞에서부터 n개 선택
  return shuffled.slice(0, n);
}

// ⑥ 터치 이벤트 처리 ---------------------------------
let touchStartX = 0;
let touchEndX = 0;
const minSwipeDistance = 50;

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}

function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;

  if (Math.abs(swipeDistance) >= minSwipeDistance) {
    if (swipeDistance > 0) {
      // 오른쪽으로 스와이프 -> 이전 카드
      move(-1);
    } else {
      // 왼쪽으로 스와이프 -> 다음 카드
      move(1);
    }
  }
}

// ⑦ 기존 기능 유지 ----------------------------------
function renderCard() {
  const w = words[idx];
  wordEl.textContent = w.english_word;
  transEl.textContent = w.translation;
  explEl.textContent = w.note || w.explanation || "";
  counterEl.textContent = `${idx + 1} / ${words.length}`;

  // 초기 상태
  revealStep = 0;
  transEl.classList.add("hidden");
  explEl.classList.add("hidden");
  revealBtn.textContent = "뜻 보기";
  revealBtn.style.visibility = "visible";

  // 이미 학습한 단어인지 표시
  showWordStatus();
}

function showWordStatus() {
  // 기존 상태 표시 요소 제거
  const existingStatus = document.querySelector(".word-status");
  if (existingStatus) {
    existingStatus.remove();
  }

  // 모드별 LocalStorage 키 생성
  const storagePrefix = currentMode === "random" ? "random-" : "";
  const key = `${storagePrefix}word-${words[idx].number}`;
  const status = localStorage.getItem(key);

  if (status) {
    const statusEl = document.createElement("div");
    statusEl.classList.add("word-status");
    statusEl.textContent = status;

    if (status === "O") {
      statusEl.classList.add("correct-mark");
    } else {
      statusEl.classList.add("wrong-mark");
    }

    document.getElementById("card").appendChild(statusEl);
  }
}

function revealHandler() {
  if (revealStep === 0) {
    transEl.classList.remove("hidden");
    revealBtn.textContent = "해석 보기";
  } else if (revealStep === 1) {
    explEl.classList.remove("hidden");
    revealBtn.style.visibility = "hidden";
  }
  revealStep++;
}

function storeAnswer(isCorrect) {
  // 모드별 LocalStorage 키 생성
  const storagePrefix = currentMode === "random" ? "random-" : "";
  const key = `${storagePrefix}word-${words[idx].number}`;
  localStorage.setItem(key, isCorrect ? "O" : "X");
  updateStats(); // 통계 업데이트
  move(1);
}

function move(delta) {
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= words.length) return;
  idx = newIdx;
  renderCard();
}

// 통계 계산 및 표시 (모드별 구분)
function updateStats() {
  let correct = 0;
  let wrong = 0;
  let total = 0;

  // 모드별 LocalStorage 접두사
  const storagePrefix = currentMode === "random" ? "random-" : "";

  // 현재 모드의 단어셋에 대한 O/X 상태 확인
  for (const word of words) {
    const key = `${storagePrefix}word-${word.number}`;
    const status = localStorage.getItem(key);

    if (status === "O") {
      correct++;
      total++;
    } else if (status === "X") {
      wrong++;
      total++;
    }
  }

  // 통계 화면 업데이트
  statsCorrectEl.textContent = `맞춤: ${correct}`;
  statsWrongEl.textContent = `틀림: ${wrong}`;

  const progress =
    words.length > 0 ? Math.round((total / words.length) * 100) : 0;
  statsTotalEl.textContent = `진행: ${progress}%`;
}

// 통계 초기화 (모드별 구분)
function resetStats() {
  if (confirm("현재 모드의 학습 기록을 초기화하시겠습니까?")) {
    // 모드별 LocalStorage 접두사
    const storagePrefix = currentMode === "random" ? "random-" : "";

    // 현재 모드의 단어 관련 localStorage 항목만 삭제
    for (const word of words) {
      const key = `${storagePrefix}word-${word.number}`;
      localStorage.removeItem(key);
    }

    // 통계 및 화면 업데이트
    updateStats();
    showWordStatus();
  }
}
