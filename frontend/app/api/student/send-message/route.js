import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { studentId, message } = await req.json();

    if (!studentId || !message) {
      return NextResponse.json({ error: "studentId and message are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch student info and their mentor
    const { data: student, error: studentError } = await supabase
      .from("users")
      .select("name, mentor_id")
      .eq("id", studentId)
      .single();

    if (studentError || !student?.mentor_id) {
      return NextResponse.json({ error: "Student or mentor not found" }, { status: 404 });
    }

    // 2. Fetch mentor email
    const { data: mentor, error: mentorError } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", student.mentor_id)
      .single();

    if (mentorError || !mentor?.email) {
      return NextResponse.json({ error: "Mentor email not found" }, { status: 404 });
    }

    // 3. Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #6f42c1; text-align: center;">New Message from Student</h2>
        <p>Hello ${mentor.name || "Mentor"},</p>
        <p>You have received a new message/query from your student <strong>${student.name || "Student"}</strong>.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #6f42c1; border-radius: 5px; margin: 20px 0;">
          <p style="white-space: pre-wrap; margin: 0;">${message}</p>
        </div>
        <p>Please reply as soon as possible.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Sent via Mentor Hub</p>
      </div>
    `;

    // 4. Send email to mentor (non-blocking)
    sendEmail(mentor.email, `New Message from Student: ${student.name}`, emailHtml);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("send-message error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
