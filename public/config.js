// CampusFix Configuration
// Use this file to set your official university domain and Supabase credentials.
// For Netlify deployment, you can also inject these via Netlify environment variables or build plugins.

window.CAMPUSFIX_CONFIG = {
  // Official University Email Domain (Enforced on frontend AND backend)
  // Student registration with any other domain will be strictly rejected.
  ALLOWED_EMAIL_DOMAIN: 'jecrcu.edu.in',

  // Supabase Backend Authentication & Database Configuration
  // Get these from your Supabase Dashboard: Project Settings -> API
  // Note: Only the public 'anon' key is used here. Never put your service_role secret key in frontend code.
  SUPABASE_URL: window.ENV?.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: window.ENV?.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
};
