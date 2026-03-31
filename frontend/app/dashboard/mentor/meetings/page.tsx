"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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

interface Meeting {
  id: string;
  batchId: string | null;
  batch: string;
  scheduledAt: string;
  date: string;
  time: string;
  description: string;
}

interface Batch {
  id: string;
  name: string;
}

export default function MentorMeetingsPage() {
  const supabase = createClient();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
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

  const fetchMeetings = async (currentBatches: Batch[] = batches) => {
    if (!user) return;

    setLoading(true);

    const { data } = await supabase
      .from("meetings")
      .select("*")
      .eq("mentor_id", user.id)
      .order("scheduled_at", { ascending: true });

    const formatted: Meeting[] = (data || []).map((meeting: any) => ({
      id: meeting.id,
      batchId: meeting.batch_id ?? null,
      batch:
        meeting.batch ||
        currentBatches.find((batch) => batch.id === meeting.batch_id)?.name ||
        "Unassigned Batch",
      scheduledAt: meeting.scheduled_at,
      date: new Date(meeting.scheduled_at).toLocaleDateString(),
      time: new Date(meeting.scheduled_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      description: meeting.description || "No description",
    }));

    setMeetings(formatted);
    setLoading(false);
  };

  const fetchBatches = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("batches")
      .select("id, name")
      .eq("mentor_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      alert("Unable to load batches: " + error.message);
      return;
    }

    const loadedBatches = (data || []) as Batch[];
    setBatches(loadedBatches);
    await fetchMeetings(loadedBatches);
  };

  useEffect(() => {
    if (user) {
      fetchBatches();
    }
  }, [user]);

  const handleScheduleMeeting = async () => {
    if (!newMeeting.batch || !newMeeting.date || !newMeeting.time || !newMeeting.venue) return;
    if (!user) return;

    const datetime = new Date(`${newMeeting.date} ${newMeeting.time}`);
    const selectedBatch = batches.find((batch) => batch.id === newMeeting.batch);
    const description = newMeeting.agenda
      ? `${newMeeting.venue} - ${newMeeting.agenda}`
      : newMeeting.venue;

    const { error } = await supabase.from("meetings").insert({
      description,
      mentor_id: user.id,
      batch_id: newMeeting.batch,
      batch: selectedBatch?.name || "",
      scheduled_at: datetime,
    });

    if (!error) {
      alert("Meeting saved successfully.");
      await fetchMeetings();
    }

    setNewMeeting({ batch: "", date: "", time: "", venue: "", agenda: "" });
    setIsDialogOpen(false);
  };

  const upcomingMeetings = meetings.filter((meeting) => {
    const scheduledDate = new Date(meeting.scheduledAt);
    return !Number.isNaN(scheduledDate.getTime()) && scheduledDate >= new Date();
  });

  const pastMeetings = meetings.filter((meeting) => {
    const scheduledDate = new Date(meeting.scheduledAt);
    return !Number.isNaN(scheduledDate.getTime()) && scheduledDate < new Date();
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Meetings</h1>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4" />
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
                  Select Batch
                </label>
                <select
                  value={newMeeting.batch}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, batch: e.target.value })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">
                    {batches.length === 0 ? "No batches available" : "Select batch"}
                  </option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
                {batches.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No batches found yet. Please create a batch from the students page first.
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
                Save Meeting
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming Meetings</h2>

        {loading ? (
          <Card className="p-4">
            <p>Loading meetings...</p>
          </Card>
        ) : batches.length === 0 ? (
          <Card className="p-4">
            <p className="text-muted-foreground">
              No batches found for this mentor. Please create a batch from the students page first.
            </p>
          </Card>
        ) : upcomingMeetings.length === 0 ? (
          <Card className="p-4">
            <p className="text-muted-foreground">No upcoming meetings.</p>
          </Card>
        ) : (
          upcomingMeetings.map((meeting) => (
            <Card key={meeting.id} className="p-4">
              <div className="space-y-1">
                <p className="font-bold">{meeting.batch}</p>
                <p>
                  {meeting.date} - {meeting.time}
                </p>
                <p className="text-sm text-muted-foreground">{meeting.description}</p>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Past Meetings</h2>

        {pastMeetings.length === 0 ? (
          <Card className="p-4">
            <p className="text-muted-foreground">No past meetings yet.</p>
          </Card>
        ) : (
          pastMeetings.map((meeting) => (
            <Card key={meeting.id} className="p-4">
              <div className="space-y-1">
                <p className="font-bold">{meeting.batch}</p>
                <p>
                  {meeting.date} - {meeting.time}
                </p>
                <p className="text-sm text-muted-foreground">{meeting.description}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
