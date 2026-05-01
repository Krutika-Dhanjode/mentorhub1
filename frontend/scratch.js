import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: students, error: err1 } = await supabase.from('profiles').select('id, first_name, last_name').eq('role', 'student');
    console.log("Students:", students);

    const { data: progress, error: err2 } = await supabase.from('progress').select('*');
    console.log("Progress Entries:");
    progress.forEach(p => {
        console.log(`Student: ${p.student_id}, Type: ${p.entry_type || p.certification_type}, Status: ${p.verification_status}, Score: ${p.score}, Title: ${p.title || p.certification_name}`);
    });
}
run();
