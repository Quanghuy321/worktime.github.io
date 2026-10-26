// ============================================================
// WORKTIME - FIREBASE CONFIGURATION
// ============================================================

// ============================================================
// 1. FIREBASE CONFIG
// ============================================================
// THAY các giá trị bên dưới bằng Firebase Config của project
// của bạn lấy từ Firebase Console.
//
// Firebase Console
// -> Project settings
// -> Your apps
// -> Web app
// -> SDK setup and configuration
// -> Config
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAM7SnwEg9LrirOmv_ORhXLDEKvETIe-8Q",
  authDomain: "chamcong1-57c90.firebaseapp.com",
  databaseURL: "https://chamcong1-57c90-default-rtdb.firebaseio.com",
  projectId: "chamcong1-57c90",
  storageBucket: "chamcong1-57c90.firebasestorage.app",
  messagingSenderId: "9357913722",
  appId: "1:9357913722:web:93974bb5acd25f73fa95c3",
  measurementId: "G-ZYCVR1699M"
};


// ============================================================
// 2. KHỞI TẠO FIREBASE
// ============================================================

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}


// ============================================================
// 3. FIREBASE AUTHENTICATION
// ============================================================

const workTimeAuth = firebase.auth();


// ============================================================
// 4. TẮT PERSISTENCE
// ============================================================
// Không lưu phiên đăng nhập khi người dùng reload trang.
// Khi mở lại trang sẽ yêu cầu đăng nhập lại.
// ============================================================

const persistenceReady =
    workTimeAuth
        .setPersistence(firebase.auth.Auth.Persistence.NONE)
        .catch(function (error) {

            console.error(
                "Không thể thiết lập Firebase Auth Persistence:",
                error
            );

        });


// ============================================================
// 5. FIREBASE DATABASE
// ============================================================

const workTimeDatabase = firebase.database();


// ============================================================
// 6. FIREBASE STORAGE
// ============================================================

const workTimeStorage = firebase.storage();


// ============================================================
// 7. EXPORT FIREBASE SERVICES
// ============================================================
// app.js sẽ lấy Firebase từ window.workTimeFirebase
// ============================================================

window.workTimeFirebase = {

    app: firebase.app(),

    auth: workTimeAuth,

    database: workTimeDatabase,

    storage: workTimeStorage,

    persistenceReady: persistenceReady

};


// ============================================================
// 8. DEBUG
// ============================================================

console.log("======================================");
console.log("WORKTIME FIREBASE");
console.log("======================================");
console.log("Firebase App:", window.workTimeFirebase.app);
console.log("Firebase Auth:", window.workTimeFirebase.auth);
console.log(
    "Firebase Database:",
    window.workTimeFirebase.database
);
console.log(
    "Firebase Storage:",
    window.workTimeFirebase.storage
);
console.log("======================================");