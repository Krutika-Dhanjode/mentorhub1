import { sendEmail } from "@/lib/email";
import crypto from "crypto";

const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_key";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { email, type } = req.body || {};

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required." });
    }

    const resolvedEmail = email.trim();

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expires in 10 minutes
    const ttl = 10 * 60 * 1000;
    const expiresAt = Date.now() + ttl;

    // Create a cryptographic hash
    const data = `${resolvedEmail}:${otp}:${expiresAt}`;
    const hash = crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");

    const actionText = type === "login" ? "log in to" : "sign up for";
    const activityDescription = type === "login" 
      ? "access your mentor hub dashboard and connect with your mentors"
      : "join our mentorship community and get matched with experienced mentors";
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">🎓 Mentor Hub</h2>
        <p>Hello,</p>
        <p>You've initiated a request to <strong>${actionText}</strong> Mentor Hub.</p>
        
        <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #007bff; border-radius: 5px; margin: 15px 0;">
          <p style="color: #333; margin: 0; font-size: 14px;">
            <strong>Activity:</strong> ${type === "login" ? "User Login" : "New User Registration"}
          </p>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 13px;">
            You will be able to ${activityDescription}
          </p>
        </div>
        
        <p style="margin-top: 20px;">Your One-Time Password (OTP) is:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007bff; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        
        <p style="color: #666; font-size: 14px;">This code is valid for <strong>10 minutes</strong>.</p>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 5px; margin: 15px 0; font-size: 13px; color: #856404;">
          <strong>Security Note:</strong> If you did not request this code, please ignore this email and do not share this OTP with anyone.
        </div>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">
          &copy; ${new Date().getFullYear()} Mentor Hub. All rights reserved.<br/>
          <em>Connecting mentors and mentees for better learning</em>
        </p>
      </div>
    `;

    // Send email using SMTP (Nodemailer) - Await for debugging
    const emailInfo = await sendEmail(resolvedEmail, `Your OTP for Mentor Hub - ${otp}`, emailHtml);

    if (!emailInfo.success) {
      console.error("SMTP Error in send-otp:", emailInfo.error);
      return res.status(500).json({ error: `Email failed: ${emailInfo.error}` });
    }

    return res.status(200).json({
      success: true,
      hash,
      expiresAt,
    });

  } catch (error) {
    console.error("send-otp error:", error);
    return res.status(500).json({ error: error?.message || "Failed to send OTP." });
  }
}

