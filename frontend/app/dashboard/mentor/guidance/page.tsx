"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

interface StudentThread {
  id: string;
  name: string;
  email: string;
  prn: string;
  batchNames: string[];
  unansweredCount: number;
  latestStudentMessage: string;
  latestMessageAt: string;
}

interface GuidanceMessage {
  id: string;
  message: string;
  senderRole: "student" | "mentor";
  createdAt: string;
}

export default function MentorGuidancePage() {
  const { user, loading } = useUser();
  const supabase = createClient();

  const [threads, setThreads] = useState<StudentThread[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [messages, setMessages] = useState<GuidanceMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedStudentId) || null,
    [threads, selectedStudentId],
  );

  const fetchThreads = async () => {
    if (!user) return;

    setDataLoading(true);

    const { data: guidanceData, error: guidanceError } = await supabase
      .from("guidance_messages")
      .select("student_id, sender_role, message, created_at")
      .eq("mentor_id", user.id);

    if (guidanceError) {
      console.error("Error fetching guidance threads:", guidanceError.message);
      setDataLoading(false);
      return;
    }

    const queriedStudentIds = Array.from(
      new Set(
        (guidanceData || [])
          .filter((entry: any) => entry.sender_role === "student")
          .map((entry: any) => entry.student_id)
          .filter(Boolean),
      ),
    );

    if (queriedStudentIds.length === 0) {
      setThreads([]);
      setSelectedStudentId("");
      setDataLoading(false);
      return;
    }

    const { data: batchData, error: batchError } = await supabase
      .from("batches")
      .select("id, name")
      .eq("mentor_id", user.id);

    if (batchError) {
      console.error("Error fetching mentor batches:", batchError.message);
      setDataLoading(false);
      return;
    }

    const batchIds = (batchData || []).map((batch: any) => batch.id);

    const { data: assignmentData, error: assignmentError } = batchIds.length > 0
      ? await supabase
          .from("batch_students")
          .select("student_id, batch_id")
          .in("batch_id", batchIds)
          .in("student_id", queriedStudentIds)
      : { data: [], error: null };

    if (assignmentError) {
      console.error("Error fetching assignments:", assignmentError.message);
      setDataLoading(false);
      return;
    }

    const assignedStudentIds = Array.from(
      new Set((assignmentData || []).map((assignment: any) => assignment.student_id).filter(Boolean)),
    );

    const relevantStudentIds = assignedStudentIds.length > 0 ? assignedStudentIds : queriedStudentIds;

    const { data: studentData, error: studentError } = await supabase
      .from("users")
      .select("id, name, email, prn")
      .in("id", relevantStudentIds);

    if (studentError) {
      console.error("Error fetching students:", studentError.message);
      setDataLoading(false);
      return;
    }

    const batchNameById = new Map((batchData || []).map((batch: any) => [batch.id, batch.name]));
    const batchNamesByStudent = new Map<string, string[]>();

    (assignmentData || []).forEach((assignment: any) => {
      if (!batchNamesByStudent.has(assignment.student_id)) {
        batchNamesByStudent.set(assignment.student_id, []);
      }

      const batchName = batchNameById.get(assignment.batch_id);
      if (batchName) {
        batchNamesByStudent.get(assignment.student_id)?.push(batchName);
      }
    });

    const guidanceByStudent = new Map<string, any[]>();

    (guidanceData || []).forEach((entry: any) => {
      if (!guidanceByStudent.has(entry.student_id)) {
        guidanceByStudent.set(entry.student_id, []);
      }
      guidanceByStudent.get(entry.student_id)?.push(entry);
    });

    const nextThreads: StudentThread[] = (studentData || [])
      .map((student: any) => {
        const studentMessages = guidanceByStudent.get(student.id) || [];
        const latestStudentEntry = [...studentMessages]
          .filter((entry: any) => entry.sender_role === "student")
          .sort(
            (left: any, right: any) =>
              new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
          )[0];

        const latestMentorReply = [...studentMessages]
          .filter((entry: any) => entry.sender_role === "mentor")
          .sort(
            (left: any, right: any) =>
              new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
          )[0];

        const unansweredCount = studentMessages.filter((entry: any) => {
          if (entry.sender_role !== "student") return false;
          if (!latestMentorReply) return true;
          return (
            new Date(entry.created_at).getTime() >
            new Date(latestMentorReply.created_at).getTime()
          );
        }).length;

        return {
          id: student.id,
          name: student.name || "Unknown Student",
          email: student.email || "",
          prn: student.prn || "N/A",
          batchNames: Array.from(new Set(batchNamesByStudent.get(student.id) || [])),
          unansweredCount,
          latestStudentMessage: latestStudentEntry?.message || "",
          latestMessageAt: latestStudentEntry?.created_at || "",
        };
      })
      .filter((thread) => thread.latestStudentMessage)
      .sort(
        (left, right) =>
          new Date(right.latestMessageAt).getTime() - new Date(left.latestMessageAt).getTime(),
      );

    setThreads(nextThreads);
    setSelectedStudentId((current) => current || nextThreads[0]?.id || "");
    setDataLoading(false);
  };

  const fetchMessages = async (studentId: string) => {
    if (!user || !studentId) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("guidance_messages")
      .select("id, message, sender_role, created_at")
      .eq("mentor_id", user.id)
      .eq("student_id", studentId)
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
      fetchThreads();
    }
  }, [loading, user]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchMessages(selectedStudentId);
    }
  }, [selectedStudentId, user?.id]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`mentor-guidance-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guidance_messages",
          filter: `mentor_id=eq.${user.id}`,
        },
        () => {
          fetchThreads();
          if (selectedStudentId) {
            fetchMessages(selectedStudentId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedStudentId]);

  const handleReply = async () => {
    if (!user || !selectedStudentId || !draft.trim()) return;

    setSending(true);

    const { error } = await supabase.from("guidance_messages").insert({
      student_id: selectedStudentId,
      mentor_id: user.id,
      sender_role: "mentor",
      message: draft.trim(),
    });

    setSending(false);

    if (error) {
      alert("Unable to send guidance reply: " + error.message);
      return;
    }

    setDraft("");
    await fetchThreads();
    await fetchMessages(selectedStudentId);
  };

  if (loading || dataLoading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading guidance inbox...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Guidance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See student issues and respond with mentor guidance in real time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Student Queries</h2>
          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No student queries have been posted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedStudentId(thread.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedStudentId === thread.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{thread.name}</p>
                      <p className="text-sm text-muted-foreground">{thread.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">PRN: {thread.prn}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Batches: {thread.batchNames.join(", ") || "Not assigned"}
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm text-foreground">
                        {thread.latestStudentMessage}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {thread.latestMessageAt
                          ? new Date(thread.latestMessageAt).toLocaleString()
                          : ""}
                      </p>
                    </div>
                    {thread.unansweredCount > 0 && (
                      <Badge>{thread.unansweredCount}</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex min-h-[560px] flex-col p-4">
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold">
              {selectedThread?.name || "Select a student"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedThread
                ? `${selectedThread.email} • PRN ${selectedThread.prn}`
                : "Choose a student to view their guidance thread"}
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <MessageSquare className="mb-3 h-10 w-10 opacity-40" />
                <p>No guidance messages in this thread yet.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.senderRole === "mentor"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                  <p
                    className={`mt-2 text-[11px] ${
                      message.senderRole === "mentor"
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
              placeholder="Write your guidance reply..."
              className="min-h-28"
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={handleReply} disabled={sending || !selectedStudentId || !draft.trim()}>
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
