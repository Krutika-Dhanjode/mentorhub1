"use client";
import { toast } from "sonner";

import { useEffect, useState } from "react";
import { Plus, Pencil, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/send-notification-email";

export default function HodSchedulePage() {
  const supabase = createClient();
  const [meetings, setMeetings] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hodName, setHodName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [cancellingMeetingId, setCancellingMeetingId] = useState(null);
  const [lastSentTime, setLastSentTime] = useState("");

  const [newMeeting, setNewMeeting] = useState({
    title: "",
    mentorIds: [],
    date: "",
    time: "",
    venue: "",
    agenda: "",
  });

  // Fetch current user (HOD)
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user?.id) {
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .eq("id", data.user.id)
          .single();
        if (userData?.name) {
          setHodName(userData.name);
        }
      }
    };
    getUser();
  }, []);

  // Fetch mentors linked to this HOD
  const fetchMentors = async () => {
    if (!user) return;

    // Get mentor IDs linked to this HOD
    const { data: mentorLinks, error: linkError } = await supabase
      .from("mentors")
      .select("mentor_user_id")
      .eq("hod_id", user.id);

    if (linkError) {
      toast.error("Unable to load mentors: " + linkError.message);
      return;
    }

    const mentorIds = (mentorLinks || [])
      .map((link) => link.mentor_user_id)
      .filter(Boolean);

    if (mentorIds.length === 0) {
      setMentors([]);
      return;
    }

    const { data: mentorData, error: mentorError } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", mentorIds);

    if (mentorError) {
      toast.error("Unable to load mentor details: " + mentorError.message);
      return;
    }

    setMentors(mentorData || []);
  };

  // Fetch HOD-scheduled meetings
  const fetchMeetings = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("hod_meetings")
      .select("*")
      .eq("hod_id", user.id)
      .order("scheduled_at", { ascending: true });

    // Map mentor names
    const formatted = (data || []).map((meeting) => {
      const mentor = mentors.find((m) => m.id === meeting.mentor_id);
      return {
        id: meeting.id,
        mentorId: meeting.mentor_id,
        mentorName: mentor?.name || "Unknown Mentor",
        mentorEmail: mentor?.email || "",
        title: meeting.title || "HOD Meeting",
        scheduledAt: meeting.scheduled_at,
        date: new Date(meeting.scheduled_at).toLocaleDateString(),
        time: new Date(meeting.scheduled_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        description: meeting.description || "No description",
        status: meeting.status || "Scheduled",
      };
    });

    setMeetings(formatted);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchMentors();
    }
  }, [user]);

  useEffect(() => {
    if (user && mentors.length >= 0) {
      fetchMeetings();
    }
  }, [user, mentors]);

  const resetMeetingForm = () => {
    setNewMeeting({
      title: "",
      mentorIds: [],
      date: "",
      time: "",
      venue: "",
      agenda: "",
    });
    setEditingMeetingId(null);
  };

  const toggleMentorSelection = (mentorId) => {
    setNewMeeting((prev) => {
      const ids = prev.mentorIds.includes(mentorId)
        ? prev.mentorIds.filter((id) => id !== mentorId)
        : [...prev.mentorIds, mentorId];
      return { ...prev, mentorIds: ids };
    });
  };

  const toggleAllMentorsSelection = () => {
    setNewMeeting((prev) => {
      const allMentorIds = mentors.map((mentor) => mentor.id).filter(Boolean);
      const allSelected =
        allMentorIds.length > 0 &&
        allMentorIds.every((id) => prev.mentorIds.includes(id));
      return {
        ...prev,
        mentorIds: allSelected ? [] : allMentorIds,
      };
    });
  };

  const handleScheduleMeeting = async () => {
    if (
      !newMeeting.title ||
      newMeeting.mentorIds.length === 0 ||
      !newMeeting.date ||
      !newMeeting.time ||
      !newMeeting.venue
    ) {
      if (newMeeting.mentorIds.length === 0) {
        toast.error("Please select at least one mentor.");
      }
      return;
    }
    if (!user) return;

    setSavingMeeting(true);

    const datetime = new Date(`${newMeeting.date} ${newMeeting.time}`);

    const description = newMeeting.agenda
      ? `${newMeeting.venue} - ${newMeeting.agenda}`
      : newMeeting.venue;

    if (editingMeetingId) {
      // Edit mode: update single meeting (mentorIds will have exactly 1 entry)
      const payload = {
        title: newMeeting.title.trim(),
        description,
        hod_id: user.id,
        mentor_id: newMeeting.mentorIds[0],
        scheduled_at: datetime,
      };

      const { error } = await supabase
        .from("hod_meetings")
        .update(payload)
        .eq("id", editingMeetingId)
        .eq("hod_id", user.id);

      setSavingMeeting(false);

      if (error) {
        toast.error("Unable to update meeting: " + error.message);
        return;
      }

      const selectedMentor = mentors.find((m) => m.id === newMeeting.mentorIds[0]);
      if (selectedMentor?.email) {
        try {
          const meetingDetails = [
            `Meeting Title: ${payload.title}`,
            `Date & Time: ${datetime.toLocaleString()}`,
            `Venue: ${newMeeting.venue || "N/A"}`,
            `Agenda: ${newMeeting.agenda || "N/A"}`,
            `Scheduled by: ${hodName || "HOD"}`,
          ].join("\n");
          await sendNotificationEmail(
            selectedMentor.email,
            selectedMentor.name || "Mentor",
            "meeting",
            meetingDetails,
            hodName
          );
        } catch (emailError) {
          console.error("Email notification failed:", emailError.message);
        }
      }

      toast.success("Meeting updated successfully.");
    } else {
      // Create mode: insert one meeting per selected mentor
      const payloads = newMeeting.mentorIds.map((mentorId) => ({
        title: newMeeting.title.trim(),
        description,
        hod_id: user.id,
        mentor_id: mentorId,
        scheduled_at: datetime,
      }));

      const { error } = await supabase.from("hod_meetings").insert(payloads);

      setSavingMeeting(false);

      if (error) {
        toast.error("Unable to save meeting: " + error.message);
        return;
      }

      // Send emails to all selected mentors
      let failedEmails = 0;
      for (const mentorId of newMeeting.mentorIds) {
        const mentor = mentors.find((m) => m.id === mentorId);
        if (mentor?.email) {
          try {
            const meetingDetails = [
              `Meeting Title: ${newMeeting.title.trim()}`,
              `Date & Time: ${datetime.toLocaleString()}`,
              `Venue: ${newMeeting.venue || "N/A"}`,
              `Agenda: ${newMeeting.agenda || "N/A"}`,
              `Scheduled by: ${hodName || "HOD"}`,
            ].join("\n");
            const emailResult = await sendNotificationEmail(
              mentor.email,
              mentor.name || "Mentor",
              "meeting",
              meetingDetails,
              hodName
            );
            setLastSentTime(
              emailResult?.lastSentAt || new Date().toISOString()
            );
          } catch (emailError) {
            failedEmails += 1;
            console.error("Email notification failed:", emailError.message);
          }
        }
      }

      if (failedEmails > 0) {
        toast.error(`Meeting(s) scheduled, but ${failedEmails} email(s) failed.`);
      } else {
        toast.success(
          newMeeting.mentorIds.length === 1
            ? "Meeting scheduled successfully."
            : `Meeting scheduled for ${newMeeting.mentorIds.length} mentors.`
        );
      }
    }

    await fetchMeetings();
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
      : `${String(scheduledDate.getHours()).padStart(2, "0")}:${String(
          scheduledDate.getMinutes()
        ).padStart(2, "0")}`;

    setEditingMeetingId(meeting.id);
    setNewMeeting({
      title: meeting.title || "HOD Meeting",
      mentorIds: meeting.mentorId ? [meeting.mentorId] : [],
      date: dateValue,
      time: timeValue,
      venue: venue || "",
      agenda: agendaParts.join(" - "),
    });
    setIsDialogOpen(true);
  };

  const handleCancelMeeting = async (meeting) => {
    if (!user) return;

    const confirmed = window.confirm(
      `Cancel meeting "${meeting.title}" scheduled on ${meeting.date} at ${meeting.time}?`
    );
    if (!confirmed) return;

    setCancellingMeetingId(meeting.id);

    const { error } = await supabase
      .from("hod_meetings")
      .update({ status: "Cancelled" })
      .eq("id", meeting.id)
      .eq("hod_id", user.id);

    setCancellingMeetingId(null);

    if (error) {
      toast.error("Unable to cancel meeting: " + error.message);
      return;
    }

    // Send cancellation email to mentor
    if (meeting.mentorEmail) {
      try {
        const cancellationDetails = [
          `Meeting Title: ${meeting.title || "HOD Meeting"}`,
          `Date & Time: ${
            meeting.scheduledAt
              ? new Date(meeting.scheduledAt).toLocaleString()
              : `${meeting.date} ${meeting.time}`
          }`,
          "Status: Cancelled",
          "",
          "Please check your dashboard for updated meeting details.",
        ].join("\n");

        const emailResult = await sendNotificationEmail(
          meeting.mentorEmail,
          meeting.mentorName || "Mentor",
          "meeting_cancelled",
          cancellationDetails,
          hodName
        );
        setLastSentTime(
          emailResult?.lastSentAt || new Date().toISOString()
        );
      } catch (emailError) {
        console.error(
          "Unable to send cancellation notification:",
          emailError.message
        );
        toast.error(
          "Meeting cancelled, but cancellation email failed to send."
        );
        await fetchMeetings();
        return;
      }
    }

    await fetchMeetings();
    toast.success("Meeting cancelled and notification sent to mentor.");
  };

  const upcomingMeetings = meetings.filter((meeting) => {
    const scheduledDate = new Date(meeting.scheduledAt);
    return (
      !Number.isNaN(scheduledDate.getTime()) && scheduledDate >= new Date()
    );
  });

  const pastMeetings = meetings.filter((meeting) => {
    const scheduledDate = new Date(meeting.scheduledAt);
    return (
      !Number.isNaN(scheduledDate.getTime()) && scheduledDate < new Date()
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold">Schedule Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule and manage meetings with your mentors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetMeetingForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" />
                Schedule Meeting
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMeetingId
                    ? "Edit Meeting"
                    : "Schedule Meeting for Mentor"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Meeting Title
                  </label>
                  <Input
                    placeholder="e.g., Monthly Review"
                    value={newMeeting.title}
                    onChange={(e) =>
                      setNewMeeting({ ...newMeeting, title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Select Mentor{!editingMeetingId && "s"}
                    {newMeeting.mentorIds.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({newMeeting.mentorIds.length} selected)
                      </span>
                    )}
                  </label>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-input bg-background">
                    {mentors.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        No mentors available
                      </p>
                    ) : (
                      <>
                        {!editingMeetingId && (
                          <label className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 cursor-pointer border-b border-input transition-colors">
                            <input
                              type="checkbox"
                              checked={
                                mentors.length > 0 &&
                                mentors.every((mentor) =>
                                  newMeeting.mentorIds.includes(mentor.id),
                                )
                              }
                              onChange={toggleAllMentorsSelection}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-sm font-medium text-foreground">
                              All Mentors
                            </span>
                          </label>
                        )}
                        {mentors.map((mentor) => (
                          <label
                            key={mentor.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 cursor-pointer border-b border-input last:border-b-0 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={newMeeting.mentorIds.includes(mentor.id)}
                              onChange={() => toggleMentorSelection(mentor.id)}
                              disabled={editingMeetingId && newMeeting.mentorIds.length === 1 && !newMeeting.mentorIds.includes(mentor.id)}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-sm text-foreground">
                              {mentor.name}
                            </span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                  {mentors.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No mentors found. Please add mentors from the Mentors
                      page first.
                    </p>
                  )}
                </div>

                <Input
                  type="date"
                  value={newMeeting.date}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, date: e.target.value })
                  }
                />

                <Input
                  type="time"
                  value={newMeeting.time}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, time: e.target.value })
                  }
                />

                <Input
                  placeholder="Venue"
                  value={newMeeting.venue}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, venue: e.target.value })
                  }
                />

                <Textarea
                  placeholder="Agenda"
                  value={newMeeting.agenda}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, agenda: e.target.value })
                  }
                />

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
      </div>

      {/* Upcoming Meetings */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming Meetings</h2>

        {loading ? (
          <Card className="p-3">
            <p>Loading meetings...</p>
          </Card>
        ) : mentors.length === 0 ? (
          <Card className="p-3">
            <p className="text-muted-foreground">
              No mentors found for this HOD. Please add mentors from the
              Mentors page first.
            </p>
          </Card>
        ) : upcomingMeetings.length === 0 ? (
          <Card className="p-3">
            <p className="text-muted-foreground">No upcoming meetings.</p>
          </Card>
        ) : (
          upcomingMeetings.map((meeting) => (
            <Card key={meeting.id} className="p-3">
              <div className="space-y-1">
                <p className="font-bold text-base">{meeting.title}</p>
                <p className="text-sm text-muted-foreground">
                  Mentor: {meeting.mentorName}
                </p>
                <p>
                  {meeting.date} - {meeting.time}
                </p>
                <p className="text-sm text-muted-foreground">
                  {meeting.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {meeting.status}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditMeeting(meeting)}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleCancelMeeting(meeting)}
                    disabled={
                      meeting.status === "Cancelled" ||
                      cancellingMeetingId === meeting.id
                    }
                  >
                    <Ban className="w-4 h-4" />
                    {meeting.status === "Cancelled"
                      ? "Cancelled"
                      : cancellingMeetingId === meeting.id
                      ? "Cancelling..."
                      : "Cancel"}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Past Meetings */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Past Meetings</h2>

        {pastMeetings.length === 0 ? (
          <Card className="p-3">
            <p className="text-muted-foreground">No past meetings yet.</p>
          </Card>
        ) : (
          pastMeetings.map((meeting) => (
            <Card key={meeting.id} className="p-3">
              <div className="space-y-1">
                <p className="font-bold text-base">{meeting.title}</p>
                <p className="text-sm text-muted-foreground">
                  Mentor: {meeting.mentorName}
                </p>
                <p>
                  {meeting.date} - {meeting.time}
                </p>
                <p className="text-sm text-muted-foreground">
                  {meeting.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {meeting.status}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
