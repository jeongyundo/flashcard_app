// script.js
// ----------------------------------------------------
// ① 전역 변수
let allWords = []; // JSON에서 로드한 모든 단어
let words = []; // 현재 학습 중인 단어 세트
let idx = 0; // 현재 카드 인덱스
let revealStep = 0; // 0:뜻 숨김, 1:뜻, 2:설명
let currentMode = null; // 'full' 또는 'random'
let currentUser = null; // 현재 로그인한 사용자

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

// DOM 요소 추가
const loadingEl = document.getElementById("loading");

// 인증 관련 요소
const authContainerEl = document.getElementById("auth-container");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const loginBtnEl = document.getElementById("loginBtn");
const signupBtnEl = document.getElementById("signupBtn");
const logoutBtnEl = document.getElementById("logoutBtn");
const authErrorEl = document.getElementById("auth-error");
const googleLoginBtnEl = document.getElementById("googleLoginBtn");

// ③ 앱 시작 ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  try {
    showLoading();
    
    // Firebase 연결 확인
    if (!firebase.apps.length) {
      console.error("Firebase가 초기화되지 않았습니다.");
      throw new Error("Firebase 초기화 실패");
    }

    // Firebase 연결 상태 확인
    try {
      // Firestore 설정
      const firestore = firebase.firestore();
      firestore.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
      });
      
      // 연결 테스트
      await firestore.collection('vocabulary').limit(1).get();
      console.log("Firebase 연결 성공");
    } catch (error) {
      console.error("Firebase 연결 실패:", error);
      if (error.code === 'permission-denied') {
        throw new Error("Firebase 접근 권한이 없습니다. Firebase 규칙을 확인해주세요.");
      } else if (error.code === 'unavailable') {
        throw new Error("Firebase 서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.");
      } else {
        throw new Error(`Firebase 연결 오류: ${error.message}`);
      }
    }

    // 인증 상태 변경 감지
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // 로그인 상태
        currentUser = user;
        showModeSelector();
        loadUserData();
      } else {
        // 로그아웃 상태
        currentUser = null;
        showAuthContainer();
      }
    });

    // Firebase에서 데이터 가져오기
    const vocabularyRef = db.collection('vocabulary');
    
    try {
      const snapshot = await vocabularyRef.get();
      
      if (snapshot.empty) {
        console.log("Firebase에 데이터가 없습니다. JSON 파일에서 데이터를 가져옵니다.");
        const res = await fetch("vocabulary_processed.json");
        if (!res.ok) throw new Error("JSON 파일을 불러오지 못했습니다.");
        allWords = await res.json();

        if (!Array.isArray(allWords) || allWords.length === 0)
          throw new Error("단어 배열이 비어 있습니다.");

        // Firebase에 데이터 저장
        console.log("Firebase에 데이터를 저장합니다...");
        const batch = db.batch();
        allWords.forEach(word => {
          const docRef = vocabularyRef.doc(word.number.toString());
          batch.set(docRef, word);
        });
        await batch.commit();
        console.log("Firebase에 데이터 저장이 완료되었습니다.");
      } else {
        console.log("Firebase에서 데이터를 가져옵니다.");
        allWords = snapshot.docs.map(doc => doc.data());
        console.log(`${allWords.length}개의 단어를 가져왔습니다.`);
      }
    } catch (firebaseError) {
      console.error("Firebase 작업 중 오류 발생:", firebaseError);
      const res = await fetch("vocabulary_processed.json");
      if (!res.ok) throw new Error("JSON 파일을 불러오지 못했습니다.");
      allWords = await res.json();
    }

    // 총 단어 수 표시
    totalCountEl.textContent = `총 ${allWords.length}개 단어`;

    // 이벤트 리스너 연결
    attachEvents();

  } catch (err) {
    console.error("초기화 중 오류 발생:", err);
    alert(
      "데이터를 불러오는 중 오류가 발생했습니다.\n\n" +
      "오류 내용: " + err.message + "\n\n" +
      "1. 인터넷 연결을 확인해주세요.\n" +
      "2. Firebase 설정이 올바른지 확인해주세요.\n" +
      "3. Firebase 프로젝트의 결제 상태를 확인해주세요.\n" +
      "4. 브라우저 콘솔(F12)에서 자세한 오류 내용을 확인할 수 있습니다."
    );
  } finally {
    hideLoading();
  }
}

function showLoading() {
  loadingEl.style.display = "flex";
}

function hideLoading() {
  loadingEl.style.display = "none";
}

// ④ 이벤트 -------------------------------------------
function attachEvents() {
  // DOM 요소 존재 여부 확인
  const elements = {
    loginBtn: loginBtnEl,
    signupBtn: signupBtnEl,
    logoutBtn: logoutBtnEl,
    googleLoginBtn: googleLoginBtnEl,
    fullModeBtn: fullModeBtnEl,
    randomModeBtn: randomModeBtnEl,
    backToModeBtn: backToModeBtnEl,
    revealBtn: revealBtn,
    correctBtn: correctBtn,
    wrongBtn: wrongBtn,
    prevBtn: prevBtn,
    nextBtn: nextBtn,
    resetStatsBtn: resetStatsBtn
  };

  // 각 요소의 존재 여부 확인 및 이벤트 리스너 연결
  if (elements.loginBtn) {
    elements.loginBtn.addEventListener("click", handleLogin);
  }
  if (elements.signupBtn) {
    elements.signupBtn.addEventListener("click", handleSignup);
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", handleLogout);
  }
  if (elements.googleLoginBtn) {
    elements.googleLoginBtn.addEventListener("click", handleGoogleLogin);
  }
  if (elements.fullModeBtn) {
    elements.fullModeBtn.addEventListener("click", () => startMode("full"));
  }
  if (elements.randomModeBtn) {
    elements.randomModeBtn.addEventListener("click", () => startMode("random"));
  }
  if (elements.backToModeBtn) {
    elements.backToModeBtn.addEventListener("click", showModeSelector);
  }
  if (elements.revealBtn) {
    elements.revealBtn.addEventListener("click", revealHandler);
  }
  if (elements.correctBtn) {
    elements.correctBtn.addEventListener("click", () => storeAnswer(true));
  }
  if (elements.wrongBtn) {
    elements.wrongBtn.addEventListener("click", () => storeAnswer(false));
  }
  if (elements.prevBtn) {
    elements.prevBtn.addEventListener("click", () => move(-1));
  }
  if (elements.nextBtn) {
    elements.nextBtn.addEventListener("click", () => move(1));
  }
  if (elements.resetStatsBtn) {
    elements.resetStatsBtn.addEventListener("click", resetStats);
  }

  // 키보드 이벤트
  document.addEventListener("keydown", (e) => {
    if (modeSelectorEl && modeSelectorEl.style.display === "none") {
      // 학습 모드일 때만 키보드 이벤트 처리
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    }
  });

  // 스와이프 이벤트 추가
  const cardElement = document.getElementById("card");
  if (cardElement) {
    cardElement.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    cardElement.addEventListener("touchend", handleTouchEnd, { passive: true });
  }
}

// ⑤ 모드 관련 함수 -----------------------------------
function showModeSelector() {
  authContainerEl.style.display = "none";
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

async function storeAnswer(isCorrect) {
  if (!currentUser) return;

  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const wordRef = userRef.collection('words').doc(words[idx].number.toString());
    
    await wordRef.set({
      word: words[idx].english_word,
      isCorrect: isCorrect,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      mode: currentMode
    });

    // 통계 업데이트
    const statsRef = userRef.collection('stats').doc(currentMode);
    await statsRef.set({
      correct: firebase.firestore.FieldValue.increment(isCorrect ? 1 : 0),
      wrong: firebase.firestore.FieldValue.increment(isCorrect ? 0 : 1)
    }, { merge: true });

    updateStats();
    move(1);
  } catch (error) {
    console.error("학습 기록 저장 오류:", error);
  }
}

function move(delta) {
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= words.length) return;
  idx = newIdx;
  renderCard();
}

// 통계 계산 및 표시 (모드별 구분)
async function updateStats() {
  if (!currentUser) return;

  try {
    const statsRef = db.collection('users').doc(currentUser.uid)
      .collection('stats').doc(currentMode);
    const doc = await statsRef.get();
    
    if (doc.exists) {
      const stats = doc.data();
      statsCorrectEl.textContent = `맞춤: ${stats.correct || 0}`;
      statsWrongEl.textContent = `틀림: ${stats.wrong || 0}`;
      const total = (stats.correct || 0) + (stats.wrong || 0);
      const progress = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
      statsTotalEl.textContent = `진행: ${progress}%`;
    }
  } catch (error) {
    console.error("통계 업데이트 오류:", error);
  }
}

// 통계 초기화 (모드별 구분)
async function resetStats() {
  if (!currentUser) return;

  try {
    const statsRef = db.collection('users').doc(currentUser.uid)
      .collection('stats').doc(currentMode);
    await statsRef.set({
      correct: 0,
      wrong: 0
    });
    updateStats();
  } catch (error) {
    console.error("통계 초기화 오류:", error);
  }
}

// 인증 관련 함수들
async function handleLogin() {
  const email = emailEl.value;
  const password = passwordEl.value;

  try {
    showLoading();
    await firebase.auth().signInWithEmailAndPassword(email, password);
    authErrorEl.textContent = "";
  } catch (error) {
    console.error("로그인 오류:", error);
    authErrorEl.textContent = "로그인에 실패했습니다: " + error.message;
  } finally {
    hideLoading();
  }
}

async function handleSignup() {
  const email = emailEl.value;
  const password = passwordEl.value;

  try {
    showLoading();
    await firebase.auth().createUserWithEmailAndPassword(email, password);
    authErrorEl.textContent = "";
  } catch (error) {
    console.error("회원가입 오류:", error);
    authErrorEl.textContent = "회원가입에 실패했습니다: " + error.message;
  } finally {
    hideLoading();
  }
}

async function handleLogout() {
  try {
    await firebase.auth().signOut();
  } catch (error) {
    console.error("로그아웃 오류:", error);
  }
}

async function handleGoogleLogin() {
  try {
    showLoading();
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // 팝업 차단 확인
    const popup = await firebase.auth().signInWithPopup(provider);
    if (!popup) {
      throw new Error("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
    }
    
    console.log("Google 로그인 성공:", popup.user);
    authErrorEl.textContent = "";
  } catch (error) {
    console.error("구글 로그인 오류:", error);
    let errorMessage = "구글 로그인에 실패했습니다: ";
    
    switch (error.code) {
      case 'auth/popup-blocked':
        errorMessage += "팝업이 차단되었습니다. 팝업 차단을 해제해주세요.";
        break;
      case 'auth/popup-closed-by-user':
        errorMessage += "로그인 창이 닫혔습니다. 다시 시도해주세요.";
        break;
      case 'auth/cancelled-popup-request':
        errorMessage += "로그인이 취소되었습니다.";
        break;
      case 'auth/network-request-failed':
        errorMessage += "네트워크 연결을 확인해주세요.";
        break;
      default:
        errorMessage += error.message;
    }
    
    authErrorEl.textContent = errorMessage;
  } finally {
    hideLoading();
  }
}

// 화면 전환 함수들
function showAuthContainer() {
  authContainerEl.style.display = "block";
  modeSelectorEl.style.display = "none";
  studyContainerEl.style.display = "none";
}

// 사용자 데이터 관련 함수들
async function loadUserData() {
  if (!currentUser) return;

  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const doc = await userRef.get();
    
    if (!doc.exists) {
      // 새 사용자 데이터 생성
      await userRef.set({
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        stats: {
          full: { correct: 0, wrong: 0 },
          random: { correct: 0, wrong: 0 }
        }
      });
    }
  } catch (error) {
    console.error("사용자 데이터 로드 오류:", error);
  }
}
