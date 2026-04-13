import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

function getActionLine(actionType) {
  if (actionType === "meeting") return "A meeting has been scheduled.";
  if (actionType === "score") return "Your score has been updated.";
  if (actionType === "guidance") return "New guidance has been provided.";
  return "You have a new update from your mentor.";
}

function buildEmailBody({ studentName, actionType, message }) {
  const actionLine = getActionLine(actionType);
  const details =
    message && String(message).trim()
      ? String(message).trim()
      : "Please check your dashboard for details.";

  return `Hello ${studentName},

${actionLine}

Details:
${details}

Regards,
Mentor-Mentee Hub`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { studentEmail, studentName, actionType, message } = req.body || {};

    if (!studentEmail || !studentEmail.trim()) {
      return res.status(400).json({ error: "studentEmail is required." });
    }
    if (!actionType || !["meeting", "score", "guidance"].includes(actionType)) {
      return res.status(400).json({ error: "actionType must be meeting, score, or guidance." });
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

    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const bodyMessage = message && String(message).trim() ? String(message).trim() : "Please check your dashboard for details.";
    const emailBody = buildEmailBody({
      studentName: resolvedName,
      actionType,
      message: bodyMessage,
    });

    const emailResult = await resend.emails.send({
      from: fromAddress,
      to: resolvedEmail,
      subject: "Update from your Mentor",
      text: emailBody,
    });

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
      id: emailResult?.data?.id || null,
      studentEmail: resolvedEmail,
      studentName: resolvedName,
      actionType,
      lastSentAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to send email." });
  }
}
