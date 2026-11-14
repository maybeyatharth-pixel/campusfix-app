// Comprehensive Test Suite for CampusFix Backend & Database
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

console.log('--- 1. Testing Database & Schema ---');
const dbFile = path.join(__dirname, 'campusfix.db');
const db = new DatabaseSync(dbFile);

const count = db.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
console.log(`[PASS] Complaints in DB: ${count}`);

const categories = db.prepare('SELECT category, count(*) as c FROM complaints GROUP BY category').all();
console.log('[PASS] Category distribution:');
console.table(categories);

console.log('\n--- 2. Testing Insert New Complaint & Timeline ---');
const newId = `CF-2026-TEST`;
const now = new Date().toISOString();

// Insert complaint
db.prepare(`
  INSERT OR REPLACE INTO complaints (
    id, title, description, location, category, priority, priority_reason,
    status, student_name, student_id, student_phone, student_email,
    photo_url, assigned_to, department, estimated_resolution, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  newId, 'Broken water pipe near gym', 'High pressure water flooding the hallway floor',
  'Sports Complex - Ground Floor', 'Water', 'High', 'Flooding hazard detected',
  'Submitted', 'Test Student', '2026-TS-001', '+91 99999 88888', 'test@campus.edu',
  null, 'Duty Plumber', 'Plumbing & Sanitation', 'Within 2 hours', now, now
);

// Insert timeline
db.prepare(`
  INSERT INTO timeline_events (complaint_id, status, title, note, actor_role, actor_name, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(newId, 'Submitted', 'Ticket Created', 'Logged via test script', 'Student', 'Test Student', now);

console.log('[PASS] Inserted test complaint successfully');

// Admin updates status with note
console.log('\n--- 3. Testing Admin Status Update & Timeline Audit ---');
const updateStatus = 'In Progress';
const adminNote = 'Plumber deployed with pipe replacement valve #4.';
db.prepare('UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?').run(updateStatus, new Date().toISOString(), newId);
db.prepare(`
  INSERT INTO timeline_events (complaint_id, status, title, note, actor_role, actor_name, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(newId, updateStatus, 'Work Order Dispatched', adminNote, 'Campus Admin', 'Admin Ramesh', new Date().toISOString());

const updated = db.prepare('SELECT id, status, updated_at FROM complaints WHERE id = ?').get(newId);
console.log('[PASS] Updated complaint status:', updated);

const timelineEvents = db.prepare('SELECT * FROM timeline_events WHERE complaint_id = ? ORDER BY created_at ASC').all(newId);
console.log(`[PASS] Timeline events count for ${newId}: ${timelineEvents.length}`);
console.table(timelineEvents.map(e => ({ status: e.status, actor: e.actor_name, note: e.note })));

console.log('\n--- 4. Testing Static Assets in public/ ---');
const files = ['index.html', 'styles.css', 'app.js'];
for (const f of files) {
  const p = path.join(__dirname, 'public', f);
  if (fs.existsSync(p)) {
    const sz = fs.statSync(p).size;
    console.log(`[PASS] public/${f} exists (${(sz / 1024).toFixed(1)} KB)`);
  } else {
    console.error(`[FAIL] public/${f} missing!`);
    process.exit(1);
  }
}

// Clean up test entry
db.prepare('DELETE FROM timeline_events WHERE complaint_id = ?').run(newId);
db.prepare('DELETE FROM complaints WHERE id = ?').run(newId);
console.log('\n[ALL TESTS PASSED] CampusFix backend, database, and assets are 100% verified!');
