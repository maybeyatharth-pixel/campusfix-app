export type ComplaintCategory =
  | 'Electrical'
  | 'Water'
  | 'Internet'
  | 'Cleanliness'
  | 'Safety'
  | 'Food';

export type ComplaintPriority = 'High' | 'Medium' | 'Low';

export type ComplaintStatus = 'Submitted' | 'Assigned' | 'In Progress' | 'Resolved';

export type AppTab = 'home' | 'report' | 'track' | 'help' | 'profile';

export type ThemeMode = 'light' | 'dark';

export interface UserProfile {
  uid: string;
  displayName: string;
  role: 'student' | 'admin';
  department?: string;
  themePreference: 'light' | 'dark' | 'system';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Complaint {
  id: string;
  ticketCode: string;
  reporterId: string;
  reporterName: string;
  location: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  triageReason: string;
  status: ComplaintStatus;
  latestNote: string;
  photoDataUrl?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface TimelineEvent {
  id: string;
  complaintId: string;
  reporterId: string;
  status: ComplaintStatus;
  note: string;
  actorId: string;
  actorName: string;
  actorRole: 'student' | 'admin';
  createdAtMs: number;
}

export const CATEGORIES: ComplaintCategory[] = [
  'Electrical',
  'Water',
  'Internet',
  'Cleanliness',
  'Safety',
  'Food',
];

export const PRIORITIES: ComplaintPriority[] = ['High', 'Medium', 'Low'];

export const STATUSES: ComplaintStatus[] = [
  'Submitted',
  'Assigned',
  'In Progress',
  'Resolved',
];

export const QUICK_LOCATIONS: string[] = [
  'Main Library · Floor 2',
  'Hostel Block A',
  'Hostel Block B',
  'Science & Innovation Center',
  'Student Union Cafeteria',
  'Engineering Lab Wing',
  'Sports Complex',
  'North Quad Walkway',
];

export const EMERGENCY_CONTACTS = [
  {
    id: 'campus-security',
    name: 'Campus Security Control Room',
    number: '1800-555-0199',
    tel: '18005550199',
    availability: '24/7 Dispatch',
    scope: 'Safety threats, fire alarms, late-night escort, locked buildings',
    urgent: true,
  },
  {
    id: 'medical-center',
    name: 'University Health & Ambulance',
    number: '1800-555-0144',
    tel: '18005550144',
    availability: '24/7 Triage',
    scope: 'Medical emergencies, injury on campus, food poisoning response',
    urgent: true,
  },
  {
    id: 'facilities-hotline',
    name: 'Facilities & Electrical Emergency',
    number: '1800-555-0122',
    tel: '18005550122',
    availability: '24/7 On-Call Engineer',
    scope: 'Power outage, sparking panels, burst water mains, elevator trap',
    urgent: false,
  },
  {
    id: 'it-helpdesk',
    name: 'Campus Network Operations (NOC)',
    number: '1800-555-0177',
    tel: '18005550177',
    availability: '07:00 – 23:00 Daily',
    scope: 'Campus Wi-Fi outages, exam hall LAN failure, eduroam access',
    urgent: false,
  },
];

export const HELP_FAQS = [
  {
    q: 'How does CampusFix auto-categorise and prioritise my report?',
    a: 'When you describe an issue (and optionally attach a photo), CampusFix analyses the location, hazard cues, and visual context to assign one of six facility categories and set High, Medium, or Low priority before routing it to the right team.',
  },
  {
    q: 'How fast are High-priority issues handled?',
    a: 'Safety hazards, sparking electrical fixtures, major water leaks, and acute dining hygiene reports are flagged as High priority and routed for acknowledgement within 15 minutes during active hours. For immediate danger, call Campus Security directly.',
  },
  {
    q: 'Can I track updates after submitting a complaint?',
    a: 'Yes. Open the Track tab and select any report to inspect its full step-by-step status timeline—from Submitted to Assigned, In Progress, and Resolved—along with timestamped notes from facilities staff.',
  },
  {
    q: 'Should I attach a photo when reporting?',
    a: 'Attaching a clear photo helps technicians bring the exact replacement part on their first visit. Photos are automatically compressed on your device before upload.',
  },
  {
    q: 'Who can view my complaint details?',
    a: 'Only you and authorized campus maintenance administrators can access your submitted tickets and status timeline. Your email address is stored privately in your account record.',
  },
];
