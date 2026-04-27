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
import { toast } from "sonner";
import { useMemo } from "react";
import { CartesianGrid, Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useUser } from "@/hooks/use-user";
import { usePathname } from "next/navigation";
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
    const { user: viewerUser } = useUser();
    const pathname = usePathname();
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
    const isHodView = String(viewerUser?.role || "").toLowerCase() === "hod" || pathname.startsWith("/dashboard/hod");
    const backHref = isHodView ? "/dashboard/hod/mentors" : "/dashboard/mentor/students";
    const visibleProgress = useMemo(() => {
        if (!isHodView)
            return progress;
        return progress.filter((entry) => {
            const entryType = String(entry.entry_type || "").toLowerCase();
            return entryType === "cgpa" || entryType === "marks" || entry.verification_status === "verified";
        });
    }, [progress, isHodView]);

    const chartData = useMemo(() => {
        const categoryMap = {
            cgpa: { total: 0, count: 0 },
            sports: { total: 0, count: 0 },
            hackathon: { total: 0, count: 0 },
            certification: { total: 0, count: 0 },
            competition: { total: 0, count: 0 },
            achievement: { total: 0, count: 0 },
        };

        progress.forEach((entry) => {
            const type = (entry.entry_type || entry.certification_type || "achievement").toLowerCase();
            const cat = type === "marks" ? "cgpa" 
                : type === "skill" ? "certification" 
                : Object.keys(categoryMap).includes(type) ? type : "achievement";

            const isVerified = cat === "cgpa" || entry.verification_status === "verified";
            const rawVal = entry.score != null ? entry.score : entry.value_text;
            const parsedVal = parseFloat(rawVal);

            if (isVerified && !isNaN(parsedVal)) {
                categoryMap[cat].total += parsedVal;
                categoryMap[cat].count++;
            }
        });

        return Object.entries(categoryMap)
            .filter(([_, stats]) => stats.count > 0)
            .map(([cat, stats]) => ({
                label: cat.charAt(0).toUpperCase() + cat.slice(1),
                score: Number((stats.total / stats.count).toFixed(1)),
                count: stats.count
            }));
    }, [progress]);

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
        if (isHodView) {
            toast.error("HOD view is read-only. Only mentors can update score and status.");
            return;
        }
        const parsed = mentorScoreDraft === "" ? null : Number(mentorScoreDraft);
        if (mentorScoreDraft !== "" && (Number.isNaN(parsed) || parsed < 0 || parsed > 10)) {
            toast.error("Please enter a valid mentor score between 0 and 10.");
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
                toast.error("Unable to save mentor score: column mentor_report_score is missing. Please run the SQL migration first.");
                return;
            }
            toast.error("Unable to save mentor score: " + message);
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
            toast.success("Mentor score saved and email sent.");
        }
        catch (emailError) {
            toast.error(`Mentor score saved, but email failed: ${emailError.message}`);
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
    const handleVerifyEntry = async (entryId, action) => {
        if (isHodView) {
            toast.error("HOD view is read-only. Only mentors can verify or reject entries.");
            return;
        }
        const rawValue = scoreDraftByEntryId[entryId];
        let parsed = undefined;

        if (action === "verified") {
            parsed = rawValue === "" ? null : Number(rawValue);
            if (rawValue !== "" && (Number.isNaN(parsed) || parsed < 0 || parsed > 10)) {
                toast.error("Please enter a valid score between 0 and 10.");
                return;
            }
            if (parsed == null) {
                toast.error("Please provide a score before approving.");
                return;
            }
        }

        setSavingScoreEntryId(entryId);
        
        try {
            const apiAction = action === "verified" ? "verify" : "reject";
            const response = await fetch('/api/mentor/verify-certification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    certificationId: entryId,
                    score: parsed,
                    feedback: `Status changed to ${action} from student profile view.`,
                    action: apiAction,
                }),
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || "Unknown error occurred");
            }

            setProgress((current) =>
                current.map((entry) =>
                    entry.id === entryId
                        ? { ...entry, verification_status: action, score: action === "verified" ? parsed : entry.score }
                        : entry
                )
            );

            toast.success(`Entry ${action === "verified" ? "approved" : "rejected"} successfully.`);
            
            const progressEntry = progress.find((entry) => entry.id === entryId);
            const emailResponse = await sendNotificationEmail(student?.email || "", student?.name || "Student", "score", `Your progress entry "${progressEntry?.title || "Activity"}" has been ${action === "verified" ? `approved with a score of ${parsed}/10` : "rejected"}.`);
            setLastSentTime(emailResponse?.lastSentAt || new Date().toISOString());
        } catch (error) {
            toast.error(`Unable to save: ${error.message}`);
        } finally {
            setSavingScoreEntryId(null);
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
            `Progress Entries: ${visibleProgress.length}`,
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
        if (visibleProgress.length === 0) {
            lines.push("No progress entries recorded.");
        }
        else {
            visibleProgress.forEach((entry) => {
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

    const handleDownloadMentorshipForm = () => {
        if (!student) return;
        window.open(`/print/mentorship-form/${id}`, '_blank');
    };

    if (pageLoading)
        return <p>Loading...</p>;
    if (!student)
        return <p>Student not found.</p>;

    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref}>
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
        <p className="text-sm text-muted-foreground">PRN: {student.prn || "N/A"}</p>
      </Card>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4">


        <Card className="p-4">
          <p>Mentor Score & Status</p>
          <h3>{student.mentor_report_score ?? "Not given"}</h3>
          {isHodView ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Read-only for HOD. Score and status can be updated only by mentor.
            </p>
          ) : (
            <>
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
            </>
          )}
        </Card>
      </div>

      {/* MEETINGS */}


      {/* PROGRESS GRAPH */}
      {chartData.length > 0 && (
        <Card className="border-border bg-card p-6 mb-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Category Performance</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Average verified scores grouped by activity type out of 10.
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary">
              {chartData.reduce((acc, curr) => acc + curr.count, 0)} active entries
            </Badge>
          </div>
          <ChartContainer className="h-64 w-full" config={{
              score: {
                  label: 'Average',
                  color: 'hsl(var(--primary))',
              },
          }}>
            <BarChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }} barCategoryGap="5%">
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8}/>
              <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}/>
              <ChartTooltip cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} content={<ChartTooltipContent labelFormatter={(label) => `Category: ${label}`} formatter={(value) => [`${value}/10`, 'Average Score']} />}/>
              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} animationDuration={700} barSize={30}/>
            </BarChart>
          </ChartContainer>
        </Card>
      )}

      {/* PROGRESS */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Progress Entries</h3>

        {visibleProgress.length === 0 ? (<p className="text-sm text-muted-foreground">{isHodView ? "No mentor-approved progress entries available for this student yet." : "No progress entries saved by this student yet."}</p>) : (visibleProgress.map((p) => (<div key={p.id} className="mb-3 rounded border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{p.title || "Untitled Progress"}</p>
                {p.entry_type && <Badge variant="outline">{p.entry_type}</Badge>}
                {(p.value_text || p.score != null) && (<Badge className="bg-primary/20 text-primary">
                    {(p.entry_type === "report" || p.entry_type !== "cgpa" && p.score != null) ? `Score: ${p.score}` : (p.value_text || p.score)}
                  </Badge>)}
                {p.verification_status && (
                    <Badge className={p.verification_status === 'verified' ? "bg-green-500/20 text-green-700 hover:bg-green-500/30" : p.verification_status === 'rejected' ? "bg-red-500/20 text-red-700 hover:bg-red-500/30" : "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30"}>
                        {p.verification_status.charAt(0).toUpperCase() + p.verification_status.slice(1)}
                    </Badge>
                )}
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {p.description || "No description provided."}
              </p>

              {!isHodView && p.entry_type !== "cgpa" && (!p.verification_status || p.verification_status === "pending") && (<div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 border-border/50">
                  <label htmlFor={`verify-score-${p.id}`} className="text-xs font-medium text-muted-foreground">
                    Assign Score (0-10)
                  </label>
                  <input id={`verify-score-${p.id}`} type="number" min="0" max="10" step="0.1" value={scoreDraftByEntryId[p.id] ?? ""} onChange={(event) => setScoreDraftByEntryId((current) => ({
                ...current,
                [p.id]: event.target.value,
            }))} className="h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground" placeholder="Score"/>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleVerifyEntry(p.id, "verified")} disabled={savingScoreEntryId === p.id}>
                    {savingScoreEntryId === p.id ? "Saving..." : "Approve & Score"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleVerifyEntry(p.id, "rejected")} disabled={savingScoreEntryId === p.id}>
                    Reject
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
