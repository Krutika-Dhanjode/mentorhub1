import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jlvoytkjxvektmnicpsp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsdm95dGtqeHZla3RtbmljcHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzMxMjMsImV4cCI6MjA5MDQwOTEyM30.tTTAhKSlz0zIyF2NJDCG517SENn-Oz_7pkw2QHiZ0TM');
supabase.from('progress').select('*').eq('entry_type', 'sports').then(r => console.log(JSON.stringify(r.data, null, 2)));
