import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: "Missing required fields" });

  try {
    // 1. Validate user and OTP config
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, reset_otp, reset_otp_expires_at")
      .eq("email", email)
      .maybeSingle();

    if (userError || !userRow) return res.status(404).json({ error: "User not found" });

    // 2. Determine Validity
    if (!userRow.reset_otp || userRow.reset_otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (new Date() > new Date(userRow.reset_otp_expires_at)) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // 3. Update password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userRow.id,
      { password: newPassword }
    );
    if (authError) throw authError;

    // 4. Clear OTP fields upon success
    await supabaseAdmin
      .from("users")
      .update({ reset_otp: null, reset_otp_expires_at: null })
      .eq("id", userRow.id);

    return res.status(200).json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to reset password" });
  }
}
