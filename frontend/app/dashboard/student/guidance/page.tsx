"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

interface MentorOption {
  id: string;
  name: string;
  email: string;
  batchNames: string[];
}

interface GuidanceMessage {
  id: string;
  message: string;
  senderRole: "student" | "mentor";
  createdAt: string;
}

export default function StudentGuidancePage() {
  const { user, loading } = useUser();
  const supabase = createClient();

  const [mentors, setMentors] = useState<MentorOption[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [messages, setMessages] = useState<GuidanceMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const selectedMentor = useMemo(
    () => mentors.find((mentor) => mentor.id === selectedMentorId) || null,
    [mentors, selectedMentorId],
  );

  const fetchMentors = async () => {
    if (!user) return;

    setDataLoading(true);

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("batch_students")
      .select("batch_id")
      .eq("student_id", user.id);

    if (assignmentError) {
      console.error("Error fetching student batches:", assignmentError.message);
      setDataLoading(false);
      return;
    }

    const batchIds = Array.from(
      new Set((assignmentData || []).map((assignment: any) => assignment.batch_id).filter(Boolean)),
    );

    if (batchIds.length === 0) {
      setMentors([]);
      setSelectedMentorId("");
      setDataLoading(false);
      return;
    }

    const { data: batchData, error: batchError } = await supabase
      .from("batches")
      .select("id, name, mentor_id")
      .in("id", batchIds);

    if (batchError) {
      console.error("Error fetching batches:", batchError.message);
      setDataLoading(false);
      return;
    }

    const mentorIds = Array.from(
      new Set((batchData || []).map((batch: any) => batch.mentor_id).filter(Boolean)),
    );

    const { data: mentorData, error: mentorError } = mentorIds.length > 0
      ? await supabase
          .from("users")
          .select("id, name, email")
          .in("id", mentorIds)
      : { data: [], error: null };

    if (mentorError) {
      console.error("Error fetching mentors:", mentorError.message);
      setDataLoading(false);
      return;
    }

    const batchNamesByMentor = new Map<string, string[]>();

    (batchData || []).forEach((batch: any) => {
      if (!batch.mentor_id) return;

      if (!batchNamesByMentor.has(batch.mentor_id)) {
        batchNamesByMentor.set(batch.mentor_id, []);
      }

      batchNamesByMentor.get(batch.mentor_id)?.push(batch.name);
    });

    const mentorOptions: MentorOption[] = (mentorData || []).map((mentor: any) => ({
      id: mentor.id,
      name: mentor.name || "Unknown Mentor",
      email: mentor.email || "",
      batchNames: batchNamesByMentor.get(mentor.id) || [],
    }));

    setMentors(mentorOptions);
    setSelectedMentorId((current) => current || mentorOptions[0]?.id || "");
    setDataLoading(false);
  };

  const fetchMessages = async (mentorId: string) => {
    if (!user || !mentorId) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("guidance_messages")
      .select("id, message, sender_role, created_at")
      .eq("student_id", user.id)
      .eq("mentor_id", mentorId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching guidance messages:", error.message);
      return;
    }

    setMessages(
      (data || []).map((message: any) => ({
        id: message.id,
        message: message.message,
        senderRole: message.sender_role,
        createdAt: message.created_at,
      })),
    );
  };

  useEffect(() => {
    if (!loading && user) {
      fetchMentors();
    }
  }, [loading, user]);

  useEffect(() => {
    if (selectedMentorId) {
      fetchMessages(selectedMentorId);
    }
  }, [selectedMentorId, user?.id]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`student-guidance-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guidance_messages",
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          if (selectedMentorId) {
            fetchMessages(selectedMentorId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedMentorId]);

  const handleSend = async () => {
    if (!user || !selectedMentorId || !draft.trim()) return;

    setSending(true);

    const { error } = await supabase.from("guidance_messages").insert({
      student_id: user.id,
      mentor_id: selectedMentorId,
      sender_role: "student",
      message: draft.trim(),
    });

    setSending(false);

    if (error) {
      alert("Unable to send your message: " + error.message);
      return;
    }

    setDraft("");
    await fetchMessages(selectedMentorId);
  };

  if (loading || dataLoading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading guidance...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Guidance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask your mentor about academic, batch, or personal guidance issues.
        </p>
      </div>

      {mentors.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground">
            You are not assigned to any mentor yet, so guidance chat is not available.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Your Mentors</h2>
            <div className="space-y-3">
              {mentors.map((mentor) => (
                <button
                  key={mentor.id}
                  type="button"
                  onClick={() => setSelectedMentorId(mentor.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedMentorId === mentor.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <p className="font-medium text-foreground">{mentor.name}</p>
                  <p className="text-sm text-muted-foreground">{mentor.email}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Batches: {mentor.batchNames.join(", ") || "Not assigned"}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="flex min-h-[560px] flex-col p-4">
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold">
                {selectedMentor?.name || "Select a mentor"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedMentor?.email || "Choose a mentor to start chatting"}
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <MessageSquare className="mb-3 h-10 w-10 opacity-40" />
                  <p>No guidance messages yet.</p>
                  <p className="text-sm">Ask your first question below.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.senderRole === "student"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                    <p
                      className={`mt-2 text-[11px] ${
                        message.senderRole === "student"
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Describe your issue or question for your mentor..."
                className="min-h-28"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={sending || !selectedMentorId || !draft.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  {sending ? "Sending..." : "Send Query"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
