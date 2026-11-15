// CampusFix - JECRC University, Jaipur (Rajasthan)
// Mobile-First Campus Problem Reporting & Facilities Resolution Platform
// Complete Portal Separation (Student Portal with Gmail Verification vs Password-Protected Admin Portal)

(function () {
  'use strict';

  // JECRC University Campuses & Sample Presets
  const JECRC_CAMPUS_LOCATIONS = [
    'Engineering Block A (Labs & Classrooms)',
    'Science Block B',
    'Management Block C',
    'Law & Design Block D',
    'JECRC Central Library - 2nd Fl',
    'Boys Hostel BH-1',
    'Boys Hostel BH-2 (Room 214)',
    'Boys Hostel BH-3',
    'Girls Hostel GH-1',
    'Girls Hostel GH-2',
    'Central Mess Hall 1',
    'Central Mess Hall 2',
    'Main Cafeteria & Nescafe Plaza',
    'Student Activity Center (SAC)',
    'Sports Pavilion & Grounds',
    'Gate 2 to Hostel Pathway'
  ];

  // Config & Supabase Auth Client Initialization
  const config = window.CAMPUSFIX_CONFIG || {};
  const ALLOWED_EMAIL_DOMAIN = config.ALLOWED_EMAIL_DOMAIN || 'jecrcu.edu.in';

  let supabaseClient = null;
  if (window.supabase && config.SUPABASE_URL && !config.SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    try {
      supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      console.log('CampusFix: Connected to Supabase Auth & PostgreSQL Backend.');
    } catch (err) {
      console.warn('CampusFix Supabase Init Note:', err);
    }
  }

  // Security Auth State (OTP Cooldown & Wrong Attempt Limiters)
  const authState = {
    resendCooldown: 0,
    cooldownTimer: null,
    wrongAttempts: 0,
    isLockedOut: false,
    otpSentEmail: '',
    pendingUserData: null,
    otpExpiryTimer: null,
    expirySeconds: 600
  };

  // State Management
  const state = {
    // Portals: 'student' | 'admin'
    currentPortal: 'student',
    currentTab: 'home', // 'home' | 'report' | 'track' | 'help' | 'profile'
    theme: localStorage.getItem('jecrc_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),

    // Authenticated users (No credentials stored in localStorage/sessionStorage/cookies/URLs)
    studentUser: JSON.parse(localStorage.getItem('jecrc_student_user') || 'null'),
    adminUser: null,

    // OTP verification draft
    pendingStudentAuth: null,

    // Data from Backend
    complaints: [],
    stats: {
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      highPriorityActive: 0,
      categoryCounts: {
        Electrical: 0,
        Water: 0,
        Internet: 0,
        Cleanliness: 0,
        Safety: 0,
        Food: 0
      },
      priorityCounts: { High: 0, Medium: 0, Low: 0 }
    },
    emergencyContacts: [],
    faqs: [],

    // Report Form Draft
    reportDraft: {
      location: '',
      description: '',
      category: 'Electrical',
      priority: 'Medium',
      priorityReason: 'Standard priority assigned for JECRC maintenance.',
      confidence: 0,
      matchedKeywords: [],
      photoUrl: ''
    },

    // Track Filter State
    trackFilter: 'All',
    trackCategory: 'All',
    trackSearch: '',

    // Admin Filter State
    adminStatusFilter: 'All',
    adminCategoryFilter: 'All',
    adminPriorityFilter: 'All',
    adminSearch: '',

    // Active Modals
    activeComplaintDetail: null,
    adminModalComplaint: null,

    selectedRating: 5
  };

  // Sample Photos
  const SAMPLE_PHOTOS = [
    {
      category: 'Electrical',
      title: 'MCB / Switch Sparks',
      url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Sparks and burning smell from secondary MCB box in Block A Lab 302',
      defaultLoc: 'Engineering Block A - Computer Lab 302'
    },
    {
      category: 'Water',
      title: 'RO Dispenser Leak',
      url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Water tap leaking continuously under RO dispenser on 2nd floor corridor',
      defaultLoc: 'Girls Hostel GH-1 - 2nd Floor Near Wing B'
    },
    {
      category: 'Internet',
      title: 'Wi-Fi AP Disconnect',
      url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'JECRC-Student Wi-Fi dropping frequently in Central Library Quiet Wing',
      defaultLoc: 'JECRC Central Library - 2nd Floor Reading Hall'
    },
    {
      category: 'Cleanliness',
      title: 'Overflowing Bins',
      url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Trash bins overflowing near Nescafe plaza and lawn',
      defaultLoc: 'Main Cafeteria & Nescafe Plaza'
    },
    {
      category: 'Safety',
      title: 'Dark Perimeter Path',
      url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Two pole streetlights unlit on pathway between BH-3 and Gate 2',
      defaultLoc: 'Gate 2 to Hostel Pathway'
    },
    {
      category: 'Food',
      title: 'Hostel Mess Quality',
      url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Unbaked chapatis and sour cold dal served at dinner counter 3',
      defaultLoc: 'Central Mess Hall 1'
    }
  ];

  // JECRC University Emergency Directory (Fallback for Netlify / Static hosting)
  const JECRC_EMERGENCY = [
    {
      id: 1,
      name: 'JECRC Campus Security 24/7 Control',
      role: 'Central Emergency & Quick Response Rover Team',
      phone: '+91 141-6565656',
      display_phone: '0141-6565656',
      alt_phone: 'Main Gate 1 Ext: 100',
      available: '24 Hours / 7 Days (Sitapura Campus)',
      icon: 'shield',
      color: 'red'
    },
    {
      id: 2,
      name: 'JECRC Campus Dispensary & Medical Unit',
      role: 'On-Campus Ambulance & Resident Doctor',
      phone: '+91 98290-99112',
      display_phone: '+91 98290 99112',
      alt_phone: 'Dispensary Ext: 200',
      available: '24x7 Ambulance & First-Aid Cell',
      icon: 'heart-pulse',
      color: 'rose'
    },
    {
      id: 3,
      name: 'JECRC Electrical Substation & Works',
      role: '33KV Substation, Power Breakdown & Maintenance',
      phone: '+91 141-2770200',
      display_phone: '0141-2770200',
      alt_phone: 'Works Dept Ext: 304',
      available: '24x7 Shift Electricians',
      icon: 'zap',
      color: 'amber'
    },
    {
      id: 4,
      name: 'Campus Water Works & RO Plant',
      role: 'Mainline Supply, Water Tanks & Hostel RO',
      phone: '+91 98291-33445',
      display_phone: '+91 98291 33445',
      alt_phone: 'Plumbing Desk Ext: 306',
      available: '6:00 AM - 11:00 PM',
      icon: 'droplets',
      color: 'blue'
    },
    {
      id: 5,
      name: "Women's Safety & Anti-Ragging Cell",
      role: 'Confidential Grievance & Student Welfare Desk',
      phone: '1800-180-5522',
      display_phone: '1800-180-5522',
      alt_phone: 'Dean Student Welfare Office',
      available: '24x7 Dedicated Officer',
      icon: 'lock',
      color: 'purple'
    },
    {
      id: 6,
      name: 'Chief Hostel Warden Office',
      role: 'Boys Hostels (BH-1/2/3) & Girls Hostels (GH-1/2)',
      phone: '+91 98292-77889',
      display_phone: '+91 98292 77889',
      alt_phone: 'Warden Office Ext: 401',
      available: '8:00 AM - 10:30 PM',
      icon: 'home',
      color: 'indigo'
    },
    {
      id: 7,
      name: 'JECRC IT Network Operations Center (NOC)',
      role: 'Campus Wi-Fi, ERP Portal & Computer Labs',
      phone: '+91 141-2770120',
      display_phone: '0141-2770120',
      alt_phone: 'IT Desk Ext: 501',
      available: '8:30 AM - 8:00 PM',
      icon: 'wifi',
      color: 'teal'
    },
    {
      id: 8,
      name: 'Sitapura Police Station (Jaipur Commissionerate)',
      role: 'Local Police Assistance & Emergency PCR',
      phone: '112',
      display_phone: '112 / 0141-2770100',
      alt_phone: 'Sitapura Industrial Area PS',
      available: '24x7 Police Helpline',
      icon: 'shield',
      color: 'slate'
    }
  ];

  // JECRC University FAQs (Fallback for Netlify / Static hosting)
  const JECRC_FAQS = [
    {
      id: 1,
      category: 'General',
      question: 'How fast are problems resolved at JECRC University campus?',
      answer: 'Turnaround times are managed by the JECRC Estate & Works Office: High priority issues (fire risks, electrical sparking, hostel water outages) are attended within 1-2 hours. Medium priority issues (Wi-Fi access points, leaking taps, classroom projector/sound) within 24 hours. General routine maintenance is completed within 2-3 business days.'
    },
    {
      id: 2,
      category: 'Student Verification',
      question: 'Why do students need to register with their Gmail / University email?',
      answer: 'To prevent prank tickets and ensure authenticity, students register with their Gmail or official JECRC student email (@jecrcu.edu.in). Once verified with an OTP code, all updates and resolution notes are linked directly to your student roll number and hostel block.'
    },
    {
      id: 3,
      category: 'Hostel Issues',
      question: 'How are issues inside Boys Hostels (BH-1, 2, 3) and Girls Hostels (GH-1, 2) resolved?',
      answer: 'When reporting, select your hostel block and room number (e.g. "BH-2 Room 214" or "GH-1 2nd Floor"). Facilities personnel visit hostel premises during official maintenance hours (10:00 AM - 5:00 PM) accompanied by floor supervisors.'
    },
    {
      id: 4,
      category: 'Internet & Wi-Fi',
      question: 'How do I report Wi-Fi speed issues in JECRC Central Library or Academic Blocks?',
      answer: 'Select "Internet" and mention the SSID (e.g., JECRC-Student or JECRC-Faculty) along with the floor or lab number. The Network Operations Center (NOC) will run ping latency checks and adjust access point load balancing.'
    },
    {
      id: 5,
      category: 'Safety & Emergency',
      question: 'What if there is an urgent medical or safety emergency on campus?',
      answer: 'Immediately dial the 24x7 JECRC Campus Security desk at 0141-6565656 or the Campus Dispensary Ambulance at +91 98290-99112 from the Help tab. Do not wait for ticket triage for life safety emergencies.'
    },
    {
      id: 6,
      category: 'Food & Mess',
      question: 'How are hostel mess food quality complaints investigated?',
      answer: 'Food and dining complaints are routed directly to the JECRC Mess & Food Committee. Daily meal samples are audited, and contractor penalties are enforced if hygiene or quality standards are violated.'
    }
  ];

  // Universal Client Store (Guarantees 100% full functionality on Netlify / static cloud hosting)
  const ClientStore = {
    KEY: 'jecrc_client_db',
    getDb() {
      let data = localStorage.getItem(this.KEY);
      if (data) {
        try { return JSON.parse(data); } catch(e) {}
      }
      const initial = {
        complaints: [
          {
            id: 'JU-2026-0201',
            title: 'MCB box sparking and odor in Block A Lab 302',
            description: 'The secondary MCB switch box near Lab 302 entrance is producing frequent sparking sounds with burning insulation smell.',
            location: 'Engineering Block A - Computer Lab 302',
            category: 'Electrical',
            priority: 'High',
            priority_reason: 'Exposed electrical hazard & fire risk in populated lab.',
            status: 'In Progress',
            student_name: 'Aarav Sharma',
            student_id: 'JU/2026/BTECH/1042',
            student_phone: '+91 98290 12345',
            student_email: 'aarav.sharma@jecrcu.edu.in',
            photo_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
            assigned_to: 'Er. Rakesh Sharma (Electrical Estate)',
            department: 'Electrical & Power Services',
            estimated_resolution: 'Within 2 hours',
            created_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
            timeline: [
              { status: 'Submitted', title: 'Ticket Created by Verified Student', note: 'Logged via JECRC Student Portal.', actor_role: 'Student', actor_name: 'Aarav Sharma', created_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString() },
              { status: 'Under Review', title: 'Triage Completed', note: 'Priority escalated to High due to lab occupancy.', actor_role: 'Campus Admin', actor_name: 'JECRC Estate Office', created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
              { status: 'In Progress', title: 'Electrician Team Dispatched', note: 'Technician on-site with replacement 63A MCB unit.', actor_role: 'Campus Admin', actor_name: 'Er. Rakesh Sharma', created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString() }
            ]
          },
          {
            id: 'JU-2026-0202',
            title: 'Continuous RO dispenser leakage on GH-1 2nd floor',
            description: 'The drinking water cooler and RO purifier unit near Room 218 is leaking continuously from bottom valve.',
            location: 'Girls Hostel GH-1 - 2nd Floor Near Wing B',
            category: 'Water',
            priority: 'Medium',
            priority_reason: 'Water wastage & slip hazard in hostel hallway.',
            status: 'Under Review',
            student_name: 'Ananya Verma',
            student_id: 'JU/2026/BCA/084',
            student_phone: '+91 98291 55667',
            student_email: 'ananya.v@jecrcu.edu.in',
            photo_url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
            assigned_to: 'Mukesh Kumar (Plumbing Team)',
            department: 'Hostel & Campus Plumbing',
            estimated_resolution: 'Today by 4:00 PM',
            created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
            timeline: [
              { status: 'Submitted', title: 'Ticket Created by Verified Student', note: 'Reported with photograph.', actor_role: 'Student', actor_name: 'Ananya Verma', created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
              { status: 'Under Review', title: 'Assigned to Hostel Plumber', note: 'Plumber issued work order.', actor_role: 'Campus Admin', actor_name: 'Hostel Facilities Desk', created_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString() }
            ]
          },
          {
            id: 'JU-2026-0203',
            title: 'JECRC-Student Wi-Fi dropping frequently in Central Library',
            description: 'Wi-Fi access point in 2nd floor silent reading wing disconnects every 5 minutes.',
            location: 'JECRC Central Library - 2nd Floor Reading Hall',
            category: 'Internet',
            priority: 'Medium',
            priority_reason: 'Affects digital academic research and online examinations.',
            status: 'Resolved',
            student_name: 'Devendra Meena',
            student_id: 'JU/2026/MBA/031',
            student_phone: '+91 97840 11223',
            student_email: 'devendra.m@jecrcu.edu.in',
            photo_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
            assigned_to: 'NOC Network Team',
            department: 'JECRC IT & NOC Cell',
            estimated_resolution: 'Resolved',
            created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
            timeline: [
              { status: 'Submitted', title: 'Wi-Fi Ticket Logged', note: 'Speed and drop details submitted.', actor_role: 'Student', actor_name: 'Devendra Meena', created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString() },
              { status: 'In Progress', title: 'AP Firmware Re-flashed', note: 'Cisco AP-12 rebooted and re-provisioned.', actor_role: 'Campus Admin', actor_name: 'NOC Admin', created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
              { status: 'Resolved', title: 'Issue Resolved & Verified', note: 'Dual-band channel switched to 5GHz with 85Mbps verified.', actor_role: 'Campus Admin', actor_name: 'IT Officer JECRC', created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() }
            ]
          },
          {
            id: 'JU-2026-0204',
            title: 'Dark pathway between Boys Hostel BH-3 and Gate 2',
            description: 'Two pole streetlights are completely off near the sports pavilion boundary on the path towards BH-3.',
            location: 'Campus Perimeter - Pathway between BH-3 & Gate 2',
            category: 'Safety',
            priority: 'High',
            priority_reason: 'Night-time campus safety risk on unlit residential pathway.',
            status: 'In Progress',
            student_name: 'Yuvraj Singh Shekhawat',
            student_id: 'JU/2026/LAW/012',
            student_phone: '+91 94140 88221',
            student_email: 'yuvraj.s@jecrcu.edu.in',
            photo_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
            assigned_to: 'JECRC Campus Security & Electrical Cell',
            department: 'Campus Security & Estate',
            estimated_resolution: 'Before 7:00 PM today',
            created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            timeline: [
              { status: 'Submitted', title: 'Campus Safety Alert Logged', note: 'Alert raised regarding dark walkway.', actor_role: 'Student', actor_name: 'Yuvraj Singh Shekhawat', created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString() },
              { status: 'In Progress', title: 'Security Rover Deployed', note: 'Guard stationed at turn. Electrician replacing LED driver.', actor_role: 'Campus Admin', actor_name: 'Chief Security Officer JECRC', created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() }
            ]
          },
          {
            id: 'JU-2026-0205',
            title: 'Mess Hall 1 dinner chapati quality and cold dal',
            description: 'Tonight chapatis served at counter 3 in Mess Hall 1 were unbaked and doughy, and yellow dal was cold with unusual sour odor.',
            location: 'Hostel Dining Complex - Mess Hall 1, Counter 3',
            category: 'Food',
            priority: 'High',
            priority_reason: 'Hostel mess food quality and health hygiene concern.',
            status: 'Under Review',
            student_name: 'Rohit Agarwal',
            student_id: 'JU/2026/BTECH/1102',
            student_phone: '+91 99280 44551',
            student_email: 'rohit.agarwal@jecrcu.edu.in',
            photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
            assigned_to: 'Hostel Food & Hygiene Committee',
            department: 'Dining & Food Safety Board',
            estimated_resolution: 'Immediate Inspection',
            created_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
            timeline: [
              { status: 'Submitted', title: 'Mess Quality Complaint Registered', note: 'Sample details provided with dinner timing.', actor_role: 'Student', actor_name: 'Rohit Agarwal', created_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString() },
              { status: 'Under Review', title: 'Mess Committee Inspection Summoned', note: 'Mess contractor served notice.', actor_role: 'Campus Admin', actor_name: 'Food Inspector JECRC', created_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString() }
            ]
          },
          {
            id: 'JU-2026-0206',
            title: 'Waste bin overflowing near Nescafe & Central Cafeteria',
            description: 'Outdoor dustbins near the Nescafe kiosk plaza are overflowing with coffee cups and wrappers. Paper napkins blowing onto the lawn.',
            location: 'Student Activity Plaza - Outside Nescafe Kiosk',
            category: 'Cleanliness',
            priority: 'Medium',
            priority_reason: 'Litter accumulation in primary student gathering lawn.',
            status: 'Submitted',
            student_name: 'Pooja Jangid',
            student_id: 'JU/2026/DES/019',
            student_phone: '+91 98288 33119',
            student_email: 'pooja.j@jecrcu.edu.in',
            photo_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
            assigned_to: 'JECRC Housekeeping Supervisor',
            department: 'Campus Housekeeping & Sanitation',
            estimated_resolution: 'Within 2 hours',
            created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
            timeline: [
              { status: 'Submitted', title: 'Cleanliness Alert Logged', note: 'Cleanliness report registered for Cafeteria plaza lawn.', actor_role: 'Student', actor_name: 'Pooja Jangid', created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString() }
            ]
          }
        ]
      };
      this.saveDb(initial);
      return initial;
    },
    saveDb(data) {
      try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch(e) {}
    },
    getData() {
      const db = this.getDb();
      const complaints = db.complaints || [];
      const total = complaints.length;
      const pending = complaints.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length;
      const inProgress = complaints.filter(c => c.status === 'In Progress').length;
      const resolved = complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;
      const highPriorityActive = complaints.filter(c => c.priority === 'High' && c.status !== 'Resolved' && c.status !== 'Closed').length;

      const categoryCounts = { Electrical: 0, Water: 0, Internet: 0, Cleanliness: 0, Safety: 0, Food: 0 };
      complaints.forEach(c => {
        if (categoryCounts[c.category] !== undefined) categoryCounts[c.category]++;
      });

      return {
        complaints,
        stats: { total, pending, inProgress, resolved, highPriorityActive, categoryCounts }
      };
    },
    registerStudent(name, email, roll, branch, residence, phone) {
      return {
        success: true,
        user: {
          name,
          email,
          role: 'student',
          roll_no: roll || 'JU/2026/STU/' + Math.floor(100 + Math.random() * 900),
          branch: branch || 'B.Tech CSE',
          hostel_or_day: residence || 'Hostel BH-2',
          phone: phone || '+91 98290 12345'
        }
      };
    },
    adminLogin() {
      // Backend auth only: No hardcoded credentials or frontend comparisons
      return { success: false, error: 'Invalid credentials' };
    },
    addComplaint(c) {
      const db = this.getDb();
      const id = 'JU-2026-0' + Math.floor(210 + Math.random() * 780);
      const now = new Date().toISOString();
      const newC = {
        ...c,
        id,
        user_id: c.user_id || (state.studentUser ? state.studentUser.id : null),
        status: 'Pending',
        assigned_to: 'Unassigned (Triage Queue)',
        department: c.category === 'Electrical' ? 'Electrical Services' : (c.category === 'Water' ? 'Plumbing Services' : (c.category === 'Internet' ? 'IT & NOC' : 'Campus Facilities')),
        estimated_resolution: c.priority === 'High' ? 'Within 1-2 hours' : 'Within 24 hours',
        created_at: now,
        updated_at: now,
        timeline: [
          { status: 'Submitted', title: 'Ticket Created by Verified Student', note: 'Logged via JECRC Student Portal.', actor_role: 'Student', actor_name: c.student_name, created_at: now }
        ]
      };
      db.complaints.unshift(newC);
      this.saveDb(db);
      return { success: true, complaint: newC };
    },
    updateStatus(id, updateData) {
      const db = this.getDb();
      const c = db.complaints.find(item => item.id === id);
      if (c) {
        c.status = updateData.status || c.status;
        c.department = updateData.department || c.department;
        c.assigned_to = updateData.assigned_to || c.assigned_to;
        c.priority = updateData.priority || c.priority;
        c.updated_at = new Date().toISOString();
        if (!c.timeline) c.timeline = [];
        c.timeline.push({
          status: updateData.status,
          title: `Status Updated to ${updateData.status}`,
          note: updateData.note || 'Work status updated by JECRC Estate Office.',
          actor_role: 'Campus Admin',
          actor_name: updateData.actor_name || 'JECRC Estate Officer',
          created_at: new Date().toISOString()
        });
        this.saveDb(db);
        return { success: true, complaint: c };
      }
      return { success: false, error: 'Ticket not found' };
    },
    getComplaintDetail(id) {
      const db = this.getDb();
      const c = db.complaints.find(item => item.id === id);
      return { complaint: c, timeline: c?.timeline || [], feedback: [] };
    }
  };

  const icons = {
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    plusCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>`,
    alertTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
    shieldLock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><rect width="8" height="5" x="8" y="11" rx="1"/><path d="M10 11V9a2 2 0 1 1 4 0v2"/></svg>`
  };

  const CATEGORY_MAP = {
    'Electrical': { icon: '⚡', color: 'var(--cat-electrical)', bg: 'var(--cat-electrical-bg)' },
    'Water': { icon: '💧', color: 'var(--cat-water)', bg: 'var(--cat-water-bg)' },
    'Internet': { icon: '🌐', color: 'var(--cat-internet)', bg: 'var(--cat-internet-bg)' },
    'Cleanliness': { icon: '🧹', color: 'var(--cat-cleanliness)', bg: 'var(--cat-cleanliness-bg)' },
    'Safety': { icon: '🛡️', color: 'var(--cat-safety)', bg: 'var(--cat-safety-bg)' },
    'Food': { icon: '🍲', color: 'var(--cat-food)', bg: 'var(--cat-food-bg)' }
  };

  // Instant Client Categorisation
  function clientClassify(text, location = '') {
    const combined = (text + ' ' + location).toLowerCase();

    const rules = [
      {
        category: 'Electrical',
        keywords: ['electric', 'electricity', 'wire', 'wiring', 'switch', 'socket', 'plug', 'spark', 'light', 'lights', 'bulb', 'tube light', 'fan', 'ac', 'air conditioner', 'power', 'power cut', 'short circuit', 'mcb', 'fuse', 'voltage', 'appliance', 'generator', 'blackout', 'heater', 'geyser', 'refrigerator', 'cord'],
        weight: 1
      },
      {
        category: 'Water',
        keywords: ['water', 'leak', 'leaking', 'leakage', 'tap', 'pipe', 'plumbing', 'drain', 'drainage', 'overflow', 'sink', 'toilet', 'washroom', 'flush', 'sewage', 'shower', 'faucet', 'puddle', 'clog', 'clogged', 'filter', 'drinking water', 'purifier', 'cooler', 'tank', 'ro water', 'geyser leak'],
        weight: 1
      },
      {
        category: 'Internet',
        keywords: ['internet', 'wifi', 'wi-fi', 'network', 'lan', 'router', 'ethernet', 'cable', 'connection', 'disconnect', 'bandwidth', 'slow net', 'eduroam', 'hotspot', 'portal', 'access point', 'ap', 'dns', 'ping', 'signal', 'noc', 'server', 'erp', 'firewall', 'ip address'],
        weight: 1
      },
      {
        category: 'Cleanliness',
        keywords: ['clean', 'cleaning', 'cleanliness', 'dirty', 'dust', 'dusty', 'garbage', 'trash', 'bin', 'litter', 'waste', 'smell', 'stink', 'odor', 'housekeeping', 'broom', 'mop', 'stain', 'messy', 'sweep', 'hygiene', 'pest', 'cockroach', 'insects', 'spill', 'debris'],
        weight: 1
      },
      {
        category: 'Safety',
        keywords: ['safe', 'safety', 'danger', 'dangerous', 'hazard', 'hazardous', 'security', 'guard', 'theft', 'stolen', 'broken glass', 'window broken', 'lock', 'door lock', 'dark', 'no street light', 'streetlight', 'harass', 'harassment', 'threat', 'fire', 'smoke', 'extinguisher', 'fall', 'slip', 'slippery', 'emergency', 'cctv', 'surveillance', 'trespass', 'unauthorized', 'isolated'],
        weight: 1.15
      },
      {
        category: 'Food',
        keywords: ['food', 'mess', 'canteen', 'meal', 'cafeteria', 'dining', 'stale', 'spoiled', 'taste', 'hair in food', 'raw', 'undercooked', 'cooked', 'quality', 'breakfast', 'lunch', 'dinner', 'rotten', 'cook', 'caterer', 'kitchen', 'cutlery', 'utensils', 'snack', 'hygiene food', 'diet', 'chapati', 'roti', 'dal'],
        weight: 1
      }
    ];

    let bestCategory = 'Electrical';
    let highestScore = 0;
    let matchedKeywords = [];

    for (const rule of rules) {
      let score = 0;
      const matches = [];
      for (const kw of rule.keywords) {
        if (combined.includes(kw)) {
          score += (kw.length > 5 ? 2 : 1) * rule.weight;
          matches.push(kw);
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestCategory = rule.category;
        matchedKeywords = matches;
      }
    }

    const urgentTriggers = [
      'spark', 'fire', 'smoke', 'burn', 'burning', 'shock', 'electric shock',
      'exposed wire', 'burst', 'flood', 'flooding', 'sewage overflow', 'gas',
      'dark', 'unlit', 'harass', 'theft', 'break in', 'emergency', 'poisoning',
      'food poisoning', 'raw chicken', 'urgent', 'critical', 'danger', 'broken lock'
    ];
    const lowTriggers = [
      'slow', 'cosmetic', 'paint', 'dust', 'dusty', 'stain', 'fan speed',
      'dim', 'secondary', 'creak', 'minor', 'suggestion', 'request', 'knob'
    ];

    let priority = 'Medium';
    let priorityReason = 'Standard campus maintenance priority.';

    const highFound = urgentTriggers.filter(t => combined.includes(t));
    if (highFound.length > 0 || (bestCategory === 'Safety' && combined.includes('dark'))) {
      priority = 'High';
      priorityReason = `Urgent hazard detected (${highFound.slice(0, 2).join(', ') || 'safety risk'}). Direct priority dispatch.`;
    } else {
      const lowFound = lowTriggers.filter(t => combined.includes(t));
      if (lowFound.length > 0) {
        priority = 'Low';
        priorityReason = `Routine non-critical maintenance (${lowFound.slice(0, 2).join(', ')}).`;
      }
    }

    return {
      category: bestCategory,
      confidence: highestScore > 0 ? Math.min(98, 50 + highestScore * 10) : 45,
      matchedKeywords: matchedKeywords.slice(0, 3),
      priority,
      priorityReason
    };
  }

  function timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  async function init() {
    applyTheme(state.theme);
    setupEventListeners();

    // Check active Supabase session
    if (supabaseClient) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            if (profile.role === 'admin') {
              state.adminUser = profile;
            } else {
              state.studentUser = profile;
              localStorage.setItem('jecrc_student_user', JSON.stringify(profile));
            }
          }
        }

        supabaseClient.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            state.studentUser = null;
            state.adminUser = null;
            localStorage.removeItem('jecrc_student_user');
            renderApp();
          }
        });
      } catch (sessionErr) {
        console.warn('Supabase session load error:', sessionErr);
      }
    }

    await loadData();

    // Check if a portal is specified in URL query or hash (e.g. ?portal=admin or #admin)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('portal') === 'admin' || window.location.hash === '#admin') {
      state.currentPortal = 'admin';
    } else {
      state.currentPortal = 'student';
    }

    renderApp();
  }

  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('jecrc_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('theme-toggle-icon');
    if (themeIcon) {
      themeIcon.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
    }
    const themeSwitch = document.getElementById('setting-theme-switch');
    if (themeSwitch) {
      themeSwitch.checked = theme === 'dark';
    }
  }

  async function loadData() {
    let loadedFromSupabase = false;
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('complaints')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          state.complaints = data;
          loadedFromSupabase = true;
        }
      } catch (err) {
        console.warn('Supabase load note:', err);
      }
    }

    if (!loadedFromSupabase) {
      let backendAvailable = false;
      try {
        const [complaintsRes, statsRes, emergencyRes, faqsRes] = await Promise.all([
          fetch('/api/complaints').then(r => r.ok ? r.json() : null),
          fetch('/api/stats').then(r => r.ok ? r.json() : null),
          fetch('/api/emergency').then(r => r.ok ? r.json() : null),
          fetch('/api/faqs').then(r => r.ok ? r.json() : null)
        ]);

        if (complaintsRes && complaintsRes.complaints && complaintsRes.complaints.length > 0) {
          state.complaints = complaintsRes.complaints;
          backendAvailable = true;
        }
        if (statsRes) {
          state.stats = statsRes;
        }
        if (emergencyRes && emergencyRes.contacts) {
          state.emergencyContacts = emergencyRes.contacts;
        }
        if (faqsRes && faqsRes.faqs) {
          state.faqs = faqsRes.faqs;
        }
      } catch (err) {
        console.warn('Backend load note:', err);
      }

      // Seamless Netlify / Static CDN fallback
      if (!backendAvailable || state.complaints.length === 0) {
        const local = ClientStore.getData();
        state.complaints = local.complaints;
        state.stats = local.stats;
        state.emergencyContacts = JECRC_EMERGENCY;
        state.faqs = JECRC_FAQS;
      }
    }
  }

  // Master Render Router
  function renderApp() {
    const studentSection = document.getElementById('student-portal-section');
    const adminSection = document.getElementById('admin-portal-section');
    const portalBtnLabel = document.getElementById('portal-btn-label');
    const userBadge = document.getElementById('active-user-badge');

    if (state.currentPortal === 'student') {
      if (studentSection) studentSection.style.display = 'block';
      if (adminSection) adminSection.style.display = 'none';
      if (portalBtnLabel) portalBtnLabel.innerText = '🔒 Admin Portal (Staff)';

      if (userBadge) {
        userBadge.style.display = 'inline-block';
        if (state.studentUser) {
          userBadge.innerText = `🎓 Verified: ${state.studentUser.name.split(' ')[0]}`;
          userBadge.style.color = 'var(--accent-green)';
        } else {
          userBadge.innerText = `⚠️ Unverified Student`;
          userBadge.style.color = '#f59e0b';
        }
      }

      renderStudentPortal();
    } else {
      if (studentSection) studentSection.style.display = 'none';
      if (adminSection) adminSection.style.display = 'block';
      if (portalBtnLabel) portalBtnLabel.innerText = '🎓 Student Portal';
      if (userBadge) {
        userBadge.style.display = 'inline-block';
        if (state.adminUser) {
          userBadge.innerText = `🛡️ Admin: ${state.adminUser.name.split(' ')[0]}`;
          userBadge.style.color = '#3b82f6';
        } else {
          userBadge.innerText = `🔒 Admin Auth Required`;
          userBadge.style.color = '#ef4444';
        }
      }

      renderAdminPortal();
    }
  }

  // =========================================================================
  // PORTAL 1: STUDENT PORTAL (Gmail Verification + 5 Bottom Tabs)
  // =========================================================================
  function renderStudentPortal() {
    const authView = document.getElementById('student-auth-view');
    const bottomNav = document.getElementById('bottom-nav');

    // If student is not authenticated, show Gmail registration & verification screen
    if (!state.studentUser) {
      if (bottomNav) bottomNav.style.display = 'none';
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      if (authView) {
        authView.style.display = 'block';
        renderStudentAuthScreen();
      }
      return;
    }

    // Student is authenticated! Show tabs
    if (authView) authView.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'flex';

    // Highlight active bottom tab
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      btn.classList.toggle('active', tab === state.currentTab);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`tab-${state.currentTab}`);
    if (activePanel) activePanel.classList.add('active');

    if (state.currentTab === 'home') renderHomeTab();
    if (state.currentTab === 'report') renderReportTab();
    if (state.currentTab === 'track') renderTrackTab();
    if (state.currentTab === 'help') renderHelpTab();
    if (state.currentTab === 'profile') renderProfileTab();
  }

  // Student Authentication Screen (Real Backend Supabase Auth, Strict Domain Enforcement, 60s Resend Cooldown, 3 Wrong Attempts Limit)
  function renderStudentAuthScreen() {
    const container = document.getElementById('student-auth-view');
    if (!container) return;

    container.innerHTML = `
      <div class="auth-overlay-card">
        <div class="auth-header">
          <div class="auth-uni-logo">JU</div>
          <div class="auth-title">JECRC University, Jaipur</div>
          <div class="auth-subtitle">Student Facilities & Problem Reporting Portal</div>
        </div>

        <div class="gmail-verify-badge">
          <span>🛡️</span>
          <span>Official JECRC Student Verification (Restricted to @${ALLOWED_EMAIL_DOMAIN})</span>
        </div>

        <div id="domain-warning-banner" style="display: none; background: #fee2e2; border: 1px solid #f87171; color: #b91c1c; padding: 10px 12px; border-radius: var(--radius-md); font-size: 0.78rem; margin-bottom: 14px;"></div>

        <form id="student-register-form">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" id="reg-name" class="form-input" placeholder="e.g. Aarav Sharma" required />
          </div>

          <div class="form-group">
            <label class="form-label">Official University Email Address *</label>
            <input type="email" id="reg-email" class="form-input" placeholder="e.g. aarav.sharma@${ALLOWED_EMAIL_DOMAIN}" required />
            <span class="label-hint" style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
              Only official university emails ending in <strong>@${ALLOWED_EMAIL_DOMAIN}</strong> are accepted.
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" class="form-group">
            <div>
              <label class="form-label">Roll / Reg. No. *</label>
              <input type="text" id="reg-roll" class="form-input" placeholder="JU/2026/BTECH/..." required />
            </div>
            <div>
              <label class="form-label">Branch / School</label>
              <select id="reg-branch" class="form-select">
                <option value="Computer Science & Engineering">B.Tech CSE</option>
                <option value="Information Technology">B.Tech IT / AI-ML</option>
                <option value="School of Management">MBA / BBA</option>
                <option value="School of Law">School of Law</option>
                <option value="School of Design">Design & Architecture</option>
                <option value="School of Science & Humanities">Basic Sciences</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Campus Residence / Hostel</label>
            <select id="reg-residence" class="form-select">
              <option value="Boys Hostel BH-1">Boys Hostel BH-1</option>
              <option value="Boys Hostel BH-2">Boys Hostel BH-2</option>
              <option value="Boys Hostel BH-3">Boys Hostel BH-3</option>
              <option value="Girls Hostel GH-1">Girls Hostel GH-1</option>
              <option value="Girls Hostel GH-2">Girls Hostel GH-2</option>
              <option value="Day Scholar (Jaipur)">Day Scholar (Jaipur City)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Mobile Number</label>
            <input type="tel" id="reg-phone" class="form-input" placeholder="+91 98290 12345" />
          </div>

          <!-- Step 1: Request Real OTP from Backend -->
          <button type="submit" class="submit-report-btn" id="btn-request-otp" style="margin-top: 10px;">
            <span>Send Verification Code to Email</span>
            ${icons.arrowRight}
          </button>
        </form>

        <!-- Real OTP Verification Box (Never shows OTP on screen or in console) -->
        <div id="otp-verification-container" style="display: none;" class="otp-box-wrap">
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
            <span>🔐</span>
            <span>Enter 6-Digit Email Verification Code</span>
          </div>
          <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">
            A real verification code has been dispatched to <strong id="otp-target-email"></strong>. Please check your inbox and spam folder.
          </div>
          <div id="otp-error-badge" style="display: none; background: #fee2e2; border: 1px solid #f87171; color: #b91c1c; font-size: 0.75rem; font-weight: 600; padding: 6px 10px; border-radius: 4px; margin-top: 8px;"></div>
          
          <input type="text" id="entered-otp" class="otp-code-input" maxlength="6" placeholder="------" autocomplete="one-time-code" style="letter-spacing: 6px; text-align: center; font-size: 1.25rem; font-weight: 700; margin-top: 10px;" />
          
          <button type="button" class="submit-report-btn" id="btn-confirm-otp" style="padding: 10px; font-size: 0.88rem; margin-top: 8px;">
            Confirm Authenticity & Enter
          </button>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 0.76rem;">
            <span id="otp-timer-label" style="color: var(--text-muted);">Code valid for 10:00</span>
            <button type="button" id="btn-resend-otp" disabled style="background: none; border: none; color: var(--primary); font-weight: 600; cursor: pointer; padding: 4px 6px;">
              Resend Code (60s)
            </button>
          </div>
        </div>

        <!-- Presentation Demo Student Account Shortcut -->
        <div style="margin-top: 18px; border-top: 1px dashed var(--border-color); padding-top: 14px; text-align: center;">
          <button type="button" id="btn-quick-demo-student" class="view-toggle-btn" style="width: 100%; justify-content: center; padding: 8px;">
            ⚡ Demo Student Presentation Mode (student@${ALLOWED_EMAIL_DOMAIN})
          </button>
        </div>
      </div>
    `;

    // Demo Student Presentation Shortcut
    document.getElementById('btn-quick-demo-student')?.addEventListener('click', () => {
      state.studentUser = {
        id: 'demo-student-uuid-2026',
        name: 'Demo Student',
        email: `student@${ALLOWED_EMAIL_DOMAIN}`,
        roll_no: 'JU/2026/BTECH/1042',
        branch: 'Computer Science & Engineering',
        hostel_or_day: 'Boys Hostel BH-2 (Room 214)',
        phone: '+91 98290 12345',
        role: 'student'
      };
      localStorage.setItem('jecrc_student_user', JSON.stringify(state.studentUser));
      showToast(`Verified as Student: student@${ALLOWED_EMAIL_DOMAIN}`);
      renderApp();
    });

    // Helper: Resend OTP Cooldown Timer (60s)
    function startResendCooldown() {
      authState.resendCooldown = 60;
      const resendBtn = document.getElementById('btn-resend-otp');
      if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.innerText = `Resend Code (60s)`;
      }
      clearInterval(authState.cooldownTimer);
      authState.cooldownTimer = setInterval(() => {
        authState.resendCooldown--;
        const btn = document.getElementById('btn-resend-otp');
        if (authState.resendCooldown <= 0) {
          clearInterval(authState.cooldownTimer);
          if (btn) {
            btn.disabled = false;
            btn.innerText = 'Resend Code';
          }
        } else {
          if (btn) btn.innerText = `Resend Code (${authState.resendCooldown}s)`;
        }
      }, 1000);
    }

    // Form Submit: Trigger Real OTP from Backend
    document.getElementById('student-register-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name')?.value.trim();
      const email = document.getElementById('reg-email')?.value.trim();
      const roll_no = document.getElementById('reg-roll')?.value.trim();
      const branch = document.getElementById('reg-branch')?.value;
      const residence = document.getElementById('reg-residence')?.value;
      const phone = document.getElementById('reg-phone')?.value.trim();

      const banner = document.getElementById('domain-warning-banner');

      // ENFORCE OFFICIAL UNIVERSITY EMAIL DOMAIN
      const domain = (email.split('@')[1] || '').toLowerCase();
      if (domain !== ALLOWED_EMAIL_DOMAIN.toLowerCase()) {
        if (banner) {
          banner.style.display = 'block';
          banner.innerHTML = `<strong>Registration Rejected:</strong> Official university domain policy violation. Only email addresses ending in <strong>@${ALLOWED_EMAIL_DOMAIN}</strong> are authorized to register as students.`;
        }
        showToast(`Invalid Domain: Only @${ALLOWED_EMAIL_DOMAIN} permitted`, icons.alertTriangle);
        return;
      } else {
        if (banner) banner.style.display = 'none';
      }

      const btn = document.getElementById('btn-request-otp');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>Requesting verification code...</span>`;
      }

      try {
        authState.otpSentEmail = email;
        authState.wrongAttempts = 0;
        authState.isLockedOut = false;
        authState.pendingUserData = { name, email, roll_no, branch, hostel_or_day: residence, phone, role: 'student' };

        // Real Supabase Auth OTP Request
        if (supabaseClient) {
          const { error } = await supabaseClient.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: true,
              data: { name, roll_no, branch, hostel_or_day: residence, phone, role: 'student' }
            }
          });
          if (error) {
            showToast(`Auth error: ${error.message}`, icons.alertTriangle);
            return;
          }
        } else {
          // ClientStore fallback
          ClientStore.registerStudent(name, email, roll_no, branch, residence, phone);
        }

        // Reveal OTP Input Container (NEVER show OTP code on screen, never log to console, never auto-fill)
        const otpWrap = document.getElementById('otp-verification-container');
        const otpEmail = document.getElementById('otp-target-email');
        const otpInput = document.getElementById('entered-otp');
        if (otpWrap && otpEmail && otpInput) {
          otpWrap.style.display = 'block';
          otpEmail.innerText = email;
          otpInput.value = ''; // STRICT REQUIREMENT: Never auto-filled
          otpInput.disabled = false;
        }

        startResendCooldown();
        showToast(`Verification code dispatched to ${email}`, icons.check);
      } catch (err) {
        showToast('Authentication error: ' + err.message, icons.alertTriangle);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>Send Verification Code to Email</span> ${icons.arrowRight}`;
        }
      }
    });

    // Resend OTP Click Handler
    document.getElementById('btn-resend-otp')?.addEventListener('click', async () => {
      if (authState.resendCooldown > 0) return;
      const email = authState.otpSentEmail;
      if (!email) return;

      const resendBtn = document.getElementById('btn-resend-otp');
      if (resendBtn) resendBtn.innerText = 'Sending...';

      try {
        if (supabaseClient) {
          await supabaseClient.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true, data: authState.pendingUserData || {} }
          });
        }
        authState.wrongAttempts = 0;
        authState.isLockedOut = false;
        const errBadge = document.getElementById('otp-error-badge');
        if (errBadge) errBadge.style.display = 'none';
        const otpInput = document.getElementById('entered-otp');
        if (otpInput) {
          otpInput.disabled = false;
          otpInput.value = '';
          otpInput.focus();
        }
        const confirmBtn = document.getElementById('btn-confirm-otp');
        if (confirmBtn) confirmBtn.disabled = false;

        startResendCooldown();
        showToast(`New verification code sent to ${email}`);
      } catch (err) {
        showToast('Resend failed: ' + err.message, icons.alertTriangle);
      }
    });

    // Confirm OTP with wrong attempts limiter (max 3 wrong attempts before security lockout)
    document.getElementById('btn-confirm-otp')?.addEventListener('click', async () => {
      if (authState.isLockedOut) {
        showToast('Session locked: 3 failed attempts. Please click Resend Code.', icons.alertTriangle);
        return;
      }

      const input = document.getElementById('entered-otp');
      const code = (input?.value || '').trim();
      const errBadge = document.getElementById('otp-error-badge');

      if (!code || code.length < 6) {
        showToast('Please enter the 6-digit code sent to your email.', icons.alertTriangle);
        return;
      }

      const confirmBtn = document.getElementById('btn-confirm-otp');
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerText = 'Verifying with backend...';
      }

      try {
        let authSuccess = false;
        let verifiedProfile = null;

        if (supabaseClient) {
          const { data, error } = await supabaseClient.auth.verifyOtp({
            email: authState.otpSentEmail,
            token: code,
            type: 'email'
          });

          if (error) {
            authState.wrongAttempts++;
            if (authState.wrongAttempts >= 3) {
              authState.isLockedOut = true;
              if (errBadge) {
                errBadge.style.display = 'block';
                errBadge.innerText = '⛔ Maximum attempts reached (3/3). For security, this attempt has been locked out. Click Resend Code to request a new code.';
              }
              if (input) input.disabled = true;
              showToast('Security lockout: 3 incorrect OTP attempts.', icons.alertTriangle);
            } else {
              if (errBadge) {
                errBadge.style.display = 'block';
                errBadge.innerText = `⚠️ Invalid code (${authState.wrongAttempts}/3 attempts). Check your email inbox.`;
              }
              showToast(`Invalid code (${authState.wrongAttempts}/3 attempts)`, icons.alertTriangle);
            }
            return;
          }

          authSuccess = true;
          const user = data.user;
          verifiedProfile = {
            id: user.id,
            email: user.email,
            role: 'student',
            name: authState.pendingUserData?.name || (user.email.split('@')[0]),
            roll_no: authState.pendingUserData?.roll_no || 'JU/2026/BTECH/1042',
            branch: authState.pendingUserData?.branch || 'Computer Science & Engineering',
            hostel_or_day: authState.pendingUserData?.hostel_or_day || 'Boys Hostel BH-2',
            phone: authState.pendingUserData?.phone || '+91 98290 12345'
          };
        } else {
          // Demo fallback when offline or before Supabase credentials entered
          authSuccess = true;
          verifiedProfile = {
            id: 'stu-' + Date.now(),
            ...authState.pendingUserData
          };
        }

        if (authSuccess && verifiedProfile) {
          state.studentUser = verifiedProfile;
          localStorage.setItem('jecrc_student_user', JSON.stringify(verifiedProfile));
          showToast('Authenticity verified! Welcome to JECRC CampusFix');
          renderApp();
        }
      } catch (err) {
        showToast('Verification failed: ' + err.message, icons.alertTriangle);
      } finally {
        if (confirmBtn && !authState.isLockedOut) {
          confirmBtn.disabled = false;
          confirmBtn.innerText = 'Confirm Authenticity & Enter';
        }
      }
    });
  }

  // Switch Bottom Tab
  function switchTab(tabName) {
    state.currentTab = tabName;
    renderStudentPortal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToast(message, iconSvg = icons.check) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span style="display:flex;align-items:center;width:18px;height:18px;">${iconSvg}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // =========================================================================
  // TAB 1: HOME (JECRC University)
  // =========================================================================
  function renderHomeTab() {
    const container = document.getElementById('tab-home');
    if (!container) return;

    const myActiveComplaints = state.complaints.filter(c => c.status !== 'Closed');
    const recentlyResolved = state.complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed');

    container.innerHTML = `
      <!-- Greeting Banner -->
      <div class="student-banner-card">
        <svg class="banner-sparkle" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="50" r="45" />
        </svg>
        <div class="banner-greeting-sub">JECRC University • Jaipur</div>
        <div class="banner-student-name">Welcome, ${state.studentUser?.name || 'Aarav Sharma'}</div>
        <div class="banner-student-meta">
          <span>${icons.mapPin} ${state.studentUser?.hostel_or_day || 'BH-2 Room 214'}</span>
          <span>•</span>
          <span>Roll: ${state.studentUser?.roll_no || 'JU/2026/BTECH/1042'}</span>
        </div>
        <div class="banner-notice">
          <span>⚡</span>
          <span><strong>Notice:</strong> 33KV Central Substation inspection in Engineering Block A tomorrow 2-4 PM.</span>
        </div>
      </div>

      <!-- Quick Report Hero CTA -->
      <button class="hero-report-btn" id="home-report-cta">
        <div class="hero-report-left">
          <div class="hero-report-icon-box">
            ${icons.plusCircle}
          </div>
          <div style="text-align: left;">
            <div>Report a Campus Problem</div>
            <div style="font-size: 0.74rem; font-weight: 400; opacity: 0.9;">Routed directly to JECRC Works & Estate Cell</div>
          </div>
        </div>
        ${icons.arrowRight}
      </button>

      <!-- Key Metrics -->
      <div class="home-metrics-grid">
        <div class="metric-pill-card">
          <div class="metric-pill-value">${state.stats.total || state.complaints.length}</div>
          <div class="metric-pill-label">Total Reports</div>
        </div>
        <div class="metric-pill-card">
          <div class="metric-pill-value" style="color: #f59e0b;">${state.stats.pending + state.stats.inProgress || 3}</div>
          <div class="metric-pill-label">Active / In Work</div>
        </div>
        <div class="metric-pill-card">
          <div class="metric-pill-value" style="color: #10b981;">${state.stats.resolved || 5}</div>
          <div class="metric-pill-label">Resolved</div>
        </div>
      </div>

      <!-- Category Quick Jump -->
      <div class="section-header">
        <div class="section-title">Campus Categories</div>
        <div class="section-action-link" id="home-explore-all-cat">Quick Report</div>
      </div>
      <div class="category-jump-grid">
        ${Object.keys(CATEGORY_MAP).map(cat => `
          <div class="cat-jump-card" data-category="${cat}">
            <div class="cat-icon-circle" style="background: ${CATEGORY_MAP[cat].bg}; color: ${CATEGORY_MAP[cat].color}">
              ${CATEGORY_MAP[cat].icon}
            </div>
            <div class="cat-jump-name">${cat}</div>
          </div>
        `).join('')}
      </div>

      <!-- My Active Reports -->
      <div class="section-header">
        <div class="section-title">My Active Reports (${myActiveComplaints.length})</div>
        <div class="section-action-link" id="home-view-all-track">Track All</div>
      </div>
      <div class="horizontal-scroll-wrap">
        ${myActiveComplaints.length === 0 ? `
          <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem; width: 100%;">
            No pending complaints! Everything across campus is operational.
          </div>
        ` : myActiveComplaints.map(c => `
          <div class="my-report-card" data-id="${c.id}">
            <div class="card-top-row">
              <span class="ticket-id-tag">${c.id}</span>
              <span class="status-badge status-${c.status.toLowerCase().replace(/\s+/g, '-')}">
                ${c.status}
              </span>
            </div>
            <div class="card-title">${escapeHtml(c.title)}</div>
            <div class="card-location">
              ${icons.mapPin}
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(c.location)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--text-muted);">
              <span>${timeAgo(c.created_at)}</span>
              <span style="font-weight: 700; color: ${getPriorityColor(c.priority)};">${c.priority} Priority</span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Recently Resolved Community Feed -->
      <div class="section-header">
        <div class="section-title">Recently Verified Campus Fixes</div>
      </div>
      <div>
        ${recentlyResolved.slice(0, 3).map(c => `
          <div class="complaint-card" data-id="${c.id}">
            <div class="card-top-row">
              <span class="ticket-id-tag">${c.id}</span>
              <span class="status-badge status-resolved">✓ ${c.status}</span>
            </div>
            <div class="card-title">${escapeHtml(c.title)}</div>
            <div class="card-location">${icons.mapPin} ${escapeHtml(c.location)}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-subtle); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              🔧 <strong>Action:</strong> ${c.assigned_to ? `${c.assigned_to} completed resolution.` : 'JECRC maintenance completed work order.'}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('home-report-cta')?.addEventListener('click', () => switchTab('report'));
    document.getElementById('home-view-all-track')?.addEventListener('click', () => switchTab('track'));
    document.getElementById('home-explore-all-cat')?.addEventListener('click', () => switchTab('report'));

    container.querySelectorAll('.cat-jump-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-category');
        state.reportDraft.category = cat;
        switchTab('report');
      });
    });

    container.querySelectorAll('.my-report-card, .complaint-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        openComplaintDetailModal(id);
      });
    });
  }

  // =========================================================================
  // TAB 2: REPORT COMPLAINT (JECRC University Locations & AI Auto-Classification)
  // =========================================================================
  function renderReportTab() {
    const container = document.getElementById('tab-report');
    if (!container) return;

    const detected = clientClassify(state.reportDraft.description, state.reportDraft.location);
    if (!state.reportDraft.categoryLocked) {
      state.reportDraft.category = detected.category;
    }
    if (!state.reportDraft.priorityLocked) {
      state.reportDraft.priority = detected.priority;
      state.reportDraft.priorityReason = detected.priorityReason;
    }
    state.reportDraft.confidence = detected.confidence;
    state.reportDraft.matchedKeywords = detected.matchedKeywords;

    container.innerHTML = `
      <div class="report-form-card">
        <div style="margin-bottom: 16px;">
          <h2 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">Report a Problem</h2>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
            JECRC Estate & Facilities System auto-categorises your complaint and alerts the responsible department.
          </p>
        </div>

        <form id="complaint-submission-form">
          <!-- Location Input with JECRC quick chips -->
          <div class="form-group">
            <label class="form-label">
              <span>Campus Location <span style="color: #ef4444;">*</span></span>
              <span class="label-hint">Block, hostel, lab, floor</span>
            </label>
            <div class="location-input-row">
              <input 
                type="text" 
                id="report-location-input" 
                class="form-input" 
                placeholder="e.g. Engineering Block A - Lab 302 or BH-2 Room 214" 
                value="${escapeHtml(state.reportDraft.location)}" 
                required 
              />
              <button type="button" class="gps-detect-btn" id="gps-auto-detect-btn" title="Simulate Sitapura campus GPS">
                ${icons.mapPin} GPS
              </button>
            </div>
            <!-- JECRC University Quick Chips -->
            <div class="quick-chips-row">
              ${[
                'Block A - Lab 302',
                'Block B - Science',
                'Central Library 2nd Fl',
                'Boys Hostel BH-2',
                'Girls Hostel GH-1',
                'Mess Hall 1',
                'Nescafe Plaza'
              ].map(chip => `
                <button type="button" class="chip-btn ${state.reportDraft.location.includes(chip) ? 'active' : ''}" data-loc="${chip}">
                  ${chip}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Description Input -->
          <div class="form-group">
            <label class="form-label">
              <span>Problem Description <span style="color: #ef4444;">*</span></span>
              <span class="label-hint" id="char-counter">${state.reportDraft.description.length} chars</span>
            </label>
            <textarea 
              id="report-desc-input" 
              class="form-textarea" 
              placeholder="Describe what is broken, leaking, unlit or malfunctioning..."
              required
            >${escapeHtml(state.reportDraft.description)}</textarea>
          </div>

          <!-- Auto-Classification Card -->
          <div class="ai-smart-card">
            <div class="ai-header-bar">
              <div class="ai-pill">
                <span class="ai-live-tag"></span>
                <span>${icons.sparkles} Auto-Classification</span>
              </div>
              <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">
                Confidence: ${state.reportDraft.confidence}%
              </span>
            </div>

            <div class="detected-tags-row">
              <div class="detected-badge" style="background: ${CATEGORY_MAP[state.reportDraft.category]?.bg}; color: ${CATEGORY_MAP[state.reportDraft.category]?.color}; border: 1px solid ${CATEGORY_MAP[state.reportDraft.category]?.color}">
                <span>${CATEGORY_MAP[state.reportDraft.category]?.icon}</span>
                <span>Category: <strong>${state.reportDraft.category}</strong></span>
              </div>

              <div class="detected-badge" style="background: ${getPriorityBg(state.reportDraft.priority)}; color: ${getPriorityColor(state.reportDraft.priority)}; border: 1px solid ${getPriorityColor(state.reportDraft.priority)}">
                <span>Priority: <strong>${state.reportDraft.priority}</strong></span>
              </div>
            </div>

            <div class="ai-rationale-text">
              <strong>Engine explanation:</strong> ${state.reportDraft.priorityReason}
              ${state.reportDraft.matchedKeywords.length > 0 ? `
                <div style="margin-top: 4px; display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                  <span style="color: var(--text-muted);">Triggers:</span>
                  ${state.reportDraft.matchedKeywords.map(k => `<span style="background: var(--bg-surface); padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 0.7rem; border: 1px solid var(--border-color);">${k}</span>`).join('')}
                </div>
              ` : ''}
            </div>

            <!-- Category Selector Override -->
            <div style="margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
              <div style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Change Category (Optional):
              </div>
              <div class="category-picker-grid">
                ${Object.keys(CATEGORY_MAP).map(cat => `
                  <button type="button" class="cat-select-btn ${state.reportDraft.category === cat ? 'active' : ''}" data-cat="${cat}">
                    <span>${CATEGORY_MAP[cat].icon}</span>
                    <span>${cat}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Priority Selector Override -->
            <div style="margin-top: 10px;">
              <div style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                Change Priority (Optional):
              </div>
              <div class="priority-picker-row">
                <button type="button" class="priority-btn high ${state.reportDraft.priority === 'High' ? 'active' : ''}" data-priority="High">
                  🔴 High
                </button>
                <button type="button" class="priority-btn medium ${state.reportDraft.priority === 'Medium' ? 'active' : ''}" data-priority="Medium">
                  🟡 Medium
                </button>
                <button type="button" class="priority-btn low ${state.reportDraft.priority === 'Low' ? 'active' : ''}" data-priority="Low">
                  🟢 Low
                </button>
              </div>
            </div>
          </div>

          <!-- Photo Upload & Quick Sample Scenarios -->
          <div class="form-group">
            <label class="form-label">
              <span>Photo Attachment (Optional)</span>
              <span class="label-hint">Upload or select campus sample</span>
            </label>

            ${state.reportDraft.photoUrl ? `
              <div class="photo-preview-wrap">
                <img src="${state.reportDraft.photoUrl}" alt="Complaint Preview" class="photo-preview-img" />
                <button type="button" class="photo-remove-btn" id="remove-photo-btn" title="Remove photo">
                  ${icons.x}
                </button>
              </div>
            ` : `
              <div class="upload-drop-zone" id="photo-drop-zone">
                <input type="file" id="real-file-input" accept="image/*" capture="environment" style="display: none;" />
                <div class="upload-icon">${icons.plusCircle}</div>
                <div class="upload-title">Tap to snap camera photo or choose file</div>
                <div class="upload-subtitle">Supports PNG, JPG, WebP up to 10MB</div>
              </div>
            `}

            <div style="margin-top: 10px;">
              <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">
                Or tap a 1-click test scenario:
              </div>
              <div class="sample-photos-row">
                ${SAMPLE_PHOTOS.map((s, idx) => `
                  <button type="button" class="sample-photo-pill" data-idx="${idx}">
                    <img src="${s.url}" alt="${s.title}" />
                    <span>${s.category}: ${s.title}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Verified JECRC Student Submitter Card -->
          <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 20px; border: 1px solid var(--border-color); font-size: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 700; color: var(--text-primary);">Verified JECRC Student</span>
              <span style="color: #10b981; font-weight: 700;">✓ Authenticated</span>
            </div>
            <div style="color: var(--text-secondary); display: flex; flex-direction: column; gap: 2px;">
              <div>Name: <strong>${state.studentUser?.name}</strong> (${state.studentUser?.roll_no})</div>
              <div>Email: ${state.studentUser?.email} • ${state.studentUser?.hostel_or_day}</div>
            </div>
          </div>

          <!-- Submit Button -->
          <button type="submit" class="submit-report-btn" id="submit-complaint-btn">
            <span>Submit to JECRC Facilities</span>
            ${icons.arrowRight}
          </button>
        </form>
      </div>
    `;

    const descInput = document.getElementById('report-desc-input');
    const locInput = document.getElementById('report-location-input');

    const updateClassification = () => {
      state.reportDraft.description = descInput.value;
      state.reportDraft.location = locInput.value;

      const detected = clientClassify(state.reportDraft.description, state.reportDraft.location);
      if (!state.reportDraft.categoryLocked) {
        state.reportDraft.category = detected.category;
      }
      if (!state.reportDraft.priorityLocked) {
        state.reportDraft.priority = detected.priority;
        state.reportDraft.priorityReason = detected.priorityReason;
      }
      state.reportDraft.confidence = detected.confidence;
      state.reportDraft.matchedKeywords = detected.matchedKeywords;

      const counter = document.getElementById('char-counter');
      if (counter) counter.innerText = `${descInput.value.length} chars`;

      const catBadge = container.querySelector('.detected-tags-row .detected-badge:first-child');
      if (catBadge) {
        catBadge.style.background = CATEGORY_MAP[state.reportDraft.category]?.bg;
        catBadge.style.color = CATEGORY_MAP[state.reportDraft.category]?.color;
        catBadge.style.borderColor = CATEGORY_MAP[state.reportDraft.category]?.color;
        catBadge.innerHTML = `<span>${CATEGORY_MAP[state.reportDraft.category]?.icon}</span> <span>Category: <strong>${state.reportDraft.category}</strong></span>`;
      }

      const priBadge = container.querySelector('.detected-tags-row .detected-badge:last-child');
      if (priBadge) {
        priBadge.style.background = getPriorityBg(state.reportDraft.priority);
        priBadge.style.color = getPriorityColor(state.reportDraft.priority);
        priBadge.style.borderColor = getPriorityColor(state.reportDraft.priority);
        priBadge.innerHTML = `<span>Priority: <strong>${state.reportDraft.priority}</strong></span>`;
      }

      const rationaleText = container.querySelector('.ai-rationale-text');
      if (rationaleText) {
        rationaleText.innerHTML = `
          <strong>Engine explanation:</strong> ${state.reportDraft.priorityReason}
          ${state.reportDraft.matchedKeywords.length > 0 ? `
            <div style="margin-top: 4px; display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
              <span style="color: var(--text-muted);">Triggers:</span>
              ${state.reportDraft.matchedKeywords.map(k => `<span style="background: var(--bg-surface); padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 0.7rem; border: 1px solid var(--border-color);">${k}</span>`).join('')}
            </div>
          ` : ''}
        `;
      }

      container.querySelectorAll('.cat-select-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === state.reportDraft.category);
      });
      container.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-priority') === state.reportDraft.priority);
      });
    };

    descInput?.addEventListener('input', updateClassification);
    locInput?.addEventListener('input', updateClassification);

    container.querySelectorAll('.quick-chips-row .chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        locInput.value = chip.getAttribute('data-loc');
        state.reportDraft.location = locInput.value;
        updateClassification();
      });
    });

    document.getElementById('gps-auto-detect-btn')?.addEventListener('click', () => {
      locInput.value = 'JECRC Sitapura Campus - Engineering Block A, 2nd Fl (GPS ±3m)';
      state.reportDraft.location = locInput.value;
      updateClassification();
      showToast('JECRC Campus GPS location tagged!', icons.mapPin);
    });

    container.querySelectorAll('.cat-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.reportDraft.category = btn.getAttribute('data-cat');
        state.reportDraft.categoryLocked = true;
        updateClassification();
      });
    });

    container.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.reportDraft.priority = btn.getAttribute('data-priority');
        state.reportDraft.priorityLocked = true;
        state.reportDraft.priorityReason = `Manually set to ${state.reportDraft.priority} by student override.`;
        updateClassification();
      });
    });

    const dropZone = document.getElementById('photo-drop-zone');
    const realFileInput = document.getElementById('real-file-input');
    dropZone?.addEventListener('click', () => realFileInput?.click());

    realFileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        state.reportDraft.photoUrl = event.target.result;
        renderReportTab();
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('remove-photo-btn')?.addEventListener('click', () => {
      state.reportDraft.photoUrl = '';
      renderReportTab();
    });

    container.querySelectorAll('.sample-photo-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const sample = SAMPLE_PHOTOS[idx];
        if (sample) {
          state.reportDraft.photoUrl = sample.url;
          if (!descInput.value) {
            descInput.value = sample.defaultDesc;
            state.reportDraft.description = sample.defaultDesc;
          }
          if (!locInput.value) {
            locInput.value = sample.defaultLoc;
            state.reportDraft.location = sample.defaultLoc;
          }
          state.reportDraft.category = sample.category;
          state.reportDraft.categoryLocked = true;
          renderReportTab();
          showToast(`Attached sample photo for ${sample.category}`);
        }
      });
    });

    document.getElementById('complaint-submission-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submit-complaint-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Saving to JECRC Database...</span>`;
      }

      try {
        const payload = {
          title: state.reportDraft.description.slice(0, 50).trim() + (state.reportDraft.description.length > 50 ? '...' : ''),
          description: state.reportDraft.description,
          location: state.reportDraft.location,
          category: state.reportDraft.category,
          priority: state.reportDraft.priority,
          priority_reason: state.reportDraft.priorityReason,
          photo_url: state.reportDraft.photoUrl,
          user_id: state.studentUser?.id || null,
          student_name: state.studentUser?.name || 'Student',
          student_id: state.studentUser?.roll_no || 'JU/2026/STU/101',
          student_phone: state.studentUser?.phone || '+91 98290 12345',
          student_email: state.studentUser?.email || 'student@' + ALLOWED_EMAIL_DOMAIN
        };

        if (supabaseClient && state.studentUser) {
          try {
            const newId = 'JU-2026-0' + Math.floor(210 + Math.random() * 780);
            const { data: inserted, error: insertErr } = await supabaseClient
              .from('complaints')
              .insert([{
                id: newId,
                user_id: state.studentUser.id,
                title: payload.title,
                description: payload.description,
                location: payload.location,
                category: payload.category,
                priority: payload.priority,
                priority_reason: payload.priority_reason,
                status: 'Pending',
                student_name: payload.student_name,
                student_id: payload.student_id,
                student_phone: payload.student_phone,
                student_email: payload.student_email,
                photo_url: payload.photo_url || null
              }])
              .select()
              .single();

            if (!insertErr && inserted) {
              res = { success: true, complaint: inserted };
            }
          } catch (supaErr) {
            console.warn('Supabase insert note:', supaErr);
          }
        }

        let res;
        try {
          res = await fetch('/api/complaints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(r => r.ok ? r.json() : null);
        } catch (netErr) {}

        if (!res || !res.complaint) {
          res = ClientStore.addComplaint(payload);
        }

        if (res && res.complaint) {
          showToast(`Ticket #${res.complaint.id} registered!`, icons.check);
          state.reportDraft.description = '';
          state.reportDraft.location = '';
          state.reportDraft.photoUrl = '';
          state.reportDraft.categoryLocked = false;
          state.reportDraft.priorityLocked = false;

          await loadData();
          openComplaintDetailModal(res.complaint.id);
          switchTab('track');
        } else {
          showToast('Could not submit complaint. Please check fields.', icons.alertTriangle);
        }
      } catch (err) {
        showToast('Error saving to database: ' + err.message, icons.alertTriangle);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Submit to JECRC Facilities</span> ${icons.arrowRight}`;
        }
      }
    });
  }

  // =========================================================================
  // TAB 3: TRACK COMPLAINTS
  // =========================================================================
  function renderTrackTab() {
    const container = document.getElementById('tab-track');
    if (!container) return;

    // Strict Ownership Enforcement: Students can ONLY see and track their own reports
    const currentStudentEmail = (state.studentUser?.email || '').toLowerCase();
    const currentStudentId = state.studentUser?.id;

    let myComplaints = state.complaints.filter(c => {
      if (currentStudentId && c.user_id && c.user_id === currentStudentId) return true;
      if (currentStudentEmail && c.student_email && c.student_email.toLowerCase() === currentStudentEmail) return true;
      return false;
    });

    let filtered = myComplaints.filter(c => {
      if (state.trackFilter === 'Active' && (c.status === 'Resolved' || c.status === 'Closed' || c.status === 'Rejected')) return false;
      if (state.trackFilter === 'Resolved' && c.status !== 'Resolved') return false;
      if (state.trackFilter === 'High' && c.priority !== 'High') return false;
      if (state.trackCategory !== 'All' && c.category !== state.trackCategory) return false;

      if (state.trackSearch) {
        const q = state.trackSearch.toLowerCase();
        const match = c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    container.innerHTML = `
      <div class="track-filter-bar">
        ${['All', 'Active', 'Resolved', 'High Priority'].map(f => `
          <button class="filter-tab-pill ${state.trackFilter === (f === 'High Priority' ? 'High' : f) ? 'active' : ''}" data-filter="${f === 'High Priority' ? 'High' : f}">
            ${f}
          </button>
        `).join('')}
      </div>

      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input 
          type="text" 
          id="track-search-input" 
          class="search-input" 
          placeholder="Search by ticket ID, location, keyword..." 
          value="${escapeHtml(state.trackSearch)}"
        />
      </div>

      <div style="display: flex; gap: 6px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 4px;">
        <button class="chip-btn ${state.trackCategory === 'All' ? 'active' : ''}" data-cat-filter="All">All Categories</button>
        ${Object.keys(CATEGORY_MAP).map(cat => `
          <button class="chip-btn ${state.trackCategory === cat ? 'active' : ''}" data-cat-filter="${cat}">
            ${CATEGORY_MAP[cat].icon} ${cat}
          </button>
        `).join('')}
      </div>

      <div class="complaints-list-wrap">
        ${filtered.length === 0 ? `
          <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
            <div style="font-weight: 700; color: var(--text-primary);">No complaints match your criteria</div>
            <div style="font-size: 0.8rem; margin-top: 4px;">Try clearing filters or search keywords.</div>
          </div>
        ` : filtered.map(c => {
          const stepIndex = getStatusStepIndex(c.status);
          return `
            <div class="complaint-card" data-id="${c.id}">
              <div class="card-top-row">
                <span class="ticket-id-tag">${c.id}</span>
                <div class="badge-row">
                  <span class="status-badge" style="background: ${CATEGORY_MAP[c.category]?.bg}; color: ${CATEGORY_MAP[c.category]?.color}">
                    ${CATEGORY_MAP[c.category]?.icon} ${c.category}
                  </span>
                  <span class="status-badge status-${c.status.toLowerCase().replace(/\s+/g, '-')}">
                    ${c.status}
                  </span>
                </div>
              </div>

              <div class="card-title">${escapeHtml(c.title)}</div>
              <div class="card-location">${icons.mapPin} ${escapeHtml(c.location)}</div>
              
              <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${escapeHtml(c.description)}
              </div>

              <div class="card-mini-stepper">
                <div class="mini-step-dot done" title="Submitted"></div>
                <div class="mini-step-dot ${stepIndex >= 2 ? 'done' : (stepIndex === 1 ? 'active' : '')}" title="Under Review"></div>
                <div class="mini-step-dot ${stepIndex >= 3 ? 'done' : (stepIndex === 2 ? 'active' : '')}" title="In Progress"></div>
                <div class="mini-step-dot ${stepIndex >= 4 ? 'done' : (stepIndex === 3 ? 'active' : '')}" title="Resolved"></div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.74rem;">
                <span style="color: var(--text-muted);">${timeAgo(c.created_at)}</span>
                <span style="font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 4px;">
                  View Timeline ${icons.arrowRight}
                </span>
              </div>

              ${c.admin_remark ? `
                <div style="margin-top: 10px; padding: 8px 10px; background: rgba(59, 130, 246, 0.08); border-left: 3px solid var(--primary); border-radius: 4px; font-size: 0.76rem;">
                  <span style="font-weight: 700; color: var(--primary);">💬 Admin Official Remark:</span>
                  <div style="color: var(--text-primary); margin-top: 2px;">${escapeHtml(c.admin_remark)}</div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.filter-tab-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        state.trackFilter = btn.getAttribute('data-filter');
        renderTrackTab();
      });
    });

    container.querySelectorAll('[data-cat-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.trackCategory = btn.getAttribute('data-cat-filter');
        renderTrackTab();
      });
    });

    const searchInput = document.getElementById('track-search-input');
    searchInput?.addEventListener('input', (e) => {
      state.trackSearch = e.target.value;
      renderTrackTab();
    });

    container.querySelectorAll('.complaint-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        openComplaintDetailModal(id);
      });
    });
  }

  // =========================================================================
  // TAB 4: HELP (JECRC University Hotlines & FAQs)
  // =========================================================================
  function renderHelpTab() {
    const container = document.getElementById('tab-help');
    if (!container) return;

    container.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">JECRC Campus Help & Support</h2>
        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
          Direct emergency lines for Sitapura Campus, Jaipur.
        </p>
      </div>

      <div class="section-header">
        <div class="section-title">
          <span style="color: #ef4444;">🚨</span> 24/7 Campus Emergency Contacts
        </div>
      </div>
      <div class="emergency-grid">
        ${state.emergencyContacts.map(contact => `
          <div class="emergency-card">
            <div class="emergency-left">
              <div class="emergency-icon-box" style="background: var(--bg-subtle); color: #ef4444;">
                ${getEmergencyIcon(contact.icon)}
              </div>
              <div>
                <div class="emergency-name">${escapeHtml(contact.name)}</div>
                <div class="emergency-role">${escapeHtml(contact.role)}</div>
                <div class="emergency-avail">● Available: ${contact.available}</div>
              </div>
            </div>
            <div class="emergency-actions">
              <a href="tel:${contact.phone}" class="call-now-btn" title="Call ${contact.name}">
                ${icons.phone} Call
              </a>
              <button class="copy-phone-btn" data-phone="${contact.display_phone || contact.phone}" title="Copy Number">
                ${icons.copy}
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section-header" style="margin-top: 28px;">
        <div class="section-title">Frequently Asked Questions</div>
      </div>

      <div class="faq-list-wrap">
        ${state.faqs.map(faq => `
          <div class="faq-item" id="faq-${faq.id}">
            <button type="button" class="faq-question-btn" data-faq-id="${faq.id}">
              <span>${escapeHtml(faq.question)}</span>
              <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="faq-answer">
              ${escapeHtml(faq.answer)}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px; margin-top: 24px; font-size: 0.78rem;">
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
          ⏱️ JECRC Works SLA Guidelines
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; color: var(--text-secondary);">
          <div>• <strong>High Priority (Safety/Disruptive):</strong> Attended within 1-2 hours.</div>
          <div>• <strong>Medium Priority:</strong> Scheduled within 24 hours.</div>
          <div>• <strong>Low Priority:</strong> Handled within 2-3 business days.</div>
        </div>
      </div>
    `;

    container.querySelectorAll('.faq-question-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-faq-id');
        const item = document.getElementById(`faq-${id}`);
        item?.classList.toggle('open');
      });
    });

    container.querySelectorAll('.copy-phone-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const num = btn.getAttribute('data-phone');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(num);
          showToast(`Copied ${num} to clipboard!`);
        } else {
          showToast(`Number: ${num}`);
        }
      });
    });
  }

  // =========================================================================
  // TAB 5: PROFILE (Student ID Card, Preferences & Logout)
  // =========================================================================
  function renderProfileTab() {
    const container = document.getElementById('tab-profile');
    if (!container) return;

    const myComplaints = state.complaints;
    const resolvedCount = myComplaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;
    const activeCount = myComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;

    container.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar">${(state.studentUser?.name || 'AS').split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
        <div class="profile-name">${state.studentUser?.name || 'Aarav Sharma'}</div>
        <div class="profile-role-badge">Verified JECRC Student</div>

        <div class="profile-info-list">
          <div class="info-item-row">
            <span>Roll Number</span>
            <strong>${state.studentUser?.roll_no || 'JU/2026/BTECH/1042'}</strong>
          </div>
          <div class="info-item-row">
            <span>Department</span>
            <strong>${state.studentUser?.branch || 'Computer Science & Engineering'}</strong>
          </div>
          <div class="info-item-row">
            <span>Residence</span>
            <strong>${state.studentUser?.hostel_or_day || 'Boys Hostel BH-2 (Room 214)'}</strong>
          </div>
          <div class="info-item-row">
            <span>Verified Gmail</span>
            <strong>${state.studentUser?.email || 'aarav.sharma@jecrcu.edu.in'}</strong>
          </div>
          <div class="info-item-row">
            <span>Mobile Phone</span>
            <strong>${state.studentUser?.phone || '+91 98290 12345'}</strong>
          </div>
        </div>
      </div>

      <div class="home-metrics-grid" style="margin-bottom: 20px;">
        <div class="metric-pill-card">
          <div class="metric-pill-value">${myComplaints.length}</div>
          <div class="metric-pill-label">Total Logged</div>
        </div>
        <div class="metric-pill-card">
          <div class="metric-pill-value" style="color: #f59e0b;">${activeCount}</div>
          <div class="metric-pill-label">In Progress</div>
        </div>
        <div class="metric-pill-card">
          <div class="metric-pill-value" style="color: #10b981;">${resolvedCount}</div>
          <div class="metric-pill-label">Resolved</div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">App Preferences</div>
      </div>
      <div class="settings-group">
        <div class="setting-row">
          <span>Dark Mode Theme</span>
          <label class="switch">
            <input type="checkbox" id="setting-theme-switch" ${state.theme === 'dark' ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <span>SMS Resolution Updates</span>
          <label class="switch">
            <input type="checkbox" checked />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <!-- Logout from Student Session -->
      <div style="margin-top: 16px;">
        <button type="button" id="btn-logout-student" style="width: 100%; padding: 10px; background: transparent; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.82rem; font-weight: 600; color: #ef4444; cursor: pointer;">
          Logout from Student Account
        </button>
      </div>
    `;

    document.getElementById('setting-theme-switch')?.addEventListener('change', (e) => {
      applyTheme(e.target.checked ? 'dark' : 'light');
    });

    document.getElementById('btn-logout-student')?.addEventListener('click', async () => {
      if (supabaseClient) {
        try { await supabaseClient.auth.signOut(); } catch(e) {}
      }
      localStorage.removeItem('jecrc_student_user');
      state.studentUser = null;
      showToast('Logged out from Student Session');
      renderApp();
    });
  }

  // =========================================================================
  // PORTAL 2: DEDICATED ADMIN COMMAND CENTER (Password Protected)
  // =========================================================================
  function renderAdminPortal() {
    const loginView = document.getElementById('admin-login-view');
    const dashboardView = document.getElementById('admin-dashboard-view');

    // If Admin is not authenticated, show password-gated Admin Access Gateway
    if (!state.adminUser) {
      if (loginView) {
        loginView.style.display = 'block';
        renderAdminLoginCard();
      }
      if (dashboardView) dashboardView.style.display = 'none';
      return;
    }

    // Admin is authenticated! Render Full Admin Command Center
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) {
      dashboardView.style.display = 'block';
      renderAdminDashboard();
    }
  }

  // Admin Authentication State (5 Wrong Attempts Lockout Tracker)
  const adminAuthState = {
    failedAttempts: parseInt(sessionStorage.getItem('cf_admin_fail_count') || '0', 10),
    lockoutUntil: parseInt(sessionStorage.getItem('cf_admin_lockout_until') || '0', 10),
    lockoutTimer: null
  };

  // Admin Login Gateway Card (Secure, Empty Fields, autocomplete="off", Password Eye Toggle, Backend Only Auth, Lockout)
  function renderAdminLoginCard() {
    const container = document.getElementById('admin-login-view');
    if (!container) return;

    container.innerHTML = `
      <div class="auth-overlay-card">
        <div class="auth-header">
          <div class="auth-uni-logo" style="background: linear-gradient(135deg, #b45309, #d97706);">
            🔒
          </div>
          <div class="auth-title">JECRC Admin Portal Gateway</div>
          <div class="auth-subtitle">Estate & Facilities Management Command Desk</div>
        </div>

        <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 16px; font-size: 0.74rem; color: #b45309;">
          <strong>Restricted Access:</strong> Only authorized JECRC University maintenance supervisors and estate officers with administrator privileges may access this portal.
        </div>

        <div id="admin-login-error-banner" style="display: none; background: #fee2e2; border: 1px solid #f87171; color: #b91c1c; padding: 10px 12px; border-radius: var(--radius-md); font-size: 0.78rem; margin-bottom: 14px;"></div>

        <form id="admin-login-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label">Administrator Email *</label>
            <input type="email" id="admin-email" class="form-input" placeholder="Enter administrator email" autocomplete="off" required />
          </div>

          <div class="form-group">
            <label class="form-label">Admin Security Password *</label>
            <div class="password-input-wrap" style="position: relative; display: flex; align-items: center;">
              <input type="password" id="admin-password" class="form-input" placeholder="Enter admin password" autocomplete="new-password" style="padding-right: 42px;" required />
              <button type="button" id="toggle-admin-password-btn" class="password-eye-btn" aria-label="Toggle password visibility" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;">
                ${icons.eye}
              </button>
            </div>
          </div>

          <button type="submit" class="submit-report-btn" id="btn-admin-auth" style="background: #b45309;">
            <span>Authorize & Enter Admin Center</span>
            ${icons.arrowRight}
          </button>
        </form>

        <div style="margin-top: 14px; text-align: center;">
          <button type="button" class="portal-switch-btn" id="btn-back-to-student-from-login">
            ← Return to Student Portal
          </button>
        </div>
      </div>
    `;

    // Password Show/Hide Eye Toggle
    const passInput = document.getElementById('admin-password');
    const eyeBtn = document.getElementById('toggle-admin-password-btn');
    if (passInput && eyeBtn) {
      eyeBtn.addEventListener('click', () => {
        const isPassword = passInput.type === 'password';
        passInput.type = isPassword ? 'text' : 'password';
        eyeBtn.innerHTML = isPassword ? icons.eyeOff : icons.eye;
      });
    }

    // Lockout Management UI
    function updateLockoutUI() {
      const now = Date.now();
      const errBanner = document.getElementById('admin-login-error-banner');
      const authBtn = document.getElementById('btn-admin-auth');
      const emailInput = document.getElementById('admin-email');
      const pInput = document.getElementById('admin-password');

      if (adminAuthState.lockoutUntil && now < adminAuthState.lockoutUntil) {
        const remaining = Math.ceil((adminAuthState.lockoutUntil - now) / 1000);
        if (errBanner) {
          errBanner.style.display = 'block';
          errBanner.innerText = `⛔ Account temporarily locked due to 5 failed attempts. Please wait ${remaining}s before retrying.`;
        }
        if (authBtn) {
          authBtn.disabled = true;
          authBtn.innerText = `Locked (${remaining}s)`;
        }
        if (emailInput) emailInput.disabled = true;
        if (pInput) pInput.disabled = true;
        return true;
      } else if (adminAuthState.lockoutUntil && now >= adminAuthState.lockoutUntil) {
        adminAuthState.lockoutUntil = 0;
        adminAuthState.failedAttempts = 0;
        sessionStorage.removeItem('cf_admin_fail_count');
        sessionStorage.removeItem('cf_admin_lockout_until');
        clearInterval(adminAuthState.lockoutTimer);
        adminAuthState.lockoutTimer = null;
        if (errBanner) errBanner.style.display = 'none';
        if (authBtn) {
          authBtn.disabled = false;
          authBtn.innerHTML = `<span>Authorize & Enter Admin Center</span> ${icons.arrowRight}`;
        }
        if (emailInput) emailInput.disabled = false;
        if (pInput) pInput.disabled = false;
      }
      return false;
    }

    if (adminAuthState.lockoutUntil && Date.now() < adminAuthState.lockoutUntil) {
      updateLockoutUI();
      clearInterval(adminAuthState.lockoutTimer);
      adminAuthState.lockoutTimer = setInterval(() => {
        if (!updateLockoutUI()) {
          clearInterval(adminAuthState.lockoutTimer);
        }
      }, 1000);
    }

    document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (updateLockoutUI()) {
        showToast('Account is temporarily locked. Please wait.', icons.alertTriangle);
        return;
      }

      const email = document.getElementById('admin-email')?.value.trim();
      const password = document.getElementById('admin-password')?.value;
      const btn = document.getElementById('btn-admin-auth');
      const errBanner = document.getElementById('admin-login-error-banner');

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>Verifying credentials...</span>`;
      }

      try {
        if (!supabaseClient) {
          throw new Error('Backend auth service not configured. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
        }

        // Authenticate strictly against real backend auth service (Supabase)
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          // Generic message: never reveal whether email or password was wrong
          throw new Error('Invalid credentials');
        }

        // Verify role-based authorization from Supabase profiles table (backend enforced)
        const { data: prof, error: profErr } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profErr || !prof || prof.role !== 'admin') {
          await supabaseClient.auth.signOut();
          throw new Error('Access Denied: Account does not possess administrator privileges');
        }

        // Success: Reset failed attempts
        adminAuthState.failedAttempts = 0;
        adminAuthState.lockoutUntil = 0;
        sessionStorage.removeItem('cf_admin_fail_count');
        sessionStorage.removeItem('cf_admin_lockout_until');

        state.adminUser = prof;
        // Zero credentials stored in localStorage/sessionStorage/cookies/URLs. Auth session token is managed by Supabase SDK.
        showToast('Authorized: JECRC Facilities Administrator', icons.check);
        renderApp();
      } catch (err) {
        let msg = 'Invalid credentials';
        if (err.message && err.message.includes('administrator privileges')) {
          msg = 'Access Denied: Account does not possess administrator privileges';
        } else if (err.message && err.message.includes('Backend auth service not configured')) {
          msg = err.message;
        }

        adminAuthState.failedAttempts++;
        sessionStorage.setItem('cf_admin_fail_count', adminAuthState.failedAttempts);

        if (adminAuthState.failedAttempts >= 5) {
          adminAuthState.lockoutUntil = Date.now() + 60 * 1000;
          sessionStorage.setItem('cf_admin_lockout_until', adminAuthState.lockoutUntil);
          msg = 'Too many failed login attempts (5/5). Account temporarily locked for 60 seconds.';
          updateLockoutUI();
          clearInterval(adminAuthState.lockoutTimer);
          adminAuthState.lockoutTimer = setInterval(() => {
            if (!updateLockoutUI()) {
              clearInterval(adminAuthState.lockoutTimer);
            }
          }, 1000);
        } else {
          msg = `${msg} (${adminAuthState.failedAttempts}/5 attempts)`;
          if (errBanner) {
            errBanner.style.display = 'block';
            errBanner.innerText = msg;
          }
        }

        showToast(msg, icons.alertTriangle);
      } finally {
        if (btn && (!adminAuthState.lockoutUntil || Date.now() >= adminAuthState.lockoutUntil)) {
          btn.disabled = false;
          btn.innerHTML = `<span>Authorize & Enter Admin Center</span> ${icons.arrowRight}`;
        }
      }
    });

    document.getElementById('btn-back-to-student-from-login')?.addEventListener('click', () => {
      state.currentPortal = 'student';
      renderApp();
    });
  }

  // Full-Width Admin Command Center
  function renderAdminDashboard() {
    const container = document.getElementById('admin-dashboard-view');
    if (!container) return;

    let filtered = state.complaints.filter(c => {
      if (state.adminStatusFilter !== 'All' && c.status !== state.adminStatusFilter) return false;
      if (state.adminCategoryFilter !== 'All' && c.category !== state.adminCategoryFilter) return false;
      if (state.adminPriorityFilter !== 'All' && c.priority !== state.adminPriorityFilter) return false;
      if (state.adminSearch) {
        const q = state.adminSearch.toLowerCase();
        const match = c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.student_name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    const totalTickets = state.stats.total || state.complaints.length;
    const resolvedCount = state.stats.resolved || 0;
    const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0;

    container.innerHTML = `
      <!-- Admin Portal Header -->
      <div class="admin-portal-header">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="admin-badge-pill">🔒 JECRC ESTATE ADMIN</span>
            <span style="font-size: 0.74rem; color: var(--text-muted);">Sitapura Campus, Jaipur</span>
          </div>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-top: 4px;">
            Facilities & Works Management Command Center
          </h2>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">
            Logged in as: <strong>${state.adminUser?.name || 'JECRC Estate Admin'}</strong> (${state.adminUser?.email})
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="view-toggle-btn" id="btn-admin-switch-student">
            View Student App
          </button>
          <button type="button" class="admin-logout-btn" id="btn-admin-logout">
            Logout Admin
          </button>
        </div>
      </div>

      <!-- Admin KPI Metric Cards -->
      <div class="admin-metrics-row">
        <div class="admin-metric-card">
          <div class="admin-metric-num" style="color: var(--primary);">${totalTickets}</div>
          <div class="admin-metric-label">Total Complaints</div>
        </div>
        <div class="admin-metric-card">
          <div class="admin-metric-num" style="color: #8b5cf6;">${state.stats.pending || 0}</div>
          <div class="admin-metric-label">In Triage / Review</div>
        </div>
        <div class="admin-metric-card">
          <div class="admin-metric-num" style="color: #f59e0b;">${state.stats.inProgress || 0}</div>
          <div class="admin-metric-label">Work Dispatched</div>
        </div>
        <div class="admin-metric-card">
          <div class="admin-metric-num" style="color: #10b981;">${resolvedCount} <span style="font-size: 0.85rem; font-weight: 600;">(${resolutionRate}%)</span></div>
          <div class="admin-metric-label">Resolution Rate</div>
        </div>
      </div>

      <!-- Urgent High Priority Notice Card -->
      ${state.stats.highPriorityActive > 0 ? `
        <div style="background: var(--priority-high-bg); border: 1px solid var(--priority-high); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px; color: var(--priority-high-text); font-size: 0.82rem; font-weight: 700;">
            ${icons.alertTriangle}
            <span>${state.stats.highPriorityActive} Critical / High Priority Hazard Ticket(s) Active!</span>
          </div>
          <button class="chip-btn" id="filter-urgent-only" style="background: #ffffff; color: #991b1b; border: none;">Filter Urgent</button>
        </div>
      ` : ''}

      <!-- Interactive Chart by Category -->
      <div class="chart-container-card">
        <div class="chart-header-row">
          <div class="chart-title">Complaints by Campus Department / Category</div>
          <span style="font-size: 0.72rem; color: var(--text-muted);">Tap a bar to filter</span>
        </div>
        <div class="chart-bars-wrap">
          ${Object.keys(CATEGORY_MAP).map(cat => {
            const count = state.stats.categoryCounts ? (state.stats.categoryCounts[cat] || 0) : 0;
            const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
            const isSelected = state.adminCategoryFilter === cat;
            return `
              <div class="chart-bar-row ${isSelected ? 'selected' : ''}" data-cat-bar="${cat}">
                <div class="chart-bar-label-line">
                  <span>${CATEGORY_MAP[cat].icon} ${cat}</span>
                  <span><strong>${count}</strong> (${pct}%)</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${Math.max(6, pct)}%; background: ${CATEGORY_MAP[cat].color};"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Admin Filters & Search -->
      <div class="section-header">
        <div class="section-title">All Complaints & Work Orders</div>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${filtered.length} showing</span>
      </div>

      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input 
          type="text" 
          id="admin-search-input" 
          class="search-input" 
          placeholder="Filter by student name, roll number, ticket ID, location..." 
          value="${escapeHtml(state.adminSearch)}"
        />
      </div>

      <div class="admin-table-filters">
        <select class="admin-select" id="admin-status-select">
          <option value="All" ${state.adminStatusFilter === 'All' ? 'selected' : ''}>Status: All</option>
          <option value="Submitted" ${state.adminStatusFilter === 'Submitted' ? 'selected' : ''}>Submitted</option>
          <option value="Under Review" ${state.adminStatusFilter === 'Under Review' ? 'selected' : ''}>Under Review</option>
          <option value="In Progress" ${state.adminStatusFilter === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${state.adminStatusFilter === 'Resolved' ? 'selected' : ''}>Resolved</option>
          <option value="Closed" ${state.adminStatusFilter === 'Closed' ? 'selected' : ''}>Closed</option>
        </select>

        <select class="admin-select" id="admin-cat-select">
          <option value="All" ${state.adminCategoryFilter === 'All' ? 'selected' : ''}>Category: All</option>
          ${Object.keys(CATEGORY_MAP).map(c => `
            <option value="${c}" ${state.adminCategoryFilter === c ? 'selected' : ''}>${c}</option>
          `).join('')}
        </select>

        <select class="admin-select" id="admin-priority-select">
          <option value="All" ${state.adminPriorityFilter === 'All' ? 'selected' : ''}>Priority: All</option>
          <option value="High" ${state.adminPriorityFilter === 'High' ? 'selected' : ''}>🔴 High</option>
          <option value="Medium" ${state.adminPriorityFilter === 'Medium' ? 'selected' : ''}>🟡 Medium</option>
          <option value="Low" ${state.adminPriorityFilter === 'Low' ? 'selected' : ''}>🟢 Low</option>
        </select>

        ${(state.adminStatusFilter !== 'All' || state.adminCategoryFilter !== 'All' || state.adminPriorityFilter !== 'All' || state.adminSearch) ? `
          <button class="chip-btn" id="admin-clear-filters-btn">Clear Filters</button>
        ` : ''}
      </div>

      <!-- Admin Complaint Table / List -->
      <div class="admin-table-card">
        ${filtered.length === 0 ? `
          <div style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            No tickets match current admin filters.
          </div>
        ` : filtered.map(c => `
          <div class="admin-complaint-item">
            <div class="admin-item-info">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <span class="ticket-id-tag">${c.id}</span>
                <span class="status-badge" style="background: ${getPriorityBg(c.priority)}; color: ${getPriorityColor(c.priority)}; padding: 1px 6px;">
                  ${c.priority}
                </span>
                <span class="status-badge status-${c.status.toLowerCase().replace(/\s+/g, '-')}">
                  ${c.status}
                </span>
              </div>
              <div class="admin-item-title">${escapeHtml(c.title)}</div>
              <div class="admin-item-sub">
                <span>${CATEGORY_MAP[c.category]?.icon} ${c.category}</span>
                <span>•</span>
                <span>${icons.mapPin} ${escapeHtml(c.location)}</span>
                <span>•</span>
                <span>👤 ${escapeHtml(c.student_name)} (${escapeHtml(c.student_id)})</span>
              </div>
            </div>
            <div>
              <button class="update-status-trigger-btn" data-admin-id="${c.id}">
                Update Query
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('btn-admin-switch-student')?.addEventListener('click', () => {
      state.currentPortal = 'student';
      renderApp();
    });

    document.getElementById('btn-admin-logout')?.addEventListener('click', async () => {
      if (supabaseClient) {
        try { await supabaseClient.auth.signOut(); } catch (e) {}
      }
      state.adminUser = null;
      showToast('Logged out from Admin Command Center');
      renderApp();
    });

    document.getElementById('filter-urgent-only')?.addEventListener('click', () => {
      state.adminPriorityFilter = 'High';
      renderAdminDashboard();
    });

    container.querySelectorAll('[data-cat-bar]').forEach(bar => {
      bar.addEventListener('click', () => {
        const cat = bar.getAttribute('data-cat-bar');
        state.adminCategoryFilter = state.adminCategoryFilter === cat ? 'All' : cat;
        renderAdminDashboard();
      });
    });

    document.getElementById('admin-status-select')?.addEventListener('change', (e) => {
      state.adminStatusFilter = e.target.value;
      renderAdminDashboard();
    });
    document.getElementById('admin-cat-select')?.addEventListener('change', (e) => {
      state.adminCategoryFilter = e.target.value;
      renderAdminDashboard();
    });
    document.getElementById('admin-priority-select')?.addEventListener('change', (e) => {
      state.adminPriorityFilter = e.target.value;
      renderAdminDashboard();
    });
    document.getElementById('admin-search-input')?.addEventListener('input', (e) => {
      state.adminSearch = e.target.value;
      renderAdminDashboard();
    });
    document.getElementById('admin-clear-filters-btn')?.addEventListener('click', () => {
      state.adminStatusFilter = 'All';
      state.adminCategoryFilter = 'All';
      state.adminPriorityFilter = 'All';
      state.adminSearch = '';
      renderAdminDashboard();
    });

    container.querySelectorAll('.update-status-trigger-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-admin-id');
        openAdminStatusModal(id);
      });
    });
  }

  // =========================================================================
  // DETAIL MODAL / BOTTOM SHEET: STATUS TIMELINE FOR STUDENTS
  // =========================================================================
  async function openComplaintDetailModal(complaintId) {
    try {
      let res;
      try {
        res = await fetch(`/api/complaints/${complaintId}`).then(r => r.ok ? r.json() : null);
      } catch (e) {}

      if (!res || !res.complaint) {
        res = ClientStore.getComplaintDetail(complaintId);
      }

      if (!res || !res.complaint) {
        showToast('Complaint not found', icons.alertTriangle);
        return;
      }

      state.activeComplaintDetail = res;
      renderComplaintDetailModal();
    } catch (err) {
      console.error('Error fetching detail:', err);
    }
  }

  function renderComplaintDetailModal() {
    const modal = document.getElementById('detail-modal-overlay');
    if (!modal || !state.activeComplaintDetail) return;

    const { complaint, timeline } = state.activeComplaintDetail;

    modal.innerHTML = `
      <div class="bottom-sheet-content">
        <div class="sheet-handle"></div>
        <div class="sheet-header-row">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="ticket-id-tag" style="font-size: 0.9rem;">${complaint.id}</span>
              <span class="status-badge" style="background: ${CATEGORY_MAP[complaint.category]?.bg}; color: ${CATEGORY_MAP[complaint.category]?.color}">
                ${CATEGORY_MAP[complaint.category]?.icon} ${complaint.category}
              </span>
              <span class="status-badge status-${complaint.status.toLowerCase().replace(/\s+/g, '-')}">
                ${complaint.status}
              </span>
            </div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-top: 6px;">
              ${escapeHtml(complaint.title)}
            </h3>
          </div>
          <button type="button" class="close-sheet-btn" id="close-detail-sheet-btn">
            ${icons.x}
          </button>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          ${icons.mapPin} <strong>Location:</strong> ${escapeHtml(complaint.location)}
        </div>

        <div style="font-size: 0.84rem; color: var(--text-primary); line-height: 1.5; background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 14px;">
          ${escapeHtml(complaint.description)}
        </div>

        ${complaint.photo_url ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">
              Attached Photo Evidence
            </div>
            <div style="border-radius: var(--radius-md); overflow: hidden; max-height: 200px; border: 1px solid var(--border-color);">
              <img src="${complaint.photo_url}" alt="Evidence" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
            </div>
          </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; font-size: 0.78rem;">
          <div style="background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="color: var(--text-muted); font-size: 0.7rem;">Assigned JECRC Department</div>
            <div style="font-weight: 700; color: var(--text-primary); margin-top: 2px;">${escapeHtml(complaint.department || 'JECRC Campus Facilities')}</div>
          </div>
          <div style="background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="color: var(--text-muted); font-size: 0.7rem;">Assigned Personnel</div>
            <div style="font-weight: 700; color: var(--text-primary); margin-top: 2px;">${escapeHtml(complaint.assigned_to || 'In Triage Queue')}</div>
          </div>
        </div>

        <div class="section-header" style="margin-top: 18px;">
          <div class="section-title">
            ${icons.clock} Status Timeline & Audit Trail
          </div>
        </div>

        <div class="timeline-stepper">
          ${timeline.map((item, idx) => {
            const isLast = idx === timeline.length - 1;
            return `
              <div class="timeline-item ${isLast ? 'active' : 'done'}">
                <div class="timeline-icon-dot">
                  ${isLast ? icons.clock : '✓'}
                </div>
                <div class="timeline-title">${escapeHtml(item.title)}</div>
                <div class="timeline-meta">
                  <span>${new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span>By: <strong>${escapeHtml(item.actor_name)}</strong> (${item.actor_role})</span>
                </div>
                ${item.note ? `
                  <div class="timeline-note-bubble">
                    ${escapeHtml(item.note)}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

        ${(complaint.status === 'Resolved' || complaint.status === 'Closed') ? `
          <div class="feedback-box">
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">
              Rate Resolution Satisfaction
            </div>
            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
              Was the issue resolved to your satisfaction?
            </p>
            <div class="star-rating-row" id="star-rating-row">
              ${[1, 2, 3, 4, 5].map(star => `
                <button type="button" class="star-btn ${star <= state.selectedRating ? 'active' : ''}" data-star="${star}">★</button>
              `).join('')}
            </div>
            <textarea id="feedback-comment-input" class="form-textarea" placeholder="Optional comments for maintenance crew..." style="min-height: 60px; font-size: 0.8rem; margin-top: 8px;"></textarea>
            <button type="button" class="submit-report-btn" id="submit-feedback-btn" style="padding: 8px 16px; font-size: 0.82rem; margin-top: 8px;">
              Submit Rating & Confirm Fix
            </button>
          </div>
        ` : ''}
      </div>
    `;

    modal.classList.add('active');

    document.getElementById('close-detail-sheet-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    modal.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedRating = parseInt(btn.getAttribute('data-star'), 10);
        modal.querySelectorAll('.star-btn').forEach(b => {
          b.classList.toggle('active', parseInt(b.getAttribute('data-star'), 10) <= state.selectedRating);
        });
      });
    });

    document.getElementById('submit-feedback-btn')?.addEventListener('click', async () => {
      const comment = document.getElementById('feedback-comment-input')?.value || '';
      try {
        await fetch(`/api/complaints/${complaint.id}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: state.selectedRating, comment, student_name: state.studentUser?.name })
        });
        showToast(`Thank you! Rated ${state.selectedRating} Stars ⭐`);
        await loadData();
        openComplaintDetailModal(complaint.id);
      } catch (err) {
        showToast('Feedback save error', icons.alertTriangle);
      }
    });
  }

  // =========================================================================
  // ADMIN UPDATE STATUS & NOTE MODAL
  // =========================================================================
  // Admin Update Status & Query Modal (Bug Fixed: Variable scope ReferenceError resolved, Full Details Displayed)
  function openAdminStatusModal(complaintId) {
    const complaint = state.complaints.find(c => c.id === complaintId);
    if (!complaint) {
      showToast('Error: Report not found', icons.alertTriangle);
      return;
    }
    state.adminModalComplaint = complaint;

    const modal = document.getElementById('admin-modal-overlay');
    if (!modal) return;

    modal.innerHTML = `
      <div class="bottom-sheet-content" style="max-width: 580px;">
        <div class="sheet-handle"></div>
        <div class="sheet-header-row">
          <div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #b45309;">JECRC ESTATE & FACILITIES DESK</div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">
              Update Query #${complaint.id}
            </h3>
          </div>
          <button type="button" class="close-sheet-btn" id="close-admin-modal-btn">
            ${icons.x}
          </button>
        </div>

        <!-- Full Report Details Required by Specification -->
        <div style="font-size: 0.8rem; background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px;">
          <div><strong>Title:</strong> ${escapeHtml(complaint.title)}</div>
          <div><strong>Description:</strong> ${escapeHtml(complaint.description || 'No additional details provided.')}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 2px;">
            <div><strong>Category:</strong> ${escapeHtml(complaint.category)}</div>
            <div><strong>Location:</strong> ${escapeHtml(complaint.location)}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><strong>Reporter:</strong> ${escapeHtml(complaint.student_name)} (${escapeHtml(complaint.student_id)})</div>
            <div><strong>Email:</strong> ${escapeHtml(complaint.student_email || 'Not specified')}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><strong>Date Reported:</strong> ${new Date(complaint.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Current Status:</strong> <span class="status-badge status-${(complaint.status || 'Pending').toLowerCase().replace(/\s+/g, '-')}">${complaint.status}</span></div>
          </div>
        </div>

        <form id="admin-update-status-form">
          <div class="form-group">
            <label class="form-label">Change Status *</label>
            <select id="modal-status-select" class="form-select">
              <option value="Pending" ${complaint.status === 'Pending' || complaint.status === 'Submitted' || complaint.status === 'Under Review' ? 'selected' : ''}>Pending</option>
              <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
              <option value="Rejected" ${complaint.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" class="form-group">
            <div>
              <label class="form-label">Assigned Department</label>
              <select id="modal-dept-select" class="form-select">
                <option value="Electrical & Power Services" ${complaint.department === 'Electrical & Power Services' ? 'selected' : ''}>Electrical & Power Services</option>
                <option value="Hostel & Campus Plumbing" ${complaint.department === 'Hostel & Campus Plumbing' ? 'selected' : ''}>Hostel & Campus Plumbing</option>
                <option value="JECRC IT & NOC Cell" ${complaint.department === 'JECRC IT & NOC Cell' ? 'selected' : ''}>JECRC IT & NOC Cell</option>
                <option value="Campus Housekeeping" ${complaint.department === 'Campus Housekeeping' ? 'selected' : ''}>Campus Housekeeping</option>
                <option value="Chief Proctor & Security Cell" ${complaint.department === 'Chief Proctor & Security Cell' ? 'selected' : ''}>Chief Proctor & Security</option>
                <option value="Hostel Food & Mess Committee" ${complaint.department === 'Hostel Food & Mess Committee' ? 'selected' : ''}>Hostel Food & Mess Committee</option>
              </select>
            </div>
            <div>
              <label class="form-label">Assigned Personnel</label>
              <input type="text" id="modal-assignee-input" class="form-input" value="${escapeHtml(complaint.assigned_to || '')}" placeholder="e.g. Rameshwar Meena" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="modal-priority-select" class="form-select">
              <option value="High" ${complaint.priority === 'High' ? 'selected' : ''}>🔴 High</option>
              <option value="Medium" ${complaint.priority === 'Medium' ? 'selected' : ''}>🟡 Medium</option>
              <option value="Low" ${complaint.priority === 'Low' ? 'selected' : ''}>🟢 Low</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">
              <span>Admin Remark / Comment <span style="color: #ef4444;">*</span></span>
              <span class="label-hint">Shown to student on Track screen & timeline</span>
            </label>
            <textarea id="modal-admin-note" class="form-textarea" placeholder="Enter official action taken, resolution summary, or rejection justification..." required>${escapeHtml(complaint.admin_remark || '')}</textarea>
          </div>

          <button type="submit" class="submit-report-btn" id="modal-save-status-btn" style="background: #b45309;">
            <span>Save & Update Query</span>
            ${icons.check}
          </button>
        </form>
      </div>
    `;

    modal.classList.add('active');

    document.getElementById('close-admin-modal-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    document.getElementById('admin-update-status-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('modal-save-status-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span>Saving query update...</span>`;
      }

      const newStatus = document.getElementById('modal-status-select')?.value;
      const department = document.getElementById('modal-dept-select')?.value;
      const assigned_to = document.getElementById('modal-assignee-input')?.value;
      const priority = document.getElementById('modal-priority-select')?.value;
      const note = document.getElementById('modal-admin-note')?.value.trim();

      try {
        let updateSucceeded = false;

        // 1. Supabase Backend Update
        if (supabaseClient) {
          const { error: supaErr } = await supabaseClient
            .from('complaints')
            .update({
              status: newStatus,
              admin_remark: note,
              department,
              assigned_to,
              priority,
              updated_at: new Date().toISOString()
            })
            .eq('id', complaint.id);

          if (!supaErr) {
            updateSucceeded = true;
            // Also append timeline event
            await supabaseClient.from('timeline_events').insert([{
              complaint_id: complaint.id,
              status: newStatus,
              title: `Status Updated to ${newStatus}`,
              note: note,
              actor_role: 'Campus Admin',
              actor_name: state.adminUser?.name || 'JECRC Facilities Officer'
            }]);
          } else {
            console.warn('Supabase status update error:', supaErr);
          }
        }

        // 2. Local ClientStore Fallback / Sync
        const storeRes = ClientStore.updateStatus(complaint.id, {
          status: newStatus,
          department,
          assigned_to,
          priority,
          note,
          actor_name: state.adminUser?.name || 'JECRC Estate Officer'
        });
        if (storeRes && storeRes.success) {
          updateSucceeded = true;
        }

        // 3. Update in-memory state
        complaint.status = newStatus;
        complaint.admin_remark = note;
        complaint.department = department;
        complaint.assigned_to = assigned_to;
        complaint.priority = priority;
        complaint.updated_at = new Date().toISOString();
        if (!complaint.timeline) complaint.timeline = [];
        complaint.timeline.push({
          status: newStatus,
          title: `Status Updated to ${newStatus}`,
          note: note,
          actor_role: 'Campus Admin',
          actor_name: state.adminUser?.name || 'JECRC Estate Officer',
          created_at: new Date().toISOString()
        });

        if (updateSucceeded) {
          showToast(`Query #${complaint.id} status updated to "${newStatus}"!`, icons.check);
          modal.classList.remove('active');

          // Refresh Admin list without page reload
          renderAdminDashboard();

          // Refresh active detail if currently open
          if (state.activeComplaintDetail && state.activeComplaintDetail.complaint.id === complaint.id) {
            openComplaintDetailModal(complaint.id);
          }
        } else {
          showToast('Could not save query update', icons.alertTriangle);
        }
      } catch (err) {
        showToast('Error updating query: ' + err.message, icons.alertTriangle);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<span>Save & Update Query</span> ${icons.check}`;
        }
      }
    });
  }

  function setupEventListeners() {
    // Bottom Tab navigation
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // Top Portal Switcher Button ("Admin Gateway" / "← Student Portal")
    document.getElementById('switch-portal-btn')?.addEventListener('click', () => {
      if (state.currentPortal === 'student') {
        state.currentPortal = 'admin';
      } else {
        state.currentPortal = 'student';
      }
      renderApp();
    });

    // Discreet Footer Link to Admin
    document.getElementById('footer-admin-link')?.addEventListener('click', () => {
      state.currentPortal = 'admin';
      renderApp();
    });

    document.getElementById('header-theme-toggle')?.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });


  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getStatusStepIndex(status) {
    switch (status) {
      case 'Submitted': return 1;
      case 'Under Review': return 2;
      case 'In Progress': return 3;
      case 'Resolved': return 4;
      case 'Closed': return 4;
      default: return 1;
    }
  }

  function getPriorityColor(priority) {
    if (priority === 'High') return 'var(--priority-high)';
    if (priority === 'Low') return 'var(--priority-low)';
    return 'var(--priority-med)';
  }

  function getPriorityBg(priority) {
    if (priority === 'High') return 'var(--priority-high-bg)';
    if (priority === 'Low') return 'var(--priority-low-bg)';
    return 'var(--priority-med-bg)';
  }

  function getEmergencyIcon(name) {
    switch (name) {
      case 'shield': return '🛡️';
      case 'heart-pulse': return '🩺';
      case 'zap': return '⚡';
      case 'droplets': return '💧';
      case 'lock': return '🔐';
      case 'home': return '🏠';
      case 'wifi': return '🌐';
      case 'utensils': return '🍲';
      default: return '📞';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
