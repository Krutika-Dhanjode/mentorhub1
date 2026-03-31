"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ScheduleMeetingModal from "@/components/schedule-meeting-modal";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

interface AssignedStudent {
  assignmentId: string;
  id: string;
  name: string;
  email: string;
  prn: string;
  cgpa: number;
  batchId: string;
  batchName: string;
  status: "On Track" | "Needs Support" | "Excellent";
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  status?: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
}

interface Batch {
  id: string;
  name: string;
  year?: string;
  department?: string;
  student_count?: number;
}

export default function MentorDashboard() {
  const { user, loading } = useUser();
  const supabase = createClient();

  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);

  const fetchMeetings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("mentor_id", user.id)
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("Error fetching meetings:", error.message);
      return;
    }

    setMeetings(data || []);
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    setDataLoading(true);

    try {
      const { data: batchData, error: batchError } = await supabase
        .from("batches")
        .select("id, name, year, department, student_count")
        .eq("mentor_id", user.id)
        .order("name", { ascending: true });

      if (batchError) {
        console.error("Error fetching batches:", batchError.message);
        setBatches([]);
        setStudents([]);
        return;
      }

      const mentorBatches = (batchData || []) as Batch[];
      setBatches(mentorBatches);

      if (mentorBatches.length === 0) {
        setStudents([]);
        return;
      }

      const batchIds = mentorBatches.map((batch) => batch.id);

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("batch_students")
        .select("id, batch_id, student_id, student_name")
        .in("batch_id", batchIds);

      if (assignmentError) {
        console.error("Error fetching batch assignments:", assignmentError.message);
        setStudents([]);
        return;
      }

      const studentIds = Array.from(
        new Set(
          (assignmentData || [])
            .map((assignment: any) => assignment.student_id)
            .filter(Boolean),
        ),
      );

      let usersById = new Map<string, any>();

      if (studentIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, name, email, prn, cgpa")
          .in("id", studentIds);

        if (userError) {
          console.error("Error fetching students:", userError.message);
        } else {
          usersById = new Map((userData || []).map((entry: any) => [entry.id, entry]));
        }
      }

      const batchMap = new Map(mentorBatches.map((batch) => [batch.id, batch]));

      const formattedStudents: AssignedStudent[] = (assignmentData || []).map(
        (assignment: any) => {
          const matchedUser = usersById.get(assignment.student_id);
          const matchedBatch = batchMap.get(assignment.batch_id);

          return {
            assignmentId: assignment.id,
            id: assignment.student_id,
            name: matchedUser?.name || assignment.student_name || "Unknown",
            email: matchedUser?.email || "",
            prn: matchedUser?.prn || "N/A",
            cgpa: matchedUser?.cgpa ?? 0,
            batchId: assignment.batch_id,
            batchName: matchedBatch?.name || "Unknown Batch",
            status: "On Track",
          };
        },
      );

      setStudents(formattedStudents);
    } catch (err) {
      console.error("Unexpected error:", err);
      setBatches([]);
      setStudents([]);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      fetchDashboardData();
      fetchMeetings();
    }
  }, [user, loading]);

  const createBatch = async () => {
    const name = prompt("Enter batch name");
    if (!name || !user) return;

    const { error } = await supabase.from("batches").insert({
      name,
      mentor_id: user.id,
      year: "2024",
      student_count: 0,
    });

    if (error) {
      alert("Unable to create batch: " + error.message);
      return;
    }

    alert("Batch created!");
    await fetchDashboardData();
  };

  const deleteBatch = async (batch: Batch) => {
    if (!user) return;

    const confirmed = window.confirm(
      `Delete batch "${batch.name}"? This will also remove all meetings and student assignments from this batch.`,
    );

    if (!confirmed) return;

    setDeletingBatchId(batch.id);

    const { error: meetingError } = await supabase
      .from("meetings")
      .delete()
      .eq("batch_id", batch.id)
      .eq("mentor_id", user.id);

    if (meetingError) {
      setDeletingBatchId(null);
      alert("Unable to delete batch meetings: " + meetingError.message);
      return;
    }

    const { error } = await supabase
      .from("batches")
      .delete()
      .eq("id", batch.id)
      .eq("mentor_id", user.id);

    setDeletingBatchId(null);

    if (error) {
      alert("Unable to delete batch: " + error.message);
      return;
    }

    await fetchDashboardData();
    await fetchMeetings();
    alert("Batch deleted successfully.");
  };

  const removeStudentFromBatch = async (student: AssignedStudent) => {
    const confirmed = window.confirm(
      `Remove ${student.name} from ${student.batchName}?`,
    );

    if (!confirmed) return;

    setRemovingAssignmentId(student.assignmentId);

    const { error } = await supabase
      .from("batch_students")
      .delete()
      .eq("id", student.assignmentId);

    setRemovingAssignmentId(null);

    if (error) {
      alert("Unable to remove student from batch: " + error.message);
      return;
    }

    await fetchDashboardData();
    alert("Student removed from batch.");
  };

  const handleScheduleMeeting = async (meetingData: any) => {
    if (!user) return;

    const { error } = await supabase.from("meetings").insert({
      title: meetingData.title || "Meeting",
      description: meetingData.description || meetingData.venue,
      mentor_id: user.id,
      student_id: meetingData.studentId,
      batch_id: meetingData.batchId || null,
      scheduled_at: new Date(`${meetingData.date}T${meetingData.time}`),
      status: "Scheduled",
    });

    if (error) {
      alert("Unable to schedule meeting: " + error.message);
      return;
    }

    alert("Meeting scheduled!");
    await fetchMeetings();
    setIsModalOpen(false);
  };

  const getStatusColor = (status: AssignedStudent["status"]) => {
    if (status === "Excellent") return "bg-primary/20 text-primary";
    if (status === "Needs Support") return "bg-destructive/20 text-destructive";
    return "bg-accent/20 text-accent";
  };

  const upcomingMeetings = meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.scheduled_at);
    return (
      !Number.isNaN(meetingDate.getTime()) &&
      meetingDate >= new Date() &&
      (meeting.status ?? "Scheduled") === "Scheduled"
    );
  });

  const batchesWithCounts = useMemo(() => {
    return batches.map((batch) => ({
      ...batch,
      assignedStudents: students.filter((student) => student.batchId === batch.id).length,
    }));
  }, [batches, students]);

  const studentsForMeeting = useMemo(() => {
    const uniqueStudents = new Map<
      string,
      { id: string; name: string; prn: string }
    >();

    for (const student of students) {
      if (!uniqueStudents.has(student.id)) {
        uniqueStudents.set(student.id, {
          id: student.id,
          name: student.name,
          prn: student.prn,
        });
      }
    }

    return Array.from(uniqueStudents.values());
  }, [students]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
            MM
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Mentor Mentee Hub
            </p>
            <h2 className="text-3xl font-bold">Mentor Dashboard</h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={createBatch}>Create Batch</Button>

          <Button onClick={() => setIsModalOpen(true)} disabled={studentsForMeeting.length === 0}>
            <Plus className="w-4 h-4" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">My Batches</h3>
          <p className="text-sm text-muted-foreground">
            Delete a batch to remove its student assignments.
          </p>
        </div>

        {dataLoading ? (
          <p>Loading...</p>
        ) : batchesWithCounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches created yet.</p>
        ) : (
          <div className="space-y-3">
            {batchesWithCounts.map((batch) => (
              <div
                key={batch.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{batch.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {batch.department || "Assigned batch"} • {batch.assignedStudents} students
                  </p>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteBatch(batch)}
                  disabled={deletingBatchId === batch.id}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deletingBatchId === batch.id ? "Deleting..." : "Delete Batch"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">Students</h3>
          <p className="text-sm text-muted-foreground">
            Remove a student to delete only that batch assignment.
          </p>
        </div>

        {dataLoading ? (
          <p>Loading...</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students assigned to your batches.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>PRN</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {students.map((student) => (
                <TableRow key={student.assignmentId}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email || "N/A"}</TableCell>
                  <TableCell>{student.prn}</TableCell>
                  <TableCell>{student.batchName}</TableCell>
                  <TableCell>{student.cgpa}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(student.status)}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeStudentFromBatch(student)}
                      disabled={removingAssignmentId === student.assignmentId}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {removingAssignmentId === student.assignmentId
                        ? "Removing..."
                        : "Remove"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 text-lg font-semibold">Upcoming Meetings</h3>

        {upcomingMeetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming meetings scheduled.
          </p>
        ) : (
          upcomingMeetings.map((meeting) => (
            <div key={meeting.id} className="mb-2 rounded border p-2">
              <p className="font-semibold">{meeting.title}</p>
              <p className="text-sm">{meeting.description}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(meeting.scheduled_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </Card>

      <ScheduleMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSchedule={handleScheduleMeeting}
        students={studentsForMeeting}
        batches={batches}
      />
    </div>
  );
}
