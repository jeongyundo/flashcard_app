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
  move(1);
}

function move(delta) {
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= words.length) return;
  idx = newIdx;
  renderCard();
}
