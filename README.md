# 🛠️ CampusFix - Mobile-First Campus Problem Reporting Platform

**CampusFix** is a responsive, mobile-first web application designed for students and campus administrators to report, auto-triage, track, and resolve physical and facilities issues across campus.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v22.5.0 or higher (Node.js 24+ recommended, zero external npm dependencies required).

### Run the App
```bash
# Navigate to the project directory
cd "C:\Users\maybe\.gemini\antigravity\scratch\campusfix"

# Start the server
node server.js
```

Then open your browser to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📱 Core Features

### 1. Mobile-First Experience
- **Realistic Phone Bezel Mockup**: Styled with simulated status bar, Dynamic Island, and responsive touch layout.
- **View Mode Switcher**: Toggle easily between the **Mobile Phone Frame** and **Full Expanded View** on desktop or tablet.

### 2. Five Bottom Navigation Tabs
1. **🏠 Home**:
   - Personalized student welcome banner (`Alex Morgan • Hostel Block B, Room 304`).
   - Campus announcement ticker.
   - Primary **Report an Issue** call-to-action button.
   - Campus KPI stats (Total Reports, In Progress, Resolved).
   - Quick Category Jump grid (1-tap navigation into Report with category pre-selected).
   - Horizontal scroll feed of **My Active Reports** with live progress badges.
   - Verified community feed of **Recently Resolved on Campus**.

2. **➕ Report**:
   - **Location**: Building & room input, campus quick chips (*Hostel Block B, Central Library, Science Complex, Cafeteria 1, Lecture Hall 201, Sports Complex*), plus a **GPS Auto-Detect** simulation button.
   - **Description**: Real-time keystroke analysis with character counter.
   - **Smart Auto-Categorisation**: Instantly classifies the issue into one of 6 required categories:
     - ⚡ **Electrical**
     - 💧 **Water**
     - 🌐 **Internet**
     - 🧹 **Cleanliness**
     - 🛡️ **Safety**
     - 🍲 **Food**
   - **Automated Priority Matrix**: Auto-assigns **🔴 High**, **🟡 Medium**, or **🟢 Low** with explicit engine rationale (e.g. electrical shock hazard, flooding risk, dark night pathway).
   - **Manual Override Controls**: Students can fine-tune or override the category and priority with one tap.
   - **Photo Upload**:
     - Drag & drop or camera file upload.
     - 6 built-in **1-Click Campus Sample Scenarios** (*Sparks, Washbasin Leak, Offline Router, Overflowing Bin, Dark Path, Stale Food*) for instant one-click testing.

3. **⏱️ Track**:
   - Filter complaints by **All**, **Active**, **Resolved**, and **High Priority**.
   - Search bar by ticket ID, building, or description keyword.
   - Category filter chips.
   - Visual 4-step progress bar on each card.
   - **Detailed Status Timeline Sheet**:
     - Visual stepper: `Submitted` ➔ `Under Review` ➔ `In Progress` ➔ `Resolved` ➔ `Closed`.
     - Timestamped audit history showing actor roles (*Student, Campus Admin, Senior Electrician, Plumber, Security Officer*).
     - Admin notes and technician remarks.
     - Interactive **5-Star Satisfaction Rating** and feedback confirmation.

4. **ℹ️ Help**:
   - **Emergency Directory**: High-priority cards with 1-tap **Call Now** (`tel:`) and **Copy Number** buttons:
     - Campus Security 24/7 Control (`1800-CAMPUS-911`)
     - Campus Medical Centre & Ambulance
     - Central Electrical Substation
     - Water Works & Mainline Works
     - Women's Safety & Anti-Ragging Helpline
     - Chief Hostel Warden Office
     - IT & Network Operations Center (NOC)
     - Food Safety & Mess Oversight Board
   - **Searchable FAQs Accordion**: Expandable answers addressing turnaround times, emergency escalation, hostel room repairs, Wi-Fi diagnosis, and food inspections.

5. **👤 Profile**:
   - Student ID card preview.
   - Personal statistics (Total Reported, Active, Resolved).
   - **Dark Mode Switch** with persistent localStorage theme.
   - SMS & Email notification preferences.
   - **Switch to Campus Admin Mode** button.
   - **Reset Database to Initial Demo State** button.

---

## 🛠️ Admin Dashboard Portal

Switch between **👤 Student Mode** and **🛠️ Admin Portal** anytime via the header pill or Profile tab.

- **Admin Metrics Cards**:
  - Total Tickets Count
  - In Triage / Under Review
  - In Progress / Dispatched
  - Resolution Rate Percentage
  - Critical / High Priority Hazard Alert banner
- **Interactive Category Distribution Chart**:
  - Visual distribution bars across Electrical, Water, Internet, Cleanliness, Safety, and Food.
  - **Interactive Filtering**: Clicking any category bar instantly filters the complaints table below!
- **Search & Multi-Filter Controls**:
  - Filter by Status (*Submitted, Under Review, In Progress, Resolved, Closed*).
  - Filter by Category and Priority.
  - Full-text search for ticket IDs, student names, or locations.
- **Admin Status Update Modal**:
  - Change status (*e.g. Under Review ➔ In Progress ➔ Resolved*).
  - Assign department and technician name.
  - Override priority.
  - Enter official internal/technician notes that immediately update the student's **Status Timeline**.

---

## 🗄️ Database Architecture

The backend uses Node.js 24's native **`node:sqlite`** (`DatabaseSync`) with persistent storage in `campusfix.db`.

### Database Tables:
- `complaints`: Primary record of tickets, categories, locations, priorities, assignees, and timestamps.
- `timeline_events`: Audit trail of all status transitions, actors, and notes.
- `feedback`: Student satisfaction star ratings and resolution reviews.

---

## 🎨 Dark Mode Support
Full dark theme support using CSS variables with deep midnight blues (`#0b0f19`, `#111827`, `#1e293b`), high-contrast text, category accent chips, and smooth transitions.
