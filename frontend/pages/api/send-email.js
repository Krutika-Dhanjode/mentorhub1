import { sendEmail } from "@/lib/email";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

function getActionLine(actionType) {
  if (actionType === "batch_allocation") return "You have been successfully added to a Mentor batch.";
  if (actionType === "meeting") return "A meeting has been scheduled.";
  if (actionType === "meeting_cancelled") return "A previously scheduled meeting has been cancelled.";
  if (actionType === "score") return "Your score has been updated.";
  if (actionType === "guidance") return "New guidance has been provided.";
  return "You have a new update from your mentor.";
}

function buildEmailHtml({ studentName, actionType, message, mentorName }) {
  const actionLine = getActionLine(actionType);
  const details =
    message && String(message).trim()
      ? String(message).trim()
      : "Please check your dashboard for details.";

  const mentorInfo = mentorName
    ? `<p style="margin: 5px 0; color: #555;"><strong>Mentor:</strong> ${mentorName}</p>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #007bff; text-align: center;">Mentor Hub Update</h2>
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>${actionLine}</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Details:</strong></p>
        <p style="margin: 10px 0; white-space: pre-wrap;">${details}</p>
        ${mentorInfo}
      </div>
      <p>Regards,<br>Mentor Hub Team</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777; text-align: center;">You can view more details on your student dashboard.</p>
    </div>
  `;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { studentEmail, studentName, actionType, message, mentorName } = req.body || {};

    if (!studentEmail || !studentEmail.trim()) {
      return res.status(400).json({ error: "studentEmail is required." });
    }
    if (!actionType || !["meeting", "meeting_cancelled", "score", "guidance", "batch_allocation"].includes(actionType)) {
      return res.status(400).json({ error: "actionType must be meeting, meeting_cancelled, score, guidance, or batch_allocation." });
    }

    let resolvedName = studentName || "Student";
    let resolvedEmail = studentEmail.trim();

    if (supabaseAdmin) {
      const { data: userRow, error: userError } = await supabaseAdmin
        .from("users")
        .select("email, name")
        .eq("email", resolvedEmail)
        .maybeSingle();

      if (userError) {
        return res.status(500).json({ error: `Unable to verify student email: ${userError.message}` });
      }
      if (!userRow?.email) {
        return res.status(404).json({ error: "No student found with the provided email." });
      }

      resolvedEmail = userRow.email;
      resolvedName = userRow.name || resolvedName;
    }

    const bodyMessage = message && String(message).trim() ? String(message).trim() : "Please check your dashboard for details.";
    const emailHtml = buildEmailHtml({
      studentName: resolvedName,
      actionType,
      message: bodyMessage,
      mentorName: mentorName || undefined,
    });

    // Send email using SMTP (Nodemailer) - Non-blocking
    sendEmail(resolvedEmail, "Update from your Mentor", emailHtml);

    if (supabaseAdmin) {
      const baseNotification = {
        email: resolvedEmail,
        type: actionType,
        message: bodyMessage,
        created_at: new Date().toISOString(),
      };

      const { error: insertWithTitleError } = await supabaseAdmin.from("notifications").insert({
        ...baseNotification,
        title: "Update from your Mentor",
        read: false,
      });

      if (insertWithTitleError) {
        await supabaseAdmin.from("notifications").insert(baseNotification);
      }
    }

    return res.status(200).json({
      success: true,
      studentEmail: resolvedEmail,
      studentName: resolvedName,
      actionType,
      lastSentAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to send email." });
  }
}
