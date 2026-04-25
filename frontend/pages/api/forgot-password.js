import { sendEmail } from "@/lib/email";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // 1. Check if user exists
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, name, email")
      .eq("email", email)
      .maybeSingle();

    if (userError || !userRow) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Generate 6-digit OTP and calculate expiry (10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3. Store OTP in database
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ reset_otp: otp, reset_otp_expires_at: expiresAt })
      .eq("email", email);

    if (updateError) throw updateError;

    // 4. Send email using existing email lib
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #007bff; text-align: center;">Reset Your Password</h2>
        <p>Hi ${userRow.name || 'User'},</p>
        <p>Here is your 6-digit OTP to reset your password. This code will expire in 10 minutes.</p>
        <div style="font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; background: #f4f4f4; padding: 15px; border-radius: 5px; letter-spacing: 5px;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #777; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail(email, "Password Reset OTP - Mentor Hub", emailHtml);
    return res.status(200).json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    return res.status(500).json({ error: error.message || "Something went wrong" });
  }
}
