import crypto from "crypto";

const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_key";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { email, otp, hash, expiresAt } = req.body || {};

    if (!email || !otp || !hash || !expiresAt) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    // Check expiration
    if (Date.now() > parseInt(expiresAt, 10)) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    const resolvedEmail = email.trim();
    
    // Recreate the hash to verify
    const data = `${resolvedEmail}:${otp}:${expiresAt}`;
    const newHash = crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");

    if (newHash !== hash) {
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    return res.status(200).json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error("verify-otp error:", error);
    return res.status(500).json({ error: "Failed to verify OTP." });
  }
}
