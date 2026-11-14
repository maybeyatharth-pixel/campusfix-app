// CampusFix - Core Mobile Web Application Logic
// Handles tabs, auto-categorisation, status timeline, admin dashboard, dark mode, database REST sync

(function () {
  'use strict';

  // State
  const state = {
    currentTab: 'home',
    currentRole: 'student', // 'student' | 'admin'
    theme: localStorage.getItem('campusfix_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    viewMode: localStorage.getItem('campusfix_view_mode') || 'mockup', // 'mockup' | 'expanded'
    
    // Data
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
      priorityReason: 'Standard priority assigned.',
      confidence: 0,
      matchedKeywords: [],
      photoUrl: '',
      studentName: 'Alex Morgan',
      studentId: '2026-CS-089',
      studentPhone: '+91 98765 43210',
      studentEmail: 'alex.morgan@campus.edu'
    },

    // Track Filter State
    trackFilter: 'All', // 'All' | 'Active' | 'Resolved' | 'High'
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

    // Feedback rating draft
    selectedRating: 5
  };

  // Sample Photos for 1-click test
  const SAMPLE_PHOTOS = [
    {
      category: 'Electrical',
      title: 'Sparks / Switchboard',
      url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Switchboard sparking and smelling burnt near corridor',
      defaultLoc: 'Hostel Block B - Room 204'
    },
    {
      category: 'Water',
      title: 'Washbasin Leak',
      url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Water valve leaking continuously under the washbasin',
      defaultLoc: 'Science Complex - 1st Floor Restroom'
    },
    {
      category: 'Internet',
      title: 'Wi-Fi AP Down',
      url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Campus Eduroam and Student Wi-Fi dropping connection repeatedly',
      defaultLoc: 'Central Library - 3rd Floor East Wing'
    },
    {
      category: 'Cleanliness',
      title: 'Overflowing Bins',
      url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Trash bin overflowing with food waste and packaging',
      defaultLoc: 'Mess Hall 1 - Main Entrance'
    },
    {
      category: 'Safety',
      title: 'Dark Unlit Pathway',
      url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Street lights not functioning on the perimeter path behind hostel at night',
      defaultLoc: 'Hostel Block D - North Pathway'
    },
    {
      category: 'Food',
      title: 'Mess Food Quality',
      url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      defaultDesc: 'Undercooked food and cold sour dal served at dinner counter',
      defaultLoc: 'Central Mess Hall - Counter 2'
    }
  ];

  // DOM Elements cache
  const el = {};

  // Icons Helper (SVG strings)
  const icons = {
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
    sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
  };

  // Category Icon & Color Mapping
  const CATEGORY_MAP = {
    'Electrical': { icon: '⚡', color: 'var(--cat-electrical)', bg: 'var(--cat-electrical-bg)' },
    'Water': { icon: '💧', color: 'var(--cat-water)', bg: 'var(--cat-water-bg)' },
    'Internet': { icon: '🌐', color: 'var(--cat-internet)', bg: 'var(--cat-internet-bg)' },
    'Cleanliness': { icon: '🧹', color: 'var(--cat-cleanliness)', bg: 'var(--cat-cleanliness-bg)' },
    'Safety': { icon: '🛡️', color: 'var(--cat-safety)', bg: 'var(--cat-safety-bg)' },
    'Food': { icon: '🍲', color: 'var(--cat-food)', bg: 'var(--cat-food-bg)' }
  };

  // Client-side instant Auto-Categorization
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
        weight: 1.15
      },
      {
        category: 'Food',
        keywords: ['food', 'mess', 'canteen', 'meal', 'cafeteria', 'dining', 'stale', 'spoiled', 'taste', 'hair in food', 'raw', 'undercooked', 'cooked', 'quality', 'breakfast', 'lunch', 'dinner', 'rotten', 'cook', 'caterer', 'kitchen', 'cutlery', 'utensils', 'snack', 'hygiene food', 'diet'],
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

    // Priority Detection
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
    let priorityReason = 'Standard campus maintenance issue.';

    const highFound = urgentTriggers.filter(t => combined.includes(t));
    if (highFound.length > 0 || (bestCategory === 'Safety' && combined.includes('dark'))) {
      priority = 'High';
      priorityReason = `Urgent risk detected (${highFound.slice(0, 2).join(', ') || 'safety risk'}). Dispatched with highest priority.`;
    } else {
      const lowFound = lowTriggers.filter(t => combined.includes(t));
      if (lowFound.length > 0) {
        priority = 'Low';
        priorityReason = `Minor non-critical maintenance (${lowFound.slice(0, 2).join(', ')}).`;
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

  // Format date helper
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

  // Initialize
  async function init() {
    applyTheme(state.theme);
    applyViewMode(state.viewMode);
    setupEventListeners();
    await loadData();
    renderApp();
  }

  // Apply Theme
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('campusfix_theme', theme);
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

  // Apply View Mode (Phone Mockup vs Full Responsive View)
  function applyViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem('campusfix_view_mode', mode);
    const wrapper = document.getElementById('phone-frame-wrapper');
    const container = document.getElementById('app-container');
    const toggleBtn = document.getElementById('view-toggle-btn');
    
    if (mode === 'expanded') {
      if (wrapper) wrapper.classList.remove('phone-mockup-frame');
      if (container) container.classList.add('expanded-view');
      if (toggleBtn) toggleBtn.innerHTML = `<span>📱</span> <span>Switch to Phone Frame</span>`;
    } else {
      if (wrapper) wrapper.classList.add('phone-mockup-frame');
      if (container) container.classList.remove('expanded-view');
      if (toggleBtn) toggleBtn.innerHTML = `<span>💻</span> <span>Switch to Expanded View</span>`;
    }
  }

  // Fetch Data from Backend
  async function loadData() {
    try {
      const [complaintsRes, statsRes, emergencyRes, faqsRes] = await Promise.all([
        fetch('/api/complaints').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/emergency').then(r => r.json()),
        fetch('/api/faqs').then(r => r.json())
      ]);

      if (complaintsRes && complaintsRes.complaints) {
        state.complaints = complaintsRes.complaints;
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
      console.warn('Backend load notice (using local state fallback if offline):', err);
    }
  }

  // Main Render Router
  function renderApp() {
    // 1. Navigation Tab Highlights
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (tab === state.currentTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. Hide all tab panels, show active
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`tab-${state.currentTab}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // 3. Render content of active tab
    if (state.currentTab === 'home') renderHomeTab();
    if (state.currentTab === 'report') renderReportTab();
    if (state.currentTab === 'track') renderTrackTab();
    if (state.currentTab === 'help') renderHelpTab();
    if (state.currentTab === 'profile') renderProfileTab();
    if (state.currentTab === 'admin') renderAdminTab();

    // Role switcher pills
    const studentPill = document.getElementById('role-pill-student');
    const adminPill = document.getElementById('role-pill-admin');
    if (studentPill && adminPill) {
      if (state.currentRole === 'student') {
        studentPill.classList.add('active');
        adminPill.classList.remove('active');
      } else {
        adminPill.classList.add('active');
        studentPill.classList.remove('active');
      }
    }
  }

  // Switch Tab
  function switchTab(tabName) {
    state.currentTab = tabName;
    if (tabName === 'admin') {
      state.currentRole = 'admin';
    } else {
      state.currentRole = 'student';
    }
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Show Toast
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
  // TAB 1: HOME
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
        <div class="banner-greeting-sub">CampusFix Self-Service</div>
        <div class="banner-student-name">Welcome, ${state.reportDraft.studentName}</div>
        <div class="banner-student-meta">
          <span>${icons.mapPin} Hostel Block B, 304</span>
          <span>•</span>
          <span>ID: ${state.reportDraft.studentId}</span>
        </div>
        <div class="banner-notice">
          <span>⚡</span>
          <span><strong>Notice:</strong> Central Substation inspection in Engineering Block tomorrow 2-4 PM.</span>
        </div>
      </div>

      <!-- Quick Report Hero CTA -->
      <button class="hero-report-btn" id="home-report-cta">
        <div class="hero-report-left">
          <div class="hero-report-icon-box">
            ${icons.plusCircle}
          </div>
          <div style="text-align: left;">
            <div>Report a Problem</div>
            <div style="font-size: 0.74rem; font-weight: 400; opacity: 0.9;">Takes less than 30 seconds</div>
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
          <div class="metric-pill-label">In Progress</div>
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
            No pending complaints! Everything on campus is smooth.
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
        <div class="section-title">Recently Verified Fixes</div>
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
              🔧 <strong>Action:</strong> ${c.assigned_to ? `${c.assigned_to} completed resolution.` : 'Facilities maintenance completed work order.'}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Event hooks for Home
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
  // TAB 2: REPORT COMPLAINT (Form, Real-time Auto-Categorisation, Priority)
  // =========================================================================
  function renderReportTab() {
    const container = document.getElementById('tab-report');
    if (!container) return;

    // Run client categorization on existing draft to keep it fresh
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
            Describe the issue and our smart engine will auto-categorise and route it to the right department.
          </p>
        </div>

        <form id="complaint-submission-form">
          <!-- Location Input -->
          <div class="form-group">
            <label class="form-label">
              <span>Location <span style="color: #ef4444;">*</span></span>
              <span class="label-hint">Campus block, room, floor</span>
            </label>
            <div class="location-input-row">
              <input 
                type="text" 
                id="report-location-input" 
                class="form-input" 
                placeholder="e.g. Hostel Block B - Room 304 or Library 2nd Fl" 
                value="${escapeHtml(state.reportDraft.location)}" 
                required 
              />
              <button type="button" class="gps-detect-btn" id="gps-auto-detect-btn" title="Simulate GPS campus detection">
                ${icons.mapPin} GPS
              </button>
            </div>
            <!-- Quick Chips -->
            <div class="quick-chips-row">
              ${[
                'Hostel Block B',
                'Central Library',
                'Science Complex',
                'Cafeteria / Mess 1',
                'Lecture Hall 201',
                'Sports Arena'
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
              placeholder="Describe what is broken, leaking, offline or hazardous in detail..."
              required
            >${escapeHtml(state.reportDraft.description)}</textarea>
          </div>

          <!-- Smart Auto-Categorization & Priority Analysis Card -->
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
              <!-- Category Badge -->
              <div class="detected-badge" style="background: ${CATEGORY_MAP[state.reportDraft.category]?.bg}; color: ${CATEGORY_MAP[state.reportDraft.category]?.color}; border: 1px solid ${CATEGORY_MAP[state.reportDraft.category]?.color}">
                <span>${CATEGORY_MAP[state.reportDraft.category]?.icon}</span>
                <span>Category: <strong>${state.reportDraft.category}</strong></span>
              </div>

              <!-- Priority Badge -->
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

            <!-- Manual Category Override Accordion/Selector -->
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

            <!-- Manual Priority Override -->
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

            <!-- One-Click Campus Scenario Samples -->
            <div style="margin-top: 10px;">
              <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">
                Or tap a 1-click test photo:
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

          <!-- Student Contact Profile (Read-only / verified) -->
          <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 20px; border: 1px solid var(--border-color); font-size: 0.75rem;">
            <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Student Submitter Details</div>
            <div style="color: var(--text-secondary); display: flex; flex-direction: column; gap: 2px;">
              <div>Name: <strong>${state.reportDraft.studentName}</strong> (Roll: ${state.reportDraft.studentId})</div>
              <div>Phone: ${state.reportDraft.studentPhone} • Email: ${state.reportDraft.studentEmail}</div>
            </div>
          </div>

          <!-- Submit Button -->
          <button type="submit" class="submit-report-btn" id="submit-complaint-btn">
            <span>Submit Complaint</span>
            ${icons.arrowRight}
          </button>
        </form>
      </div>
    `;

    // Hook listeners for Report
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

      // Update counters
      const counter = document.getElementById('char-counter');
      if (counter) counter.innerText = `${descInput.value.length} chars`;

      // Live update DOM badges without full re-render
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

      // Update buttons active states
      container.querySelectorAll('.cat-select-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === state.reportDraft.category);
      });
      container.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-priority') === state.reportDraft.priority);
      });
    };

    descInput?.addEventListener('input', updateClassification);
    locInput?.addEventListener('input', updateClassification);

    // Quick location chips
    container.querySelectorAll('.quick-chips-row .chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        locInput.value = chip.getAttribute('data-loc');
        state.reportDraft.location = locInput.value;
        updateClassification();
      });
    });

    // GPS Auto detect simulation
    document.getElementById('gps-auto-detect-btn')?.addEventListener('click', () => {
      locInput.value = 'Hostel Block B - 2nd Floor (GPS accuracy ±3m)';
      state.reportDraft.location = locInput.value;
      updateClassification();
      showToast('Campus GPS location tagged!', icons.mapPin);
    });

    // Category overrides
    container.querySelectorAll('.cat-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.reportDraft.category = btn.getAttribute('data-cat');
        state.reportDraft.categoryLocked = true;
        updateClassification();
      });
    });

    // Priority overrides
    container.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.reportDraft.priority = btn.getAttribute('data-priority');
        state.reportDraft.priorityLocked = true;
        state.reportDraft.priorityReason = `Manually set to ${state.reportDraft.priority} by user override.`;
        updateClassification();
      });
    });

    // Photo Drop Zone & File Upload
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

    // Sample Photos Quick Selector
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

    // Form Submission
    document.getElementById('complaint-submission-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submit-complaint-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Saving to Campus Database...</span>`;
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
          student_name: state.reportDraft.studentName,
          student_id: state.reportDraft.studentId,
          student_phone: state.reportDraft.studentPhone,
          student_email: state.reportDraft.studentEmail
        };

        const res = await fetch('/api/complaints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res && res.complaint) {
          showToast(`Ticket #${res.complaint.id} created!`, icons.check);
          // Clear draft
          state.reportDraft.description = '';
          state.reportDraft.location = '';
          state.reportDraft.photoUrl = '';
          state.reportDraft.categoryLocked = false;
          state.reportDraft.priorityLocked = false;

          await loadData();
          // Open detail modal directly
          openComplaintDetailModal(res.complaint.id);
          switchTab('track');
        } else {
          showToast('Could not submit complaint. Please check fields.', icons.alertTriangle);
        }
      } catch (err) {
        console.error('Submission failed:', err);
        showToast('Error saving to database: ' + err.message, icons.alertTriangle);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Submit Complaint</span> ${icons.arrowRight}`;
        }
      }
    });
  }

  // =========================================================================
  // TAB 3: TRACK COMPLAINTS (Search, Status Filter, Timeline Sheet)
  // =========================================================================
  function renderTrackTab() {
    const container = document.getElementById('tab-track');
    if (!container) return;

    // Filter complaints
    let filtered = state.complaints.filter(c => {
      // Status Pill Filter
      if (state.trackFilter === 'Active' && (c.status === 'Resolved' || c.status === 'Closed')) return false;
      if (state.trackFilter === 'Resolved' && (c.status !== 'Resolved' && c.status !== 'Closed')) return false;
      if (state.trackFilter === 'High' && c.priority !== 'High') return false;

      // Category filter
      if (state.trackCategory !== 'All' && c.category !== state.trackCategory) return false;

      // Search keyword
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
      <!-- Filter Tabs -->
      <div class="track-filter-bar">
        ${['All', 'Active', 'Resolved', 'High Priority'].map(f => `
          <button class="filter-tab-pill ${state.trackFilter === (f === 'High Priority' ? 'High' : f) ? 'active' : ''}" data-filter="${f === 'High Priority' ? 'High' : f}">
            ${f}
          </button>
        `).join('')}
      </div>

      <!-- Search Input -->
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

      <!-- Category Filter Pills -->
      <div style="display: flex; gap: 6px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 4px;">
        <button class="chip-btn ${state.trackCategory === 'All' ? 'active' : ''}" data-cat-filter="All">All Categories</button>
        ${Object.keys(CATEGORY_MAP).map(cat => `
          <button class="chip-btn ${state.trackCategory === cat ? 'active' : ''}" data-cat-filter="${cat}">
            ${CATEGORY_MAP[cat].icon} ${cat}
          </button>
        `).join('')}
      </div>

      <!-- Complaints List -->
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

              <!-- Mini Progress Bar on Card -->
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
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Filter pill events
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

    // Card click opens timeline modal
    container.querySelectorAll('.complaint-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        openComplaintDetailModal(id);
      });
    });
  }

  // =========================================================================
  // TAB 4: HELP (FAQs & Emergency Numbers)
  // =========================================================================
  function renderHelpTab() {
    const container = document.getElementById('tab-help');
    if (!container) return;

    container.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">Campus Help & Support</h2>
        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
          Direct emergency hotlines and answers to maintenance queries.
        </p>
      </div>

      <!-- Emergency Hotline Numbers Section -->
      <div class="section-header">
        <div class="section-title">
          <span style="color: #ef4444;">🚨</span> 24/7 Emergency Contacts
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

      <!-- FAQs Section -->
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

      <!-- Escalation Matrix Banner -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px; margin-top: 24px; font-size: 0.78rem;">
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
          ⏱️ Standard Resolution SLA
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; color: var(--text-secondary);">
          <div>• <strong>High Priority (Safety/Hazard):</strong> Initial response < 30 mins, fix < 4 hours.</div>
          <div>• <strong>Medium Priority:</strong> Scheduled within 24 hours.</div>
          <div>• <strong>Low Priority:</strong> Routine maintenance within 3-5 days.</div>
        </div>
      </div>
    `;

    // FAQ Accordion click
    container.querySelectorAll('.faq-question-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-faq-id');
        const item = document.getElementById(`faq-${id}`);
        item?.classList.toggle('open');
      });
    });

    // Copy Phone Buttons
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
  // TAB 5: PROFILE
  // =========================================================================
  function renderProfileTab() {
    const container = document.getElementById('tab-profile');
    if (!container) return;

    const myComplaints = state.complaints;
    const resolvedCount = myComplaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;
    const activeCount = myComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;

    container.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar">AM</div>
        <div class="profile-name">${state.reportDraft.studentName}</div>
        <div class="profile-role-badge">Student Submitter</div>

        <div class="profile-info-list">
          <div class="info-item-row">
            <span>Roll Number</span>
            <strong>${state.reportDraft.studentId}</strong>
          </div>
          <div class="info-item-row">
            <span>Department</span>
            <strong>Computer Science & Engg.</strong>
          </div>
          <div class="info-item-row">
            <span>Residence</span>
            <strong>Hostel Block B, Room 304</strong>
          </div>
          <div class="info-item-row">
            <span>Email</span>
            <strong>${state.reportDraft.studentEmail}</strong>
          </div>
          <div class="info-item-row">
            <span>Phone</span>
            <strong>${state.reportDraft.studentPhone}</strong>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="home-metrics-grid" style="margin-bottom: 20px;">
        <div class="metric-pill-card">
          <div class="metric-pill-value">${myComplaints.length}</div>
          <div class="metric-pill-label">Total Logged</div>
        </div>
        <div class="metric-pill-card">
          <div class="metric-pill-value" style="color: #f59e0b;">${activeCount}</div>
          <div class="metric-pill-label">Active</div>
        </div>
        <div class="metric-pill-card">
          <div class="metric-pill-value" style="color: #10b981;">${resolvedCount}</div>
          <div class="metric-pill-label">Resolved</div>
        </div>
      </div>

      <!-- Settings & Controls -->
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
        <div class="setting-row">
          <span>Email Ticket Receipts</span>
          <label class="switch">
            <input type="checkbox" checked />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <!-- Switch to Admin Mode -->
      <div class="settings-group">
        <div class="setting-row" style="cursor: pointer;" id="profile-switch-admin-btn">
          <div>
            <div style="font-weight: 700;">Switch to Campus Admin Portal</div>
            <div style="font-size: 0.74rem; color: var(--text-secondary);">Manage tickets, view category charts and update statuses</div>
          </div>
          ${icons.arrowRight}
        </div>
      </div>

      <!-- Reset Demo Database -->
      <div style="margin-top: 20px; text-align: center;">
        <button type="button" id="reset-demo-db-btn" style="background: transparent; border: 1px solid var(--border-color); padding: 8px 16px; border-radius: var(--radius-md); font-size: 0.78rem; color: var(--text-muted); cursor: pointer;">
          🔄 Reset Database to Demo State
        </button>
      </div>
    `;

    document.getElementById('setting-theme-switch')?.addEventListener('change', (e) => {
      applyTheme(e.target.checked ? 'dark' : 'light');
    });

    document.getElementById('profile-switch-admin-btn')?.addEventListener('click', () => {
      switchTab('admin');
      showToast('Switched to Campus Admin Mode');
    });

    document.getElementById('reset-demo-db-btn')?.addEventListener('click', async () => {
      if (confirm('Reset database to clean initial demo complaints and timeline?')) {
        await fetch('/api/reset-demo', { method: 'POST' });
        await loadData();
        renderApp();
        showToast('Database reset to fresh demo data!');
      }
    });
  }

  // =========================================================================
  // TAB 6: ADMIN DASHBOARD (Counts, Chart by Category, Filters, Status Update)
  // =========================================================================
  function renderAdminTab() {
    const container = document.getElementById('tab-admin');
    if (!container) return;

    // Filter complaints for admin table
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
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">Campus Admin Portal</h2>
          <p style="font-size: 0.78rem; color: var(--text-secondary);">Real-time facilities triage, analytics & work order management</p>
        </div>
        <button type="button" class="role-pill-btn" id="admin-back-student-btn" style="background: var(--bg-muted); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.75rem;">
          ← Student View
        </button>
      </div>

      <!-- Admin KPI Metric Cards -->
      <div class="admin-metrics-row">
        <div class="admin-metric-card">
          <div class="admin-metric-num" style="color: var(--primary);">${totalTickets}</div>
          <div class="admin-metric-label">Total Tickets</div>
        </div>
        <div class="admin-metric-card">
          <div class="admin-metric-num" style="color: #8b5cf6;">${state.stats.pending || 0}</div>
          <div class="admin-metric-label">In Triage / Review</div>
        </div>
        <div class="admin-metric-card">
          <div class="admin-metric-num" style="color: #f59e0b;">${state.stats.inProgress || 0}</div>
          <div class="admin-metric-label">In Progress</div>
        </div>
        <div class="admin-metric-card">
          <div class="admin-metric-num" style="color: #10b981;">${resolvedCount} <span style="font-size: 0.85rem; font-weight: 600;">(${resolutionRate}%)</span></div>
          <div class="admin-metric-label">Resolved Rate</div>
        </div>
      </div>

      <!-- Urgent High Priority Notice Card if any -->
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
          <div class="chart-title">Breakdown by Campus Category</div>
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
        <div class="section-title">Complaints Management</div>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${filtered.length} showing</span>
      </div>

      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input 
          type="text" 
          id="admin-search-input" 
          class="search-input" 
          placeholder="Filter by ticket ID, student, description, building..." 
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
                <span>👤 ${escapeHtml(c.student_name)}</span>
              </div>
            </div>
            <div>
              <button class="update-status-trigger-btn" data-admin-id="${c.id}">
                Update Status
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Admin event hooks
    document.getElementById('admin-back-student-btn')?.addEventListener('click', () => {
      state.currentRole = 'student';
      switchTab('home');
    });

    document.getElementById('filter-urgent-only')?.addEventListener('click', () => {
      state.adminPriorityFilter = 'High';
      renderAdminTab();
    });

    // Chart bar click filters category
    container.querySelectorAll('[data-cat-bar]').forEach(bar => {
      bar.addEventListener('click', () => {
        const cat = bar.getAttribute('data-cat-bar');
        state.adminCategoryFilter = state.adminCategoryFilter === cat ? 'All' : cat;
        renderAdminTab();
      });
    });

    // Admin filter selects
    document.getElementById('admin-status-select')?.addEventListener('change', (e) => {
      state.adminStatusFilter = e.target.value;
      renderAdminTab();
    });
    document.getElementById('admin-cat-select')?.addEventListener('change', (e) => {
      state.adminCategoryFilter = e.target.value;
      renderAdminTab();
    });
    document.getElementById('admin-priority-select')?.addEventListener('change', (e) => {
      state.adminPriorityFilter = e.target.value;
      renderAdminTab();
    });
    document.getElementById('admin-search-input')?.addEventListener('input', (e) => {
      state.adminSearch = e.target.value;
      renderAdminTab();
    });
    document.getElementById('admin-clear-filters-btn')?.addEventListener('click', () => {
      state.adminStatusFilter = 'All';
      state.adminCategoryFilter = 'All';
      state.adminPriorityFilter = 'All';
      state.adminSearch = '';
      renderAdminTab();
    });

    // Update status button click
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
      const res = await fetch(`/api/complaints/${complaintId}`).then(r => r.json());
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

    const { complaint, timeline, feedback } = state.activeComplaintDetail;
    const stepIndex = getStatusStepIndex(complaint.status);

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

        <!-- Department & Assignment info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; font-size: 0.78rem;">
          <div style="background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="color: var(--text-muted); font-size: 0.7rem;">Assigned Department</div>
            <div style="font-weight: 700; color: var(--text-primary); margin-top: 2px;">${escapeHtml(complaint.department || 'Campus Facilities')}</div>
          </div>
          <div style="background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="color: var(--text-muted); font-size: 0.7rem;">Assigned Personnel</div>
            <div style="font-weight: 700; color: var(--text-primary); margin-top: 2px;">${escapeHtml(complaint.assigned_to || 'In Triage Queue')}</div>
          </div>
        </div>

        <!-- STATUS TIMELINE SECTION -->
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

        <!-- Student Satisfaction Rating Box (if Resolved or Closed) -->
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

        <!-- Admin Quick Action Trigger from detail modal -->
        <div style="margin-top: 20px; display: flex; gap: 10px;">
          <button type="button" class="update-status-trigger-btn" id="detail-admin-update-btn" style="flex: 1; padding: 10px; text-align: center;">
            🛠️ Admin: Update Status & Add Note
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    // Close listener
    document.getElementById('close-detail-sheet-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    // Star rating listeners
    modal.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedRating = parseInt(btn.getAttribute('data-star'), 10);
        modal.querySelectorAll('.star-btn').forEach(b => {
          b.classList.toggle('active', parseInt(b.getAttribute('data-star'), 10) <= state.selectedRating);
        });
      });
    });

    // Submit Feedback
    document.getElementById('submit-feedback-btn')?.addEventListener('click', async () => {
      const comment = document.getElementById('feedback-comment-input')?.value || '';
      try {
        await fetch(`/api/complaints/${complaint.id}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: state.selectedRating, comment })
        });
        showToast(`Thank you! Rated ${state.selectedRating} Stars ⭐`);
        await loadData();
        openComplaintDetailModal(complaint.id);
      } catch (err) {
        showToast('Feedback save error', icons.alertTriangle);
      }
    });

    // Admin update shortcut
    document.getElementById('detail-admin-update-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
      openAdminStatusModal(complaint.id);
    });
  }

  // =========================================================================
  // ADMIN UPDATE STATUS & NOTE MODAL
  // =========================================================================
  function openAdminStatusModal(complaintId) {
    const complaint = state.complaints.find(c => c.id === complaintId);
    if (!complaint) return;
    state.adminModalComplaint = complaint;

    const modal = document.getElementById('admin-modal-overlay');
    if (!modal) return;

    modal.innerHTML = `
      <div class="bottom-sheet-content" style="max-width: 550px;">
        <div class="sheet-handle"></div>
        <div class="sheet-header-row">
          <div>
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">ADMIN WORK ORDER DISPATCH</div>
            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">
              Update Ticket ${complaint.id}
            </h3>
          </div>
          <button type="button" class="close-sheet-btn" id="close-admin-modal-btn">
            ${icons.x}
          </button>
        </div>

        <div style="font-size: 0.8rem; background: var(--bg-subtle); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 14px;">
          <div><strong>Title:</strong> ${escapeHtml(complaint.title)}</div>
          <div><strong>Location:</strong> ${escapeHtml(complaint.location)}</div>
          <div><strong>Current Status:</strong> <span class="status-badge status-${complaint.status.toLowerCase().replace(/\s+/g, '-')}">${complaint.status}</span></div>
        </div>

        <form id="admin-update-status-form">
          <!-- Status Selector -->
          <div class="form-group">
            <label class="form-label">Update Status</label>
            <select id="modal-status-select" class="form-select">
              <option value="Submitted" ${complaint.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
              <option value="Under Review" ${complaint.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
              <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
              <option value="Closed" ${complaint.status === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
          </div>

          <!-- Department & Staff Assignment -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" class="form-group">
            <div>
              <label class="form-label">Department</label>
              <select id="modal-dept-select" class="form-select">
                <option value="Electrical Maintenance" ${complaint.department === 'Electrical Maintenance' ? 'selected' : ''}>Electrical Maintenance</option>
                <option value="Plumbing & Sanitation" ${complaint.department === 'Plumbing & Sanitation' ? 'selected' : ''}>Plumbing & Sanitation</option>
                <option value="Campus IT & NOC" ${complaint.department === 'Campus IT & NOC' ? 'selected' : ''}>Campus IT & NOC</option>
                <option value="Campus Housekeeping" ${complaint.department === 'Campus Housekeeping' ? 'selected' : ''}>Campus Housekeeping</option>
                <option value="Campus Security & Safety Cell" ${complaint.department === 'Campus Security & Safety Cell' ? 'selected' : ''}>Campus Security & Safety</option>
                <option value="Food Safety & Mess Committee" ${complaint.department === 'Food Safety & Mess Committee' ? 'selected' : ''}>Food Safety Board</option>
              </select>
            </div>
            <div>
              <label class="form-label">Assigned Personnel</label>
              <input type="text" id="modal-assignee-input" class="form-input" value="${escapeHtml(complaint.assigned_to || '')}" placeholder="e.g. Ramesh Sharma" />
            </div>
          </div>

          <!-- Priority Override -->
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="modal-priority-select" class="form-select">
              <option value="High" ${complaint.priority === 'High' ? 'selected' : ''}>🔴 High</option>
              <option value="Medium" ${complaint.priority === 'Medium' ? 'selected' : ''}>🟡 Medium</option>
              <option value="Low" ${complaint.priority === 'Low' ? 'selected' : ''}>🟢 Low</option>
            </select>
          </div>

          <!-- Admin Note (Appears on Student Timeline) -->
          <div class="form-group">
            <label class="form-label">
              <span>Admin / Technician Note <span style="color: #ef4444;">*</span></span>
              <span class="label-hint">Visible on Student Timeline</span>
            </label>
            <textarea id="modal-admin-note" class="form-textarea" placeholder="e.g. Dispatched senior electrician. Replacement capacitor installed and tested." required></textarea>
          </div>

          <button type="submit" class="submit-report-btn" id="modal-save-status-btn">
            Save Status & Update Timeline
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

    // Form submit
    document.getElementById('admin-update-status-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('modal-save-status-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving updates...';
      }

      const newStatus = document.getElementById('modal-status-select')?.value;
      const department = document.getElementById('modal-dept-select')?.value;
      const assigned_to = document.getElementById('modal-assignee-input')?.value;
      const priority = document.getElementById('modal-priority-select')?.value;
      const note = document.getElementById('modal-admin-note')?.value;

      try {
        const res = await fetch(`/api/complaints/${complaint.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            department,
            assigned_to,
            priority,
            note,
            actor_name: 'Campus Admin Officer',
            actor_role: 'Campus Admin'
          })
        }).then(r => r.json());

        if (res && res.success) {
          showToast(`Status updated to ${newStatus}!`, icons.check);
          modal.classList.remove('active');
          await loadData();
          renderApp();
          // Also refresh detail sheet if open
          if (state.activeComplaintDetail && state.activeComplaintDetail.complaint.id === complaint.id) {
            openComplaintDetailModal(complaint.id);
          }
        } else {
          showToast('Update failed: ' + (res.error || 'Server error'), icons.alertTriangle);
        }
      } catch (err) {
        showToast('Network error updating status', icons.alertTriangle);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerText = 'Save Status & Update Timeline';
        }
      }
    });
  }

  // =========================================================================
  // SETUP EVENT LISTENERS
  // =========================================================================
  function setupEventListeners() {
    // Bottom Tab navigation
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // Top Role Switcher
    document.getElementById('role-pill-student')?.addEventListener('click', () => {
      state.currentRole = 'student';
      switchTab('home');
    });
    document.getElementById('role-pill-admin')?.addEventListener('click', () => {
      state.currentRole = 'admin';
      switchTab('admin');
    });

    // Header Theme Toggle Button
    document.getElementById('header-theme-toggle')?.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // Desktop View Toggle (Mockup vs Expanded)
    document.getElementById('view-toggle-btn')?.addEventListener('click', () => {
      applyViewMode(state.viewMode === 'mockup' ? 'expanded' : 'mockup');
    });
  }

  // Helper functions
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

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
