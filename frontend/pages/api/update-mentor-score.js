import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Supabase admin configuration is missing." });
  }

  try {
    const { studentEmail, score } = req.body || {};

    if (!studentEmail || !String(studentEmail).trim()) {
      return res.status(400).json({ error: "studentEmail is required." });
    }

    const parsedScore = score === null || score === "" ? null : Number(score);
    if (parsedScore !== null && (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10)) {
      return res.status(400).json({ error: "score must be between 0 and 10." });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const normalizedEmail = String(studentEmail).trim().toLowerCase();

    const { data: studentRow, error: studentError } = await supabaseAdmin
      .from("users")
      .select("id, email, name, mentor_report_score")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (studentError) {
      return res.status(500).json({ error: studentError.message });
    }
    if (!studentRow?.id) {
      return res.status(404).json({ error: "Student not found for provided email." });
    }

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ mentor_report_score: parsedScore })
      .eq("id", studentRow.id)
      .select("id, email, name, mentor_report_score");

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      student: updatedRows?.[0] || {
        id: studentRow.id,
        email: studentRow.email,
        name: studentRow.name,
        mentor_report_score: parsedScore,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to update mentor score." });
  }
}
