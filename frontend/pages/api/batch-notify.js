import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { batchId, senderId, senderName, message } = req.body;

    if (!batchId || !senderId) {
      return res.status(400).json({ error: "batchId and senderId are required" });
    }

    // Fetch batch mentor and students
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('mentor_id')
      .eq('id', batchId)
      .single();

    if (batchError) throw batchError;

    const { data: batchStudents, error: studentsError } = await supabaseAdmin
      .from('batch_students')
      .select('student_id')
      .eq('batch_id', batchId);

    if (studentsError) throw studentsError;

    // Collect all recipient user IDs (mentor + all students, exclude sender)
    const recipientIds = new Set();
    if (batch.mentor_id && batch.mentor_id !== senderId) {
      recipientIds.add(batch.mentor_id);
    }
    
    for (const bs of batchStudents || []) {
      if (bs.student_id && bs.student_id !== senderId) {
        recipientIds.add(bs.student_id);
      }
    }

    if (recipientIds.size === 0) {
      return res.status(200).json({ success: true, message: "No one to notify" });
    }

    // Fetch emails for recipients
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('email')
      .in('id', Array.from(recipientIds));

    if (usersError) throw usersError;

    // Truncate message for notification
    const displayMsg = message ? (message.length > 50 ? message.substring(0, 50) + '...' : message) : 'Shared a file';
    const notificationText = `New message in group from ${senderName || 'user'}: ${displayMsg}`;

    // Prepare notification records
    const notifications = (users || [])
      .filter(u => u.email)
      .map(u => ({
        email: u.email,
        type: 'message',
        message: notificationText,
        created_at: new Date().toISOString()
      }));

    if (notifications.length > 0) {
      // Try to insert with title (if schema supports it), fallback if it doesn't
      const { error: insertWithTitleError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications.map(n => ({...n, title: 'New Group Message', read: false})));
        
      if (insertWithTitleError) {
        // Fallback to basic schema
        await supabaseAdmin.from('notifications').insert(notifications);
      }
    }

    return res.status(200).json({ success: true, count: notifications.length });
  } catch (error) {
    console.error("batch notify error:", error);
    return res.status(500).json({ error: error.message });
  }
}
