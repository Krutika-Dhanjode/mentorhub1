"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/send-notification-email";
const escapePdfText = (value) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const buildPdfBlob = (lines) => {
    const linesPerPage = 32;
    const pages = [];
    for (let index = 0; index < lines.length; index += linesPerPage) {
        pages.push(lines.slice(index, index + linesPerPage));
    }
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    let objectIndex = 1;
    const addObject = (content) => {
        offsets.push(pdf.length);
        pdf += `${objectIndex} 0 obj\n${content}\nendobj\n`;
        objectIndex += 1;
        return objectIndex - 1;
    };
    const fontObject = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const pageObjectIds = [];
    pages.forEach((pageLines) => {
        const streamLines = pageLines.map((line, lineIndex) => {
            const y = 780 - lineIndex * 22;
            return `BT /F1 12 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
        });
        const streamContent = streamLines.join("\n");
        const contentObject = addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
        pageObjectIds.push(addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`));
    });
    const pagesObjectId = addObject(`<< /Type /Pages /Kids [${pageObjectIds.map((pageId) => `${pageId} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`);
    pdf = pdf.replace("/Parent 0 0 R", `/Parent ${pagesObjectId} 0 R`);
    const catalogObjectId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${offsets.length}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${offsets.length} /Root ${catalogObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
};
export default function StudentReportPage({ params }) {
    const { id } = use(params);
    const supabase = createClient();
    const [student, setStudent] = useState(null);
    const [meetings, setMeetings] = useState([]);
    const [progress, setProgress] = useState([]);
    const [scoreDraftByEntryId, setScoreDraftByEntryId] = useState({});
    const [savingScoreEntryId, setSavingScoreEntryId] = useState(null);
    const [mentorScoreDraft, setMentorScoreDraft] = useState("");
    const [savingMentorScore, setSavingMentorScore] = useState(false);
    const [mentorStatusDraft, setMentorStatusDraft] = useState("Good Standing");
    const [lastSentTime, setLastSentTime] = useState("");
    const [pageLoading, setPageLoading] = useState(true);
    // ✅ FETCH STUDENT
    useEffect(() => {
        const fetchStudent = async () => {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", id)
                .maybeSingle();
            if (error) {
                console.error("Error fetching student:", error.message);
                setStudent(null);
                setPageLoading(false);
                return;
            }
            setStudent(data);
            setMentorScoreDraft(data?.mentor_report_score != null ? String(data.mentor_report_score) : "");
            setPageLoading(false);
        };
        fetchStudent();
    }, [id]);
    const handleSaveMentorScore = async () => {
        const parsed = mentorScoreDraft === "" ? null : Number(mentorScoreDraft);
        if (mentorScoreDraft !== "" && (Number.isNaN(parsed) || parsed < 0 || parsed > 10)) {
            alert("Please enter a valid mentor score between 0 and 10.");
            return;
        }
        setSavingMentorScore(true);
        const response = await fetch("/api/update-mentor-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                studentEmail: student?.email || "",
                score: parsed,
            }),
        });
        
        await supabase
            .from("batch_students")
            .update({ status: mentorStatusDraft })
            .eq("student_id", id);

        const payload = await response.json().catch(() => ({}));
        setSavingMentorScore(false);
        if (!response.ok) {
            const message = payload?.error || "Unable to save mentor score.";
            if (String(message).includes("mentor_report_score")) {
                alert("Unable to save mentor score: column mentor_report_score is missing. Please run the SQL migration first.");
                return;
            }
            alert("Unable to save mentor score: " + message);
            return;
        }
        setStudent((current) => (current
            ? {
                ...current,
                mentor_report_score: payload?.student?.mentor_report_score ?? parsed,
            }
            : current));
        try {
            const emailResponse = await sendNotificationEmail(student?.email || "", student?.name || "Student", "score", `Your mentor score has been updated to ${parsed == null ? "Not given" : `${parsed}/10`}.`);
            setLastSentTime(emailResponse?.lastSentAt || new Date().toISOString());
            alert("Mentor score saved and email sent.");
        }
        catch (emailError) {
            alert(`Mentor score saved, but email failed: ${emailError.message}`);
        }
    };
    // ✅ FETCH MEETINGS
    useEffect(() => {
        const fetchMeetings = async () => {
            const { data: batchAssignments, error: assignmentError } = await supabase
                .from("batch_students")
                .select("batch_id, status")
                .eq("student_id", id);
            
            if (batchAssignments && batchAssignments.length > 0 && batchAssignments[0].status) {
                setMentorStatusDraft(batchAssignments[0].status);
            }

            if (assignmentError) {
                console.error("Error fetching student batch assignments:", assignmentError.message);
                setMeetings([]);
                return;
            }
            const batchIds = Array.from(new Set((batchAssignments || []).map((entry) => entry.batch_id).filter(Boolean)));
            if (batchIds.length === 0) {
                setMeetings([]);
                return;
            }
            const { data, error } = await supabase
                .from("meetings")
                .select("*")
                .in("batch_id", batchIds)
                .eq("status", "Scheduled")
                .order("scheduled_at", { ascending: true });
            if (error) {
                console.error("Error fetching batch meetings:", error.message);
                setMeetings([]);
                return;
            }
            setMeetings(data || []);
        };
        fetchMeetings();
    }, [id]);
    // ✅ FETCH PROGRESS
    useEffect(() => {
        const fetchProgress = async () => {
            const { data } = await supabase
                .from("progress")
                .select("*")
                .eq("student_id", id);
            setProgress(data || []);
            setScoreDraftByEntryId(Object.fromEntries((data || []).map((entry) => [entry.id, entry.score != null ? String(entry.score) : ""])));
        };
        fetchProgress();
    }, [id]);
    const handleReportScoreSave = async (entryId) => {
        const rawValue = scoreDraftByEntryId[entryId];
        const parsed = rawValue === "" ? null : Number(rawValue);
        if (rawValue !== "" && (Number.isNaN(parsed) || parsed < 0 || parsed > 10)) {
            alert("Please enter a valid score between 0 and 10.");
            return;
        }
        const { data: studentByEmail, error: studentLookupError } = await supabase
            .from("users")
            .select("id, email, name")
            .eq("email", student?.email || "")
            .maybeSingle();
        if (studentLookupError || !studentByEmail?.id) {
            alert("Unable to find student by email for score update.");
            return;
        }
        setSavingScoreEntryId(entryId);
        const { error } = await supabase
            .from("progress")
            .update({ score: parsed })
            .eq("id", entryId)
            .eq("student_id", studentByEmail.id);
        setSavingScoreEntryId(null);
        if (error) {
            alert("Unable to save report score: " + error.message);
            return;
        }
        setProgress((current) => current.map((entry) => entry.id === entryId ? { ...entry, score: parsed } : entry));
        try {
            const progressEntry = progress.find((entry) => entry.id === entryId);
            const emailResponse = await sendNotificationEmail(student?.email || "", student?.name || "Student", "score", `Your report score has been updated for "${progressEntry?.title || "Report"}" to ${parsed == null ? "Not given" : `${parsed}/10`}.`);
            setLastSentTime(emailResponse?.lastSentAt || new Date().toISOString());
            alert("Report score saved and email sent.");
        }
        catch (emailError) {
            alert(`Report score saved, but email failed: ${emailError.message}`);
        }
    };
    const handleExport = () => {
        if (!student)
            return;
        const lines = [
            "Mentor Mentee Hub - Student Report",
            "",
            `Student Name: ${student.name || "Unknown"}`,
            `PRN: ${student.prn || "N/A"}`,
            `Email: ${student.email || "N/A"}`,
            `CGPA: ${student.cgpa || 0}`,
            `Mentor Score (Out of 10): ${student.mentor_report_score ?? "N/A"}`,
            `Meetings Count: ${meetings.length}`,
            `Progress Entries: ${progress.length}`,
            "",
            "Meetings",
            "----------------------------------------",
        ];
        if (meetings.length === 0) {
            lines.push("No meetings recorded.");
        }
        else {
            meetings.forEach((meeting) => {
                lines.push(`Title: ${meeting.title || "Meeting"}`);
                lines.push(`When: ${meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : "Date not available"}`);
                lines.push(`Description: ${meeting.description || "No description provided"}`);
                lines.push("----------------------------------------");
            });
        }
        lines.push("", "Progress", "----------------------------------------");
        if (progress.length === 0) {
            lines.push("No progress entries recorded.");
        }
        else {
            progress.forEach((entry) => {
                lines.push(`Title: ${entry.title || "Untitled Progress"}`);
                lines.push(`Type: ${entry.entry_type || "N/A"}`);
                lines.push(`Value: ${entry.value_text || entry.score || "N/A"}`);
                lines.push(`Description: ${entry.description || "No description provided"}`);
                lines.push(`Date: ${entry.created_at
                    ? new Date(entry.created_at).toLocaleString()
                    : entry.date
                        ? new Date(entry.date).toLocaleDateString()
                        : "Date not available"}`);
                if (Array.isArray(entry.attachment_names) && entry.attachment_names.length > 0) {
                    lines.push(`Attachments: ${entry.attachment_names.join(", ")}`);
                }
                lines.push("----------------------------------------");
            });
        }
        const blob = buildPdfBlob(lines);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${(student.name || "student").replace(/\s+/g, "-").toLowerCase()}-report.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
    };
    const handleDownloadMentorshipForm = async () => {
        if (!student)
            return;
        // Fetch student's full profile data for mentorship form
        const { data: studentProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (!studentProfile) {
            alert('Unable to fetch student profile data');
            return;
        }
        // Create mentorship form content as text lines
        const lines = [
            'MENTORSHIP FORM',
            '',
            `Name in full: ${studentProfile.name || 'Not provided'}`,
            `PRN No.: ${studentProfile.prn || 'Not provided'}`,
            `Admission date: ${studentProfile.admission_date || 'Not provided'}  Year: ${studentProfile.academic_year || 'Not provided'}`,
            `Gender: ${studentProfile.gender || 'Not provided'}  Birth date: ${studentProfile.date_of_birth || 'Not provided'}`,
            `Birth place: ${studentProfile.birth_place || 'Not provided'}  Birth District: ${studentProfile.birth_district || 'Not provided'}`,
            `Religion: ${studentProfile.religion || 'Not provided'}  Category: ${studentProfile.category || 'Not provided'}`,
            `Caste/Sub Caste: ${studentProfile.caste_sub_caste || 'Not provided'}  Domicile: ${studentProfile.domicile || 'Not provided'}`,
            `Blood Group: ${studentProfile.blood_group || 'Not provided'}`,
            `Seat type: ${studentProfile.seat_type || 'Not provided'}`,
            '',
            'ACADEMIC DETAILS',
            `SSC Marks: ${studentProfile.ssc_marks || 'Not provided'} out of ${studentProfile.ssc_out_of || 'Not provided'}`,
            `SSC Passing Year: ${studentProfile.ssc_passing_year || 'Not provided'}  SSC Board: ${studentProfile.ssc_board || 'Not provided'}`,
            `HSC Marks: ${studentProfile.hsc_marks || 'Not provided'} out of ${studentProfile.hsc_out_of || 'Not provided'}`,
            `HSC Passing Year: ${studentProfile.hsc_passing_year || 'Not provided'}  HSC Board: ${studentProfile.hsc_board || 'Not provided'}`,
            `Diploma Marks: ${studentProfile.diploma_marks || 'Not provided'} out of ${studentProfile.diploma_out_of || 'Not provided'}`,
            `Diploma Passing Year: ${studentProfile.diploma_passing_year || 'Not provided'}`,
            '',
            'HSC SUBJECT MARKS',
            `Physics: ${studentProfile.hsc_physics_marks || 'Not provided'}`,
            `Chemistry: ${studentProfile.hsc_chemistry_marks || 'Not provided'}`,
            `Mathematics: ${studentProfile.hsc_mathematics_marks || 'Not provided'}`,
            `Total: ${studentProfile.hsc_total_marks || 'Not provided'} Out of: ${studentProfile.hsc_out_of || 'Not provided'}`,
            '',
            'INSTITUTION DETAILS',
            `Last Institution: ${studentProfile.last_institution_name || 'Not provided'}`,
            `City: ${studentProfile.city || 'Not provided'}  District: ${studentProfile.district || 'Not provided'}`,
            `State: ${studentProfile.state || 'Not provided'}`,
            '',
            'FAMILY DETAILS',
            `Parents Income: ${studentProfile.parents_income || 'Not provided'}`,
            `Free Concession: ${studentProfile.free_concession || 'Not provided'}`,
            `Number of Children: ${studentProfile.number_of_children || 'Not provided'}`,
            '',
            'FATHER DETAILS',
            `Name: ${studentProfile.father_name || 'Not provided'}`,
            `Address: ${studentProfile.father_address || 'Not provided'}`,
            `Office Address: ${studentProfile.father_office_address || 'Not provided'}`,
            `Designation: ${studentProfile.father_designation || 'Not provided'}`,
            `Occupation: ${studentProfile.father_occupation || 'Not provided'}`,
            `Email: ${studentProfile.father_email || 'Not provided'}`,
            `Mobile: ${studentProfile.father_mobile || 'Not provided'}`,
            '',
            'MOTHER DETAILS',
            `Name: ${studentProfile.mother_name || 'Not provided'}`,
            `Office Address: ${studentProfile.mother_office_address || 'Not provided'}`,
            `Designation: ${studentProfile.mother_designation || 'Not provided'}`,
            `Occupation: ${studentProfile.mother_occupation || 'Not provided'}`,
            `Email: ${studentProfile.mother_email || 'Not provided'}`,
            `Mobile: ${studentProfile.mother_mobile || 'Not provided'}`,
            '',
            'GUARDIAN DETAILS',
            `Name: ${studentProfile.local_guardian_name || 'Not provided'}`,
            `Address: ${studentProfile.local_guardian_address || 'Not provided'}`,
            `Office Address: ${studentProfile.local_guardian_office_address || 'Not provided'}`,
            `Designation: ${studentProfile.local_guardian_designation || 'Not provided'}`,
            `Occupation: ${studentProfile.local_guardian_occupation || 'Not provided'}`,
            `Email: ${studentProfile.local_guardian_email || 'Not provided'}`,
            `Mobile: ${studentProfile.local_guardian_mobile || 'Not provided'}`,
            '',
            'ADDITIONAL INFORMATION',
            `Local Residence: ${studentProfile.local_residence || 'Not provided'}`,
            `Height: ${studentProfile.height || 'Not provided'}  Weight: ${studentProfile.weight || 'Not provided'}`,
            `Marital Status: ${studentProfile.marital_status || 'Not provided'}`,
            `Allergy History: ${studentProfile.allergy_history || 'Not provided'}`,
            '',
            'SIGNATURES',
            'Student\'s Name & Signature: _______________________________',
            'Parent/Guardian\'s Name & Signature: _______________________________',
        ];
        const blob = buildPdfBlob(lines);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${(studentProfile.prn || 'student-mentorship-form').replace(/\s+/g, '-').toLowerCase()}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
    };
    if (pageLoading)
        return <p>Loading...</p>;
    if (!student)
        return <p>Student not found.</p>;
    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/mentor/students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5"/>
          </Button>
        </Link>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">Student Report</h1>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadMentorshipForm}>
            <Download className="w-4 h-4"/>
            Download Mentorship Form
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4"/>
            Export Report
          </Button>
        </div>
      </div>

      {/* STUDENT INFO */}
      <Card className="p-6">
        <h2 className="text-xl font-bold">{student.name}</h2>
        <p>{student.email}</p>
      </Card>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p>Scheduled Meetings (Student Batch)</p>
          <h3>{meetings.length}</h3>
        </Card>

        <Card className="p-4">
          <p>Mentor Score & Status</p>
          <h3>{student.mentor_report_score ?? "Not given"}</h3>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input type="number" min="0" max="10" step="0.1" value={mentorScoreDraft} onChange={(event) => setMentorScoreDraft(event.target.value)} placeholder="0 - 10" className="h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"/>
              <select value={mentorStatusDraft} onChange={(e) => setMentorStatusDraft(e.target.value)} className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground">
                <option value="Excellent">Excellent</option>
                <option value="Outstanding">Outstanding</option>
                <option value="Good Standing">Good Standing</option>
                <option value="Average">Average</option>
                <option value="Needs Improvement">Needs Improvement</option>
                <option value="At Risk">At Risk</option>
                <option value="Warning">Warning</option>
              </select>
            </div>
            <Button size="sm" variant="outline" onClick={handleSaveMentorScore} disabled={savingMentorScore} className="w-fit">
              {savingMentorScore ? "Saving..." : "Save Score & Status"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Last Sent Time: {lastSentTime ? new Date(lastSentTime).toLocaleString() : "Not sent yet"}
          </p>
        </Card>
      </div>

      {/* MEETINGS */}
      <Card className="p-4">
        <h3>Scheduled Meetings (Student Batch)</h3>

        {meetings.map((m) => (<div key={m.id} className="border p-2 mb-2">
            <p>{m.title}</p>
            <p>{new Date(m.scheduled_at).toLocaleString()}</p>
          </div>))}
      </Card>

      {/* PROGRESS */}
      <Card className="p-4">
        <h3>Progress</h3>

        {progress.length === 0 ? (<p className="text-sm text-muted-foreground">No progress entries saved by this student yet.</p>) : (progress.map((p) => (<div key={p.id} className="mb-3 rounded border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{p.title || "Untitled Progress"}</p>
                {p.entry_type && <Badge variant="outline">{p.entry_type}</Badge>}
                {(p.value_text || p.score) && (<Badge className="bg-primary/20 text-primary">
                    {p.value_text || p.score}
                  </Badge>)}
                {p.entry_type === "report" && p.score !== null && p.score !== undefined && (<Badge className="bg-accent/20 text-accent">Score: {p.score}</Badge>)}
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {p.description || "No description provided."}
              </p>

              {p.entry_type === "report" && (<div className="mt-3 flex flex-wrap items-center gap-2">
                  <label htmlFor={`report-score-${p.id}`} className="text-xs font-medium text-muted-foreground">
                    Report Score (0-10)
                  </label>
                  <input id={`report-score-${p.id}`} type="number" min="0" max="10" step="0.1" value={scoreDraftByEntryId[p.id] ?? ""} onChange={(event) => setScoreDraftByEntryId((current) => ({
                ...current,
                [p.id]: event.target.value,
            }))} className="h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"/>
                  <Button size="sm" variant="outline" onClick={() => handleReportScoreSave(p.id)} disabled={savingScoreEntryId === p.id}>
                    {savingScoreEntryId === p.id ? "Saving..." : "Save Score"}
                  </Button>
                </div>)}

              <p className="mt-2 text-xs text-muted-foreground">
                {p.created_at
                ? new Date(p.created_at).toLocaleString()
                : p.date
                    ? new Date(p.date).toLocaleDateString()
                    : "Date not available"}
              </p>

              {Array.isArray(p.attachments) && p.attachments.length > 0 && (<div className="mt-3 flex flex-wrap gap-2">
                  {p.attachments.map((fileUrl, index) => (<a key={`${p.id}-${index}`} href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded border px-3 py-1 text-sm text-primary hover:bg-primary/5">
                      <Paperclip className="h-4 w-4"/>
                      {Array.isArray(p.attachment_names) && p.attachment_names[index]
                        ? p.attachment_names[index]
                        : `Attachment ${index + 1}`}
                    </a>))}
                </div>)}
            </div>)))}
      </Card>
    </div>);
}
