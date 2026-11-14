import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  TimelineEvent,
  UserProfile,
} from '../types/campus';

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (val && typeof val === 'object' && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === 'number') {
    return val;
  }
  return Date.now();
}

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '');
}

export function generateTicketCode(): string {
  const num = Math.floor(100000 + Math.random() * 899999);
  return `CF-${num}`;
}

export async function syncUserOnSignIn(
  user: User,
  themePreference: 'light' | 'dark'
): Promise<{ profile: UserProfile; isAdmin: boolean }> {
  const isBootstrapped =
    Boolean(user.emailVerified) && user.email === BOOTSTRAPPED_ADMIN_EMAIL;

  let isAdmin = isBootstrapped;

  if (!isAdmin) {
    const adminRef = doc(db, 'admins', user.uid);
    try {
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        isAdmin = true;
      }
    } catch {
      // Non-admin users without admin doc simply evaluate as student
    }
  } else {
    // Ensure bootstrapped admin has an /admins/{uid} record too
    const adminRef = doc(db, 'admins', user.uid);
    try {
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists() && user.email) {
        await setDoc(adminRef, {
          uid: user.uid,
          email: user.email.slice(0, 160),
          grantedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `admins/${user.uid}`);
    }
  }

  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');

  let existingProfile: UserProfile | null = null;
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      existingProfile = snap.data() as UserProfile;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
  }

  const cleanName = (user.displayName || user.email?.split('@')[0] || 'Campus Member')
    .trim()
    .slice(0, 80);

  if (!existingProfile) {
    const role: 'student' | 'admin' = isAdmin ? 'admin' : 'student';
    const newProfile: UserProfile = {
      uid: user.uid,
      displayName: cleanName,
      role,
      department: isAdmin ? 'Campus Operations' : 'General Campus',
      themePreference,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(userRef, newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    }
    if (user.email) {
      try {
        await setDoc(privateRef, {
          uid: user.uid,
          email: user.email.slice(0, 160),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/private/info`);
      }
    }
    return {
      profile: {
        ...newProfile,
        role: isAdmin ? 'admin' : 'student',
      },
      isAdmin,
    };
  }

  if (existingProfile.role === 'admin') {
    isAdmin = true;
  }

  if (user.email) {
    try {
      const privSnap = await getDoc(privateRef);
      if (!privSnap.exists()) {
        await setDoc(privateRef, {
          uid: user.uid,
          email: user.email.slice(0, 160),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/private/info`);
    }
  }

  return { profile: existingProfile, isAdmin };
}

export async function updateUserProfile(
  uid: string,
  updates: {
    displayName?: string;
    department?: string;
    themePreference?: 'light' | 'dark' | 'system';
  }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.displayName !== undefined) {
    payload.displayName = updates.displayName.trim().slice(0, 80);
  }
  if (updates.department !== undefined) {
    payload.department = updates.department.trim().slice(0, 80);
  }
  if (updates.themePreference !== undefined) {
    payload.themePreference = updates.themePreference;
  }
  try {
    await updateDoc(userRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

export function subscribeToComplaints(
  uid: string,
  isAdminView: boolean,
  onData: (complaints: Complaint[]) => void,
  onError: (err: Error) => void
): () => void {
  const baseCollection = collection(db, 'complaints');
  const q = isAdminView
    ? query(baseCollection)
    : query(baseCollection, where('reporterId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Complaint[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id || docSnap.id),
          ticketCode: String(d.ticketCode || 'CF-000000'),
          reporterId: String(d.reporterId || ''),
          reporterName: String(d.reporterName || 'Student'),
          location: String(d.location || ''),
          description: String(d.description || ''),
          category: (d.category || 'Cleanliness') as ComplaintCategory,
          priority: (d.priority || 'Medium') as ComplaintPriority,
          triageReason: String(d.triageReason || ''),
          status: (d.status || 'Submitted') as ComplaintStatus,
          latestNote: String(d.latestNote || ''),
          photoDataUrl: typeof d.photoDataUrl === 'string' ? d.photoDataUrl : undefined,
          createdAtMs: toMillis(d.createdAt),
          updatedAtMs: toMillis(d.updatedAt),
        };
      });
      items.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'complaints');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeToTimeline(
  complaintId: string,
  uid: string,
  isAdminView: boolean,
  onData: (events: TimelineEvent[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `complaints/${complaintId}/timeline`;
  const timelineCol = collection(db, 'complaints', complaintId, 'timeline');
  const q = isAdminView
    ? query(timelineCol)
    : query(timelineCol, where('reporterId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const events: TimelineEvent[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id || docSnap.id),
          complaintId: String(d.complaintId || complaintId),
          reporterId: String(d.reporterId || ''),
          status: (d.status || 'Submitted') as ComplaintStatus,
          note: String(d.note || ''),
          actorId: String(d.actorId || ''),
          actorName: String(d.actorName || 'Campus Staff'),
          actorRole: (d.actorRole || 'student') as 'student' | 'admin',
          createdAtMs: toMillis(d.createdAt),
        };
      });
      events.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onData(events);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function requestAutoTriage(input: {
  location: string;
  description: string;
  photoDataUrl?: string;
}): Promise<{
  category: ComplaintCategory;
  priority: ComplaintPriority;
  reason: string;
  source: 'gemini' | 'fallback';
}> {
  const response = await fetch('/api/triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Unable to auto-categorise complaint right now.');
  }

  return response.json();
}

export async function createComplaint(params: {
  user: User;
  reporterName: string;
  location: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  triageReason: string;
  photoDataUrl?: string;
}): Promise<{ complaintId: string; ticketCode: string }> {
  const complaintId = generateSafeId('cmp');
  const eventId = generateSafeId('evt');
  const ticketCode = generateTicketCode();
  const initialNote = `Ticket logged under ${params.category} (${params.priority} priority) and queued for review.`;

  const complaintRef = doc(db, 'complaints', complaintId);
  const timelineRef = doc(db, 'complaints', complaintId, 'timeline', eventId);

  const complaintPayload: Record<string, unknown> = {
    id: complaintId,
    ticketCode,
    reporterId: params.user.uid,
    reporterName: params.reporterName.trim().slice(0, 80) || 'Student',
    location: params.location.trim().slice(0, 120),
    description: params.description.trim().slice(0, 2000),
    category: params.category,
    priority: params.priority,
    triageReason: params.triageReason.trim().slice(0, 300),
    status: 'Submitted',
    latestNote: initialNote.slice(0, 500),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (params.photoDataUrl && params.photoDataUrl.length <= 350000) {
    complaintPayload.photoDataUrl = params.photoDataUrl;
  }

  const timelinePayload = {
    id: eventId,
    complaintId,
    reporterId: params.user.uid,
    status: 'Submitted',
    note: initialNote.slice(0, 500),
    actorId: params.user.uid,
    actorName: params.reporterName.trim().slice(0, 80) || 'Student',
    actorRole: 'student',
    createdAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(complaintRef, complaintPayload);
    batch.set(timelineRef, timelinePayload);
    await batch.commit();
    return { complaintId, ticketCode };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `complaints/${complaintId}`);
  }
}

export async function updateComplaintByAdmin(params: {
  complaint: Complaint;
  newStatus: ComplaintStatus;
  note: string;
  newPriority: ComplaintPriority;
  newCategory: ComplaintCategory;
  adminUser: User;
  adminName: string;
}): Promise<void> {
  const cleanNote = params.note.trim().slice(0, 500) || `Status updated to ${params.newStatus}.`;
  const complaintRef = doc(db, 'complaints', params.complaint.id);
  const eventId = generateSafeId('evt');
  const timelineRef = doc(db, 'complaints', params.complaint.id, 'timeline', eventId);

  try {
    const batch = writeBatch(db);
    batch.update(complaintRef, {
      status: params.newStatus,
      latestNote: cleanNote,
      priority: params.newPriority,
      category: params.newCategory,
      updatedAt: serverTimestamp(),
    });
    batch.set(timelineRef, {
      id: eventId,
      complaintId: params.complaint.id,
      reporterId: params.complaint.reporterId,
      status: params.newStatus,
      note: cleanNote,
      actorId: params.adminUser.uid,
      actorName: params.adminName.trim().slice(0, 80) || 'Facilities Admin',
      actorRole: 'admin',
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `complaints/${params.complaint.id}`);
  }
}

export async function seedSampleComplaintsForAdmin(
  adminUser: User,
  adminName: string
): Promise<void> {
  const samples: Array<{
    location: string;
    description: string;
    category: ComplaintCategory;
    priority: ComplaintPriority;
    triageReason: string;
    status: ComplaintStatus;
    note: string;
  }> = [
    {
      location: 'Science & Innovation Center · Lab 204',
      description: 'Overhead fluorescent ballast is buzzing and sparking intermittently near the fume hood switchboard.',
      category: 'Electrical',
      priority: 'High',
      triageReason: 'Electrical sparking near laboratory switchboard poses an immediate fire and shock hazard.',
      status: 'In Progress',
      note: 'Master electrician dispatched to isolate Lab 204 breaker panel and replace ballast.',
    },
    {
      location: 'Hostel Block A · 3rd Floor Washroom',
      description: 'Main cold-water supply pipe joint is leaking steadily onto the corridor tiles outside Room 312.',
      category: 'Water',
      priority: 'High',
      triageReason: 'Active pipe leak creating slip risk and potential water damage on residential floor.',
      status: 'Assigned',
      note: 'Plumbing team assigned; shutoff valve inspection scheduled within 30 minutes.',
    },
    {
      location: 'Main Library · Quiet Study Floor 2',
      description: 'Campus Wi-Fi drops every 5 minutes along the west reading tables during evening study hours.',
      category: 'Internet',
      priority: 'Medium',
      triageReason: 'Recurring wireless access point disruption affecting student study workspace.',
      status: 'Submitted',
      note: 'Ticket logged under Internet (Medium priority) and queued for Network Operations review.',
    },
    {
      location: 'North Quad Walkway · Gate 3',
      description: 'Two pathway bollard lights are out along the steps leading to Gate 3, making the stairs very dark after 6 PM.',
      category: 'Safety',
      priority: 'High',
      triageReason: 'Unlit exterior stairwell creates fall and personal safety risk after dusk.',
      status: 'In Progress',
      note: 'Temporary floodlight positioned; underground cable fault being traced by night crew.',
    },
    {
      location: 'Student Union Cafeteria · Counter 2',
      description: 'Milk dispenser near the espresso station was warm and sour-smelling during morning breakfast service.',
      category: 'Food',
      priority: 'High',
      triageReason: 'Spoiled dairy at active dining counter requires immediate food safety intervention.',
      status: 'Resolved',
      note: 'Unit taken offline immediately, sanitized, and fresh chilled batch verified by dining supervisor.',
    },
    {
      location: 'Engineering Lab Wing · Atrium',
      description: 'Recycling bins near the vending machines have overflowed since yesterday afternoon.',
      category: 'Cleanliness',
      priority: 'Low',
      triageReason: 'Routine waste bin overflow without structural or safety hazard.',
      status: 'Assigned',
      note: 'Custodial shift scheduled for midday clearing and bin liner replacement.',
    },
  ];

  const batchCreate = writeBatch(db);
  const pendingUpdates: Array<{
    complaintId: string;
    status: ComplaintStatus;
    note: string;
  }> = [];

  for (const item of samples) {
    const complaintId = generateSafeId('cmp');
    const eventId1 = generateSafeId('evt');
    const ticketCode = generateTicketCode();
    const complaintRef = doc(db, 'complaints', complaintId);
    const timelineRef1 = doc(db, 'complaints', complaintId, 'timeline', eventId1);

    batchCreate.set(complaintRef, {
      id: complaintId,
      ticketCode,
      reporterId: adminUser.uid,
      reporterName: adminName.trim().slice(0, 80) || 'Campus Member',
      location: item.location,
      description: item.description,
      category: item.category,
      priority: item.priority,
      triageReason: item.triageReason,
      status: 'Submitted',
      latestNote: 'Ticket logged and queued for triage.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batchCreate.set(timelineRef1, {
      id: eventId1,
      complaintId,
      reporterId: adminUser.uid,
      status: 'Submitted',
      note: 'Ticket logged and queued for triage.',
      actorId: adminUser.uid,
      actorName: adminName.trim().slice(0, 80) || 'Campus Member',
      actorRole: 'student',
      createdAt: serverTimestamp(),
    });

    if (item.status !== 'Submitted') {
      pendingUpdates.push({
        complaintId,
        status: item.status,
        note: item.note,
      });
    }
  }

  try {
    await batchCreate.commit();
    if (pendingUpdates.length > 0) {
      const batchUpdate = writeBatch(db);
      for (const upd of pendingUpdates) {
        const complaintRef = doc(db, 'complaints', upd.complaintId);
        const eventId2 = generateSafeId('evt');
        const timelineRef2 = doc(db, 'complaints', upd.complaintId, 'timeline', eventId2);

        batchUpdate.update(complaintRef, {
          status: upd.status,
          latestNote: upd.note,
          updatedAt: serverTimestamp(),
        });
        batchUpdate.set(timelineRef2, {
          id: eventId2,
          complaintId: upd.complaintId,
          reporterId: adminUser.uid,
          status: upd.status,
          note: upd.note,
          actorId: adminUser.uid,
          actorName: adminName.trim().slice(0, 80) || 'Facilities Admin',
          actorRole: 'admin',
          createdAt: serverTimestamp(),
        });
      }
      await batchUpdate.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'complaints');
  }
}
