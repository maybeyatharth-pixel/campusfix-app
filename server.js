// CampusFix - Mobile-First Campus Problem Reporting Platform
// High-performance backend using Node.js built-in HTTP and SQLite (node:sqlite)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'campusfix.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize SQLite database
const db = new DatabaseSync(DB_FILE);

// Setup Database Schema
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      priority_reason TEXT,
      status TEXT NOT NULL DEFAULT 'Submitted',
      student_name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      student_phone TEXT,
      student_email TEXT,
      photo_url TEXT,
      assigned_to TEXT,
      department TEXT,
      estimated_resolution TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT,
      actor_role TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    );
  `);

  // Seed sample initial data if empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM complaints');
  const count = countStmt.get().count;

  if (count === 0) {
    seedDatabase();
  }
}

// Pre-seed realistic campus data
function seedDatabase() {
  const sampleComplaints = [
    {
      id: 'CF-2026-0101',
      title: 'Sparks from corridor switchboard',
      description: 'The main switchboard near Room 204 has exposed wiring and sparked when turning on the corridor lights. Strong burning smell noticed.',
      location: 'Hostel Block B - 2nd Floor Corridor',
      category: 'Electrical',
      priority: 'High',
      priority_reason: 'Fire and electrical shock hazard detected with burning smell.',
      status: 'In Progress',
      student_name: 'Alex Morgan',
      student_id: '2026-CS-089',
      student_phone: '+91 98765 43210',
      student_email: 'alex.morgan@campus.edu',
      photo_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      assigned_to: 'Ramesh Sharma (Senior Electrician)',
      department: 'Electrical Maintenance',
      estimated_resolution: 'Within 2 hours',
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      timeline: [
        {
          status: 'Submitted',
          title: 'Complaint Logged',
          note: 'Student logged urgent hazard report via CampusFix mobile app.',
          actor_role: 'Student',
          actor_name: 'Alex Morgan',
          created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
        },
        {
          status: 'Under Review',
          title: 'Triaged by Campus Control Room',
          note: 'Classified as HIGH urgency. Circuit breaker tripped remotely for section 2B.',
          actor_role: 'Campus Admin',
          actor_name: 'Control Desk Officer Roy',
          created_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString()
        },
        {
          status: 'In Progress',
          title: 'Maintenance Team Dispatched',
          note: 'Senior electrician assigned with replacement MCB and insulating terminal box.',
          actor_role: 'Maintenance Lead',
          actor_name: 'Ramesh Sharma',
          created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
        }
      ]
    },
    {
      id: 'CF-2026-0102',
      title: 'Water pipe leaking under washbasin',
      description: 'Continuous leaking from the cold water valve under the second washbasin in the 1st floor washroom. Water is accumulating on the tiles making floor slippery.',
      location: 'Science Complex - Block A, 1st Floor Washroom',
      category: 'Water',
      priority: 'Medium',
      priority_reason: 'Continuous leak causing water wastage and slippery flooring.',
      status: 'Under Review',
      student_name: 'Priya Patel',
      student_id: '2026-BT-042',
      student_phone: '+91 98220 11223',
      student_email: 'priya.patel@campus.edu',
      photo_url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
      assigned_to: 'Santosh Kumar',
      department: 'Plumbing & Sanitation',
      estimated_resolution: 'Within 6 hours',
      created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      timeline: [
        {
          status: 'Submitted',
          title: 'Complaint Logged',
          note: 'Report submitted with washbasin photo.',
          actor_role: 'Student',
          actor_name: 'Priya Patel',
          created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
        },
        {
          status: 'Under Review',
          title: 'Acknowledged by Facilities',
          note: 'Assigned to plumbing team duty roster #3.',
          actor_role: 'Campus Admin',
          actor_name: 'Admin Sarah',
          created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
        }
      ]
    },
    {
      id: 'CF-2026-0103',
      title: 'Library 3rd floor Wi-Fi access point offline',
      description: 'EDUROAM and Campus-Student Wi-Fi dropping connection repeatedly in the Quiet Study wing. Signal shows 1 bar or says "Cannot obtain IP address".',
      location: 'Central Library - 3rd Floor East Wing',
      category: 'Internet',
      priority: 'Medium',
      priority_reason: 'Academic impact on students during study hours.',
      status: 'Resolved',
      student_name: 'David Chen',
      student_id: '2026-EE-115',
      student_phone: '+91 97110 55443',
      student_email: 'david.chen@campus.edu',
      photo_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
      assigned_to: 'NOC Team Lead Anil',
      department: 'Campus IT & Network Operations',
      estimated_resolution: 'Resolved',
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      timeline: [
        {
          status: 'Submitted',
          title: 'Complaint Logged',
          note: 'Issue reported by student in library.',
          actor_role: 'Student',
          actor_name: 'David Chen',
          created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
        },
        {
          status: 'Under Review',
          title: 'Network NOC Diagnostics',
          note: 'PoE switch port 18 in rack L3 rebooted remotely.',
          actor_role: 'Campus Admin',
          actor_name: 'NOC Engineer Vikas',
          created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString()
        },
        {
          status: 'In Progress',
          title: 'Access Point Firmware Upgrade',
          note: 'Re-flashed Aruba AP-515 and verified DHCP leases.',
          actor_role: 'Maintenance Lead',
          actor_name: 'Anil Gupta',
          created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
        },
        {
          status: 'Resolved',
          title: 'Connection Restored',
          note: 'Speed test verified at 120 Mbps with 42 concurrent users active.',
          actor_role: 'Campus Admin',
          actor_name: 'NOC Team Lead Anil',
          created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
        }
      ]
    },
    {
      id: 'CF-2026-0104',
      title: 'Overflowing garbage bin near cafeteria entrance',
      description: 'The outdoor waste bins beside Mess Hall 1 entrance are overflowing with food trays and beverage cups. Stray animals are gathering around it.',
      location: 'Dining Hall & Cafeteria Plaza - Main Gate',
      category: 'Cleanliness',
      priority: 'High',
      priority_reason: 'Sanitation concern attracting stray animals near eating area.',
      status: 'Submitted',
      student_name: 'Simran Kaur',
      student_id: '2026-ME-021',
      student_phone: '+91 99887 66554',
      student_email: 'simran.kaur@campus.edu',
      photo_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      assigned_to: 'Housekeeping Supervisor',
      department: 'Campus Housekeeping',
      estimated_resolution: 'Within 3 hours',
      created_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
      timeline: [
        {
          status: 'Submitted',
          title: 'Complaint Logged',
          note: 'Cleanliness alert logged with geo-tagged cafeteria entrance.',
          actor_role: 'Student',
          actor_name: 'Simran Kaur',
          created_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString()
        }
      ]
    },
    {
      id: 'CF-2026-0105',
      title: 'Dark pathway behind Girls Hostel Block D',
      description: 'Three consecutive solar street lamps are completely unlit on the path between Block D and the North Gate. Very dark and unsafe after 7:30 PM.',
      location: 'Hostel Block D - North Perimeter Pathway',
      category: 'Safety',
      priority: 'High',
      priority_reason: 'Dark isolated pathway poses serious campus safety risk at night.',
      status: 'In Progress',
      student_name: 'Ananya Deshmukh',
      student_id: '2026-EC-054',
      student_phone: '+91 91234 56789',
      student_email: 'ananya.d@campus.edu',
      photo_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
      assigned_to: 'Security Desk & Electrical Team',
      department: 'Campus Security & Facilities',
      estimated_resolution: 'Before sunset today',
      created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      timeline: [
        {
          status: 'Submitted',
          title: 'Emergency Safety Alert Logged',
          note: 'Student raised alert regarding non-functional perimeter lighting.',
          actor_role: 'Student',
          actor_name: 'Ananya Deshmukh',
          created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
        },
        {
          status: 'Under Review',
          title: 'Chief Security Officer Alerted',
          note: 'Security rover deployed to monitor path until lighting is repaired.',
          actor_role: 'Campus Admin',
          actor_name: 'CSO R. K. Singh',
          created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString()
        },
        {
          status: 'In Progress',
          title: 'Battery and Inverter Replacement',
          note: 'Electrician replacing solar battery backup on poles #12, #13, #14.',
          actor_role: 'Maintenance Lead',
          actor_name: 'Balwinder Singh',
          created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        }
      ]
    },
    {
      id: 'CF-2026-0106',
      title: 'Under-cooked chicken and sour dal served at dinner',
      description: 'The chicken curry served tonight had raw pink meat inside, and the yellow dal had a sour fermented taste. Multiple students complained to the mess manager on duty.',
      location: 'Central Mess Hall - Counter 2',
      category: 'Food',
      priority: 'High',
      priority_reason: 'Food safety violation with health and food poisoning hazard.',
      status: 'Under Review',
      student_name: 'Rohan Varma',
      student_id: '2026-CH-077',
      student_phone: '+91 98450 99887',
      student_email: 'rohan.varma@campus.edu',
      photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      assigned_to: 'Dr. Meenakshi (Hostel Food Committee Head)',
      department: 'Dining & Food Safety Board',
      estimated_resolution: 'Immediate Inspection',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      timeline: [
        {
          status: 'Submitted',
          title: 'Food Quality Complaint Registered',
          note: 'Logged with sample description and dinner batch timing.',
          actor_role: 'Student',
          actor_name: 'Rohan Varma',
          created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
        },
        {
          status: 'Under Review',
          title: 'Food Safety Committee Summoned',
          note: 'Mess caterer served formal warning; batch samples collected for quality audit.',
          actor_role: 'Campus Admin',
          actor_name: 'Food Inspector K. Murthy',
          created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        }
      ]
    },
    {
      id: 'CF-2026-0107',
      title: 'Classroom ceiling fan regulator knob broken',
      description: 'The fan in Lecture Hall 201 runs only at maximum speed or turns off. The regulator knob is cracked and loose.',
      location: 'Academic Complex - Lecture Hall 201',
      category: 'Electrical',
      priority: 'Low',
      priority_reason: 'Minor non-hazardous fixture issue; fan is operational.',
      status: 'Resolved',
      student_name: 'Sneha Rao',
      student_id: '2026-IT-019',
      student_phone: '+91 97400 33221',
      student_email: 'sneha.rao@campus.edu',
      photo_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      assigned_to: 'Dinesh Electrician',
      department: 'Electrical Maintenance',
      estimated_resolution: 'Completed',
      created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      timeline: [
        {
          status: 'Submitted',
          title: 'Complaint Logged',
          note: 'Reported by student during class.',
          actor_role: 'Student',
          actor_name: 'Sneha Rao',
          created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
        },
        {
          status: 'Resolved',
          title: 'Regulator Replaced',
          note: 'Modular electronic rotary regulator installed and tested on all speed steps.',
          actor_role: 'Maintenance Lead',
          actor_name: 'Dinesh Electrician',
          created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
        }
      ]
    },
    {
      id: 'CF-2026-0108',
      title: 'Water cooler dispensing warm water in summer',
      description: 'The UV water cooler near seminar hall 2 is running but the refrigeration compressor is not kicking in. Dispensing room temperature water.',
      location: 'Engineering Department - Ground Floor Seminar Lobby',
      category: 'Water',
      priority: 'Low',
      priority_reason: 'Non-emergency convenience issue; drinking water is purified and safe.',
      status: 'Submitted',
      student_name: 'Farhan Ali',
      student_id: '2026-CE-033',
      student_phone: '+91 99112 88442',
      student_email: 'farhan.ali@campus.edu',
      photo_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
      assigned_to: 'HVAC & Cooler Tech',
      department: 'Plumbing & Sanitation',
      estimated_resolution: 'Within 24 hours',
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      timeline: [
        {
          status: 'Submitted',
          title: 'Complaint Logged',
          note: 'Logged by student.',
          actor_role: 'Student',
          actor_name: 'Farhan Ali',
          created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
        }
      ]
    }
  ];

  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      id, title, description, location, category, priority, priority_reason,
      status, student_name, student_id, student_phone, student_email,
      photo_url, assigned_to, department, estimated_resolution, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTimeline = db.prepare(`
    INSERT INTO timeline_events (
      complaint_id, status, title, note, actor_role, actor_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of sampleComplaints) {
    insertComplaint.run(
      c.id, c.title, c.description, c.location, c.category, c.priority, c.priority_reason,
      c.status, c.student_name, c.student_id, c.student_phone, c.student_email,
      c.photo_url, c.assigned_to, c.department, c.estimated_resolution, c.created_at, c.updated_at
    );

    if (c.timeline) {
      for (const t of c.timeline) {
        insertTimeline.run(c.id, t.status, t.title, t.note, t.actor_role, t.actor_name, t.created_at);
      }
    }
  }

  console.log(`Database seeded with ${sampleComplaints.length} complaints.`);
}

// Auto-categorization engine (Electrical, Water, Internet, Cleanliness, Safety, Food)
function autoCategorize(text, location = '') {
  const combined = (text + ' ' + location).toLowerCase();

  const rules = [
    {
      category: 'Electrical',
      keywords: ['electric', 'electricity', 'wire', 'wiring', 'switch', 'socket', 'plug', 'spark', 'light', 'lights', 'bulb', 'tube light', 'fan', 'ac', 'air conditioner', 'power', 'power cut', 'short circuit', 'mcb', 'fuse', 'voltage', 'appliance', 'generator', 'blackout', 'heater', 'geyser', 'refrigerator', 'cord'],
      weight: 1
    },
    {
      category: 'Water',
      keywords: ['water', 'leak', 'leaking', 'leakage', 'tap', 'pipe', 'plumbing', 'drain', 'drainage', 'overflow', 'sink', 'toilet', 'washroom', 'flush', 'sewage', 'shower', 'faucet', 'puddle', 'clog', 'clogged', 'filter', 'drinking water', 'purifier', 'cooler', 'tank', 'geyser leak'],
      weight: 1
    },
    {
      category: 'Internet',
      keywords: ['internet', 'wifi', 'wi-fi', 'network', 'lan', 'router', 'ethernet', 'cable', 'connection', 'disconnect', 'bandwidth', 'slow net', 'eduroam', 'hotspot', 'portal', 'access point', 'ap', 'dns', 'ping', 'signal', 'noc', 'server', 'firewall', 'ip address'],
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
      weight: 1.1 // slightly higher bias for safety threats
    },
    {
      category: 'Food',
      keywords: ['food', 'mess', 'canteen', 'meal', 'cafeteria', 'dining', 'stale', 'spoiled', 'taste', 'hair in food', 'raw', 'undercooked', 'cooked', 'quality', 'breakfast', 'lunch', 'dinner', 'rotten', 'cook', 'caterer', 'kitchen', 'cutlery', 'utensils', 'snack', 'hygiene food', 'diet'],
      weight: 1
    }
  ];

  let bestCategory = 'Cleanliness'; // fallback default
  let highestScore = 0;
  let matchedKeywords = [];

  for (const rule of rules) {
    let score = 0;
    const currentMatches = [];
    for (const kw of rule.keywords) {
      // Check full word or phrase match
      const regex = new RegExp('\\b' + kw.replace('-', '[\\s-]') + '\\b', 'i');
      if (regex.test(combined)) {
        score += 2 * rule.weight;
        currentMatches.push(kw);
      } else if (combined.includes(kw)) {
        score += 1 * rule.weight;
        currentMatches.push(kw);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestCategory = rule.category;
      matchedKeywords = currentMatches;
    }
  }

  return {
    category: bestCategory,
    confidence: highestScore > 0 ? Math.min(99, Math.round(50 + highestScore * 10)) : 40,
    matchedKeywords: matchedKeywords.slice(0, 4)
  };
}

// Priority calculation engine (High, Medium, Low)
function determinePriority(category, text, location = '') {
  const combined = (text + ' ' + location).toLowerCase();

  const urgentTriggers = [
    'spark', 'fire', 'smoke', 'flame', 'burning', 'burn', 'shock', 'electric shock',
    'exposed wire', 'burst', 'flood', 'flooding', 'sewage overflow', 'gas', 'gas leak',
    'dark', 'pitch dark', 'unlit pathway', 'harass', 'theft', 'break in', 'emergency',
    'poisoning', 'food poisoning', 'raw chicken', 'urgent', 'critical', 'danger',
    'immediate', 'blood', 'injury', 'broken lock', 'unlocked', 'cannot lock'
  ];

  const lowTriggers = [
    'slow', 'cosmetic', 'paint', 'scratch', 'dust', 'dusty', 'stain', 'fan speed',
    'dim light', 'secondary', 'creak', 'minor', 'suggestion', 'request', 'preference',
    'loose screw', 'knob'
  ];

  let isHigh = false;
  let highMatches = [];
  for (const trigger of urgentTriggers) {
    if (combined.includes(trigger)) {
      isHigh = true;
      highMatches.push(trigger);
    }
  }

  if (category === 'Safety' && (combined.includes('night') || combined.includes('dark') || combined.includes('broken lock') || combined.includes('threat'))) {
    isHigh = true;
    highMatches.push('night-time safety hazard');
  }

  if (category === 'Electrical' && (combined.includes('spark') || combined.includes('burning') || combined.includes('shock') || combined.includes('exposed'))) {
    isHigh = true;
    highMatches.push('electrical safety hazard');
  }

  if (isHigh) {
    return {
      priority: 'High',
      reason: `High priority assigned: detected critical risk keywords (${highMatches.slice(0, 3).join(', ')}). Requires immediate dispatch.`
    };
  }

  let isLow = false;
  let lowMatches = [];
  for (const trigger of lowTriggers) {
    if (combined.includes(trigger)) {
      isLow = true;
      lowMatches.push(trigger);
    }
  }

  if (isLow) {
    return {
      priority: 'Low',
      reason: `Low priority assigned: non-urgent or cosmetic item (${lowMatches.slice(0, 2).join(', ')}). Handled within regular maintenance schedule.`
    };
  }

  return {
    priority: 'Medium',
    reason: `Medium priority assigned: standard functional campus issue requiring scheduled maintenance.`
  };
}

// Generate new unique Ticket ID
function generateTicketId() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `CF-${year}-${randomNum}`;
}

// Static emergency directory
const EMERGENCY_CONTACTS = [
  {
    id: 1,
    name: 'Campus Security 24/7 Control',
    role: 'Central Emergency & Quick Response Team',
    phone: '+91 1800-CAMPUS-911',
    display_phone: '1800-226-787',
    alt_phone: 'Ext: 911 / 100',
    available: '24 Hours / 7 Days',
    icon: 'shield',
    color: 'red'
  },
  {
    id: 2,
    name: 'Campus Health & Medical Centre',
    role: 'Ambulance & Emergency Doctor On-Duty',
    phone: '+91 94123-HEALTH',
    display_phone: '+91 94123-43258',
    alt_phone: 'Ext: 200',
    available: '24 Hours Ambulance Service',
    icon: 'heart-pulse',
    color: 'rose'
  },
  {
    id: 3,
    name: 'Central Electrical Substation',
    role: 'Breakdowns, High Voltage & Power Emergencies',
    phone: '+91 94110-POWER',
    display_phone: '+91 94110-76937',
    alt_phone: 'Ext: 440',
    available: '24x7 Shift Electricians',
    icon: 'zap',
    color: 'amber'
  },
  {
    id: 4,
    name: 'Campus Water Works & Plumbing',
    role: 'Mainline Burst, Sewage & Water Supply',
    phone: '+91 94110-WATER',
    display_phone: '+91 94110-92837',
    alt_phone: 'Ext: 450',
    available: '6:00 AM - 11:00 PM',
    icon: 'droplets',
    color: 'blue'
  },
  {
    id: 5,
    name: "Women's Safety & Anti-Ragging Cell",
    role: 'Confidential Support & Rapid Escort',
    phone: '+91 1800-SAFE-HER',
    display_phone: '1800-723-343',
    alt_phone: 'Dean of Student Welfare Cell',
    available: '24x7 Dedicated Officer',
    icon: 'lock',
    color: 'purple'
  },
  {
    id: 6,
    name: 'Chief Hostel Warden Office',
    role: 'Residential Affairs & Hostel Escalations',
    phone: '+91 98100-WARDEN',
    display_phone: '+91 98100-92733',
    alt_phone: 'Ext: 301',
    available: '8:00 AM - 10:00 PM',
    icon: 'home',
    color: 'indigo'
  },
  {
    id: 7,
    name: 'Campus IT Network Operations (NOC)',
    role: 'Campus Wi-Fi, Eduroam, Portals & Labs',
    phone: '+91 98111-ITHELP',
    display_phone: '+91 98111-48435',
    alt_phone: 'Ext: 555',
    available: '8:30 AM - 9:00 PM',
    icon: 'wifi',
    color: 'teal'
  },
  {
    id: 8,
    name: 'Dining & Food Safety Cell',
    role: 'Mess Food Quality, Hygiene & Kitchen Oversight',
    phone: '+91 98222-MESSFD',
    display_phone: '+91 98222-63773',
    alt_phone: 'Ext: 602',
    available: 'Meal Times & Kitchen Shifts',
    icon: 'utensils',
    color: 'orange'
  }
];

// Static FAQ list
const FAQS = [
  {
    id: 1,
    category: 'General',
    question: 'How fast will my reported campus problem be resolved?',
    answer: 'Turnaround times depend on assigned priority: High priority issues (safety hazards, electrical sparks, pipe bursts) are dispatched immediately with target resolution under 3-6 hours. Medium priority issues are typically addressed within 24-48 hours. Low priority / cosmetic repairs are completed within 3-5 business days.'
  },
  {
    id: 2,
    category: 'General',
    question: 'How do I know if someone has actually looked at my complaint?',
    answer: 'CampusFix provides a real-time status timeline on the "Track" tab. As soon as a supervisor assigns a technician or reviews the ticket, an audit event is timestamped with the admin/technician name and internal note.'
  },
  {
    id: 3,
    category: 'Safety',
    question: 'What should I do if there is an active fire or severe physical hazard?',
    answer: 'Do NOT wait for a regular ticket! Call the 24/7 Campus Security Control Room immediately at 1800-CAMPUS-911 (available on the Help tab with one-tap dialing) and evacuate the area safely.'
  },
  {
    id: 4,
    category: 'Electrical & Water',
    question: 'Can I report problems inside my private hostel room?',
    answer: 'Yes! When entering the location, specify your Hostel Block and Room Number (e.g. "Hostel B - Room 304"). Maintenance personnel visit hostel rooms between 10:00 AM and 5:00 PM on weekdays, accompanied by the hostel floor attendant.'
  },
  {
    id: 5,
    category: 'Internet',
    question: 'Why is the campus Wi-Fi slow in my block and how do I report it?',
    answer: 'Select "Internet" or describe the slow connection. Be sure to note whether the problem is with "EDUROAM", "Campus-Student", or your room LAN port. The Network Operations Center (NOC) will run ping diagnostics and re-align the nearest access point.'
  },
  {
    id: 6,
    category: 'Food',
    question: 'How are food hygiene and quality complaints investigated?',
    answer: 'Food reports are routed directly to the Student Food Committee and Campus Health Officer. Samples from the reported meal batch are tested, and caterers receive contractual penalty points if standards are breached.'
  },
  {
    id: 7,
    category: 'General',
    question: 'Can I upload photos taken directly from my phone camera?',
    answer: 'Yes! On mobile devices, tapping the photo button opens your camera or gallery. You can upload before-and-after photos or select from pre-loaded campus scenario samples for testing.'
  }
];

// Helper to read request body JSON
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) { // 10MB limit (for base64 photos)
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS & headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // JSON responder helper
  const jsonResponse = (data, statusCode = 200) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify(data));
  };

  // API ROUTING
  try {
    // 1. Auto-categorize & priority test endpoint (for real-time typing feedback)
    if (pathname === '/api/classify' && req.method === 'POST') {
      const body = await getRequestBody(req);
      const text = body.description || body.text || '';
      const location = body.location || '';
      const catResult = autoCategorize(text, location);
      const priResult = determinePriority(catResult.category, text, location);

      return jsonResponse({
        category: catResult.category,
        confidence: catResult.confidence,
        matchedKeywords: catResult.matchedKeywords,
        priority: priResult.priority,
        priorityReason: priResult.reason
      });
    }

    // 2. GET /api/complaints - List with filters & search
    if (pathname === '/api/complaints' && req.method === 'GET') {
      const search = parsedUrl.searchParams.get('search') || '';
      const status = parsedUrl.searchParams.get('status') || '';
      const category = parsedUrl.searchParams.get('category') || '';
      const priority = parsedUrl.searchParams.get('priority') || '';

      let query = 'SELECT * FROM complaints WHERE 1=1';
      const params = [];

      if (status && status !== 'All') {
        query += ' AND status = ?';
        params.push(status);
      }
      if (category && category !== 'All') {
        query += ' AND category = ?';
        params.push(category);
      }
      if (priority && priority !== 'All') {
        query += ' AND priority = ?';
        params.push(priority);
      }
      if (search) {
        query += ' AND (id LIKE ? OR title LIKE ? OR description LIKE ? OR location LIKE ? OR student_name LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      query += ' ORDER BY created_at DESC';

      const stmt = db.prepare(query);
      const complaints = stmt.all(...params);

      return jsonResponse({ complaints });
    }

    // 3. GET /api/complaints/:id - Detail with timeline
    const complaintDetailMatch = pathname.match(/^\/api\/complaints\/([A-Za-z0-9-]+)$/);
    if (complaintDetailMatch && req.method === 'GET') {
      const id = complaintDetailMatch[1];
      const stmt = db.prepare('SELECT * FROM complaints WHERE id = ?');
      const complaint = stmt.get(id);

      if (!complaint) {
        return jsonResponse({ error: 'Complaint not found' }, 404);
      }

      const timelineStmt = db.prepare('SELECT * FROM timeline_events WHERE complaint_id = ? ORDER BY created_at ASC');
      const timeline = timelineStmt.all(id);

      const feedbackStmt = db.prepare('SELECT * FROM feedback WHERE complaint_id = ? ORDER BY created_at DESC');
      const feedback = feedbackStmt.all(id);

      return jsonResponse({
        complaint,
        timeline,
        feedback
      });
    }

    // 4. POST /api/complaints - Submit new complaint
    if (pathname === '/api/complaints' && req.method === 'POST') {
      const body = await getRequestBody(req);

      if (!body.description || !body.location) {
        return jsonResponse({ error: 'Location and description are required' }, 400);
      }

      const title = body.title || body.description.slice(0, 50).trim() + (body.description.length > 50 ? '...' : '');
      const location = body.location;
      const description = body.description;
      const photo_url = body.photo_url || null;

      // Auto-categorize if not provided
      let category = body.category;
      if (!category) {
        const catObj = autoCategorize(description, location);
        category = catObj.category;
      }

      // Auto-determine priority if not provided
      let priority = body.priority;
      let priority_reason = body.priority_reason;
      if (!priority) {
        const priObj = determinePriority(category, description, location);
        priority = priObj.priority;
        priority_reason = priObj.reason;
      }

      const id = generateTicketId();
      const student_name = body.student_name || 'Alex Morgan';
      const student_id = body.student_id || '2026-CS-089';
      const student_phone = body.student_phone || '+91 98765 43210';
      const student_email = body.student_email || 'alex.morgan@campus.edu';
      const status = 'Submitted';
      const now = new Date().toISOString();

      let department = 'Campus Facilities';
      if (category === 'Electrical') department = 'Electrical Maintenance';
      if (category === 'Water') department = 'Plumbing & Sanitation';
      if (category === 'Internet') department = 'Campus IT & NOC';
      if (category === 'Cleanliness') department = 'Campus Housekeeping';
      if (category === 'Safety') department = 'Campus Security & Safety Cell';
      if (category === 'Food') department = 'Food Safety & Mess Committee';

      let estimated_resolution = 'Within 48 hours';
      if (priority === 'High') estimated_resolution = 'Within 2-4 hours';
      if (priority === 'Low') estimated_resolution = 'Within 3-5 days';

      const insertStmt = db.prepare(`
        INSERT INTO complaints (
          id, title, description, location, category, priority, priority_reason,
          status, student_name, student_id, student_phone, student_email,
          photo_url, assigned_to, department, estimated_resolution, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        id, title, description, location, category, priority, priority_reason,
        status, student_name, student_id, student_phone, student_email,
        photo_url, 'Unassigned (In Triage Queue)', department, estimated_resolution, now, now
      );

      // Create initial timeline event
      const timelineStmt = db.prepare(`
        INSERT INTO timeline_events (
          complaint_id, status, title, note, actor_role, actor_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      timelineStmt.run(
        id,
        'Submitted',
        'Ticket Created by Student',
        `Complaint logged via CampusFix app with priority ${priority}. Auto-assigned to ${department}.`,
        'Student',
        student_name,
        now
      );

      const createdComplaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);

      return jsonResponse({
        success: true,
        message: 'Complaint submitted successfully',
        complaint: createdComplaint
      }, 201);
    }

    // 5. PATCH /api/complaints/:id/status - Admin status update with note
    const statusUpdateMatch = pathname.match(/^\/api\/complaints\/([A-Za-z0-9-]+)\/status$/);
    if (statusUpdateMatch && (req.method === 'PATCH' || req.method === 'POST')) {
      const id = statusUpdateMatch[1];
      const body = await getRequestBody(req);

      const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
      if (!existing) {
        return jsonResponse({ error: 'Complaint not found' }, 404);
      }

      const newStatus = body.status || existing.status;
      const note = body.note || `Status changed from ${existing.status} to ${newStatus}`;
      const actor_role = body.actor_role || 'Campus Admin';
      const actor_name = body.actor_name || 'Admin Officer';
      const assigned_to = body.assigned_to || existing.assigned_to;
      const department = body.department || existing.department;
      const priority = body.priority || existing.priority;
      const now = new Date().toISOString();

      // Update complaint
      const updateStmt = db.prepare(`
        UPDATE complaints
        SET status = ?, assigned_to = ?, department = ?, priority = ?, updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(newStatus, assigned_to, department, priority, now, id);

      // Add timeline event
      let eventTitle = `Status updated to ${newStatus}`;
      if (newStatus === 'Under Review') eventTitle = 'Under Review by Department';
      if (newStatus === 'In Progress') eventTitle = 'Work Order Dispatched / In Progress';
      if (newStatus === 'Resolved') eventTitle = 'Maintenance Completed / Resolved';
      if (newStatus === 'Closed') eventTitle = 'Ticket Closed & Verified';

      const timelineStmt = db.prepare(`
        INSERT INTO timeline_events (
          complaint_id, status, title, note, actor_role, actor_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      timelineStmt.run(id, newStatus, eventTitle, note, actor_role, actor_name, now);

      const updated = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
      const timeline = db.prepare('SELECT * FROM timeline_events WHERE complaint_id = ? ORDER BY created_at ASC').all(id);

      return jsonResponse({
        success: true,
        message: 'Status updated successfully',
        complaint: updated,
        timeline
      });
    }

    // 6. POST /api/complaints/:id/feedback - Student feedback
    const feedbackMatch = pathname.match(/^\/api\/complaints\/([A-Za-z0-9-]+)\/feedback$/);
    if (feedbackMatch && req.method === 'POST') {
      const id = feedbackMatch[1];
      const body = await getRequestBody(req);
      const rating = Number(body.rating) || 5;
      const comment = body.comment || '';
      const now = new Date().toISOString();

      db.prepare('INSERT INTO feedback (complaint_id, rating, comment, created_at) VALUES (?, ?, ?, ?)').run(
        id, rating, comment, now
      );

      // Also log in timeline
      db.prepare(`
        INSERT INTO timeline_events (complaint_id, status, title, note, actor_role, actor_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 'Feedback', `Student Satisfaction Rating: ${rating}/5 Stars`,
        comment ? `Feedback note: "${comment}"` : 'Student confirmed satisfaction with resolution.',
        'Student', 'Student Alex', now
      );

      return jsonResponse({ success: true, message: 'Thank you for your rating!' });
    }

    // 7. GET /api/stats - Admin Dashboard Metrics & Category Distribution
    if (pathname === '/api/stats' && req.method === 'GET') {
      const total = db.prepare('SELECT COUNT(*) as count FROM complaints').get().count;
      const submitted = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Submitted'").get().count;
      const underReview = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Under Review'").get().count;
      const inProgress = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'In Progress'").get().count;
      const resolved = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'").get().count;
      const closed = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Closed'").get().count;
      const highPriority = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE priority = 'High' AND status != 'Resolved' AND status != 'Closed'").get().count;

      // Category breakdown (All 6 required categories)
      const categories = ['Electrical', 'Water', 'Internet', 'Cleanliness', 'Safety', 'Food'];
      const categoryCounts = {};
      for (const cat of categories) {
        const count = db.prepare('SELECT COUNT(*) as count FROM complaints WHERE category = ?').get(cat).count;
        categoryCounts[cat] = count;
      }

      // Priority breakdown
      const priorityCounts = {
        High: db.prepare("SELECT COUNT(*) as count FROM complaints WHERE priority = 'High'").get().count,
        Medium: db.prepare("SELECT COUNT(*) as count FROM complaints WHERE priority = 'Medium'").get().count,
        Low: db.prepare("SELECT COUNT(*) as count FROM complaints WHERE priority = 'Low'").get().count
      };

      // Recent 5 complaints
      const recent = db.prepare('SELECT id, title, location, category, priority, status, created_at FROM complaints ORDER BY created_at DESC LIMIT 5').all();

      return jsonResponse({
        total,
        pending: submitted + underReview,
        submitted,
        underReview,
        inProgress,
        resolved: resolved + closed,
        resolvedOnly: resolved,
        closedOnly: closed,
        highPriorityActive: highPriority,
        categoryCounts,
        priorityCounts,
        recent
      });
    }

    // 8. GET /api/emergency - Emergency Numbers
    if (pathname === '/api/emergency' && req.method === 'GET') {
      return jsonResponse({ contacts: EMERGENCY_CONTACTS });
    }

    // 9. GET /api/faqs - Frequently Asked Questions
    if (pathname === '/api/faqs' && req.method === 'GET') {
      return jsonResponse({ faqs: FAQS });
    }

    // 10. POST /api/reset-demo - Reset database to fresh seed
    if (pathname === '/api/reset-demo' && req.method === 'POST') {
      db.exec('DELETE FROM feedback; DELETE FROM timeline_events; DELETE FROM complaints;');
      seedDatabase();
      return jsonResponse({ success: true, message: 'Database reset to demo state.' });
    }

    // STATIC FILE SERVING
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    
    // Normalize path to prevent path traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Access Denied');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      return;
    }

    // Fallback to index.html for SPA routing
    const fallbackPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(fallbackPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(fs.readFileSync(fallbackPath));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');

  } catch (error) {
    console.error('Server error handling request:', error);
    jsonResponse({ error: error.message || 'Internal Server Error' }, 500);
  }
});

// Initialize DB and start server
initDatabase();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`CampusFix Server running at http://localhost:${PORT}`);
  console.log(`Mobile-first web app ready!`);
  console.log(`===============================================`);
});
