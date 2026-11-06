# Ảnh Firestore và chuyển avatar từ Storage

Avatar được lưu trong document `avatars/{uid}` dưới dạng WebP base64. App nén ảnh để dữ liệu ảnh không vượt quá 700 KiB, thấp hơn giới hạn 1 MiB/document của Firestore. Trường `users/{uid}.profileImage` trong Realtime Database chỉ lưu tham chiếu Firestore, không chứa ảnh.

## Triển khai

Không cần Cloud Functions hoặc gói Blaze cho ảnh phản hồi. App gửi ảnh đã nén trực tiếp lên Firestore; Firebase Security Rules xác thực admin qua tài liệu vai trò Firestore. Firestore cần được tạo và sử dụng trong hạn mức miễn phí của Firebase; vượt hạn mức có thể yêu cầu bật billing.

1. Tạo Firestore Database trong Firebase Console, nếu chưa có.
2. Với từng admin/superadmin, tạo thủ công tài liệu trong Firestore:

   - Collection: `adminRoles`
   - Document ID: UID của tài khoản admin (lấy từ Firebase Authentication)
   - Trường: `role` (string), giá trị `admin` hoặc `superadmin`

   Không cấp quyền ghi collection `adminRoles` cho app. Khi cấp hoặc thu hồi quyền admin, cập nhật cả `users/{uid}.role` trong Realtime Database và tài liệu `adminRoles/{uid}` trong Firestore. Tài liệu vai trò Firestore chỉ được chỉnh sửa qua Firebase Console hoặc Admin SDK tin cậy.

3. Triển khai Firestore Rules:

   ```powershell
   firebase deploy --only firestore:rules --project <project-id>
   ```

4. Chạy một lần lệnh di chuyển avatar bằng PowerShell, thay giá trị theo Firebase project:

   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\service-account.json"
   $env:FIREBASE_PROJECT_ID = "<project-id>"
   $env:FIREBASE_STORAGE_BUCKET = "<bucket-name>"
   $env:FIREBASE_DATABASE_URL = "https://<project-id>-default-rtdb.firebaseio.com"
   npm run migrate:avatars
   ```

Script chỉ xử lý file trong `avatars/` có tên `{uid}.{jpg|jpeg|png|webp|gif}`. File Storage chỉ bị xóa sau khi ảnh đã được ghi và xác minh trong Firestore, đồng thời hồ sơ Realtime Database đã được cập nhật. File trùng UID hoặc sai định dạng được giữ nguyên và báo lỗi để xử lý thủ công. Chạy lại script an toàn cho các ảnh đã di chuyển.
