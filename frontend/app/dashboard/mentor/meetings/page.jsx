"use client";
import { toast } from "sonner";

import { useEffect, useState } from "react";
import { Plus, Pencil, Ban, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/send-notification-email";
export default function MentorMeetingsPage() {
    const supabase = createClient();
    const [meetings, setMeetings] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMeetingId, setEditingMeetingId] = useState(null);
    const [savingMeeting, setSavingMeeting] = useState(false);
    const [cancellingMeetingId, setCancellingMeetingId] = useState(null);
    const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
    const [attendanceMeeting, setAttendanceMeeting] = useState(null);
    const [attendanceStudents, setAttendanceStudents] = useState([]);
    const [attendanceByStudent, setAttendanceByStudent] = useState({});
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceSaving, setAttendanceSaving] = useState(false);
    const [lastSentTime, setLastSentTime] = useState("");
    const [newMeeting, setNewMeeting] = useState({
        title: "",
        batch: "",
        date: "",
        time: "",
        venue: "",
        agenda: "",
    });
    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        };
        getUser();
    }, []);
    const fetchMeetings = async (currentBatches = batches) => {
        if (!user)
            return;
        setLoading(true);
        const { data } = await supabase
            .from("meetings")
            .select("*")
            .eq("mentor_id", user.id)
            .order("scheduled_at", { ascending: true });
        const formatted = (data || []).map((meeting) => ({
            id: meeting.id,
            batchId: meeting.batch_id ?? null,
            batch: meeting.batch ||
                currentBatches.find((batch) => batch.id === meeting.batch_id)?.name ||
                "Unassigned Batch",
            title: meeting.title || "Mentorship Meeting",
            scheduledAt: meeting.scheduled_at,
            date: new Date(meeting.scheduled_at).toLocaleDateString(),
            time: new Date(meeting.scheduled_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
            description: meeting.description || "No description",
            status: meeting.status || "Scheduled",
        }));
        setMeetings(formatted);
        setLoading(false);
    };
    const fetchBatches = async () => {
        if (!user)
            return;
        const { data, error } = await supabase
            .from("batches")
            .select("id, name")
            .eq("mentor_id", user.id)
            .order("name", { ascending: true });
        if (error) {
            toast.error("Unable to load batches: " + error.message);
            return;
        }
        const loadedBatches = (data || []);
        setBatches(loadedBatches);
        await fetchMeetings(loadedBatches);
    };
    useEffect(() => {
        if (user) {
            fetchBatches();
        }
    }, [user]);
    const resetMeetingForm = () => {
        setNewMeeting({ title: "", batch: "", date: "", time: "", venue: "", agenda: "" });
        setEditingMeetingId(null);
    };
    const handleScheduleMeeting = async () => {
        if (!newMeeting.title || !newMeeting.batch || !newMeeting.date || !newMeeting.time || !newMeeting.venue)
            return;
        if (!user)
            return;
        setSavingMeeting(true);
        const datetime = new Date(`${newMeeting.date} ${newMeeting.time}`);
        const selectedBatch = batches.find((batch) => batch.id === newMeeting.batch);
        const [meetingVenue = "", ...agendaParts] = (newMeeting.venue || "").split(" - ");
        const description = newMeeting.agenda
            ? `${newMeeting.venue} - ${newMeeting.agenda}`
            : newMeeting.venue;
        const payload = {
            title: newMeeting.title.trim(),
            description,
            mentor_id: user.id,
            batch_id: newMeeting.batch,
            batch: selectedBatch?.name || "",
            scheduled_at: datetime,
        };
        const { error } = editingMeetingId
            ? await supabase
                .from("meetings")
                .update(payload)
                .eq("id", editingMeetingId)
                .eq("mentor_id", user.id)
            : await supabase.from("meetings").insert(payload);
        setSavingMeeting(false);
        if (!error) {
            const { data: assignments, error: assignmentError } = await supabase
                .from("batch_students")
                .select("student_id")
                .eq("batch_id", newMeeting.batch);
            if (!assignmentError) {
                const studentIds = Array.from(new Set((assignments || []).map((entry) => entry.student_id).filter(Boolean)));
                if (studentIds.length > 0) {
                    const { data: usersData } = await supabase
                        .from("users")
                        .select("email, name")
                        .in("id", studentIds);
                    const students = (usersData || []).filter((row) => row.email);
                    let failedEmails = 0;
                    for (const student of students) {
                        try {
                            const meetingDetails = [
                                `Meeting Title: ${payload.title}`,
                                `Date & Time: ${datetime.toLocaleString()}`,
                                `Batch: ${selectedBatch?.name || "N/A"}`,
                                `Venue: ${meetingVenue || newMeeting.venue || "N/A"}`,
                                `Agenda: ${newMeeting.agenda || agendaParts.join(" - ") || "N/A"}`,
                            ].join("\n");
                            const emailResult = await sendNotificationEmail(student.email, student.name || "Student", "meeting", meetingDetails);
                            setLastSentTime(emailResult?.lastSentAt || new Date().toISOString());
                        }
                        catch (emailError) {
                            failedEmails += 1;
                            console.error("Unable to send meeting notification:", emailError.message);
                        }
                    }
                    if (failedEmails > 0) {
                        toast.error(`${failedEmails} meeting notification email(s) failed to send.`);
                    }
                }
            }
            toast.success(editingMeetingId ? "Meeting updated successfully." : "Meeting saved successfully.");
            await fetchMeetings();
        }
        else {
            toast.error("Unable to save meeting: " + error.message);
        }
        resetMeetingForm();
        setIsDialogOpen(false);
    };
    const handleEditMeeting = (meeting) => {
        const [venue, ...agendaParts] = (meeting.description || "").split(" - ");
        const scheduledDate = new Date(meeting.scheduledAt);
        const dateValue = Number.isNaN(scheduledDate.getTime())
            ? ""
            : scheduledDate.toISOString().split("T")[0];
        const timeValue = Number.isNaN(scheduledDate.getTime())
            ? ""
            : `${String(scheduledDate.getHours()).padStart(2, "0")}:${String(scheduledDate.getMinutes()).padStart(2, "0")}`;
        setEditingMeetingId(meeting.id);
        setNewMeeting({
            title: meeting.title || "Mentorship Meeting",
            batch: meeting.batchId || "",
            date: dateValue,
            time: timeValue,
            venue: venue || "",
            agenda: agendaParts.join(" - "),
        });
        setIsDialogOpen(true);
    };
    const handleCancelMeeting = async (meeting) => {
        if (!user)
            return;
        const confirmed = window.confirm(`Cancel meeting "${meeting.title}" scheduled on ${meeting.date} at ${meeting.time}?`);
        if (!confirmed)
            return;
        setCancellingMeetingId(meeting.id);
        const { error } = await supabase
            .from("meetings")
            .update({ status: "Cancelled" })
            .eq("id", meeting.id)
            .eq("mentor_id", user.id);
        setCancellingMeetingId(null);
        if (error) {
            toast.error("Unable to cancel meeting: " + error.message);
            return;
        }
        await fetchMeetings();
        toast.success("Meeting cancelled.");
    };
    const openAttendanceDialog = async (meeting) => {
        if (!meeting.batchId) {
            toast.success("This meeting is not linked to a batch.");
            return;
        }
        setAttendanceMeeting(meeting);
        setAttendanceDialogOpen(true);
        setAttendanceLoading(true);
        const { data: assignmentData, error: assignmentError } = await supabase
            .from("batch_students")
            .select("student_id, student_name")
            .eq("batch_id", meeting.batchId);
        if (assignmentError) {
            setAttendanceLoading(false);
            toast.error("Unable to load batch students: " + assignmentError.message);
            return;
        }
        const studentIds = Array.from(new Set((assignmentData || []).map((row) => row.student_id).filter(Boolean)));
        let usersById = new Map();
        if (studentIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from("users")
                .select("id, name, prn, email")
                .in("id", studentIds);
            if (usersError) {
                setAttendanceLoading(false);
                toast.error("Unable to load student details: " + usersError.message);
                return;
            }
            usersById = new Map((usersData || []).map((student) => [student.id, student]));
        }
        const formattedStudents = (assignmentData || []).map((row) => {
            const userEntry = usersById.get(row.student_id);
            return {
                id: row.student_id,
                name: userEntry?.name || row.student_name || "Unknown Student",
                prn: userEntry?.prn || "N/A",
                email: userEntry?.email || "",
            };
        });
        const { data: attendanceRows, error: attendanceError } = await supabase
            .from("meeting_attendance")
            .select("student_id, present")
            .eq("meeting_id", meeting.id);
        if (attendanceError) {
            setAttendanceLoading(false);
            toast.error("Unable to load existing attendance: " + attendanceError.message);
            return;
        }
        const initialAttendance = {};
        formattedStudents.forEach((student) => {
            initialAttendance[student.id] = false;
        });
        (attendanceRows || []).forEach((row) => {
            initialAttendance[row.student_id] = Boolean(row.present);
        });
        setAttendanceStudents(formattedStudents);
        setAttendanceByStudent(initialAttendance);
        setAttendanceLoading(false);
    };
    const handleSaveAttendance = async () => {
        if (!attendanceMeeting || !user)
            return;
        setAttendanceSaving(true);
        const payload = attendanceStudents.map((student) => ({
            meeting_id: attendanceMeeting.id,
            student_id: student.id,
            mentor_id: user.id,
            present: Boolean(attendanceByStudent[student.id]),
            marked_by: user.id,
            marked_at: new Date().toISOString(),
        }));
        const { error } = await supabase
            .from("meeting_attendance")
            .upsert(payload, { onConflict: "meeting_id,student_id" });
        setAttendanceSaving(false);
        if (error) {
            toast.error("Unable to save attendance: " + error.message);
            return;
        }
        setAttendanceDialogOpen(false);
        toast.success("Attendance saved successfully.");
    };
    const upcomingMeetings = meetings.filter((meeting) => {
        const scheduledDate = new Date(meeting.scheduledAt);
        return !Number.isNaN(scheduledDate.getTime()) && scheduledDate >= new Date();
    });
    const pastMeetings = meetings.filter((meeting) => {
        const scheduledDate = new Date(meeting.scheduledAt);
        return !Number.isNaN(scheduledDate.getTime()) && scheduledDate < new Date();
    });
    return (<div className="space-y-8">
      <div className="flex justify-between items-end gap-4">
        <h1 className="text-3xl font-bold">Meetings</h1>
        <p className="text-xs text-muted-foreground">
          Last Sent Time: {lastSentTime ? new Date(lastSentTime).toLocaleString() : "Not sent yet"}
        </p>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
                resetMeetingForm();
            }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4"/>
              Schedule Meeting
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Meeting</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Meeting Title
                </label>
                <Input placeholder="e.g., Academic Review" value={newMeeting.title} onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}/>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Select Batch
                </label>
                <select value={newMeeting.batch} onChange={(e) => setNewMeeting({ ...newMeeting, batch: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  <option value="">
                    {batches.length === 0 ? "No batches available" : "Select batch"}
                  </option>
                  {batches.map((batch) => (<option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>))}
                </select>
                {batches.length === 0 && (<p className="text-xs text-muted-foreground">
                    No batches found yet. Please create a batch from the students page first.
                  </p>)}
              </div>

              <Input type="date" value={newMeeting.date} onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}/>

              <Input type="time" value={newMeeting.time} onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}/>

              <Input placeholder="Venue" value={newMeeting.venue} onChange={(e) => setNewMeeting({ ...newMeeting, venue: e.target.value })}/>

              <Textarea placeholder="Agenda" value={newMeeting.agenda} onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}/>

              <Button onClick={handleScheduleMeeting}>
                {savingMeeting
            ? "Saving..."
            : editingMeetingId
                ? "Update Meeting"
                : "Save Meeting"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming Meetings</h2>

        {loading ? (<Card className="p-4">
            <p>Loading meetings...</p>
          </Card>) : batches.length === 0 ? (<Card className="p-4">
            <p className="text-muted-foreground">
              No batches found for this mentor. Please create a batch from the students page first.
            </p>
          </Card>) : upcomingMeetings.length === 0 ? (<Card className="p-4">
            <p className="text-muted-foreground">No upcoming meetings.</p>
          </Card>) : (upcomingMeetings.map((meeting) => (<Card key={meeting.id} className="p-4">
              <div className="space-y-2">
                <p className="font-bold">{meeting.title}</p>
                <p className="text-sm text-muted-foreground">{meeting.batch}</p>
                <p>
                  {meeting.date} - {meeting.time}
                </p>
                <p className="text-sm text-muted-foreground">{meeting.description}</p>
                <p className="text-xs text-muted-foreground">Status: {meeting.status}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => handleEditMeeting(meeting)}>
                    <Pencil className="w-4 h-4"/>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openAttendanceDialog(meeting)}>
                    <ClipboardCheck className="w-4 h-4"/>
                    Attendance
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleCancelMeeting(meeting)} disabled={meeting.status === "Cancelled" || cancellingMeetingId === meeting.id}>
                    <Ban className="w-4 h-4"/>
                    {meeting.status === "Cancelled"
                ? "Cancelled"
                : cancellingMeetingId === meeting.id
                    ? "Cancelling..."
                    : "Cancel"}
                  </Button>
                </div>
              </div>
            </Card>)))}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Past Meetings</h2>

        {pastMeetings.length === 0 ? (<Card className="p-4">
            <p className="text-muted-foreground">No past meetings yet.</p>
          </Card>) : (pastMeetings.map((meeting) => (<Card key={meeting.id} className="p-4">
              <div className="space-y-1">
                <p className="font-bold">{meeting.title}</p>
                <p className="text-sm text-muted-foreground">{meeting.batch}</p>
                <p>
                  {meeting.date} - {meeting.time}
                </p>
                <p className="text-sm text-muted-foreground">{meeting.description}</p>
                <p className="text-xs text-muted-foreground">Status: {meeting.status}</p>
              </div>
            </Card>)))}
      </div>

      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Mark Attendance
              {attendanceMeeting ? ` - ${attendanceMeeting.title}` : ""}
            </DialogTitle>
          </DialogHeader>
          {attendanceLoading ? (<p className="text-sm text-muted-foreground">Loading batch students...</p>) : attendanceStudents.length === 0 ? (<p className="text-sm text-muted-foreground">No students found in this batch.</p>) : (<div className="space-y-4">
              <div className="max-h-80 overflow-y-auto rounded-md border">
                {attendanceStudents.map((student) => (<label key={student.id} className="flex items-center justify-between gap-4 border-b px-3 py-2 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        PRN: {student.prn} {student.email ? `| ${student.email}` : ""}
                      </p>
                    </div>
                    <input type="checkbox" checked={Boolean(attendanceByStudent[student.id])} onChange={(event) => setAttendanceByStudent((current) => ({
                ...current,
                [student.id]: event.target.checked,
            }))} className="h-4 w-4"/>
                  </label>))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAttendance} disabled={attendanceSaving}>
                  {attendanceSaving ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </div>)}
        </DialogContent>
      </Dialog>
    </div>);
}
