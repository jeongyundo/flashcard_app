// script.js
// ----------------------------------------------------
// ① 전역 변수
let words = []; // JSON 로드 후 채워짐
let idx = 0; // 현재 카드 인덱스
let revealStep = 0; // 0:뜻 숨김, 1:뜻, 2:설명

// ② DOM 참조
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
    words = await res.json();

    if (!Array.isArray(words) || words.length === 0)
      throw new Error("단어 배열이 비어 있습니다.");

    // (2) 첫 카드 렌더
    attachEvents();
    renderCard();
    updateStats(); // 통계 초기 업데이트
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
  revealBtn.addEventListener("click", revealHandler);
  correctBtn.addEventListener("click", () => storeAnswer(true));
  wrongBtn.addEventListener("click", () => storeAnswer(false));
  prevBtn.addEventListener("click", () => move(-1));
  nextBtn.addEventListener("click", () => move(1));
  resetStatsBtn.addEventListener("click", resetStats);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") move(1);
    if (e.key === "ArrowLeft") move(-1);
  });
}

// ⑤ 렌더 & 로직 --------------------------------------
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

// 단어의 학습 상태 표시 (O/X)
function showWordStatus() {
  // 기존 상태 표시 요소 제거
  const existingStatus = document.querySelector(".word-status");
  if (existingStatus) {
    existingStatus.remove();
  }

  const key = `word-${words[idx].number}`;
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
  const key = `word-${words[idx].number}`;
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

// ⑥ 통계 관련 기능 ----------------------------------
// 통계 계산 및 표시
function updateStats() {
  let correct = 0;
  let wrong = 0;
  let total = 0;

  // 모든 단어에 대한 O/X 상태 확인
  for (const word of words) {
    const key = `word-${word.number}`;
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

// 통계 초기화
function resetStats() {
  if (confirm("모든 학습 기록을 초기화하시겠습니까?")) {
    // 단어 관련 localStorage 항목만 삭제
    for (const word of words) {
      const key = `word-${word.number}`;
      localStorage.removeItem(key);
    }

    // 통계 및 화면 업데이트
    updateStats();
    showWordStatus(); // 현재 카드의 상태 표시 업데이트
  }
}

// 스와이프 관련 변수
let touchStartX = 0;
let touchEndX = 0;
const minSwipeDistance = 50; // 최소 스와이프 거리 (px)

// 이벤트 리스너 추가 함수에 스와이프 관련 이벤트 추가
function attachEvents() {
  // 기존 이벤트 유지
  revealBtn.addEventListener("click", revealHandler);
  correctBtn.addEventListener("click", () => storeAnswer(true));
  wrongBtn.addEventListener("click", () => storeAnswer(false));
  prevBtn.addEventListener("click", () => move(-1));
  nextBtn.addEventListener("click", () => move(1));
  resetStatsBtn.addEventListener("click", resetStats);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") move(1);
    if (e.key === "ArrowLeft") move(-1);
  });

  // 카드 요소에 터치 이벤트 추가
  const cardElement = document.getElementById("card");

  // 터치 시작 이벤트
  cardElement.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  // 터치 종료 이벤트
  cardElement.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true }
  );
}

// 스와이프 처리 함수
function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;

  // 최소 스와이프 거리를 넘었는지 확인
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
