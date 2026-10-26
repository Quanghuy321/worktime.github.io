"use strict";

/* =====================================================

   CA NGÀY: 06:00 - 18:00
   CA ĐÊM: 18:00 - 06:00
===================================================== */


/* =====================================================
   BIẾN TOÀN CỤC
===================================================== */

let auth = null;
let db = null;
let storage = null;

let currentUser = null;
let currentProfile = null;

/*
 * LUÔN MỞ Ở DASHBOARD SAU KHI ĐĂNG NHẬP
 */
let currentPage = "dashboard";

let attendanceListener = null;


/* =====================================================
   AVATAR MẶC ĐỊNH
===================================================== */

const DEFAULT_AVATAR =
    "https://ui-avatars.com/api/?name=User&background=2563eb&color=ffffff&size=200";


/* =====================================================
   HÀM LẤY ELEMENT
===================================================== */

function $(id) {
    return document.getElementById(id);
}


/* =====================================================
   HIỆN / ẨN
===================================================== */

function show(element) {
    if (element) {
        element.classList.remove("hidden");
    }
}

function hide(element) {
    if (element) {
        element.classList.add("hidden");
    }
}


// =====================================================
// KHỞI ĐỘNG APP
// CODE MỚI
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);


async function initializeApp() {

    console.log(
        "WorkTime đang khởi động..."
    );


    // =================================================
    // KIỂM TRA FIREBASE
    // =================================================

    if (
        !window.workTimeFirebase ||
        !window.workTimeFirebase.auth ||
        !window.workTimeFirebase.database ||
        !window.workTimeFirebase.storage
    ) {

        console.error(
            "Firebase chưa được cấu hình."
        );

        hide(
            $("loadingScreen")
        );

        show(
            $("authSection")
        );

        showError(
            "loginError",
            "Không thể kết nối Firebase. Kiểm tra firebase-config.js."
        );

        setupBasicEvents();

        return;
    }


    // =================================================
    // LẤY FIREBASE SERVICE
    // =================================================

    auth =
        window.workTimeFirebase.auth;

    db =
        window.workTimeFirebase.database;

    storage =
        window.workTimeFirebase.storage;


    // =================================================
    // CHỜ FIREBASE SET PERSISTENCE
    // =================================================

    try {

        if (
            window.workTimeFirebase.persistenceReady
        ) {

            await window.workTimeFirebase
                .persistenceReady;
        }


    } catch (error) {

        console.warn(
            "Không thể xóa phiên Firebase cũ:",
            error
        );
    }


    // =================================================
    // EVENT
    // =================================================

    setupBasicEvents();

    setupNavigation();

    setupPasswordToggle();

    setupDateInputs();

    setupRealtimeAuth();


    // =================================================
    // ẨN LOADING
    // =================================================

    hide(
        $("loadingScreen")
    );


    console.log(
        "WorkTime đã khởi động thành công."
    );
}

/* =====================================================
   SỰ KIỆN CƠ BẢN
===================================================== */

function setupBasicEvents() {

    const loginForm =
        $("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    const registerForm =
        $("registerForm");

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            handleRegister
        );
    }


    const showRegisterBtn =
        $("showRegisterBtn");

    if (showRegisterBtn) {

        showRegisterBtn.addEventListener(
            "click",
            showRegister
        );
    }


    const showLoginBtn =
        $("showLoginBtn");

    if (showLoginBtn) {

        showLoginBtn.addEventListener(
            "click",
            showLogin
        );
    }


    const logoutBtn =
        $("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );
    }


    const mobileLogoutBtn =
        $("mobileLogoutBtn");

    if (mobileLogoutBtn) {

        mobileLogoutBtn.addEventListener(
            "click",
            logout
        );
    }


    const mobileMenuBtn =
        $("mobileMenuBtn");

    if (mobileMenuBtn) {

        mobileMenuBtn.addEventListener(
            "click",
            toggleMobileSidebar
        );
    }


    const sidebarOverlay =
        $("sidebarOverlay");

    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeMobileSidebar
        );
    }


    const checkInBtn =
        $("checkInBtn");

    if (checkInBtn) {

        checkInBtn.addEventListener(
            "click",
            checkIn
        );
    }


    const checkOutBtn =
        $("checkOutBtn");

    if (checkOutBtn) {

        checkOutBtn.addEventListener(
            "click",
            checkOut
        );
    }


    const attendanceShiftSelect =
        $("attendanceShiftSelect");

    if (attendanceShiftSelect) {

        attendanceShiftSelect.addEventListener(
            "change",
            function () {

                updateShiftUI();
                updateShiftWarningState();

                loadTodayAttendance();

                startAttendanceListener();
            }
        );
    }


    const historyFilterBtn =
        $("historyFilterBtn");

    if (historyFilterBtn) {

        historyFilterBtn.addEventListener(
            "click",
            loadHistory
        );
    }


    const leaveForm =
        $("leaveForm");

    if (leaveForm) {

        leaveForm.addEventListener(
            "submit",
            submitLeave
        );
    }


    const profileForm =
        $("profileForm");

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            saveProfile
        );
    }


    const imageInput =
        $("imageInput");

    if (imageInput) {

        imageInput.addEventListener(
            "change",
            uploadAvatar
        );
    }


    const adminAttendanceFilterBtn =
        $("adminAttendanceFilterBtn");

    if (adminAttendanceFilterBtn) {

        adminAttendanceFilterBtn.addEventListener(
            "click",
            loadAdminAttendance
        );
    }


    const adminLeaveStatusFilter =
        $("adminLeaveStatusFilter");

    if (adminLeaveStatusFilter) {

        adminLeaveStatusFilter.addEventListener(
            "change",
            loadAdminLeaves
        );
    }


    const employeeSearch =
        $("employeeSearch");

    if (employeeSearch) {

        employeeSearch.addEventListener(
            "input",
            loadEmployees
        );
    }
}


/* =====================================================
   FIREBASE AUTH
===================================================== */

function setupRealtimeAuth() {

    if (!auth) {
        showAuth();
        return;
    }

    auth.onAuthStateChanged(
        async function (user) {

            try {

                /*
                 * KHÔNG CÓ USER
                 * => luôn hiện màn hình đăng nhập
                 */
                if (!user) {

                    currentUser = null;
                    currentProfile = null;

                    stopAttendanceListener();

                    currentPage = "dashboard";

                    showAuth();

                    return;
                }


                /*
                 * CÓ USER
                 */
                currentUser = user;

                await loadUserProfile();

            } catch (error) {

                console.error(
                    "Auth error:",
                    error
                );

                currentUser = null;
                currentProfile = null;

                stopAttendanceListener();

                showAuth();

                showToast(
                    "Không thể tải thông tin tài khoản.",
                    "error"
                );
            }
        }
    );
}


/* =====================================================
   AUTH UI
===================================================== */

function showAuth() {

    hide($("appSection"));

    show($("authSection"));

    showLogin();

    closeMobileSidebar();
}


function showApp() {
    hide($("authSection"));
    show($("appSection"));

    updateHeaderDate();

    // LUÔN LUÔN mở Dashboard sau khi đăng nhập
    currentPage = "dashboard";

    document.querySelectorAll(".page-content").forEach(function (page) {
        page.classList.remove("active-page");
    });

    const dashboard = $("page-dashboard");

    if (dashboard) {
        dashboard.classList.add("active-page");
    }

    document.querySelectorAll(".nav-item").forEach(function (item) {
        item.classList.remove("active");

        if (item.dataset.page === "dashboard") {
            item.classList.add("active");
        }
    });

    updatePageHeader("dashboard");
}


function showRegister() {

    hide($("loginFormContainer"));

    show($("registerFormContainer"));

    clearError("loginError");

    clearError("registerError");
}


function showLogin() {

    hide($("registerFormContainer"));

    show($("loginFormContainer"));

    clearError("loginError");

    clearError("registerError");
}


/* =====================================================
   ĐĂNG NHẬP
===================================================== */

async function handleLogin(event) {

    event.preventDefault();

    clearError("loginError");

    if (!auth) {

        showError(
            "loginError",
            "Firebase chưa được kết nối."
        );

        return;
    }


    const email =
        $("loginEmail")?.value.trim();

    const password =
        $("loginPassword")?.value;


    if (!email || !password) {

        showError(
            "loginError",
            "Vui lòng nhập email và mật khẩu."
        );

        return;
    }


    const button =
        $("loginBtn");


    setButtonLoading(
        button,
        true,
        "Đang đăng nhập..."
    );


    try {

        /*
         * Đăng nhập bình thường.
         *
         * Persistence đã được đặt là NONE
         * trong firebase-config.js
         */
        await auth.signInWithEmailAndPassword(
            email,
            password
        );


        /*
         * Chỉ nhớ EMAIL nếu người dùng tick.
         *
         * Không lưu mật khẩu.
         */
        const remember =
            $("rememberLogin")?.checked;


        if (remember) {

            localStorage.setItem(
                "worktime_remember_email",
                email
            );

        } else {

            localStorage.removeItem(
                "worktime_remember_email"
            );
        }


        showToast(
            "Đăng nhập thành công.",
            "success"
        );


    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showError(
            "loginError",
            getFirebaseErrorMessage(error)
        );


    } finally {

        setButtonLoading(
            button,
            false,
            "Đăng nhập"
        );
    }
}


/* =====================================================
   ĐĂNG KÝ
===================================================== */

async function handleRegister(event) {

    event.preventDefault();

    clearError("registerError");


    if (!auth || !db) {

        showError(
            "registerError",
            "Firebase chưa được kết nối."
        );

        return;
    }


    const name =
        $("registerName")?.value.trim();


    const email =
        $("registerEmail")?.value.trim();


    const phone =
        $("registerPhone")?.value.trim();


    const department =
        $("registerDepartment")?.value ||
        "OTHER";


    const position =
        $("registerPosition")?.value.trim() ||
        "Nhân viên";


    const shift =
        $("registerShift")?.value ||
        "day";


    const password =
        $("registerPassword")?.value;


    const confirmPassword =
        $("registerPasswordConfirm")?.value;


    if (!name || !email || !password) {

        showError(
            "registerError",
            "Vui lòng nhập đầy đủ thông tin."
        );

        return;
    }


    if (password.length < 6) {

        showError(
            "registerError",
            "Mật khẩu phải có ít nhất 6 ký tự."
        );

        return;
    }


    if (password !== confirmPassword) {

        showError(
            "registerError",
            "Mật khẩu nhập lại không khớp."
        );

        return;
    }


    const button =
        $("registerBtn");


    setButtonLoading(
        button,
        true,
        "Đang tạo tài khoản..."
    );


    try {

        const result =
            await auth.createUserWithEmailAndPassword(
                email,
                password
            );


        const user =
            result.user;


        const profile = {

            uid:
                user.uid,

            name:
                name,

            email:
                email,

            phone:
                phone,

            department:
                department,

            position:
                position,

            role:
                "employee",

            shift:
                shift,

            status:
                "active",

            profileImage:
                "",

            createdAt:
                firebase.database.ServerValue.TIMESTAMP,

            updatedAt:
                firebase.database.ServerValue.TIMESTAMP
        };


        await db
            .ref(
                "users/" +
                user.uid
            )
            .set(profile);


        localStorage.setItem(
            "worktime_remember_email",
            email
        );


        await auth.signOut();


        showLogin();


        if ($("loginEmail")) {

            $("loginEmail").value =
                email;
        }


        showToast(
            "Đăng ký thành công. Vui lòng đăng nhập.",
            "success"
        );


    } catch (error) {

        console.error(
            "Register error:",
            error
        );

        showError(
            "registerError",
            getFirebaseErrorMessage(error)
        );

    } finally {

        setButtonLoading(
            button,
            false,
            "Tạo tài khoản"
        );
    }
}


/* =====================================================
   LOAD PROFILE
===================================================== */

async function loadUserProfile() {

    if (
        !currentUser ||
        !db
    ) {

        showAuth();

        return;
    }


    try {

        const snapshot =
            await db
                .ref(
                    "users/" +
                    currentUser.uid
                )
                .once("value");


        let profile =
            snapshot.val();


        if (!profile) {

            profile = {

                uid:
                    currentUser.uid,

                name:
                    currentUser.displayName ||
                    (
                        currentUser.email ||
                        "User"
                    ).split("@")[0],

                email:
                    currentUser.email || "",

                phone:
                    "",

                department:
                    "OTHER",

                position:
                    "Nhân viên",

                role:
                    "employee",

                shift:
                    "day",

                status:
                    "active",

                profileImage:
                    "",

                createdAt:
                    firebase.database.ServerValue.TIMESTAMP,

                updatedAt:
                    firebase.database.ServerValue.TIMESTAMP
            };


            await db
                .ref(
                    "users/" +
                    currentUser.uid
                )
                .set(profile);
        }


        currentProfile =
            profile;


        if (
            profile.status === "locked"
        ) {

            await auth.signOut();

            showAuth();

            showError(
                "loginError",
                "Tài khoản đã bị khóa."
            );

            return;
        }


        if (
            profile.status === "inactive"
        ) {

            await auth.signOut();

            showAuth();

            showError(
                "loginError",
                "Tài khoản hiện không hoạt động."
            );

            return;
        }


        if (
            profile.status === "deleted"
        ) {

            await auth.signOut();

            showAuth();

            showError(
                "loginError",
                "Tài khoản không còn tồn tại."
            );

            return;
        }


        updateUserInterface();

        showApp();

        startAttendanceListener();

        await refreshCurrentPage();


    } catch (error) {

        console.error(
            "Load profile error:",
            error
        );

        showAuth();

        showError(
            "loginError",
            "Không thể tải hồ sơ. Kiểm tra Firebase Database Rules."
        );
    }
}


/* =====================================================
   UPDATE GIAO DIỆN USER
===================================================== */

function updateUserInterface() {

    if (
        !currentUser ||
        !currentProfile
    ) {
        return;
    }


    const name =
        currentProfile.name ||
        currentUser.email ||
        "User";


    const role =
        currentProfile.role ||
        "employee";


    const avatar =
        currentProfile.profileImage ||
        createAvatar(name);


    setText(
        "sidebarName",
        name
    );


    setText(
        "sidebarRole",
        roleText(role)
    );


    setImage(
        "sidebarAvatar",
        avatar
    );


    setText(
        "dashboardName",
        name
    );


    setText(
        "dashboardProfileName",
        name
    );


    setText(
        "dashboardProfileDepartment",
        departmentText(
            currentProfile.department
        )
    );


    setText(
        "dashboardProfilePosition",
        currentProfile.position ||
        "Nhân viên"
    );


    setImage(
        "dashboardAvatar",
        avatar
    );


    setImage(
        "profileImage",
        avatar
    );


    setText(
        "profileDisplayName",
        name
    );


    setText(
        "profileDisplayEmail",
        currentUser.email || ""
    );


    setValue(
        "profileName",
        currentProfile.name || ""
    );


    setValue(
        "profileEmail",
        currentUser.email || ""
    );


    setValue(
        "profilePhone",
        currentProfile.phone || ""
    );


    setValue(
        "profileDepartment",
        currentProfile.department || "OTHER"
    );


    setValue(
        "profilePosition",
        currentProfile.position || ""
    );


    setValue(
        "profileRole",
        roleText(role)
    );


    updateShiftUI();


    const admin =
        role === "admin" ||
        role === "superadmin";


    if (admin) {

        show($("adminMenu"));

    } else {

        hide($("adminMenu"));
    }
}


/* =====================================================
   NAVIGATION
===================================================== */

function setupNavigation() {

    document
        .querySelectorAll("[data-page]")
        .forEach(function (element) {

            element.addEventListener(
                "click",
                function () {

                    const page =
                        this.dataset.page;


                    if (!page) {
                        return;
                    }


                    navigate(page);
                }
            );
        });
}


function navigate(page) {

    if (!currentUser) {

        showAuth();

        return;
    }


    const adminPages = [
        "admin",
        "employees",
        "adminAttendance",
        "adminPayroll",
        "adminLeave"
    ];


    if (
        adminPages.includes(page) &&
        !isAdmin()
    ) {

        showToast(
            "Bạn không có quyền truy cập.",
            "error"
        );

        page =
            "dashboard";
    }


    document
        .querySelectorAll(".page-content")
        .forEach(function (element) {

            element.classList.remove(
                "active-page"
            );
        });


    const target =
        $("page-" + page);


    if (!target) {

        console.error(
            "Không tìm thấy page:",
            page
        );

        return;
    }


    target.classList.add(
        "active-page"
    );


    document
        .querySelectorAll(".nav-item")
        .forEach(function (item) {

            item.classList.toggle(
                "active",
                item.dataset.page === page
            );
        });


    currentPage =
        page;


    updatePageHeader(page);

    closeMobileSidebar();

    updateShiftWarningState();
    refreshCurrentPage();
}


/* =====================================================
   REFRESH PAGE
===================================================== */

async function refreshCurrentPage() {

    switch (currentPage) {

        case "dashboard":

            await loadDashboard();

            break;


        case "attendance":

            await loadTodayAttendance();

            break;


        case "history":

            await loadHistory();

            break;


        case "leave":

            await loadMyLeaves();

            break;


        case "profile":

            updateUserInterface();

            break;


        case "admin":

            await loadAdminDashboard();

            break;


        case "employees":

            await loadEmployees();

            break;


        case "adminAttendance":

            await loadAdminAttendance();

            break;


        case "adminPayroll":

            await loadAdminMonthlyPayroll();

            break;


        case "adminLeave":

            await loadAdminLeaves();

            break;


        default:

            break;
    }
}


/* =====================================================
   PAGE HEADER
===================================================== */

function updatePageHeader(page) {

    const titles = {

        dashboard: [
            "Dashboard",
            "Tổng quan công việc hôm nay"
        ],

        attendance: [
            "Chấm công",
            "Theo dõi thời gian làm việc"
        ],

        history: [
            "Lịch sử",
            "Lịch sử chấm công"
        ],

        leave: [
            "Nghỉ phép",
            "Quản lý yêu cầu nghỉ phép"
        ],

        profile: [
            "Hồ sơ",
            "Thông tin tài khoản"
        ],

        admin: [
            "Quản trị",
            "Tổng quan hệ thống"
        ],

        employees: [
            "Nhân viên",
            "Quản lý nhân viên"
        ],

        adminAttendance: [
            "Chấm công nhân viên",
            "Theo dõi chấm công"
        ],

        adminPayroll: [
            "Chấm công & Lương tháng",
            "Tổng hợp ngày công, giờ làm và lương theo tháng"
        ],

        adminLeave: [
            "Duyệt nghỉ phép",
            "Quản lý yêu cầu nghỉ phép"
        ]
    };


    const data =
        titles[page] ||
        titles.dashboard;


    setText(
        "pageTitle",
        data[0]
    );


    setText(
        "pageSubtitle",
        data[1]
    );
}


/* =====================================================
   CA LÀM VIỆC
===================================================== */

function getShiftInfo() {

    const shift =
        currentProfile?.shift ||
        "day";


    if (shift === "night") {

        return {

            key:
                "night",

            name:
                "Ca đêm",

            time:
                "18:00 - 06:00"
        };
    }


    return {

        key:
            "day",

        name:
            "Ca ngày",

        time:
            "06:00 - 18:00"
    };
}


function updateShiftUI() {

    const attendanceShiftSelect =
        $("attendanceShiftSelect");

    const shift =
        getAttendanceShiftInfo();


    if (attendanceShiftSelect) {

        attendanceShiftSelect.value =
            shift.key;

        attendanceShiftSelect.disabled =
            true;

        attendanceShiftSelect.title =
            "Ca được tính tự động theo giờ hệ thống.";
    }


    setText(
        "dashboardShift",
        shift.name
    );


    setText(
        "dashboardShiftTime",
        shift.time
    );


    setText(
        "attendanceShift",
        shift.name
    );


    setText(
        "attendanceShiftTime",
        shift.time
    );
}


function getAttendanceShiftInfo(date = new Date()) {

    const hour =
        date.getHours();


    if (hour >= 6 && hour < 18) {

        return {
            key: "day",
            name: "Ca ngày",
            time: "06:00 - 18:00"
        };
    }


    return {
        key: "night",
        name: "Ca đêm",
        time: "18:00 - 06:00"
    };
}


function getAttendanceRecordKey(dateKey, shiftKey) {

    return dateKey + "_" + shiftKey;
}


function getAttendanceRef(dateKey, shiftKey) {

    return db.ref(
        "attendance/" +
        currentUser.uid +
        "/" +
        getAttendanceRecordKey(dateKey, shiftKey)
    );
}


function getLegacyAttendanceRef(dateKey) {

    return db.ref(
        "attendance/" +
        currentUser.uid +
        "/" +
        dateKey
    );
}


/* =====================================================
   NGÀY CHẤM CÔNG
===================================================== */

function getAttendanceDateKey(
    date = new Date()
) {

    const hour =
        date.getHours();


    if (
        hour >= 0 &&
        hour < 6
    ) {

        const previous =
            new Date(date);


        previous.setDate(
            previous.getDate() - 1
        );


        return formatDateKey(
            previous
        );
    }


    return formatDateKey(date);
}


function isShiftTimeAllowed(
    shiftKey,
    date = new Date()
) {

    const hour =
        date.getHours();


    if (shiftKey === "night") {

        return hour >= 18 || hour < 6;
    }


    return hour >= 6 && hour < 18;
}


function getShiftTimeErrorMessage(
    shiftKey
) {

    if (shiftKey === "night") {

        return "Ca đêm chỉ được chấm công từ 18:00.";
    }


    return "Ca ngày chỉ được chấm công từ 06:00 đến trước 18:00.";
}


function updateShiftWarningState() {

    const shift =
        getAttendanceShiftInfo();

    const warning =
        $("attendanceShiftWarning");

    const activeLabel =
        $("attendanceActiveShift");


    if (warning) {

        warning.textContent = "";
        warning.style.display = "none";
    }


    if (activeLabel) {

        activeLabel.textContent =
            shift.name + " đang hoạt động";
    }
}


/* =====================================================
   CHECK IN
===================================================== */

async function checkIn() {

    if (
        !currentUser ||
        !db
    ) {
        return;
    }


    const dateKey =
        getAttendanceDateKey();


    const shift =
        getAttendanceShiftInfo();


    if (!isShiftTimeAllowed(shift.key)) {

        showToast(
            getShiftTimeErrorMessage(shift.key),
            "error"
        );

        return;
    }


    const ref =
        getAttendanceRef(dateKey, shift.key);

    let activeRef =
        ref;


    try {

        const snapshot =
            await ref.once("value");


        let existing =
            snapshot.val();


        if (!existing && shift.key === "day") {

            activeRef =
                getLegacyAttendanceRef(dateKey);

            existing =
                (await activeRef.once("value"))
                    .val();
        }


        if (
            existing &&
            existing.checkIn
        ) {

            showToast(
                "Bạn đã chấm công vào.",
                "info"
            );

            return;
        }


        const data = {

            uid:
                currentUser.uid,

            name:
                currentProfile?.name || "",

            email:
                currentUser.email || "",

            date:
                dateKey,

            shift:
                shift.key,

            shiftName:
                shift.name,

            checkIn:
                firebase.database.ServerValue.TIMESTAMP,

            checkInText:
                getCurrentTime(),

            updatedAt:
                firebase.database.ServerValue.TIMESTAMP
        };


        await ref.update(
            data
        );


        showToast(
            "Chấm công vào thành công.",
            "success"
        );


        await loadTodayAttendance();


    } catch (error) {

        console.error(
            "Check in error:",
            error
        );

        showToast(
            getFirebaseErrorMessage(error),
            "error"
        );
    }
}


/* =====================================================
   CHECK OUT
===================================================== */

async function checkOut() {

    if (
        !currentUser ||
        !db
    ) {
        return;
    }


    const dateKey =
        getAttendanceDateKey();


    const shift =
        getAttendanceShiftInfo();


    if (!isShiftTimeAllowed(shift.key)) {

        showToast(
            getShiftTimeErrorMessage(shift.key),
            "error"
        );

        return;
    }


    const ref =
        getAttendanceRef(dateKey, shift.key);

    let activeRef =
        ref;


    try {

        const snapshot =
            await ref.once("value");


        let existing =
            snapshot.val();


        if (!existing && shift.key === "day") {

            activeRef =
                getLegacyAttendanceRef(dateKey);

            existing =
                (await activeRef.once("value"))
                    .val();
        }


        if (
            !existing ||
            !existing.checkIn
        ) {

            showToast(
                "Bạn chưa chấm công vào.",
                "error"
            );

            return;
        }


        if (existing.checkOut) {

            showToast(
                "Bạn đã chấm công ra.",
                "info"
            );

            return;
        }


        await activeRef.update({

            checkOut:
                firebase.database.ServerValue.TIMESTAMP,

            checkOutText:
                getCurrentTime(),

            updatedAt:
                firebase.database.ServerValue.TIMESTAMP
        });


        showToast(
            "Chấm công ra thành công.",
            "success"
        );


        await loadTodayAttendance();


    } catch (error) {

        console.error(
            "Check out error:",
            error
        );

        showToast(
            getFirebaseErrorMessage(error),
            "error"
        );
    }
}


/* =====================================================
   LOAD CHẤM CÔNG HÔM NAY
===================================================== */

async function loadTodayAttendance() {

    if (
        !currentUser ||
        !db
    ) {
        return;
    }


    const dateKey =
        getAttendanceDateKey();

    const shift =
        getAttendanceShiftInfo();


    try {

        let snapshot = null;

        let data = null;


        if (shift.key === "night") {

            snapshot =
                await db
                    .ref("attendance/" + currentUser.uid + "/" +
                        getAttendanceRecordKey(dateKey, "night"))
                    .once("value");

            data =
                snapshot.val();

        } else {

            snapshot =
                await db
                    .ref("attendance/" + currentUser.uid + "/" +
                        getAttendanceRecordKey(dateKey, "day"))
                    .once("value");

            data =
                snapshot.val();


            if (!data) {

                snapshot =
                    await getLegacyAttendanceRef(dateKey).once("value");

                data =
                    snapshot.val();
            }
        }


        const checkIn =
            data?.checkInText ||
            "--";


        const checkOut =
            data?.checkOutText ||
            "--";


        setText(
            "attendanceCheckIn",
            checkIn
        );


        setText(
            "attendanceCheckOut",
            checkOut
        );


        setText(
            "dashboardCheckIn",
            checkIn
        );


        setText(
            "dashboardCheckOut",
            checkOut
        );


        let status =
            "Chưa chấm công";


        if (
            data?.checkIn &&
            !data?.checkOut
        ) {

            status =
                "Đang làm việc";

        } else if (
            data?.checkIn &&
            data?.checkOut
        ) {

            status =
                "Đã hoàn thành";
        }


        setText(
            "dashboardAttendanceStatus",
            status
        );


        const checkInButton =
            $("checkInBtn");


        const checkOutButton =
            $("checkOutBtn");


        if (checkInButton) {

            const canCheckIn =
                !data?.checkIn &&
                isShiftTimeAllowed(shift.key);

            checkInButton.disabled =
                !canCheckIn;

            checkInButton.style.opacity =
                canCheckIn ? "1" : "0.4";

            checkInButton.style.cursor =
                canCheckIn ? "pointer" : "not-allowed";
        }


        if (checkOutButton) {

            const canCheckOut =
                !!data?.checkIn &&
                !data?.checkOut;

            checkOutButton.disabled =
                !canCheckOut;

            checkOutButton.style.opacity =
                canCheckOut ? "1" : "0.4";

            checkOutButton.style.cursor =
                canCheckOut ? "pointer" : "not-allowed";
        }


    } catch (error) {

        console.error(
            "Load attendance error:",
            error
        );
    }
}


/* =====================================================
   REALTIME CHẤM CÔNG
===================================================== */

function startAttendanceListener() {

    if (
        !currentUser ||
        !db
    ) {
        return;
    }


    stopAttendanceListener();


    const dateKey =
        getAttendanceDateKey();


    const shift =
        getAttendanceShiftInfo();

    const ref =
        getAttendanceRef(dateKey, shift.key);


    attendanceListener =
        function (snapshot) {

            const data =
                snapshot.val();


            setText(
                "attendanceCheckIn",
                data?.checkInText || "--"
            );


            setText(
                "attendanceCheckOut",
                data?.checkOutText || "--"
            );


            setText(
                "dashboardCheckIn",
                data?.checkInText || "--"
            );


            setText(
                "dashboardCheckOut",
                data?.checkOutText || "--"
            );
        };


    ref.on(
        "value",
        attendanceListener
    );
}


function stopAttendanceListener() {

    attendanceListener =
        null;
}


/* =====================================================
   DASHBOARD
===================================================== */

async function loadDashboard() {

    await loadTodayAttendance();

    await loadMonthlyAttendanceCount();
}


async function loadMonthlyAttendanceCount() {

    if (
        !currentUser ||
        !db
    ) {
        return;
    }


    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    try {

        const snapshot =
            await db
                .ref(
                    "attendance/" +
                    currentUser.uid
                )
                .once("value");


        const data =
            snapshot.val() || {};


        let count =
            0;


        Object.keys(data)
            .forEach(function (key) {

                if (
                    key.startsWith(
                        year + "-" + month
                    )
                ) {

                    if (
                        data[key]?.checkIn
                    ) {

                        count++;
                    }
                }
            });


        setText(
            "dashboardMonthDays",
            count
        );


    } catch (error) {

        console.error(
            "Monthly attendance error:",
            error
        );
    }
}


/* =====================================================
   LỊCH SỬ
===================================================== */

async function loadHistory() {

    if (
        !currentUser ||
        !db
    ) {
        return;
    }


    const tbody =
        $("historyTableBody");


    if (!tbody) {
        return;
    }


    let month =
        $("historyMonth")?.value;


    if (!month) {

        const now =
            new Date();


        month =
            now.getFullYear() +
            "-" +
            String(
                now.getMonth() + 1
            ).padStart(
                2,
                "0"
            );
    }


    tbody.innerHTML =
        loadingRow(
            5,
            "Đang tải..."
        );


    try {

        const snapshot =
            await db
                .ref(
                    "attendance/" +
                    currentUser.uid
                )
                .once("value");


        const data =
            snapshot.val() || {};


        const rows =
            Object.entries(data)
                .filter(function (entry) {

                    return entry[0]
                        .startsWith(month);
                })
                .sort(function (a, b) {

                    return b[0]
                        .localeCompare(a[0]);
                });


        if (!rows.length) {

            tbody.innerHTML =
                emptyRow(
                    5,
                    "Chưa có dữ liệu."
                );

            return;
        }


        tbody.innerHTML =
            rows
                .map(function (entry) {

                    const recordKey =
                        entry[0];

                    const dateKey =
                        recordKey.split("_")[0];


                    const item =
                        entry[1];

                    const shiftName =
                        item.shiftName ||
                        (recordKey.endsWith("_night")
                            ? "Ca đêm"
                            : "Ca ngày");


                    let status;


                    if (
                        item.checkIn &&
                        item.checkOut
                    ) {

                        status =
                            badge(
                                "Hoàn thành",
                                "success"
                            );

                    } else if (
                        item.checkIn
                    ) {

                        status =
                            badge(
                                "Đang làm",
                                "warning"
                            );

                    } else {

                        status =
                            badge(
                                "Chưa chấm",
                                "danger"
                            );
                    }


                    return `
                        <tr>

                            <td>
                                ${formatDisplayDate(
                                    dateKey
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    shiftName
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    item.checkInText ||
                                    "--"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    item.checkOutText ||
                                    "--"
                                )}
                            </td>

                            <td>
                                ${status}
                            </td>

                        </tr>
                    `;
                })
                .join("");


    } catch (error) {

        console.error(
            "History error:",
            error
        );

        tbody.innerHTML =
            emptyRow(
                5,
                "Không thể tải lịch sử."
            );
    }
}


/* =====================================================
   NGHỈ PHÉP
===================================================== */

async function submitLeave(event) {

    event.preventDefault();

    clearError("leaveError");


    if (
        !currentUser ||
        !currentProfile ||
        !db
    ) {
        return;
    }


    const startDate =
        $("leaveStartDate")?.value;


    const endDate =
        $("leaveEndDate")?.value;


    const type =
        $("leaveType")?.value ||
        "other";


    const reason =
        $("leaveReason")?.value.trim();


    if (
        !startDate ||
        !endDate ||
        !reason
    ) {

        showError(
            "leaveError",
            "Vui lòng nhập đầy đủ thông tin."
        );

        return;
    }


    if (endDate < startDate) {

        showError(
            "leaveError",
            "Ngày kết thúc không được trước ngày bắt đầu."
        );

        return;
    }


    const button =
        $("leaveSubmitBtn");


    setButtonLoading(
        button,
        true,
        "Đang gửi..."
    );


    try {

        const leaveRef =
            db
                .ref(
                    "leaves/" +
                    currentUser.uid
                )
                .push();


        await leaveRef.set({

            uid:
                currentUser.uid,

            name:
                currentProfile.name || "",

            email:
                currentUser.email || "",

            startDate:
                startDate,

            endDate:
                endDate,

            type:
                type,

            reason:
                reason,

            status:
                "pending",

            createdAt:
                firebase.database.ServerValue.TIMESTAMP,

            reviewedAt:
                null,

            reviewedBy:
                "",

            reviewedByName:
                ""
        });


        $("leaveForm")?.reset();


        showToast(
            "Đã gửi yêu cầu nghỉ phép.",
            "success"
        );


        await loadMyLeaves();


    } catch (error) {

        console.error(
            "Leave error:",
            error
        );

        showError(
            "leaveError",
            getFirebaseErrorMessage(error)
        );

    } finally {

        setButtonLoading(
            button,
            false,
            "Gửi yêu cầu"
        );
    }
}


/* =====================================================
   DANH SÁCH NGHỈ PHÉP CỦA USER
===================================================== */

async function loadMyLeaves() {

    if (
        !currentUser ||
        !db
    ) {
        return;
    }


    const container =
        $("myLeavesList");


    if (!container) {
        return;
    }


    container.innerHTML =
        "<p>Đang tải...</p>";


    try {

        const snapshot =
            await db
                .ref(
                    "leaves/" +
                    currentUser.uid
                )
                .once("value");


        const data =
            snapshot.val() || {};


        const rows =
            Object.entries(data)
                .map(function (entry) {
                    return {
                        id: entry[0],
                        item: entry[1]
                    };
                })
                .sort(function (a, b) {

                    return (
                        (b.item.createdAt || 0) -
                        (a.item.createdAt || 0)
                    );
                });


        if (!rows.length) {

            container.innerHTML =
                "<p>Chưa có yêu cầu nghỉ phép.</p>";

            return;
        }


        container.innerHTML =
            rows
                .map(function (item) {

                    const leave = item.item;
                    const deleteButton = leave.status === "pending"
                        ? `<button type="button" class="btn btn-danger" onclick="deleteMyLeave('${escapeAttribute(item.id)}')">Xóa yêu cầu</button>`
                        : "";

                    return `
                        <div class="leave-item">

                            <div class="leave-item-header">

                                <strong>
                                    ${formatDisplayDate(
                                        item.startDate
                                    )}
                                    -
                                    ${formatDisplayDate(
                                        item.endDate
                                    )}
                                </strong>

                                ${leaveStatusBadge(
                                    leave.status
                                )}

                            </div>

                            <p>
                                <strong>
                                    ${escapeHtml(
                                        leaveTypeText(
                                            leave.type
                                        )
                                    )}
                                </strong>
                            </p>

                            <p>
                                ${escapeHtml(
                                    leave.reason || ""
                                )}
                            </p>

                            ${deleteButton}

                        </div>
                    `;
                })
                .join("");


    } catch (error) {

        console.error(
            "My leaves error:",
            error
        );

        container.innerHTML =
            "<p>Không thể tải dữ liệu.</p>";
    }
}


async function deleteMyLeave(leaveId) {

    if (!currentUser || !db || !leaveId) {
        return;
    }

    const leaveRef = db.ref(
        "leaves/" + currentUser.uid + "/" + leaveId
    );

    try {

        const snapshot = await leaveRef.once("value");
        const leave = snapshot.val();

        if (!leave) {
            showToast("Yêu cầu nghỉ phép không còn tồn tại.", "error");
            await loadMyLeaves();
            return;
        }

        if (leave.status !== "pending") {
            showToast("Chỉ có thể xóa yêu cầu đang chờ duyệt.", "error");
            await loadMyLeaves();
            return;
        }

        if (!window.confirm("Bạn có chắc muốn xóa yêu cầu nghỉ phép này?")) {
            return;
        }

        await leaveRef.remove();
        showToast("Đã xóa yêu cầu nghỉ phép.", "success");
        await loadMyLeaves();

    } catch (error) {

        console.error("Delete leave error:", error);
        showToast(getFirebaseErrorMessage(error), "error");
    }
}

window.deleteMyLeave = deleteMyLeave;


/* =====================================================
   PROFILE
===================================================== */

async function saveProfile(event) {

    event.preventDefault();

    clearError("profileError");


    if (
        !currentUser ||
        !db
    ) {
        return;
    }


    const name =
        $("profileName")?.value.trim();


    const phone =
        $("profilePhone")?.value.trim();


    const department =
        $("profileDepartment")?.value ||
        "OTHER";


    const position =
        $("profilePosition")?.value.trim() ||
        "Nhân viên";


    if (!name) {

        showError(
            "profileError",
            "Họ tên không được để trống."
        );

        return;
    }


    try {

        await db
            .ref(
                "users/" +
                currentUser.uid
            )
            .update({

                name:
                    name,

                phone:
                    phone,

                department:
                    department,

                position:
                    position,

                updatedAt:
                    firebase.database.ServerValue.TIMESTAMP
            });


        currentProfile.name =
            name;

        currentProfile.phone =
            phone;

        currentProfile.department =
            department;

        currentProfile.position =
            position;


        updateUserInterface();


        showToast(
            "Cập nhật hồ sơ thành công.",
            "success"
        );


    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        showError(
            "profileError",
            getFirebaseErrorMessage(error)
        );
    }
}


/* =====================================================
   UPLOAD ẢNH
===================================================== */

async function uploadAvatar(event) {

    const file =
        event.target.files?.[0];


    if (!file) {
        return;
    }


    if (
        !file.type.startsWith("image/")
    ) {

        showToast(
            "Vui lòng chọn file hình ảnh.",
            "error"
        );

        return;
    }


    if (
        file.size >
        5 * 1024 * 1024
    ) {

        showToast(
            "Ảnh không được vượt quá 5MB.",
            "error"
        );

        return;
    }


    if (
        !currentUser ||
        !storage ||
        !db
    ) {

        showToast(
            "Firebase Storage chưa sẵn sàng.",
            "error"
        );

        return;
    }


    const status =
        $("uploadStatus");


    if (status) {

        status.textContent =
            "Đang tải ảnh...";
    }


    try {

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        const path =
            "avatars/" +
            currentUser.uid +
            "." +
            extension;


        const storageRef =
            storage.ref(path);


        const upload =
            await storageRef.put(file);


        const downloadURL =
            await upload.ref.getDownloadURL();


        await db
            .ref(
                "users/" +
                currentUser.uid
            )
            .update({

                profileImage:
                    downloadURL,

                updatedAt:
                    firebase.database.ServerValue.TIMESTAMP
            });


        currentProfile.profileImage =
            downloadURL;


        updateUserInterface();


        if (status) {

            status.textContent =
                "Tải ảnh thành công.";
        }


        showToast(
            "Đã cập nhật ảnh đại diện.",
            "success"
        );


    } catch (error) {

        console.error(
            "Upload error:",
            error
        );


        if (status) {

            status.textContent =
                "Tải ảnh thất bại.";
        }


        showToast(
            getFirebaseErrorMessage(error),
            "error"
        );
    }
}


/* =====================================================
   ADMIN
===================================================== */

function isAdmin() {

    return (
        currentProfile?.role === "admin" ||
        currentProfile?.role === "superadmin"
    );
}


/* =====================================================
   ADMIN DASHBOARD
===================================================== */

async function loadAdminDashboard() {

    if (
        !isAdmin() ||
        !db
    ) {
        return;
    }


    try {

        const usersSnapshot =
            await db
                .ref("users")
                .once("value");


        const users =
            usersSnapshot.val() || {};


        const employees =
            Object.values(users)
                .filter(function (user) {

                    return (
                        user.status !== "deleted"
                    );
                });


        setText(
            "adminTotalEmployees",
            employees.length
        );


        const today =
            formatDateKey(
                new Date()
            );


        const attendanceSnapshot =
            await db
                .ref("attendance")
                .once("value");


        const attendance =
            attendanceSnapshot.val() || {};


        let checkedIn =
            0;


        Object.values(attendance)
            .forEach(function (userAttendance) {

                const record =
                    userAttendance?.[today];


                if (
                    record?.checkIn
                ) {

                    checkedIn++;
                }
            });


        setText(
            "adminCheckedIn",
            checkedIn
        );


        setText(
            "adminNotChecked",
            Math.max(
                employees.length -
                checkedIn,
                0
            )
        );


        const leavesSnapshot =
            await db
                .ref("leaves")
                .once("value");


        const leaves =
            leavesSnapshot.val() || {};


        let pending =
            0;


        Object.values(leaves)
            .forEach(function (userLeaves) {

                Object.values(
                    userLeaves || {}
                )
                .forEach(function (leave) {

                    if (
                        leave.status ===
                        "pending"
                    ) {

                        pending++;
                    }
                });
            });


        setText(
            "adminPendingLeaves",
            pending
        );


    } catch (error) {

        console.error(
            "Admin dashboard error:",
            error
        );
    }
}


/* =====================================================
   NHÂN VIÊN
===================================================== */

async function loadEmployees() {

    if (
        !isAdmin() ||
        !db
    ) {
        return;
    }


    const tbody =
        $("employeesTableBody");


    if (!tbody) {
        return;
    }


    tbody.innerHTML =
        loadingRow(
            6,
            "Đang tải..."
        );


    try {

        const snapshot =
            await db
                .ref("users")
                .once("value");


        const users =
            snapshot.val() || {};


        const search =
            $("employeeSearch")
                ?.value
                .trim()
                .toLowerCase() ||
            "";


        const rows =
            Object.values(users)
                .filter(function (user) {

                    return (
                        user.status !==
                        "deleted"
                    );
                })
                .filter(function (user) {

                    if (!search) {
                        return true;
                    }


                    return (
                        String(
                            user.name || ""
                        )
                            .toLowerCase()
                            .includes(search)
                        ||
                        String(
                            user.email || ""
                        )
                            .toLowerCase()
                            .includes(search)
                    );
                });


        if (!rows.length) {

            tbody.innerHTML =
                emptyRow(
                    6,
                    "Không tìm thấy nhân viên."
                );

            return;
        }


        tbody.innerHTML =
            rows
                .map(function (user) {

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    user.name ||
                                    "Chưa có tên"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    user.email ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    departmentText(
                                        user.department
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    user.position ||
                                    "Nhân viên"
                                )}
                            </td>

                            <td>
                                ${
                                    user.shift ===
                                    "night"
                                        ? "Ca đêm"
                                        : "Ca ngày"
                                }
                            </td>

                            <td>
                                ${statusBadge(
                                    user.status
                                )}
                            </td>

                        </tr>
                    `;
                })
                .join("");


    } catch (error) {

        console.error(
            "Employees error:",
            error
        );

        tbody.innerHTML =
            emptyRow(
                6,
                "Không thể tải nhân viên."
            );
    }
}


/* =====================================================
   ADMIN ATTENDANCE
===================================================== */

async function loadAdminAttendance() {

    if (
        !isAdmin() ||
        !db
    ) {
        return;
    }


    const tbody =
        $("adminAttendanceTableBody");


    if (!tbody) {
        return;
    }


    let dateKey =
        $("adminAttendanceDate")?.value;


    if (!dateKey) {

        dateKey =
            formatDateKey(
                new Date()
            );
    }


    tbody.innerHTML =
        loadingRow(
            5,
            "Đang tải..."
        );


    try {

        const usersSnapshot =
            await db
                .ref("users")
                .once("value");


        const users =
            usersSnapshot.val() || {};


        const attendanceSnapshot =
            await db
                .ref("attendance")
                .once("value");


        const attendance =
            attendanceSnapshot.val() || {};


        const rows =
            Object.values(users)
                .filter(function (user) {

                    return (
                        user.status !==
                        "deleted"
                    );
                });


        tbody.innerHTML =
            rows
                .map(function (user) {

                    const dateRecords =
                        Object.entries(
                            attendance[user.uid] || {}
                        )
                            .filter(function ([key]) {

                                return (
                                    key === dateKey ||
                                    key.startsWith(dateKey + "_")
                                );

                            })
                            .map(function ([, value]) {

                                return value;

                            })
                            .filter(Boolean);


                    const record =
                        dateRecords[0] || null;

                    const shiftName =
                        dateRecords
                            .map(function (item) {

                                return item.shiftName ||
                                    (
                                        item.shift === "night"
                                            ? "Ca đêm"
                                            : "Ca ngày"
                                    );

                            })
                            .join(" / ") ||
                        (
                            user.shift === "night"
                                ? "Ca đêm"
                                : "Ca ngày"
                        );

                    const checkInText =
                        dateRecords
                            .map(function (item) {

                                return item.checkInText;

                            })
                            .filter(Boolean)
                            .join(" / ") || "--";

                    const checkOutText =
                        dateRecords
                            .map(function (item) {

                                return item.checkOutText;

                            })
                            .filter(Boolean)
                            .join(" / ") || "--";

                    const hasCheckIn =
                        dateRecords.some(
                            function (item) {

                                return !!item.checkIn;

                            }
                        );

                    const hasCheckOut =
                        dateRecords.length > 0 &&
                        dateRecords.every(
                            function (item) {

                                return !!item.checkOut;

                            }
                        );


                    let status;


                    if (
                        hasCheckIn &&
                        hasCheckOut
                    ) {

                        status =
                            badge(
                                "Hoàn thành",
                                "success"
                            );

                    } else if (
                        hasCheckIn
                    ) {

                        status =
                            badge(
                                "Đang làm",
                                "warning"
                            );

                    } else {

                        status =
                            badge(
                                "Chưa chấm",
                                "danger"
                            );
                    }


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    user.name ||
                                    "Chưa có tên"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    user.email ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    shiftName
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    checkInText
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    checkOutText
                                )}
                            </td>

                            <td>
                                ${status}
                            </td>

                        </tr>
                    `;
                })
                .join("");


    } catch (error) {

        console.error(
            "Admin attendance error:",
            error
        );

        tbody.innerHTML =
            emptyRow(
                6,
                "Không thể tải dữ liệu."
            );
    }
}


/* =====================================================
   ADMIN LEAVE
===================================================== */

async function loadAdminLeaves() {

    if (
        !isAdmin() ||
        !db
    ) {
        return;
    }


    const tbody =
        $("adminLeaveTableBody");


    if (!tbody) {
        return;
    }


    const filter =
        $("adminLeaveStatusFilter")
            ?.value ||
        "all";


    tbody.innerHTML =
        loadingRow(
            6,
            "Đang tải..."
        );


    try {

        const snapshot =
            await db
                .ref("leaves")
                .once("value");


        const all =
            snapshot.val() || {};


        const rows = [];


        Object.entries(all)
            .forEach(function (userEntry) {

                const uid = userEntry[0];
                const userLeaves = userEntry[1];

                Object.entries(
                    userLeaves || {}
                )
                .forEach(function (entry) {

                    const id =
                        entry[0];


                    const leave =
                        entry[1];


                    if (
                        filter !== "all" &&
                        leave.status !==
                        filter
                    ) {

                        return;
                    }


                    rows.push({
                        uid:
                            uid,

                        id:
                            id,

                        leave:
                            leave
                    });
                });
            });


        rows.sort(function (a, b) {

            return (
                (b.leave.createdAt || 0) -
                (a.leave.createdAt || 0)
            );
        });


        if (!rows.length) {

            tbody.innerHTML =
                emptyRow(
                    6,
                    "Không có yêu cầu."
                );

            return;
        }


        tbody.innerHTML =
            rows
                .map(function (item) {

                    const leave =
                        item.leave;


                    let action = "";


                    if (
                        leave.status ===
                        "pending"
                    ) {

                        action = `

                            <button
                                type="button"
                                onclick="reviewLeave(
                                    '${escapeAttribute(
                                        leave.uid
                                    )}',
                                    '${escapeAttribute(
                                        item.id
                                    )}',
                                    'approved'
                                )"
                            >
                                Duyệt
                            </button>

                            <button
                                type="button"
                                onclick="reviewLeave(
                                    '${escapeAttribute(
                                        leave.uid
                                    )}',
                                    '${escapeAttribute(
                                        item.id
                                    )}',
                                    'rejected'
                                )"
                            >
                                Từ chối
                            </button>
                        `;
                    }

                    action += `
                        <button
                            type="button"
                            class="btn btn-danger"
                            onclick="deleteAdminLeave(
                                '${escapeAttribute(item.uid)}',
                                '${escapeAttribute(item.id)}'
                            )"
                        >
                            Xóa
                        </button>
                    `;


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    leave.name ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${formatDisplayDate(
                                    leave.startDate
                                )}
                                -
                                ${formatDisplayDate(
                                    leave.endDate
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    leaveTypeText(
                                        leave.type
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    leave.reason ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${leaveStatusBadge(
                                    leave.status
                                )}
                            </td>

                            <td>
                                ${action}
                            </td>

                        </tr>
                    `;
                })
                .join("");


    } catch (error) {

        console.error(
            "Admin leave error:",
            error
        );

        tbody.innerHTML =
            emptyRow(
                6,
                "Không thể tải dữ liệu."
            );
    }
}


/* =====================================================
   DUYỆT NGHỈ PHÉP
===================================================== */

async function reviewLeave(
    uid,
    leaveId,
    status
) {

    if (
        !isAdmin() ||
        !db ||
        !currentUser
    ) {
        return;
    }


    if (
        status !== "approved" &&
        status !== "rejected"
    ) {
        return;
    }


    try {

        await db
            .ref(
                "leaves/" +
                uid +
                "/" +
                leaveId
            )
            .update({

                status:
                    status,

                reviewedAt:
                    firebase.database.ServerValue.TIMESTAMP,

                reviewedBy:
                    currentUser.uid,

                reviewedByName:
                    currentProfile?.name ||
                    currentUser.email ||
                    ""
            });


        showToast(
            status === "approved"
                ? "Đã duyệt yêu cầu."
                : "Đã từ chối yêu cầu.",
            "success"
        );


        await loadAdminLeaves();


    } catch (error) {

        console.error(
            "Review leave error:",
            error
        );

        showToast(
            getFirebaseErrorMessage(error),
            "error"
        );
    }
}


window.reviewLeave =
    reviewLeave;


async function deleteAdminLeave(uid, leaveId) {

    if (!isAdmin() || !db || !uid || !leaveId) {
        return;
    }

    if (!window.confirm("Admin: bạn có chắc muốn xóa đơn nghỉ phép này?")) {
        return;
    }

    try {

        await db.ref("leaves/" + uid + "/" + leaveId).remove();
        showToast("Đã xóa đơn nghỉ phép.", "success");
        await loadAdminLeaves();

    } catch (error) {

        console.error("Admin delete leave error:", error);
        showToast(getFirebaseErrorMessage(error), "error");
    }
}

window.deleteAdminLeave = deleteAdminLeave;


/* =====================================================
   ĐĂNG XUẤT
===================================================== */

async function logout() {

    if (!auth) {

        showAuth();

        return;
    }


    try {

        stopAttendanceListener();

        await auth.signOut();


        currentUser =
            null;


        currentProfile =
            null;


        showAuth();

        showLogin();


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        showToast(
            getFirebaseErrorMessage(error),
            "error"
        );
    }
}


/* =====================================================
   PASSWORD TOGGLE
===================================================== */

function setupPasswordToggle() {

    const button =
        $("loginPasswordToggle");


    const input =
        $("loginPassword");


    if (
        button &&
        input
    ) {

        button.addEventListener(
            "click",
            function () {

                if (
                    input.type ===
                    "password"
                ) {

                    input.type =
                        "text";

                    button.textContent =
                        "Ẩn";

                } else {

                    input.type =
                        "password";

                    button.textContent =
                        "Hiện";
                }
            }
        );
    }


    const remembered =
        localStorage.getItem(
            "worktime_remember_email"
        );


    if (
        remembered &&
        $("loginEmail")
    ) {

        $("loginEmail").value =
            remembered;


        if ($("rememberLogin")) {

            $("rememberLogin").checked =
                true;
        }
    }
}


/* =====================================================
   MOBILE SIDEBAR
===================================================== */

function toggleMobileSidebar() {

    $("sidebar")
        ?.classList
        .toggle(
            "mobile-open"
        );


    $("sidebarOverlay")
        ?.classList
        .toggle(
            "show"
        );
}


function closeMobileSidebar() {

    $("sidebar")
        ?.classList
        .remove(
            "mobile-open"
        );


    $("sidebarOverlay")
        ?.classList
        .remove(
            "show"
        );
}


/* =====================================================
   DATE INPUT
===================================================== */

function setupDateInputs() {

    const today =
        formatDateKey(
            new Date()
        );


    if ($("adminAttendanceDate")) {

        $("adminAttendanceDate").value =
            today;
    }


    if ($("historyMonth")) {

        const now =
            new Date();


        $("historyMonth").value =
            now.getFullYear() +
            "-" +
            String(
                now.getMonth() + 1
            ).padStart(
                2,
                "0"
            );
    }
}


/* =====================================================
   HEADER DATE
===================================================== */

function updateHeaderDate() {

    setText(
        "headerDate",
        new Intl.DateTimeFormat(
            "vi-VN",
            {
                weekday:
                    "long",

                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric"
            }
        ).format(
            new Date()
        )
    );
}


/* =====================================================
   CLOCK
===================================================== */

function startClock() {

    let lastAutoShiftKey = null;


    function updateClock() {

        const now =
            new Date();

        const currentShift =
            getAttendanceShiftInfo(now);


        setText(
            "attendanceClock",
            now.toLocaleTimeString(
                "vi-VN"
            )
        );


        setText(
            "attendanceDate",
            now.toLocaleDateString(
                "vi-VN",
                {
                    weekday:
                        "long",

                    day:
                        "2-digit",

                    month:
                        "2-digit",

                    year:
                        "numeric"
                }
            )
        );


        if (
            lastAutoShiftKey &&
            lastAutoShiftKey !== currentShift.key
        ) {

            updateShiftUI();
            updateShiftWarningState();

            if (currentUser && db) {
                loadTodayAttendance();
                startAttendanceListener();
            }
        }


        lastAutoShiftKey =
            currentShift.key;
    }


    updateClock();


    setInterval(
        updateClock,
        1000
    );
}


startClock();


/* =====================================================
   DOM
===================================================== */

function setText(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            value ?? "";
    }
}


function setValue(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.value =
            value ?? "";
    }
}


function setImage(
    id,
    url
) {

    const element =
        $(id);


    if (element) {

        element.src =
            url ||
            DEFAULT_AVATAR;
    }
}


/* =====================================================
   ERROR
===================================================== */

function showError(
    id,
    message
) {

    const element =
        $(id);


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.classList.remove(
        "hidden"
    );
}


function clearError(id) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            "";

        element.classList.add(
            "hidden"
        );
    }
}


/* =====================================================
   BUTTON LOADING
===================================================== */

function setButtonLoading(
    button,
    loading,
    text
) {

    if (!button) {
        return;
    }


    button.disabled =
        loading;


    if (loading) {

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            text;

    } else {

        button.textContent =
            text ||
            button.dataset.originalText ||
            "Thực hiện";
    }
}


/* =====================================================
   TOAST
===================================================== */

function showToast(
    message,
    type
) {

    const container =
        $("toastContainer");


    if (!container) {

        console.log(
            "[" +
            type +
            "]",
            message
        );

        return;
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "toast " +
        (type || "info");


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    setTimeout(
        function () {

            toast.remove();

        },
        4000
    );
}


/* =====================================================
   DATE
===================================================== */

function formatDateKey(
    date
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}


function formatDisplayDate(
    dateKey
) {

    if (!dateKey) {

        return "--";
    }


    const parts =
        String(dateKey).split("-");


    if (
        parts.length !== 3
    ) {

        return dateKey;
    }


    return (
        parts[2] +
        "/" +
        parts[1] +
        "/" +
        parts[0]
    );
}


function getCurrentTime() {

    return new Date()
        .toLocaleTimeString(
            "vi-VN",
            {
                hour12:
                    false,

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit"
            }
        );
}


/* =====================================================
   TEXT
===================================================== */

function roleText(
    role
) {

    const roles = {

        employee:
            "Nhân viên",

        admin:
            "Quản trị viên",

        superadmin:
            "Super Admin"
    };


    return (
        roles[role] ||
        "Nhân viên"
    );
}


function departmentText(
    department
) {

    const departments = {

        IT:
            "Công nghệ thông tin",

        HR:
            "Nhân sự",

        ACCOUNTING:
            "Kế toán",

        SALES:
            "Kinh doanh",

        MARKETING:
            "Marketing",

        OTHER:
            "Khác"
    };


    return (
        departments[department] ||
        department ||
        "Khác"
    );
}


function leaveTypeText(
    type
) {

    const types = {

        annual:
            "Nghỉ phép năm",

        sick:
            "Nghỉ bệnh",

        personal:
            "Nghỉ việc riêng",

        unpaid:
            "Nghỉ không lương",

        other:
            "Khác"
    };


    return (
        types[type] ||
        "Khác"
    );
}


/* =====================================================
   BADGE
===================================================== */

function badge(
    text,
    type
) {

    return (
        '<span class="badge badge-' +
        (type || "info") +
        '">' +
        escapeHtml(text) +
        "</span>"
    );
}


function leaveStatusBadge(
    status
) {

    const data = {

        pending:
            [
                "Chờ duyệt",
                "warning"
            ],

        approved:
            [
                "Đã duyệt",
                "success"
            ],

        rejected:
            [
                "Từ chối",
                "danger"
            ]
    };


    const result =
        data[status] ||
        [
            "Không xác định",
            "info"
        ];


    return badge(
        result[0],
        result[1]
    );
}


function statusBadge(
    status
) {

    const data = {

        active:
            [
                "Hoạt động",
                "success"
            ],

        locked:
            [
                "Đã khóa",
                "danger"
            ],

        inactive:
            [
                "Không hoạt động",
                "warning"
            ],

        deleted:
            [
                "Đã xóa",
                "danger"
            ]
    };


    const result =
        data[status] ||
        [
            "Không xác định",
            "info"
        ];


    return badge(
        result[0],
        result[1]
    );
}


/* =====================================================
   TABLE
===================================================== */

function loadingRow(
    colspan,
    text
) {

    return `
        <tr>
            <td
                colspan="${colspan}"
                style="text-align:center;padding:30px;"
            >
                ${escapeHtml(text)}
            </td>
        </tr>
    `;
}


function emptyRow(
    colspan,
    text
) {

    return `
        <tr>
            <td
                colspan="${colspan}"
                style="text-align:center;padding:30px;"
            >
                ${escapeHtml(text)}
            </td>
        </tr>
    `;
}


/* =====================================================
   AVATAR
===================================================== */

function createAvatar(
    name
) {

    const safeName =
        encodeURIComponent(
            name || "User"
        );


    return (
        "https://ui-avatars.com/api/" +
        "?name=" +
        safeName +
        "&background=2563eb" +
        "&color=ffffff" +
        "&size=200"
    );
}


/* =====================================================
   XSS PROTECTION
===================================================== */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );
}

// ============================================================
// WORKTIME
// BẢNG CHẤM CÔNG 1 THÁNG
// ============================================================


// ============================================================
// KIỂM TRA NĂM NHUẬN
// ============================================================

function payrollIsLeapYear(year) {

    return (
        year % 400 === 0 ||
        (
            year % 4 === 0 &&
            year % 100 !== 0
        )
    );

}


// ============================================================
// SỐ NGÀY TRONG THÁNG
// ============================================================

function payrollGetDaysInMonth(
    year,
    month
) {

    return new Date(
        year,
        month,
        0
    ).getDate();

}


// ============================================================
// FORMAT TIỀN
// ============================================================

function payrollFormatMoney(
    value
) {

    return (
        Number(value || 0)
            .toLocaleString("vi-VN")
        + " ₫"
    );

}


// ============================================================
// FORMAT GIỜ
// ============================================================

function payrollFormatHours(
    value
) {

    return (
        Number(value || 0)
            .toFixed(2)
        + " giờ"
    );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function payrollEscapeHtml(
    value
) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ============================================================
// LẤY THÁNG ĐANG CHỌN
// ============================================================

function payrollGetSelectedMonth() {

    const input =
        document.getElementById(
            "adminPayrollMonth"
        );


    if (
        !input ||
        !input.value
    ) {

        const now =
            new Date();


        return {

            year:
                now.getFullYear(),

            month:
                now.getMonth() + 1

        };

    }


    const parts =
        input.value.split("-");


    return {

        year:
            Number(parts[0]),

        month:
            Number(parts[1])

    };

}


// ============================================================
// TÍNH GIỜ LÀM
// ============================================================

function payrollCalculateHours(
    attendance,
    lunchBreakHours
) {

    if (!attendance) {
        return 0;
    }


    if (
        !attendance.checkIn ||
        !attendance.checkOut
    ) {

        return 0;

    }


    const checkIn =
        Number(
            attendance.checkIn
        );


    const checkOut =
        Number(
            attendance.checkOut
        );


    if (
        !Number.isFinite(checkIn) ||
        !Number.isFinite(checkOut)
    ) {

        return 0;

    }

    const manualHours = Number(attendance.manualHours);
    if (manualHours === 6 || manualHours === 12) {
        return manualHours;
    }


    if (
        checkOut <= checkIn
    ) {

        return 0;

    }


    let hours =
        (
            checkOut -
            checkIn
        ) /
        (
            1000 *
            60 *
            60
        );


    const breakHours =
        Number(
            lunchBreakHours
        ) || 0;


    hours -= breakHours;


    return Math.max(
        0,
        hours
    );

}


// ============================================================
// LẤY CHẤM CÔNG
// ============================================================

function payrollGetAttendance(
    attendanceData,
    uid,
    dateKey,
    shift,
    defaultShift
) {

    if (
        !attendanceData ||
        !attendanceData[uid]
    ) {

        return [];

    }


    const userAttendance =
        attendanceData[uid];


    const records =
        Object.keys(userAttendance)
            .filter(function (key) {

                return (
                    key === dateKey ||
                    key.startsWith(dateKey + "_")
                );

            })
            .map(function (key) {

                const record = userAttendance[key];
                const suffix = key.slice(dateKey.length + 1);
                return {
                    ...record,
                    _recordKey: key,
                    _shift: record?.shift || (suffix === "day" || suffix === "night" ? suffix : defaultShift)
                };

            })
            .filter(Boolean);


    const shiftRecords = records.filter(function (record) {
        return record._shift === shift;
    });
    const canonicalKey = `${dateKey}_${shift}`;

    return shiftRecords.some(function (record) {
        return record._recordKey === canonicalKey;
    })
        ? shiftRecords.filter(function (record) {
            return record._recordKey === canonicalKey;
        })
        : shiftRecords;

}


// ============================================================
// TÍNH NGHỈ PHÉP
// ============================================================

function payrollGetLeaveDays(
    leaves,
    year,
    month
) {

    const paidDates = new Set();

    const unpaidDates = new Set();


    if (!leaves) {

        return {
            paid: 0,
            unpaid: 0,
            paidDates,
            unpaidDates
        };

    }


    Object.keys(leaves)
        .forEach(function (leaveId) {

            const leave =
                leaves[leaveId];


            if (!leave) {
                return;
            }


            if (
                leave.status !==
                "approved"
            ) {

                return;

            }


            if (
                !leave.startDate ||
                !leave.endDate
            ) {

                return;

            }


            const start =
                new Date(
                    leave.startDate
                );


            const end =
                new Date(
                    leave.endDate
                );


            if (
                isNaN(start.getTime()) ||
                isNaN(end.getTime())
            ) {

                return;

            }


            for (
                let date =
                    new Date(start);

                date <= end;

                date.setDate(
                    date.getDate() + 1
                )
            ) {

                if (
                    date.getFullYear() !==
                    year
                ) {

                    continue;

                }


                if (
                    date.getMonth() + 1 !==
                    month
                ) {

                    continue;

                }


                const dateKey =
                    formatDateKey(date);

                if (leave.type === "unpaid") {
                    unpaidDates.add(dateKey);
                } else {
                    paidDates.add(dateKey);
                }

            }

        });


    return {
        paid: paidDates.size,
        unpaid: unpaidDates.size,
        paidDates,
        unpaidDates
    };

}


// ============================================================
// TÍNH CÔNG 1 NHÂN VIÊN
// ============================================================

function payrollCalculateEmployee(
    user,
    attendanceData,
    leavesData,
    year,
    month,
    standardWorkDays,
    lunchBreakHours,
    holidayDates,
    shift
) {

    const daysInMonth =
        payrollGetDaysInMonth(
            year,
            month
        );

    const normalizedLunchBreakHours =
        Math.max(
            0,
            Number(lunchBreakHours) || 0
        );


    const uid =
        user.uid;


    const defaultShift = user.shift === "night" ? "night" : "day";
    const assignedShift = shift === "night" ? "night" : "day";
    let workedDays = 0;

    let payableDays = 0;

    let totalHours = 0;

    let holidayWorkDays = 0;

    const workedDateKeys = new Set();


    const daily =
        {};


    // ========================================================
    // TỪNG NGÀY
    // ========================================================

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const dateKey =
            year +
            "-" +
            String(month)
                .padStart(2, "0") +
            "-" +
            String(day)
                .padStart(2, "0");


        const attendanceRecords =
            payrollGetAttendance(
                attendanceData,
                uid,
                dateKey,
                assignedShift,
                defaultShift
            );


        let status =
            "none";


        let hours =
            0;


        const completeItems = attendanceRecords.filter(function (record) {
            return record && record.checkIn && record.checkOut;
        });
        const incompleteItems = attendanceRecords.filter(function (record) {
            return record && record.checkIn && !record.checkOut;
        });

        if (completeItems.length) {
            status = "complete";
            completeItems.forEach(function (record) {
                hours += payrollCalculateHours(record, normalizedLunchBreakHours);
                const recordWorkUnits = Number(record.workUnits);
                const workUnits = Number.isFinite(recordWorkUnits) && recordWorkUnits > 0
                    ? recordWorkUnits
                    : 1;
                payableDays += workUnits;
                workedDays += workUnits;
            });
            totalHours += hours;
            workedDateKeys.add(dateKey);
            if (holidayDates[dateKey] === true) holidayWorkDays++;
        } else if (incompleteItems.length) {
            status = "incomplete";
        }


        daily[dateKey] = {

            status:
                status,

            hours:
                hours,

            attendance:
                completeItems[0] || incompleteItems[0] || null

        };

    }


    // ========================================================
    // NGHỈ PHÉP
    // ========================================================

    const userLeaves =
        leavesData &&
        leavesData[uid]
            ? leavesData[uid]
            : {};


    const leaveResult =
        payrollGetLeaveDays(
            userLeaves,
            year,
            month
        );


    const paidLeaveDays = assignedShift === defaultShift
        ? [...leaveResult.paidDates]
            .filter(function (dateKey) {
                return !workedDateKeys.has(dateKey);
            })
            .length
        : 0;


    const unpaidLeaveDays = assignedShift === defaultShift
        ? [...leaveResult.unpaidDates]
            .filter(function (dateKey) {
                return !workedDateKeys.has(dateKey);
            })
            .length
        : 0;


    // ========================================================
    // NGÀY TÍNH LƯƠNG
        // NGÀY CÔNG QUY ĐỔI
    // ========================================================

    // ========================================================
    // LƯƠNG THEO NGÀY CÔNG, CHIA ĐỀU 30 NGÀY
    // ========================================================

    const monthlySalaryValue =
        Number(user.monthlySalary);

    const monthlySalary =
        Number.isFinite(monthlySalaryValue)
            ? Math.max(0, monthlySalaryValue)
            : 0;


    let actualSalary =
        0;


    if (monthlySalary > 0) {
        actualSalary =
            monthlySalary *
            payableDays /
            30;
    }


    return {

        uid:
            uid,

        name:
            user.name ||
            user.displayName ||
            user.email ||
            "Không tên",

        email:
            user.email ||
            "",

        department:
            user.department ||
            "",

        shift:
            assignedShift,

        monthlySalary:
            Math.max(
                0,
                Number.isFinite(
                    Number(user.monthlySalary)
                )
                    ? Number(user.monthlySalary)
                    : 0
            ),

        workedDays:
            workedDays,

        paidLeaveDays:
            paidLeaveDays,

        unpaidLeaveDays:
            unpaidLeaveDays,

        payableDays:
            payableDays,

        totalHours:
            Number(totalHours.toFixed(2)),

        holidayWorkDays:
            holidayWorkDays,

        actualSalary:
            Math.round(actualSalary),

        daily:
            daily

    };

}


// ============================================================
// Ô TỪNG NGÀY
// ============================================================

function payrollRenderDay(
    item,
    uid,
    dateKey,
    employeeName,
    isHoliday
) {

    function renderShiftButton(shiftItem, shift, label) {
        const attendance = shiftItem?.attendance || {};
        const statusClass = shiftItem?.status === "complete"
            ? "payroll-complete"
            : shiftItem?.status === "incomplete"
                ? "payroll-incomplete"
                : "payroll-empty";
        const content = shiftItem?.status === "complete"
            ? `<strong>${label} ${shiftItem.hours.toFixed(1)}h</strong>`
            : shiftItem?.status === "incomplete"
                ? `<strong>${label} V</strong>`
                : `<strong>${label} —</strong>`;
        const title = shiftItem?.status === "complete"
            ? `${label === "N" ? "Ca ngày" : "Ca đêm"}: ${shiftItem.hours.toFixed(2)} giờ`
            : `${label === "N" ? "Ca ngày" : "Ca đêm"}: bấm để chỉnh giờ công`;

        return `
            <button
                type="button"
                class="payroll-day-edit ${statusClass}"
                data-uid="${payrollEscapeHtml(uid)}"
                data-date="${payrollEscapeHtml(dateKey)}"
                data-attendance-key="${payrollEscapeHtml(attendance._recordKey || "")}" 
                data-name="${payrollEscapeHtml(employeeName)}"
                data-check-in="${payrollEscapeHtml(attendance.checkInText || "")}"
                data-check-out="${payrollEscapeHtml(attendance.checkOutText || "")}"
                data-shift="${shift}"
                data-existing="${attendance.checkIn || attendance.checkOut ? "true" : "false"}"
                data-work-units="${attendance.workUnits || 1}"
                data-manual-hours="${attendance.manualHours || ""}"
                aria-label="${title}"
                title="${title}"
            >${content}</button>
        `;
    }

    const hasComplete = item?.day?.status === "complete" || item?.night?.status === "complete";
    const hasIncomplete = item?.day?.status === "incomplete" || item?.night?.status === "incomplete";
    const statusClass = hasComplete
        ? "payroll-complete"
        : hasIncomplete
            ? "payroll-incomplete"
            : "payroll-empty";

    return `
        <td class="payroll-day ${statusClass} ${isHoliday ? "payroll-holiday-cell" : ""}">
            <div class="payroll-day-controls">
                ${renderShiftButton(item?.day, "day", "N")}
                ${renderShiftButton(item?.night, "night", "Đ")}
            </div>
        </td>
    `;
}


function openPayrollAttendanceEditor(button) {

    if (!isAdmin()) {
        showToast("Bạn không có quyền chỉnh sửa chấm công.", "error");
        return;
    }

    const dialog = document.getElementById("payrollAttendanceDialog");
    if (!dialog) return;

    dialog.dataset.uid = button.dataset.uid;
    dialog.dataset.date = button.dataset.date;
    dialog.dataset.attendanceKey = button.dataset.attendanceKey || `${button.dataset.date}_${button.dataset.shift || "day"}`;
    dialog.dataset.shift = button.dataset.shift || "day";
    dialog.dataset.existing = button.dataset.existing;
    dialog.dataset.workUnits = button.dataset.workUnits || "1";
    dialog.dataset.manualHours = button.dataset.manualHours || "";
    document.getElementById("payrollAttendanceMeta").textContent =
        `${button.dataset.name} · ${formatDisplayDate(button.dataset.date)}`;
    document.getElementById("payrollCheckInTime").value = (button.dataset.checkIn || "").slice(0, 5);
    document.getElementById("payrollCheckOutTime").value = (button.dataset.checkOut || "").slice(0, 5);
    document.getElementById("payrollAttendanceError").textContent = "";
    document.getElementById("payrollAttendanceDelete").classList.toggle(
        "hidden",
        button.dataset.existing !== "true"
    );
    dialog.showModal();

    document.querySelectorAll("[data-attendance-hours]").forEach(function (presetButton) {
        const selected = presetButton.dataset.attendanceHours === dialog.dataset.manualHours;
        presetButton.classList.toggle("is-selected", selected);
        presetButton.setAttribute("aria-pressed", String(selected));
    });

    if (button.dataset.existing !== "true") {
        selectPayrollAttendancePreset(12);
    }
}


function selectPayrollAttendancePreset(hours) {

    const dialog = document.getElementById("payrollAttendanceDialog");
    if (!dialog || (hours !== 6 && hours !== 12)) return;

    const nightShift = dialog.dataset.shift === "night";
    const checkIn = nightShift ? "18:00" : "06:00";
    const checkOut = nightShift
        ? (hours === 12 ? "06:00" : "00:00")
        : (hours === 12 ? "18:00" : "12:00");

    document.getElementById("payrollCheckInTime").value = checkIn;
    document.getElementById("payrollCheckOutTime").value = checkOut;
    dialog.dataset.manualHours = String(hours);
    dialog.dataset.workUnits = hours === 6 ? "0.5" : "1";

    document.querySelectorAll("[data-attendance-hours]").forEach(function (presetButton) {
        const selected = Number(presetButton.dataset.attendanceHours) === hours;
        presetButton.classList.toggle("is-selected", selected);
        presetButton.setAttribute("aria-pressed", String(selected));
    });
}


async function savePayrollAttendance(event) {

    event.preventDefault();
    const dialog = document.getElementById("payrollAttendanceDialog");
    const errorElement = document.getElementById("payrollAttendanceError");

    if (!isAdmin() || !db || !currentUser || !dialog.dataset.uid || !dialog.dataset.date) {
        errorElement.textContent = "Không đủ quyền hoặc Firebase chưa sẵn sàng.";
        return;
    }

    const checkInText = document.getElementById("payrollCheckInTime").value;
    const checkOutText = document.getElementById("payrollCheckOutTime").value;
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

    if (!timePattern.test(checkInText) || !timePattern.test(checkOutText)) {
        errorElement.textContent = "Vui lòng nhập giờ vào và giờ ra hợp lệ.";
        return;
    }

    const [year, month, day] = dialog.dataset.date.split("-").map(Number);
    const [checkInHour, checkInMinute] = checkInText.split(":").map(Number);
    const [checkOutHour, checkOutMinute] = checkOutText.split(":").map(Number);
    const checkIn = new Date(year, month - 1, day, checkInHour, checkInMinute);
    const checkOut = new Date(year, month - 1, day, checkOutHour, checkOutMinute);

    const shift = dialog.dataset.shift === "night" ? "night" : "day";
    if (checkOut.getTime() === checkIn.getTime() || (checkOut < checkIn && shift !== "night")) {
        errorElement.textContent = "Giờ ra phải sau giờ vào; chỉ ca đêm mới được checkout sang ngày hôm sau.";
        return;
    }

    if (checkOut < checkIn) checkOut.setDate(checkOut.getDate() + 1);

    const saveButton = document.getElementById("payrollAttendanceSave");
    saveButton.disabled = true;

    try {
        const attendanceKey = `${dialog.dataset.date}_${shift}`;
        await db.ref(`attendance/${dialog.dataset.uid}/${attendanceKey}`).update({
            uid: dialog.dataset.uid,
            date: attendanceKey,
            shift: shift,
            shiftName: shift === "night" ? "Ca đêm" : "Ca ngày",
            checkIn: checkIn.getTime(),
            checkInText: `${checkInText}:00`,
            checkOut: checkOut.getTime(),
            checkOutText: `${checkOutText}:00`,
            workUnits: Number(dialog.dataset.workUnits) || 1,
            manualHours: Number(dialog.dataset.manualHours) || null,
            manual: true,
            manualBy: currentUser.uid,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });

        dialog.close();
        showToast("Đã cập nhật chấm công thủ công.", "success");
        await loadAdminMonthlyPayroll();
    } catch (error) {
        console.error("Manual attendance error:", error);
        errorElement.textContent = getFirebaseErrorMessage(error);
    } finally {
        saveButton.disabled = false;
    }
}


async function deletePayrollAttendance() {

    const dialog = document.getElementById("payrollAttendanceDialog");
    if (!isAdmin() || !db || dialog.dataset.existing !== "true") return;
    if (!window.confirm("Xóa dữ liệu chấm công của nhân viên trong ngày này?")) return;

    try {
        await db.ref(`attendance/${dialog.dataset.uid}/${dialog.dataset.attendanceKey}`).remove();
        dialog.close();
        showToast("Đã xóa dữ liệu chấm công trong ngày.", "success");
        await loadAdminMonthlyPayroll();
    } catch (error) {
        console.error("Delete attendance error:", error);
        document.getElementById("payrollAttendanceError").textContent =
            getFirebaseErrorMessage(error);
    }
}


// ============================================================
// LOAD BẢNG CHẤM CÔNG THÁNG
// ============================================================

async function togglePayrollHoliday(button, monthKey) {

    if (!isAdmin() || !db) return;

    const dateKey = button.dataset.date;
    const holidayRef = db.ref(`payrollHolidays/${monthKey}/${dateKey}`);

    try {
        if (button.dataset.holiday === "true") {
            await holidayRef.remove();
            showToast("Đã bỏ đánh dấu ngày lễ.", "info");
        } else {
            await holidayRef.set(true);
            showToast("Đã đánh dấu ngày lễ.", "success");
        }

        await loadAdminMonthlyPayroll();
    } catch (error) {
        console.error("Payroll holiday update error:", error);
        showToast(getFirebaseErrorMessage(error), "error");
    }
}


async function loadAdminMonthlyPayroll() {

    try {

        if (!isAdmin() || !db) {

            console.error(
                "Firebase Database chưa sẵn sàng."
            );

            return;

        }


        const {
            year,
            month
        } =
            payrollGetSelectedMonth();


        const standardWorkDays =
            Number(
                document.getElementById(
                    "adminStandardWorkDays"
                )?.value
            ) || 26;


        const lunchBreakHours =
            Number(
                document.getElementById(
                    "adminLunchBreakHours"
                )?.value
            ) || 1;


        const daysInMonth =
            payrollGetDaysInMonth(
                year,
                month
            );
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;


        // ====================================================
        // ĐỌC FIREBASE
        // ====================================================

        const results =
            await Promise.all([

                db
                    .ref("users")
                    .once("value"),

                db
                    .ref("attendance")
                    .once("value"),

                db
                    .ref("leaves")
                    .once("value")

            ]);


        const usersData =
            results[0].val() || {};


        const attendanceData =
            results[1].val() || {};


        const leavesData =
            results[2].val() || {};

        let holidayDates = {};
        try {
            const holidaySnapshot = await db
                .ref(`payrollHolidays/${monthKey}`)
                .once("value");
            holidayDates = holidaySnapshot.val() || {};
        } catch (holidayError) {
            console.warn(
                "Không tải được danh sách ngày lễ. Kiểm tra Firebase Database Rules.",
                holidayError
            );
        }


        // ====================================================
        // NHÂN VIÊN
        // ====================================================

        const employees =
            [];


        Object.keys(usersData)
            .forEach(function (uid) {

                const user =
                    usersData[uid];


                if (!user) {
                    return;
                }


                if (
                    user.deleted ===
                    true
                ) {

                    return;

                }


                if (
                    user.active ===
                    false
                ) {

                    return;

                }


                employees.push({

                    ...user,

                    uid:
                        uid

                });

            });


        // ====================================================
        // TÍNH
        // ====================================================

        const rows = employees.map(function (user) {
            const dayRow = payrollCalculateEmployee(
                    user,
                    attendanceData,
                    leavesData,
                    year,
                    month,
                    standardWorkDays,
                    lunchBreakHours,
                    holidayDates,
                    "day"
                );
            const nightRow = payrollCalculateEmployee(
                user,
                attendanceData,
                leavesData,
                year,
                month,
                standardWorkDays,
                lunchBreakHours,
                holidayDates,
                "night"
            );
            const daily = {};
            Object.keys(dayRow.daily).forEach(function (dateKey) {
                daily[dateKey] = {
                    day: dayRow.daily[dateKey],
                    night: nightRow.daily[dateKey]
                };
            });

            return {
                ...dayRow,
                shift: "combined",
                workedDays: dayRow.workedDays + nightRow.workedDays,
                paidLeaveDays: dayRow.paidLeaveDays + nightRow.paidLeaveDays,
                unpaidLeaveDays: dayRow.unpaidLeaveDays + nightRow.unpaidLeaveDays,
                totalHours: dayRow.totalHours + nightRow.totalHours,
                holidayWorkDays: dayRow.holidayWorkDays + nightRow.holidayWorkDays,
                payableDays: dayRow.payableDays + nightRow.payableDays,
                actualSalary: dayRow.actualSalary + nightRow.actualSalary,
                daily: daily
            };
        });


        // ====================================================
        // TỔNG
        // ====================================================

        let totalWorkedDays = 0;

        let totalPaidLeave = 0;

        let totalUnpaidLeave = 0;

        let totalHours = 0;

        let totalHolidayWorkDays = 0;

        let totalSalary = 0;


        rows.forEach(
            function (row) {

                totalWorkedDays +=
                    row.workedDays;

                totalPaidLeave +=
                    row.paidLeaveDays;

                totalUnpaidLeave +=
                    row.unpaidLeaveDays;

                totalHours +=
                    row.totalHours;

                totalHolidayWorkDays +=
                    row.holidayWorkDays;

                totalSalary +=
                    row.actualSalary || 0;

            }
        );


        // ====================================================
        // HEADER
        // ====================================================

        const tableHead =
            document.getElementById(
                "adminPayrollTableHead"
            );


        if (!tableHead) {
            return;
        }


        let headerHTML = `

            <tr>

                <th>
                    Nhân viên
                </th>

                <th>
                    Phòng ban
                </th>

                <th>
                    Lương tháng
                </th>

        `;


        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {

            const dateKey =
                `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isHoliday = holidayDates[dateKey] === true;

            headerHTML += `

                <th class="payroll-date">
                    <button type="button" class="payroll-holiday-toggle ${isHoliday ? "is-holiday" : ""}" data-date="${dateKey}" data-holiday="${isHoliday}" aria-label="${isHoliday ? "Bỏ đánh dấu ngày lễ" : "Đánh dấu ngày lễ"} ${dateKey}">
                        <strong>${String(day).padStart(2, "0")}</strong>
                        ${isHoliday ? "<small>LỄ</small>" : ""}
                    </button>
                </th>

            `;

        }


        headerHTML += `

                <th>
                    Ngày công
                </th>

                <th>
                    Nghỉ phép
                </th>

                <th>
                    Nghỉ không lương
                </th>

                <th>
                    Tổng giờ
                </th>

                <th>
                    Ngày lễ
                </th>

                <th>
                    Ngày tính lương
                </th>

                <th>
                    Lương thực tế
                </th>

                <th>
                    Lưu
                </th>

            </tr>

        `;


        tableHead.innerHTML =
            headerHTML;

        tableHead.querySelectorAll(".payroll-holiday-toggle").forEach(function (button) {
            button.addEventListener("click", function () {
                togglePayrollHoliday(button, monthKey);
            });
        });


        // ====================================================
        // BODY
        // ====================================================

        const tableBody =
            document.getElementById(
                "adminPayrollTableBody"
            );


        let bodyHTML = "";


        rows.forEach(
            function (row) {

                bodyHTML += `

                    <tr>

                        <td>

                            <strong>
                                ${
                                    payrollEscapeHtml(
                                        row.name
                                    )
                                }
                            </strong>

                            <br>

                            <small>
                                <span class="payroll-shift-label">CA NGÀY + CA ĐÊM</span>
                                <span>${payrollEscapeHtml(row.email)}</span>
                            </small>

                        </td>


                        <td>

                            ${
                                payrollEscapeHtml(
                                    row.department ||
                                    "—"
                                )
                            }

                        </td>


                        <td>

                            <input

                                type="number"

                                class="salary-input"

                                value="${
                                    row.monthlySalary
                                }"

                                data-uid="${
                                    row.uid
                                }"

                                data-shift="${row.shift}"

                                min="0"

                                step="1000"

                            >

                        </td>

                `;


                for (
                    let day = 1;
                    day <= daysInMonth;
                    day++
                ) {

                    const dateKey =
                        year +
                        "-" +
                        String(month)
                            .padStart(2, "0") +
                        "-" +
                        String(day)
                            .padStart(2, "0");


                    bodyHTML +=
                        payrollRenderDay(
                            row.daily[dateKey],
                            row.uid,
                            dateKey,
                            row.name,
                            holidayDates[dateKey] === true
                        );

                }


                bodyHTML += `

                        <td>
                            ${row.workedDays}
                        </td>

                        <td>
                            ${row.paidLeaveDays}
                        </td>

                        <td>
                            ${row.unpaidLeaveDays}
                        </td>

                        <td>
                            ${
                                payrollFormatHours(
                                    row.totalHours
                                )
                            }
                        </td>

                        <td>
                            ${row.holidayWorkDays}
                        </td>

                        <td>
                            ${row.payableDays}
                        </td>

                        <td>

                            <strong>
                                ${payrollFormatMoney(row.actualSalary)}
                            </strong>

                        </td>

                        <td>

                            <button

                                type="button"

                                class="btn btn-primary"

                                onclick="
                                    saveEmployeeMonthlySalary(
                                        '${row.uid}',
                                        'combined',
                                        this
                                    )
                                "

                            >

                                Lưu

                            </button>

                        </td>

                    </tr>

                `;

            }
        );


        tableBody.innerHTML =
            bodyHTML;

        tableBody.querySelectorAll(".payroll-day-edit").forEach(function (button) {
            button.addEventListener("click", function () {
                openPayrollAttendanceEditor(button);
            });
        });


        // ====================================================
        // FOOTER
        // ====================================================

        const tableFoot =
            document.getElementById(
                "adminPayrollTableFoot"
            );


        tableFoot.innerHTML = `

            <tr>

                <th colspan="3">
                    TỔNG
                </th>

                <th colspan="${daysInMonth}">
                </th>

                <th>
                    ${totalWorkedDays}
                </th>

                <th>
                    ${totalPaidLeave}
                </th>

                <th>
                    ${totalUnpaidLeave}
                </th>

                <th>
                    ${
                        payrollFormatHours(
                            totalHours
                        )
                    }
                </th>

                <th>
                    ${totalHolidayWorkDays}
                </th>

                <th>
                    ${
                        totalWorkedDays
                    }
                </th>

                <th>
                    ${
                        payrollFormatMoney(
                            totalSalary
                        )
                    }
                </th>

                <th>
                </th>

            </tr>

        `;


        // ====================================================
        // SUMMARY
        // ====================================================

        const calendarElement =
            document.getElementById(
                "adminPayrollCalendarDays"
            );


        const daysElement =
            document.getElementById(
                "adminPayrollTotalDays"
            );


        const hoursElement =
            document.getElementById(
                "adminPayrollTotalHours"
            );


        const holidayDaysElement =
            document.getElementById(
            "adminPayrollTotalHolidayDays"
            );


        const salaryElement =
            document.getElementById(
                "adminPayrollTotalSalary"
            );


        if (calendarElement) {

            calendarElement.textContent =
                daysInMonth;

        }


        if (daysElement) {

            daysElement.textContent =
                totalWorkedDays;

        }


        if (hoursElement) {

            hoursElement.textContent =
                payrollFormatHours(
                    totalHours
                );

        }


        if (holidayDaysElement) {

            holidayDaysElement.textContent =
                totalHolidayWorkDays;

        }


        if (salaryElement) {

            salaryElement.textContent =
                payrollFormatMoney(
                    totalSalary
                );

        }


    } catch (error) {

        console.error(
            "Lỗi tải bảng chấm công tháng:",
            error
        );


        alert(
            "Không thể tải bảng chấm công tháng: " +
            error.message
        );

    }

}


// ============================================================
// LƯU LƯƠNG NHÂN VIÊN
// ============================================================

async function saveEmployeeMonthlySalary(
    uid,
    shift,
    button
) {

    try {

        if (!db) {

            alert(
                "Firebase chưa kết nối."
            );

            return;

        }


        const input =
            document.querySelector(
                `.salary-input[data-uid="${uid}"][data-shift="${shift}"]`
            );


        if (!input) {

            alert(
                "Không tìm thấy ô lương."
            );

            return;

        }


        const salary =
            Number(
                input.value
            ) || 0;


        if (salary < 0) {

            alert(
                "Lương không được âm."
            );

            return;

        }


        button.disabled =
            true;


        await db
            .ref(
                "users/" +
                uid
            )
            .update({

                monthlySalary:
                    salary,

                updatedAt:
                    firebase.database.ServerValue
                        .TIMESTAMP

            });


        button.textContent =
            "Đã lưu";


        setTimeout(
            function () {

                button.textContent =
                    "Lưu";

                button.disabled =
                    false;

            },
            1000
        );


        await loadAdminMonthlyPayroll();


    } catch (error) {

        console.error(
            "Lỗi lưu lương:",
            error
        );


        alert(
            "Không thể lưu lương: " +
            error.message
        );


        button.disabled =
            false;

    }

}


// ============================================================
// KHỞI TẠO THÁNG
// ============================================================

function exportAdminPayrollToExcel() {

    if (!isAdmin()) {
        showToast("Bạn không có quyền xuất bảng lương.", "error");
        return;
    }

    if (!window.XLSX) {
        showToast("Không tải được thư viện Excel. Kiểm tra kết nối mạng rồi thử lại.", "error");
        return;
    }

    const sourceTable = document.querySelector("#page-adminPayroll .admin-payroll-table");
    const month = document.getElementById("adminPayrollMonth")?.value || "thang";

    if (!sourceTable || !sourceTable.tBodies[0]?.rows.length) {
        showToast("Hãy tính bảng công trước khi xuất.", "error");
        return;
    }

    try {
        const exportTable = sourceTable.cloneNode(true);

        exportTable.querySelectorAll("input").forEach(function (input) {
            input.replaceWith(document.createTextNode(input.value));
        });

        exportTable.querySelectorAll(".payroll-day-controls").forEach(function (controls) {
            const shifts = Array.from(controls.querySelectorAll("button"))
                .map(function (button) {
                    return button.textContent.replace(/\s+/g, " ").trim();
                })
                .filter(Boolean);
            controls.replaceWith(document.createTextNode(shifts.join(" / ") || "—"));
        });

        exportTable.querySelectorAll("button").forEach(function (button) {
            button.replaceWith(document.createTextNode(button.textContent.replace(/\s+/g, " ").trim()));
        });

        Array.from(exportTable.rows).forEach(function (row) {
            if (row.cells.length) row.deleteCell(row.cells.length - 1);
        });

        const workbook = window.XLSX.utils.table_to_book(exportTable, {
            sheet: "Bảng công",
            raw: true
        });
        const worksheet = workbook.Sheets["Bảng công"];
        const range = window.XLSX.utils.decode_range(worksheet["!ref"]);
        const headerFill = { fgColor: { rgb: "17365D" } };
        const border = {
            top: { style: "thin", color: { rgb: "D9E2F3" } },
            bottom: { style: "thin", color: { rgb: "D9E2F3" } },
            left: { style: "thin", color: { rgb: "D9E2F3" } },
            right: { style: "thin", color: { rgb: "D9E2F3" } }
        };

        for (let col = range.s.c; col <= range.e.c; col++) {
            const address = window.XLSX.utils.encode_cell({ r: range.s.r, c: col });
            if (worksheet[address]) {
                worksheet[address].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
                    fill: headerFill,
                    alignment: { horizontal: "center", vertical: "center", wrapText: true },
                    border
                };
            }
        }

        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const address = window.XLSX.utils.encode_cell({ r: row, c: col });
                if (!worksheet[address]) continue;
                worksheet[address].s = {
                    font: { color: { rgb: "243247" }, sz: 10 },
                    fill: { fgColor: { rgb: row % 2 ? "F3F7FC" : "FFFFFF" } },
                    alignment: { horizontal: col < 2 ? "left" : "center", vertical: "center", wrapText: true },
                    border
                };
            }
        }

        worksheet["!cols"] = Array.from({ length: range.e.c + 1 }, function (_, col) {
            if (col === 0) return { wch: 28 };
            if (col === 1) return { wch: 18 };
            return { wch: 12 };
        });
        worksheet["!rows"] = [{ hpt: 32 }];
        worksheet["!freeze"] = { xSplit: 2, ySplit: 1, topLeftCell: "C2", activePane: "bottomRight", state: "frozen" };
        worksheet["!autofilter"] = { ref: window.XLSX.utils.encode_range(range) };
        window.XLSX.writeFile(workbook, `Bang-cong-${month}.xlsx`);
        showToast("Đã xuất bảng công Excel.", "success");

    } catch (error) {
        console.error("Payroll Excel export error:", error);
        showToast("Không thể xuất Excel: " + error.message, "error");
    }
}

function initializeAdminPayrollMonth() {

    const input =
        document.getElementById(
            "adminPayrollMonth"
        );


    if (!input) {
        return;
    }


    if (!input.value) {

        const now =
            new Date();


        input.value =
            now.getFullYear() +
            "-" +
            String(
                now.getMonth() + 1
            ).padStart(2, "0");

    }

}


// ============================================================
// GẮN SỰ KIỆN
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeAdminPayrollMonth();


        const button =
            document.getElementById(
                "adminPayrollFilterBtn"
            );


        if (button) {

            button.addEventListener(
                "click",
                function () {

                    loadAdminMonthlyPayroll();

                }
            );

        }

        document.getElementById("adminPayrollExportBtn")?.addEventListener(
            "click",
            exportAdminPayrollToExcel
        );

        document.getElementById("payrollAttendanceForm")?.addEventListener(
            "submit",
            savePayrollAttendance
        );
        document.getElementById("payrollAttendanceClose")?.addEventListener("click", function () {
            document.getElementById("payrollAttendanceDialog").close();
        });
        document.getElementById("payrollAttendanceCancel")?.addEventListener("click", function () {
            document.getElementById("payrollAttendanceDialog").close();
        });
        document.getElementById("payrollAttendanceDelete")?.addEventListener(
            "click",
            deletePayrollAttendance
        );
        document.querySelectorAll("[data-attendance-hours]").forEach(function (presetButton) {
            presetButton.addEventListener("click", function () {
                selectPayrollAttendancePreset(Number(presetButton.dataset.attendanceHours));
            });
        });
        ["payrollCheckInTime", "payrollCheckOutTime"].forEach(function (inputId) {
            document.getElementById(inputId)?.addEventListener("input", function () {
                const dialog = document.getElementById("payrollAttendanceDialog");
                if (!dialog.open || !dialog.dataset.manualHours) return;
                dialog.dataset.manualHours = "";
                dialog.dataset.workUnits = "1";
                document.querySelectorAll("[data-attendance-hours]").forEach(function (presetButton) {
                    presetButton.classList.remove("is-selected");
                    presetButton.setAttribute("aria-pressed", "false");
                });
            });
        });

    }
);


// ============================================================
// CHO PHÉP CÁC HÀM ĐƯỢC GỌI TỪ HTML
// ============================================================
// PUBLIC PAYROLL FUNCTIONS
// ============================================================

window.loadAdminMonthlyPayroll =
    loadAdminMonthlyPayroll;

window.saveEmployeeMonthlySalary =
    saveEmployeeMonthlySalary;


/* =====================================================
   FIREBASE ERROR
===================================================== */

function getFirebaseErrorMessage(
    error
) {

    if (!error) {

        return "Đã xảy ra lỗi.";
    }


    console.error(
        "Firebase error:",
        error
    );


    const code =
        error.code ||
        "";


    const messages = {

        "auth/invalid-email":
            "Email không hợp lệ.",

        "auth/user-disabled":
            "Tài khoản Firebase đã bị vô hiệu hóa.",

        "auth/user-not-found":
            "Không tìm thấy tài khoản.",

        "auth/wrong-password":
            "Mật khẩu không chính xác.",

        "auth/invalid-credential":
            "Email hoặc mật khẩu không chính xác.",

        "auth/email-already-in-use":
            "Email này đã được sử dụng.",

        "auth/weak-password":
            "Mật khẩu phải có ít nhất 6 ký tự.",

        "auth/operation-not-allowed":
            "Firebase Authentication Email/Password chưa được bật.",

        "auth/network-request-failed":
            "Không thể kết nối mạng.",

        "database/permission-denied":
            "Firebase Database từ chối quyền truy cập.",

        "storage/unauthorized":
            "Firebase Storage từ chối quyền tải ảnh.",

        "storage/canceled":
            "Đã hủy tải ảnh.",

        "storage/quota-exceeded":
            "Firebase Storage đã vượt giới hạn dung lượng."
    };


    return (
        messages[code] ||
        error.message ||
        "Đã xảy ra lỗi Firebase."
    );
}
