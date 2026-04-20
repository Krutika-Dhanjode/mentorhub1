import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { studentId, progress } = await req.json();

    if (!studentId || progress === undefined) {
      return NextResponse.json({ error: "studentId and progress are required" }, { status: 400 });
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
        <h2 style="color: #20c997; text-align: center;">Project Progress Update</h2>
        <p>Hello ${mentor.name || "Mentor"},</p>
        <p>Your student <strong>${student.name || "Student"}</strong> has updated their project progress.</p>
        <div style="background-color: #f0fff4; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <p style="font-size: 18px; margin: 0;">New Progress Status</p>
          <div style="width: 100%; height: 20px; background-color: #e9ecef; border-radius: 10px; margin: 15px 0; overflow: hidden;">
            <div style="width: ${progress}%; height: 100%; background-color: #20c997;"></div>
          </div>
          <h1 style="font-size: 36px; color: #20c997; margin: 0;">${progress}%</h1>
        </div>
        <p>Log in to your dashboard to review the details and provide feedback.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Sent via Mentor Hub</p>
      </div>
    `;

    // 4. Send email to mentor (non-blocking)
    sendEmail(mentor.email, `Progress Update: ${student.name} - ${progress}%`, emailHtml);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("update-progress error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
