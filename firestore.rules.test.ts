/**
 * Security Rules Specification Tests ("Dirty Dozen" Payloads)
 * Designed for verification against Firestore security rules in firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated create on complaints',
    operation: 'create',
    path: 'complaints/cmp_test_1',
    auth: null,
    payload: { id: 'cmp_test_1', status: 'Submitted' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email creating complaint',
    operation: 'create',
    path: 'complaints/cmp_test_2',
    auth: { uid: 'student_1', email: 's1@campus.edu', email_verified: false },
    payload: { id: 'cmp_test_2', reporterId: 'student_1', status: 'Submitted' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity spoofing with mismatched reporterId',
    operation: 'create',
    path: 'complaints/cmp_test_3',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    payload: { id: 'cmp_test_3', reporterId: 'student_b', status: 'Submitted' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Privilege escalation via user profile role=admin',
    operation: 'create',
    path: 'users/student_a',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    payload: { uid: 'student_a', displayName: 'Attacker', role: 'admin', themePreference: 'light' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Privilege escalation via admins registry write',
    operation: 'create',
    path: 'admins/student_a',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    payload: { uid: 'student_a', email: 'a@campus.edu' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'State shortcutting complaint directly to Resolved',
    operation: 'create',
    path: 'complaints/cmp_test_6',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    payload: { id: 'cmp_test_6', reporterId: 'student_a', status: 'Resolved' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Student attempting to update status or latestNote',
    operation: 'update',
    path: 'complaints/cmp_test_7',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    payload: { status: 'Resolved', latestNote: 'Self approved' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Shadow ghost field injection on complaint',
    operation: 'create',
    path: 'complaints/cmp_test_8',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    payload: { id: 'cmp_test_8', reporterId: 'student_a', status: 'Submitted', isBypassed: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Invalid document ID poisoning with illegal characters',
    operation: 'create',
    path: 'complaints/bad id $$$',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    payload: { id: 'bad id $$$', reporterId: 'student_a', status: 'Submitted' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Cross-user PII read on private subcollection',
    operation: 'get',
    path: 'users/student_b/private/info',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unscoped list query on complaints by non-admin',
    operation: 'list',
    path: 'complaints',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Client timestamp forgery instead of server request.time',
    operation: 'create',
    path: 'complaints/cmp_test_12',
    auth: { uid: 'student_a', email: 'a@campus.edu', email_verified: true },
    payload: { id: 'cmp_test_12', reporterId: 'student_a', status: 'Submitted', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
];
