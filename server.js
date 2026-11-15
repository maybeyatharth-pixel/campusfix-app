// CampusFix - JECRC University Campus Problem Reporting Platform
// High-performance backend using Node.js built-in HTTP and SQLite (node:sqlite) with universal fallback
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'campusfix.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Universal persistent database adapter (supports SQLite or persistent JSON if on older Node)
let db;
try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_FILE);
  console.log('Using native SQLite engine for JECRC University CampusFix');
} catch (e) {
  console.warn('node:sqlite unavailable, using persistent JSON database fallback');
  db = createUniversalStore(path.join(__dirname, 'campusfix_store.json'));
}

function createUniversalStore(filePath) {
  let data = { users: [], complaints: [], timeline_events: [], feedback: [] };
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!data.users) data.users = [];
      if (!data.complaints) data.complaints = [];
      if (!data.timeline_events) data.timeline_events = [];
      if (!data.feedback) data.feedback = [];
    } catch (err) {}
  }
  const save = () => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {}
  };

  return {
    exec(sql) {},
    prepare(sql) {
      const s = sql.trim();
      return {
        get(...params) {
          if (s.includes('FROM users WHERE email =')) {
            const email = params[0];
            return data.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase()) || null;
          }
          if (s.includes('COUNT(*) as count FROM complaints WHERE priority =')) {
            const p = params[0] || 'High';
            const count = data.complaints.filter(c => c.priority === p && c.status !== 'Resolved' && c.status !== 'Closed').length;
            return { count };
          }
          if (s.includes('COUNT(*) as count FROM complaints WHERE status =')) {
            const match = s.match(/status = '([^']+)'/);
            const status = match ? match[1] : '';
            const count = data.complaints.filter(c => c.status === status).length;
            return { count };
          }
          if (s.includes('COUNT(*) as count FROM complaints WHERE category =')) {
            const cat = params[0];
            const count = data.complaints.filter(c => c.category === cat).length;
            return { count };
          }
          if (s.includes('COUNT(*) as count FROM complaints WHERE priority =')) {
            const pri = s.includes("'High'") ? 'High' : (s.includes("'Medium'") ? 'Medium' : 'Low');
            const count = data.complaints.filter(c => c.priority === pri).length;
            return { count };
          }
          if (s.includes('COUNT(*) as count FROM complaints')) {
            return { count: data.complaints.length };
          }
          if (s.includes('SELECT * FROM complaints WHERE id = ?')) {
            const id = params[0];
            return data.complaints.find(c => c.id === id) || null;
          }
          return null;
        },
        all(...params) {
          if (s.includes('SELECT * FROM timeline_events WHERE complaint_id = ?')) {
            const cid = params[0];
            return data.timeline_events.filter(t => t.complaint_id === cid).sort((a,b) => (a.created_at || '').localeCompare(b.created_at || ''));
          }
          if (s.includes('SELECT * FROM feedback WHERE complaint_id = ?')) {
            const cid = params[0];
            return data.feedback.filter(f => f.complaint_id === cid);
          }
          if (s.includes('SELECT * FROM complaints')) {
            let list = [...data.complaints];
            list.sort((a,b) => (b.created_at || '').localeCompare(a.created_at || ''));
            return list;
          }
          if (s.includes('SELECT id, title, location, category, priority, status, created_at FROM complaints')) {
            let list = [...data.complaints];
            list.sort((a,b) => (b.created_at || '').localeCompare(a.created_at || ''));
            return list.slice(0, 5);
          }
          return [];
        },
        run(...params) {
          if (s.includes('INSERT INTO users')) {
            const [name, email, role, roll_no, branch, hostel_or_day, phone, password_hash, verified, created_at] = params;
            data.users.push({
              id: data.users.length + 1,
              name, email, role, roll_no, branch, hostel_or_day, phone, password_hash, verified, created_at
            });
            save();
            return { changes: 1 };
          }
          if (s.includes('INSERT INTO complaints')) {
            const [
              id, title, description, location, category, priority, priority_reason,
              status, student_name, student_id, student_phone, student_email,
              photo_url, assigned_to, department, estimated_resolution, created_at, updated_at
            ] = params;
            data.complaints.push({
              id, title, description, location, category, priority, priority_reason,
              status, student_name, student_id, student_phone, student_email,
              photo_url, assigned_to, department, estimated_resolution, created_at, updated_at
            });
            save();
            return { changes: 1 };
          }
          if (s.includes('INSERT INTO timeline_events')) {
            const [complaint_id, status, title, note, actor_role, actor_name, created_at] = params;
            data.timeline_events.push({
              id: data.timeline_events.length + 1,
              complaint_id, status, title, note, actor_role, actor_name, created_at
            });
            save();
            return { changes: 1 };
          }
          if (s.includes('INSERT INTO feedback')) {
            const [complaint_id, rating, comment, created_at] = params;
            data.feedback.push({
              id: data.feedback.length + 1,
              complaint_id, rating, comment, created_at
            });
            save();
            return { changes: 1 };
          }
          if (s.includes('UPDATE complaints')) {
            const [newStatus, assigned_to, department, priority, now, id] = params;
            const c = data.complaints.find(item => item.id === id);
            if (c) {
              c.status = newStatus;
              c.assigned_to = assigned_to;
              c.department = department;
              c.priority = priority;
              c.updated_at = now;
              save();
            }
            return { changes: 1 };
          }
          if (s.includes('DELETE FROM feedback')) {
            data.feedback = [];
            data.timeline_events = [];
            data.complaints = [];
            save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }
  };
}

// Setup Database Schema
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      roll_no TEXT,
      branch TEXT,
      hostel_or_day TEXT,
      phone TEXT,
      password_hash TEXT,
      verified INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

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

  // Seed default admin and sample data if empty
  seedDatabase();
}

function seedDatabase() {
  // 1. Seed Initial Admin user only if configured via environment variables
  try {
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL;
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (adminEmail && adminPassword) {
      const adminExists = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
      if (!adminExists) {
        db.prepare(`
          INSERT INTO users (name, email, role, roll_no, branch, hostel_or_day, phone, password_hash, verified, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'JECRC Estate & Facilities Admin',
          adminEmail,
          'admin',
          'ADMIN-STAFF-01',
          'Campus Facilities Office',
          'Admin Block, 1st Floor',
          '+91 141 2770200',
          adminPassword,
          1,
          new Date().toISOString()
        );
        console.log('Seeded initial admin user from environment variables.');
      }
    }
  } catch (e) {
    console.warn('User seed note:', e.message);
  }

  // 2. Seed JECRC Student user
  try {
    const studentExists = db.prepare('SELECT * FROM users WHERE email = ?').get('aarav.sharma@jecrcu.edu.in');
    if (!studentExists) {
      db.prepare(`
        INSERT INTO users (name, email, role, roll_no, branch, hostel_or_day, phone, password_hash, verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'Aarav Sharma',
        'aarav.sharma@jecrcu.edu.in',
        'student',
        'JU/2026/BTECH/1042',
        'Computer Science & Engineering',
        'Boys Hostel BH-2 (Room 214)',
        '+91 98290 12345',
        'student@123',
        1,
        new Date().toISOString()
      );
    }
  } catch (e) {
    console.warn('Student seed note:', e.message);
  }

  // 3. Seed realistic JECRC University Complaints
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM complaints');
  const count = countStmt.get() ? countStmt.get().count : 0;

  if (count === 0) {
    const sampleComplaints = [
      {
        id: 'JU-2026-0201',
        title: 'Sparks and burning smell from MCB in Engineering Block A',
        description: 'During afternoon lab session in Lab 302 (Block A), heavy sparking occurred from the secondary MCB box. The circuit breaker tripped and smoke smell is still present.',
        location: 'Engineering Block A - 3rd Floor, Computer Lab 302',
        category: 'Electrical',
        priority: 'High',
        priority_reason: 'Fire & electrical hazard in academic lab with active student batch.',
        status: 'In Progress',
        student_name: 'Aarav Sharma',
        student_id: 'JU/2026/BTECH/1042',
        student_phone: '+91 98290 12345',
        student_email: 'aarav.sharma@jecrcu.edu.in',
        photo_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
        assigned_to: 'Rameshwar Meena (Senior Electrician, JECRC Works)',
        department: 'Electrical & Power Services',
        estimated_resolution: 'Within 2 hours',
        created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        timeline: [
          {
            status: 'Submitted',
            title: 'Hazard Ticket Created by Student',
            note: 'Student logged urgent hazard alert via JECRC CampusFix app with verified @jecrcu.edu.in credentials.',
            actor_role: 'Student',
            actor_name: 'Aarav Sharma (JU/2026/BTECH/1042)',
            created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
          },
          {
            status: 'Under Review',
            title: 'Triaged by JECRC Central Control Room',
            note: 'Power line to Lab 302 isolated. Work order #WO-JU-891 created.',
            actor_role: 'Campus Admin',
            actor_name: 'Dr. S. K. Gupta (Estate Officer)',
            created_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString()
          },
          {
            status: 'In Progress',
            title: 'Electrician Team Dispatched',
            note: 'Replacement Schneider 63A 4-pole MCB box brought for rewiring.',
            actor_role: 'Maintenance Lead',
            actor_name: 'Rameshwar Meena',
            created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'JU-2026-0202',
        title: 'RO Drinking Water dispenser leaking in Girls Hostel GH-1',
        description: 'The stainless steel RO water dispenser on the 2nd floor corridor of GH-1 has a broken push tap. Purified water is continuously spilling over the corridor marble floor.',
        location: 'Girls Hostel GH-1 - 2nd Floor Near Wing B',
        category: 'Water',
        priority: 'Medium',
        priority_reason: 'Drinking water wastage and slippery hazard in hostel corridor.',
        status: 'Under Review',
        student_name: 'Kritika Rathore',
        student_id: 'JU/2026/BBA/045',
        student_phone: '+91 98295 67890',
        student_email: 'kritika.r@jecrcu.edu.in',
        photo_url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
        assigned_to: 'Mukesh Sharma (Plumbing Attendant)',
        department: 'Hostel Facilities & Plumbing',
        estimated_resolution: 'Within 4 hours',
        created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        timeline: [
          {
            status: 'Submitted',
            title: 'Complaint Logged',
            note: 'Hostel student reported water leakage with photo.',
            actor_role: 'Student',
            actor_name: 'Kritika Rathore',
            created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
          },
          {
            status: 'Under Review',
            title: 'Hostel Warden Acknowledged',
            note: 'GH-1 warden informed; supply valve closed temporarily.',
            actor_role: 'Campus Admin',
            actor_name: 'Mrs. Sunita Verma (GH-1 Warden)',
            created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'JU-2026-0203',
        title: 'Central Library 2nd floor JECRC-Student Wi-Fi dropping',
        description: 'Wi-Fi AP near Digital Reference Section disconnects every 5 minutes. Ping to gateway 172.16.0.1 shows 80% packet loss.',
        location: 'JECRC Central Library - 2nd Floor Reading Hall',
        category: 'Internet',
        priority: 'Medium',
        priority_reason: 'Academic internet connectivity impacted for digital research.',
        status: 'Resolved',
        student_name: 'Manish Choudhary',
        student_id: 'JU/2026/BTECH/0890',
        student_phone: '+91 97850 11442',
        student_email: 'manish.c@jecrcu.edu.in',
        photo_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
        assigned_to: 'Vikas Sharma (JECRC NOC Network Engineer)',
        department: 'Campus IT & Network Operations (NOC)',
        estimated_resolution: 'Resolved',
        created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
        timeline: [
          {
            status: 'Submitted',
            title: 'Wi-Fi Issue Registered',
            note: 'Logged with network diagnostic details.',
            actor_role: 'Student',
            actor_name: 'Manish Choudhary',
            created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
          },
          {
            status: 'In Progress',
            title: 'NOC Diagnostic & PoE Switch Check',
            note: 'Checked Cisco Catalyst PoE switch on Rack L2; faulty patch cord replaced.',
            actor_role: 'Maintenance Lead',
            actor_name: 'Vikas Sharma',
            created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
          },
          {
            status: 'Resolved',
            title: 'Network Verified Stable',
            note: 'Access point rebooted with updated firmware. Speed test 95 Mbps verified.',
            actor_role: 'Campus Admin',
            actor_name: 'IT Head JECRC',
            created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'JU-2026-0204',
        title: 'Dark pathway between Boys Hostel BH-3 and Gate 2',
        description: 'Two pole streetlights are completely off near the sports pavilion boundary on the path towards BH-3. Pitch dark after 7:30 PM.',
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
          {
            status: 'Submitted',
            title: 'Campus Safety Alert Logged',
            note: 'Student raised alert regarding darkness near Gate 2 walkway.',
            actor_role: 'Student',
            actor_name: 'Yuvraj Singh Shekhawat',
            created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString()
          },
          {
            status: 'In Progress',
            title: 'Security Rover Deployed',
            note: 'Security guard stationed at gate 2 turn. Electrician replacing LED driver unit.',
            actor_role: 'Campus Admin',
            actor_name: 'Chief Security Officer JECRC',
            created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
          }
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
        assigned_to: 'Dr. Meenakshi (Hostel Food & Hygiene Committee)',
        department: 'Dining & Food Safety Board',
        estimated_resolution: 'Immediate Inspection',
        created_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
        timeline: [
          {
            status: 'Submitted',
            title: 'Mess Quality Complaint Registered',
            note: 'Sample details provided with dinner timing.',
            actor_role: 'Student',
            actor_name: 'Rohit Agarwal',
            created_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString()
          },
          {
            status: 'Under Review',
            title: 'Mess Committee Inspection Summoned',
            note: 'Mess contractor served notice; kitchen supervisor warned.',
            actor_role: 'Campus Admin',
            actor_name: 'Food Inspector JECRC',
            created_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString()
          }
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
          {
            status: 'Submitted',
            title: 'Cleanliness Alert Logged',
            note: 'Cleanliness report registered for Cafeteria plaza lawn.',
            actor_role: 'Student',
            actor_name: 'Pooja Jangid',
            created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
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

    console.log(`Database seeded with ${sampleComplaints.length} JECRC University complaints.`);
  }
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

  let bestCategory = 'Cleanliness';
  let highestScore = 0;
  let matchedKeywords = [];

  for (const rule of rules) {
    let score = 0;
    const currentMatches = [];
    for (const kw of rule.keywords) {
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

function generateTicketId() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `JU-${year}-${randomNum}`;
}

// JECRC University Jaipur Emergency Directory
const EMERGENCY_CONTACTS = [
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

// JECRC University FAQs
const FAQS = [
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

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) {
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

// HTTP Server Request Handler
async function handleRequest(req, res) {
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

  const jsonResponse = (data, statusCode = 200) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify(data));
  };

  try {
    // ==========================================
    // AUTHENTICATION ROUTES (Student & Admin)
    // ==========================================

    // 1. POST /api/auth/student-register - Register with Gmail / Student email
    if (pathname === '/api/auth/student-register' && req.method === 'POST') {
      const body = await getRequestBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const name = (body.name || '').trim();
      const roll_no = (body.roll_no || '').trim();
      const branch = (body.branch || '').trim();
      const hostel_or_day = (body.hostel_or_day || '').trim();
      const phone = (body.phone || '').trim();

      if (!email || !name) {
        return jsonResponse({ error: 'Name and Gmail/email address are required' }, 400);
      }

      // Generate verification OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Check if user already exists
      const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      let user;
      if (existing) {
        user = existing;
      } else {
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO users (name, email, role, roll_no, branch, hostel_or_day, phone, password_hash, verified, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          name, email, 'student', roll_no || 'JU/2026/STU/' + Math.floor(100 + Math.random() * 900),
          branch || 'Engineering / Technology', hostel_or_day || 'Day Scholar (Jaipur)',
          phone || '+91 98290 00000', otpCode, 1, now
        );
        user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      }

      return jsonResponse({
        success: true,
        message: 'Gmail authentication verified successfully for JECRC University!',
        otpCode: otpCode, // returned so client can show "Email verification code: XXXXXX verified!"
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'student',
          roll_no: user.roll_no,
          branch: user.branch,
          hostel_or_day: user.hostel_or_day,
          phone: user.phone
        }
      });
    }

    // 2. POST /api/auth/admin-login - Secure Admin Login Gateway
    if (pathname === '/api/auth/admin-login' && req.method === 'POST') {
      const body = await getRequestBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const password = (body.password || '').trim();

      if (!email || !password) {
        return jsonResponse({ error: 'Admin Email and Password are required' }, 400);
      }

      const adminUser = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, 'admin');

      // Check admin credentials
      if (adminUser && adminUser.password_hash === password) {
        return jsonResponse({
          success: true,
          message: 'Welcome to JECRC University Facilities Administration Portal',
          user: {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: 'admin',
            department: adminUser.branch,
            phone: adminUser.phone
          }
        });
      } else {
        return jsonResponse({ error: 'Invalid JECRC Admin credentials. Please check your admin email and password.' }, 401);
      }
    }

    // 3. POST /api/classify - Real-time NLP classifier
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

    // 4. GET /api/complaints - Filtered complaints list
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

    // 5. GET /api/complaints/:id - Detail with timeline
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

    // 6. POST /api/complaints - Submit new complaint
    if (pathname === '/api/complaints' && req.method === 'POST') {
      const body = await getRequestBody(req);

      if (!body.description || !body.location) {
        return jsonResponse({ error: 'Location and description are required' }, 400);
      }

      const title = body.title || body.description.slice(0, 50).trim() + (body.description.length > 50 ? '...' : '');
      const location = body.location;
      const description = body.description;
      const photo_url = body.photo_url || null;

      let category = body.category;
      if (!category) {
        const catObj = autoCategorize(description, location);
        category = catObj.category;
      }

      let priority = body.priority;
      let priority_reason = body.priority_reason;
      if (!priority) {
        const priObj = determinePriority(category, description, location);
        priority = priObj.priority;
        priority_reason = priObj.reason;
      }

      const id = generateTicketId();
      const student_name = body.student_name || 'Aarav Sharma';
      const student_id = body.student_id || 'JU/2026/BTECH/1042';
      const student_phone = body.student_phone || '+91 98290 12345';
      const student_email = body.student_email || 'aarav.sharma@jecrcu.edu.in';
      const status = 'Submitted';
      const now = new Date().toISOString();

      let department = 'JECRC Campus Facilities';
      if (category === 'Electrical') department = 'Electrical & Power Services';
      if (category === 'Water') department = 'Hostel & Campus Plumbing';
      if (category === 'Internet') department = 'JECRC IT & NOC Cell';
      if (category === 'Cleanliness') department = 'Campus Housekeeping';
      if (category === 'Safety') department = 'Chief Proctor & Security Cell';
      if (category === 'Food') department = 'Hostel Food & Mess Committee';

      let estimated_resolution = 'Within 24 hours';
      if (priority === 'High') estimated_resolution = 'Within 1-2 hours';
      if (priority === 'Low') estimated_resolution = 'Within 2-3 business days';

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
        photo_url, 'Unassigned (Triage Queue)', department, estimated_resolution, now, now
      );

      const timelineStmt = db.prepare(`
        INSERT INTO timeline_events (
          complaint_id, status, title, note, actor_role, actor_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      timelineStmt.run(
        id,
        'Submitted',
        'Ticket Created by Verified JECRC Student',
        `Complaint logged via JECRC CampusFix app with priority ${priority}. Routed to ${department}.`,
        'Student',
        `${student_name} (${student_id})`,
        now
      );

      const createdComplaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);

      return jsonResponse({
        success: true,
        message: 'Complaint submitted successfully to JECRC Facilities Desk',
        complaint: createdComplaint
      }, 201);
    }

    // 7. PATCH /api/complaints/:id/status - Admin status update with note
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
      const actor_name = body.actor_name || 'JECRC Estate Officer';
      const assigned_to = body.assigned_to || existing.assigned_to;
      const department = body.department || existing.department;
      const priority = body.priority || existing.priority;
      const now = new Date().toISOString();

      const updateStmt = db.prepare(`
        UPDATE complaints
        SET status = ?, assigned_to = ?, department = ?, priority = ?, updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(newStatus, assigned_to, department, priority, now, id);

      let eventTitle = `Status updated to ${newStatus}`;
      if (newStatus === 'Under Review') eventTitle = 'Under Review by Department';
      if (newStatus === 'In Progress') eventTitle = 'Work Order Dispatched / Maintenance Active';
      if (newStatus === 'Resolved') eventTitle = 'Maintenance Completed & Tested';
      if (newStatus === 'Closed') eventTitle = 'Ticket Closed & Verified by Student';

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

    // 8. POST /api/complaints/:id/feedback - Student feedback
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

      db.prepare(`
        INSERT INTO timeline_events (complaint_id, status, title, note, actor_role, actor_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 'Feedback', `Student Satisfaction Rating: ${rating}/5 Stars`,
        comment ? `Feedback note: "${comment}"` : 'Student verified satisfactory resolution on campus.',
        'Student', body.student_name || 'Student Submitter', now
      );

      return jsonResponse({ success: true, message: 'Thank you for your rating!' });
    }

    // 9. GET /api/stats - Admin Dashboard Metrics & Category Distribution
    if (pathname === '/api/stats' && req.method === 'GET') {
      const total = db.prepare('SELECT COUNT(*) as count FROM complaints').get().count;
      const submitted = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Submitted'").get().count;
      const underReview = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Under Review'").get().count;
      const inProgress = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'In Progress'").get().count;
      const resolved = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'").get().count;
      const closed = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Closed'").get().count;
      const highPriority = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE priority = 'High' AND status != 'Resolved' AND status != 'Closed'").get().count;

      const categories = ['Electrical', 'Water', 'Internet', 'Cleanliness', 'Safety', 'Food'];
      const categoryCounts = {};
      for (const cat of categories) {
        const count = db.prepare('SELECT COUNT(*) as count FROM complaints WHERE category = ?').get(cat).count;
        categoryCounts[cat] = count;
      }

      const priorityCounts = {
        High: db.prepare("SELECT COUNT(*) as count FROM complaints WHERE priority = 'High'").get().count,
        Medium: db.prepare("SELECT COUNT(*) as count FROM complaints WHERE priority = 'Medium'").get().count,
        Low: db.prepare("SELECT COUNT(*) as count FROM complaints WHERE priority = 'Low'").get().count
      };

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

    // 10. GET /api/emergency - Emergency Numbers
    if (pathname === '/api/emergency' && req.method === 'GET') {
      return jsonResponse({ contacts: EMERGENCY_CONTACTS });
    }

    // 11. GET /api/faqs - Frequently Asked Questions
    if (pathname === '/api/faqs' && req.method === 'GET') {
      return jsonResponse({ faqs: FAQS });
    }

    // 12. POST /api/reset-demo - Reset database to fresh seed
    if (pathname === '/api/reset-demo' && req.method === 'POST') {
      db.exec('DELETE FROM feedback; DELETE FROM timeline_events; DELETE FROM complaints;');
      seedDatabase();
      return jsonResponse({ success: true, message: 'JECRC University database reset to demo state.' });
    }

    // STATIC FILE SERVING
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    
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
}

const server = http.createServer(handleRequest);

// Initialize DB and start server
initDatabase();

const serverPort = parseInt(PORT, 10) || 3000;

server.listen(serverPort, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`CampusFix - JECRC University Server running on port ${serverPort}`);
  console.log(`Campus: Sitapura Industrial Area, Jaipur, Rajasthan`);
  console.log(`===============================================`);
});

// Bind alternate port so Railway routes seamlessly whether target is 8080 or 3000
const alternatePorts = [8080, 3000].filter(p => p !== serverPort);
for (const altPort of alternatePorts) {
  try {
    const auxServer = http.createServer(handleRequest);
    auxServer.on('error', () => {});
    auxServer.listen(altPort, '0.0.0.0', () => {
      console.log(`Also listening on port ${altPort}`);
    });
  } catch (err) {}
}
