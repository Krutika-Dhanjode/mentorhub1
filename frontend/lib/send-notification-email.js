export async function sendNotificationEmail(studentEmail, studentName, actionType, message, mentorName) {
  if (!studentEmail || !studentEmail.trim()) {
    throw new Error("Student email is required to send notification.");
  }

  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      studentEmail: studentEmail.trim(),
      studentName: studentName || "Student",
      actionType,
      message,
      mentorName: mentorName || undefined,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Failed to send notification email.");
  }

  return payload;
}
