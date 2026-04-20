import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { batchId, date, time, meetingLink, title } = await req.json();

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch all students in that batch
    const { data: assignments, error: assignmentError } = await supabase
      .from("batch_students")
      .select("student_id")
      .eq("batch_id", batchId);

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    const studentIds = (assignments || []).map((a) => a.student_id).filter(Boolean);

    // 2. Fetch emails for those students
    const { data: students, error: studentError } = await supabase
      .from("users")
      .select("email, name")
      .in("id", studentIds);

    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }

    // 3. Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #007bff; text-align: center;">New Meeting Scheduled</h2>
        <p>Hello,</p>
        <p>A new mentorship meeting has been scheduled for your batch.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Title:</strong> ${title || "Mentorship Meeting"}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          ${meetingLink ? `<p><strong>Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ""}
        </div>
        <p>Please be on time.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Sent via Mentor Hub</p>
      </div>
    `;

    // 4. Send emails to all students (non-blocking)
    students.forEach((student) => {
      if (student.email) {
        sendEmail(student.email, `Meeting Scheduled: ${title || "Mentorship Meeting"}`, emailHtml);
      }
    });

    // 5. Send email to admin (optional, using placeholder for admin email)
    const adminEmail = "admin@mentorhub.com"; // Placeholder or from env
    sendEmail(adminEmail, `Meeting Scheduled Alert: ${batchId}`, `
      <h3>New Meeting Scheduled</h3>
      <p>A meeting has been scheduled for Batch ID: ${batchId}</p>
      <p>Time: ${date} at ${time}</p>
    `);

    return NextResponse.json({ success: true, studentCount: students.length });
  } catch (error) {
    console.error("schedule-meeting error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
