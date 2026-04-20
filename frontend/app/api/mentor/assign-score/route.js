import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { studentId, score, feedback } = await req.json();

    if (!studentId || score === undefined) {
      return NextResponse.json({ error: "studentId and score are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch student email
    const { data: student, error: studentError } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", studentId)
      .single();

    if (studentError || !student?.email) {
      return NextResponse.json({ error: "Student email not found" }, { status: 404 });
    }

    // 2. Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #28a745; text-align: center;">New Score Assigned</h2>
        <p>Hello ${student.name || "Student"},</p>
        <p>Your mentor has updated your score for the recent evaluation.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <p style="font-size: 18px; margin: 0;">Your Score</p>
          <h1 style="font-size: 48px; color: #28a745; margin: 10px 0;">${score}</h1>
          ${feedback ? `<p style="font-style: italic; color: #555;">"${feedback}"</p>` : ""}
        </div>
        <p>Log in to your dashboard to see more details.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Sent via Mentor Hub</p>
      </div>
    `;

    // 3. Send email to student (non-blocking)
    sendEmail(student.email, `Evaluation Result Updated - Score: ${score}`, emailHtml);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("assign-score error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
