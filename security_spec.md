# CampusFix Security Specification

## 1. Data Invariants
1. **Identity Integrity**: A student cannot create a complaint with another user's `reporterId` (`reporterId == request.auth.uid`).
2. **Privilege Escalation Prevention**: A student cannot self-assign `role: "admin"` in `/users/{userId}` or write to `/admins/{adminId}` unless verified as a bootstrapped or existing admin.
3. **Initial State Integrity**: Student-created complaints must start with `status == "Submitted"` (cannot be created already `"Resolved"` or `"In Progress"`).
4. **Terminal State Locking**: Once a complaint reaches `status == "Resolved"`, non-admin users cannot modify it.
5. **PII Isolation**: User email addresses live strictly in `/users/{userId}/private/info` and `/admins/{adminId}`, readable only by the owner or an admin.
6. **Timeline Master Gate & Immutability**: Timeline events under `/complaints/{complaintId}/timeline/{eventId}` must reference an existing parent complaint, preserve its `reporterId`, and cannot be updated or deleted once written.
7. **Server Timestamp Enforcement**: `createdAt` and `updatedAt` must equal `request.time`.
8. **Strict Key & Size Bounds**: Every document enforces `hasAll` + `hasOnly`, regex-validated IDs (`^[a-zA-Z0-9_\-]+$`), and strict string length caps (preventing ghost fields and resource exhaustion).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Create**: Anonymous `create` on `/complaints/c1` -> `PERMISSION_DENIED`.
2. **Unverified Email Create**: User with `email_verified: false` creating `/complaints/c1` -> `PERMISSION_DENIED`.
3. **Identity Spoofing**: Student A (`uid_a`) creates `/complaints/c1` with `reporterId: "uid_b"` -> `PERMISSION_DENIED`.
4. **Privilege Escalation (User Profile)**: Student creates `/users/uid_a` with `role: "admin"` -> `PERMISSION_DENIED`.
5. **Privilege Escalation (Admins Collection)**: Student writes `/admins/uid_a` -> `PERMISSION_DENIED`.
6. **State Shortcutting**: Student creates `/complaints/c1` with `status: "Resolved"` -> `PERMISSION_DENIED`.
7. **Student Admin-Field Tampering**: Student updates their own complaint's `status` to `"Resolved"` or changes `latestNote` -> `PERMISSION_DENIED`.
8. **Shadow / Ghost Field Injection**: Student creates `/complaints/c1` with extra key `isAdminApproved: true` -> `PERMISSION_DENIED`.
9. **Resource Poisoning (ID)**: Client creates `/complaints/invalid id with spaces and $$$` -> `PERMISSION_DENIED`.
10. **PII Blanket Read**: Student A reads `/users/uid_b/private/info` -> `PERMISSION_DENIED`.
11. **Unscoped List Scraping**: Student A lists `/complaints` without `where("reporterId", "==", "uid_a")` -> `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: Client creates `/complaints/c1` with backdated `createdAt` instead of server `request.time` -> `PERMISSION_DENIED`.
