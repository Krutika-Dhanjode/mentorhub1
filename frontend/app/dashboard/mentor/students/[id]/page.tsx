"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export default function StudentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();

  const [student, setStudent] = useState<any>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
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
      setPageLoading(false);
    };

    fetchStudent();
  }, [id]);

  // ✅ FETCH MEETINGS
  useEffect(() => {
    const fetchMeetings = async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("student_id", id);

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
    };

    fetchProgress();
  }, [id]);

  if (pageLoading) return <p>Loading...</p>;
  if (!student) return <p>Student not found.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/mentor/students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">Student Report</h1>
        </div>

        <Button>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* STUDENT INFO */}
      <Card className="p-6">
        <h2 className="text-xl font-bold">{student.name}</h2>
        <p>{student.email}</p>
      </Card>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p>CGPA</p>
          <h3>{student.cgpa || 0}</h3>
        </Card>

        <Card className="p-4">
          <p>Meetings</p>
          <h3>{meetings.length}</h3>
        </Card>
      </div>

      {/* MEETINGS */}
      <Card className="p-4">
        <h3>Meetings</h3>

        {meetings.map((m) => (
          <div key={m.id} className="border p-2 mb-2">
            <p>{m.title}</p>
            <p>{new Date(m.scheduled_at).toLocaleString()}</p>
          </div>
        ))}
      </Card>

      {/* PROGRESS */}
      <Card className="p-4">
        <h3>Progress</h3>

        {progress.length === 0 ? (
          <p className="text-sm text-muted-foreground">No progress entries saved by this student yet.</p>
        ) : (
          progress.map((p) => (
            <div key={p.id} className="mb-3 rounded border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{p.title || "Untitled Progress"}</p>
                {p.entry_type && <Badge variant="outline">{p.entry_type}</Badge>}
                {(p.value_text || p.score) && (
                  <Badge className="bg-primary/20 text-primary">
                    {p.value_text || p.score}
                  </Badge>
                )}
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {p.description || "No description provided."}
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                {p.created_at
                  ? new Date(p.created_at).toLocaleString()
                  : p.date
                    ? new Date(p.date).toLocaleDateString()
                    : "Date not available"}
              </p>

              {Array.isArray(p.attachments) && p.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.attachments.map((fileUrl: string, index: number) => (
                    <a
                      key={`${p.id}-${index}`}
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded border px-3 py-1 text-sm text-primary hover:bg-primary/5"
                    >
                      <Paperclip className="h-4 w-4" />
                      {Array.isArray(p.attachment_names) && p.attachment_names[index]
                        ? p.attachment_names[index]
                        : `Attachment ${index + 1}`}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
