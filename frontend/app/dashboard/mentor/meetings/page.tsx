"use client";

import { useState, useEffect } from "react";
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
import CreateBatchModal from "@/components/create-batch-modal";
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
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    batch: "",
    date: "",
    time: "",
    venue: "",
    agenda: "",
  });

  // ✅ GET USER
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  const fetchMeetings = async () => {
    if (!user) return;

    setLoading(true);

    const { data } = await supabase
      .from("meetings")
      .select("*")
      .eq("mentor_id", user.id)
      .order("scheduled_at", { ascending: true });

    const formatted: Meeting[] = (data || []).map((m: any) => ({
      id: m.id,
      batchId: m.batch_id ?? null,
      batch: m.batch || batches.find((batch) => batch.id === m.batch_id)?.name || "Unassigned Batch",
      scheduledAt: m.scheduled_at,
      date: new Date(m.scheduled_at).toLocaleDateString(),
      time: new Date(m.scheduled_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      description: m.description || "No description",
    }));

    setMeetings(formatted);
    setLoading(false);
  };

  const fetchBatches = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("batches")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      alert("Unable to load batches: " + error.message);
      return;
    }

    setBatches((data || []) as Batch[]);
  };

  // ✅ FETCH MEETINGS FROM DB
  useEffect(() => {
    if (user) {
      fetchBatches();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMeetings();
    }
  }, [user, batches.length]);

  // ✅ INSERT INTO DB
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
      alert("Meeting saved in database");
      await fetchMeetings();
    }

    setNewMeeting({ batch: "", date: "", time: "", venue: "", agenda: "" });
    setIsDialogOpen(false);
  };

  const handleCreateBatch = async (batchData: {
    name: string;
    year: string;
    department: string;
  }) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("batches")
      .insert({
        name: batchData.name,
        mentor_id: user.id,
      })
      .select("id, name")
      .single();

    if (error) {
      alert("Unable to create batch: " + error.message);
      return;
    }

    const createdBatch = data as Batch;
    setBatches((current) =>
      [...current, createdBatch].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setNewMeeting((current) => ({ ...current, batch: createdBatch.id }));
    setIsBatchModalOpen(false);
    alert("Batch created in database successfully.");
  };

  const upcomingMeetings = meetings.filter((m) => {
    const scheduledDate = new Date(m.scheduledAt);
    return !Number.isNaN(scheduledDate.getTime()) && scheduledDate >= new Date();
  });

  const pastMeetings = meetings.filter((m) => {
    const scheduledDate = new Date(m.scheduledAt);
    return !Number.isNaN(scheduledDate.getTime()) && scheduledDate < new Date();
  });

  return (
    <div className="space-y-8">
      {/* HEADER */}
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
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-foreground">
                    Select Batch
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBatchModalOpen(true)}
                  >
                    Create Batch
                  </Button>
                </div>
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
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {batches.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No batches found yet. Create one and it will be saved to Supabase.
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

      <CreateBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onCreate={handleCreateBatch}
      />

      {/* MEETINGS */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming Meetings</h2>

        {loading ? (
          <Card className="p-4">
            <p>Loading meetings...</p>
          </Card>
        ) : batches.length === 0 ? (
          <Card className="p-4">
            <p className="text-muted-foreground">
              No batches found for this mentor. Create or assign a batch first.
            </p>
          </Card>
        ) : upcomingMeetings.length === 0 ? (
          <Card className="p-4">
            <p className="text-muted-foreground">No upcoming meetings.</p>
          </Card>
        ) : (
          upcomingMeetings.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="space-y-1">
                <p className="font-bold">{m.batch}</p>
                <p>
                  {m.date} - {m.time}
                </p>
                <p className="text-sm text-muted-foreground">{m.description}</p>
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
          pastMeetings.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="space-y-1">
                <p className="font-bold">{m.batch}</p>
                <p>
                  {m.date} - {m.time}
                </p>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
