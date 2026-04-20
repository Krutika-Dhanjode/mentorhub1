import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { studentId, reply } = await req.json();

    if (!studentId || !reply) {
      return NextResponse.json({ error: "studentId and reply are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch student info and mentor info
    const { data: student, error: studentError } = await supabase
      .from("users")
      .select("email, name, mentor_id")
      .eq("id", studentId)
      .single();

    if (studentError || !student?.email) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 2. Fetch mentor name
    let mentorName = "Your Mentor";
    if (student.mentor_id) {
        const { data: mentor } = await supabase
            .from("users")
            .select("name")
            .eq("id", student.mentor_id)
            .single();
        if (mentor) mentorName = mentor.name;
    }

    // 3. Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #fd7e14; text-align: center;">New Reply from Mentor</h2>
        <p>Hello ${student.name || "Student"},</p>
        <p>Your mentor <strong>${mentorName}</strong> has replied to your message.</p>
        <div style="background-color: #fff9f4; padding: 15px; border-left: 4px solid #fd7e14; border-radius: 5px; margin: 20px 0;">
          <p style="white-space: pre-wrap; margin: 0;">${reply}</p>
        </div>
        <p>Log in to your dashboard to continue the conversation.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Sent via Mentor Hub</p>
      </div>
    `;

    // 4. Send email to student (non-blocking)
    sendEmail(student.email, `New Reply from ${mentorName}`, emailHtml);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reply-message error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
