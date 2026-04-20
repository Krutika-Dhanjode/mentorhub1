import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports (587 uses STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Reusable email sending function using Nodemailer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML content of the email
 * @returns {Promise} - Promise object representing the result of the email send
 */
export async function sendEmail(to, subject, html) {
  try {
    const from = process.env.SMTP_FROM || 'mentormenteehub0@gmail.com';
    
    const info = await transporter.sendMail({
      from: `"Mentor Hub" <${from}>`,
      to,
      subject,
      html,
    });

    console.log('Email sent successfully:', JSON.stringify(info, null, 2));
    return { success: true, messageId: info.messageId, info };
  } catch (error) {
    console.error('Error sending email:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return { success: false, error: error.message, details: error };
  }
}
