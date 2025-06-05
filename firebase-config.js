// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCvh38JVaE687a_LMgp-nCayysEf49HPG8",
  authDomain: "my-flash-card-app-for-test.firebaseapp.com",
  projectId: "my-flash-card-app-for-test",
  storageBucket: "my-flash-card-app-for-test.firebasestorage.app",
  messagingSenderId: "373301073843",
  appId: "1:373301073843:web:1571e9f59ce1c4de145dc6",
  measurementId: "G-FK1PXGW3RK"
};


// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); 