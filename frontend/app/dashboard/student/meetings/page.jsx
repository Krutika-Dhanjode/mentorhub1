'use client';
import { toast } from 'sonner';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, User, Layers3, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

export default function StudentMeetingsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [meetings, setMeetings] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const [reasonMeeting, setReasonMeeting] = useState(null);
    const [absentReason, setAbsentReason] = useState('');
    const [savingReason, setSavingReason] = useState(false);
    const [reasonFile, setReasonFile] = useState(null);

    useEffect(() => {
        const fetchMeetings = async () => {
            if (!user)
                return;
            setDataLoading(true);

            const { data: myAssignments, error: myAssignmentsError } = await supabase
                .from('batch_students')
                .select('batch_id')
                .eq('student_id', user.id);
            if (myAssignmentsError) {
                console.error('Error fetching student batches:', myAssignmentsError.message);
                setMeetings([]);
                setDataLoading(false);
                return;
            }

            const batchIds = Array.from(new Set((myAssignments || []).map((entry) => entry.batch_id).filter(Boolean)));
            if (batchIds.length === 0) {
                setMeetings([]);
                setDataLoading(false);
                return;
            }

            const { data: batchData } = await supabase
                .from('batches')
                .select('id, name')
                .in('id', batchIds);

            const { data: meetingData, error: meetingError } = await supabase
                .from('meetings')
                .select('id, title, description, scheduled_at, status, mentor_id, batch_id')
                .in('batch_id', batchIds)
                .order('scheduled_at', { ascending: true });
            if (meetingError) {
                console.error('Error fetching meetings:', meetingError.message);
                setMeetings([]);
                setDataLoading(false);
                return;
            }

            const { data: attendanceData } = await supabase
                .from('meeting_attendance')
                .select('meeting_id, present, absent_reason, absent_reason_status, absent_reason_file_url, absent_reason_file_name')
                .eq('student_id', user.id);

            const attendanceByMeetingId = new Map((attendanceData || []).map((row) => [
                row.meeting_id,
                {
                    present: Boolean(row.present),
                    absentReason: row.absent_reason || '',
                    absentReasonStatus: row.absent_reason_status || 'pending',
                    absentReasonFileUrl: row.absent_reason_file_url || '',
                    absentReasonFileName: row.absent_reason_file_name || '',
                },
            ]));

            const mentorIds = Array.from(new Set((meetingData || []).map((meeting) => meeting.mentor_id).filter(Boolean)));
            const { data: mentorData } = mentorIds.length > 0
                ? await supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', mentorIds)
                : { data: [] };

            const mentorMap = new Map((mentorData || []).map((mentor) => [mentor.id, mentor]));
            const batchMap = new Map((batchData || []).map((batch) => [batch.id, batch.name]));

            const formattedMeetings = (meetingData || []).map((meeting) => {
                const attendance = attendanceByMeetingId.get(meeting.id);
                return {
                    id: meeting.id,
                    title: meeting.title || 'Mentorship Meeting',
                    description: meeting.description || 'No description provided',
                    scheduledAt: meeting.scheduled_at,
                    status: meeting.status || 'Scheduled',
                    mentorId: meeting.mentor_id || null,
                    mentorName: mentorMap.get(meeting.mentor_id)?.name || 'Unknown Mentor',
                    mentorEmail: mentorMap.get(meeting.mentor_id)?.email || '',
                    batchName: batchMap.get(meeting.batch_id) || 'Unknown Batch',
                    attendancePresent: attendance ? attendance.present : null,
                    absentReason: attendance ? attendance.absentReason : '',
                    absentReasonStatus: attendance ? attendance.absentReasonStatus : 'pending',
                    absentReasonFileUrl: attendance ? attendance.absentReasonFileUrl : '',
                    absentReasonFileName: attendance ? attendance.absentReasonFileName : '',
                };
            });

            setMeetings(formattedMeetings);
            setDataLoading(false);
        };

        if (!loading && user) {
            fetchMeetings();
        }
    }, [loading, user]);

    const upcomingMeetings = useMemo(() => meetings.filter((meeting) => {
        const scheduledDate = new Date(meeting.scheduledAt);
        return !Number.isNaN(scheduledDate.getTime()) && scheduledDate >= new Date();
    }), [meetings]);

    const pastMeetings = useMemo(() => meetings.filter((meeting) => {
        const scheduledDate = new Date(meeting.scheduledAt);
        return Number.isNaN(scheduledDate.getTime()) || scheduledDate < new Date();
    }), [meetings]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Scheduled':
                return 'bg-primary/20 text-primary';
            case 'In Progress':
                return 'bg-blue-500/20 text-blue-500';
            case 'Completed':
                return 'bg-accent/20 text-accent';
            case 'Cancelled':
                return 'bg-destructive/20 text-destructive';
            default:
                return 'bg-secondary text-foreground';
        }
    };

    const getAttendanceBadge = (attendancePresent) => {
        if (attendancePresent === true) {
            return { label: 'Attended', className: 'bg-green-500/20 text-green-600' };
        }
        if (attendancePresent === false) {
            return { label: 'Missed', className: 'bg-red-500/20 text-red-600' };
        }
        return { label: 'Attendance Pending', className: 'bg-yellow-500/20 text-yellow-700' };
    };

    const getReasonStatusBadge = (status) => {
        if (status === 'accepted') {
            return { label: 'Reason Accepted', className: 'bg-green-500/20 text-green-700' };
        }
        if (status === 'rejected') {
            return { label: 'Reason Rejected', className: 'bg-red-500/20 text-red-700' };
        }
        return { label: 'Reason Pending', className: 'bg-yellow-500/20 text-yellow-700' };
    };

    const openReasonDialog = (meeting) => {
        setReasonMeeting(meeting);
        setAbsentReason(meeting.absentReason || '');
        setReasonFile(null);
        setReasonDialogOpen(true);
    };

    const submitAbsentReason = async () => {
        if (!user || !reasonMeeting)
            return;
        const trimmedReason = absentReason.trim();
        if (!trimmedReason) {
            toast.error('Please enter a reason before submitting.');
            return;
        }

        setSavingReason(true);
        let reasonFileUrl = reasonMeeting.absentReasonFileUrl || '';
        let reasonFileName = reasonMeeting.absentReasonFileName || '';
        if (reasonFile) {
            const sanitizedFileName = reasonFile.name.replace(/\s+/g, '-');
            const reasonPath = `absence-reasons/${user.id}/${reasonMeeting.id}-${Date.now()}-${sanitizedFileName}`;
            const { error: uploadError } = await supabase
                .storage
                .from('student-progress')
                .upload(reasonPath, reasonFile, { upsert: false });
            if (uploadError) {
                setSavingReason(false);
                toast.error('Unable to upload file: ' + uploadError.message);
                return;
            }
            const { data: publicUrlData } = supabase
                .storage
                .from('student-progress')
                .getPublicUrl(reasonPath);
            reasonFileUrl = publicUrlData.publicUrl;
            reasonFileName = reasonFile.name;
        }
        const payload = {
            meeting_id: reasonMeeting.id,
            student_id: user.id,
            mentor_id: reasonMeeting.mentorId,
            present: false,
            absent_reason: trimmedReason,
            absent_reason_status: 'pending',
            absent_reason_file_url: reasonFileUrl || null,
            absent_reason_file_name: reasonFileName || null,
            marked_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('meeting_attendance')
            .upsert(payload, { onConflict: 'meeting_id,student_id' });

        setSavingReason(false);
        if (error) {
            toast.error('Unable to submit absent reason: ' + error.message);
            return;
        }

        setMeetings((current) => current.map((meeting) => meeting.id === reasonMeeting.id
            ? {
                ...meeting,
                absentReason: trimmedReason,
                absentReasonStatus: 'pending',
                absentReasonFileUrl: reasonFileUrl,
                absentReasonFileName: reasonFileName,
                attendancePresent: false
            }
            : meeting));

        setReasonDialogOpen(false);
        toast.success('Absent reason submitted to mentor.');
    };

    if (loading || dataLoading) {
        return <p className="text-sm text-muted-foreground">Loading meetings...</p>;
    }

    return (<div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See the meetings your mentor scheduled for the batches you belong to.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Meetings</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{meetings.length}</p>
        </Card>
        <Card className="border-border p-4">
          <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
          <p className="mt-1 text-2xl font-bold text-primary">{upcomingMeetings.length}</p>
        </Card>
        <Card className="border-border p-4">
          <p className="text-sm font-medium text-muted-foreground">Completed / Past</p>
          <p className="mt-1 text-2xl font-bold text-accent">{pastMeetings.length}</p>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Upcoming Meetings</h2>
        {upcomingMeetings.length === 0 ? (<Card className="border-border p-6">
            <p className="text-sm text-muted-foreground">
              No upcoming meetings are scheduled for your batches yet.
            </p>
          </Card>) : (<div className="space-y-3">
            {upcomingMeetings.map((meeting) => (<Card key={meeting.id} className="border-border p-2.5">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1.5">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{meeting.title}</h3>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4"/>
                        {meeting.mentorName}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Layers3 className="h-4 w-4"/>
                        {meeting.batchName}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4"/>
                        {new Date(meeting.scheduledAt).toLocaleDateString()}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4"/>
                        {new Date(meeting.scheduledAt).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="rounded-lg bg-secondary/40 p-2.5">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <FileText className="h-4 w-4"/>
                        Details Shared By Mentor
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{meeting.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={`${getStatusColor(meeting.status)} px-2 py-0.5 text-xs`}>{meeting.status}</Badge>
                    {meeting.status !== 'Cancelled' ? (
                      <>
                        <Badge className={`${getAttendanceBadge(meeting.attendancePresent).className} px-2 py-0.5 text-xs`}>
                          {getAttendanceBadge(meeting.attendancePresent).label}
                        </Badge>
                        {meeting.absentReason ? (
                          <Badge className={`${getReasonStatusBadge(meeting.absentReasonStatus).className} px-2 py-0.5 text-xs`}>
                            {getReasonStatusBadge(meeting.absentReasonStatus).label}
                          </Badge>
                        ) : null}
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => openReasonDialog(meeting)}>
                          Absent Reason
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>))}
          </div>)}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Past Meetings</h2>
        {pastMeetings.length === 0 ? (<Card className="border-border p-6">
            <p className="text-sm text-muted-foreground">No past meetings found for your batches.</p>
          </Card>) : (<div className="space-y-2.5">
            {pastMeetings.map((meeting) => (<Card key={meeting.id} className="border-border p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-foreground">{meeting.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {meeting.mentorName} - {meeting.batchName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(meeting.scheduledAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{meeting.description}</p>
                    {meeting.absentReason ? (
                      <p className="text-sm text-foreground">
                        <span className="font-medium">Your Reason:</span> {meeting.absentReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={`${getStatusColor(meeting.status)} px-2 py-0.5 text-xs`}>{meeting.status}</Badge>
                    {meeting.status !== 'Cancelled' ? (
                      <>
                        <Badge className={`${getAttendanceBadge(meeting.attendancePresent).className} px-2 py-0.5 text-xs`}>
                          {getAttendanceBadge(meeting.attendancePresent).label}
                        </Badge>
                        {meeting.absentReason ? (
                          <Badge className={`${getReasonStatusBadge(meeting.absentReasonStatus).className} px-2 py-0.5 text-xs`}>
                            {getReasonStatusBadge(meeting.absentReasonStatus).label}
                          </Badge>
                        ) : null}
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => openReasonDialog(meeting)}>
                          Absent Reason
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>))}
          </div>)}
      </div>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Absent Reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Write the reason for your absence. Mentor can accept or reject this reason.
            </p>
            <Textarea
              placeholder="Write your absence reason..."
              value={absentReason}
              onChange={(e) => setAbsentReason(e.target.value)}
              className="min-h-24"
            />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Upload Proof (optional)</p>
              <Input type="file" onChange={(e) => setReasonFile(e.target.files?.[0] || null)} />
              {reasonMeeting?.absentReasonFileUrl ? (
                <a
                  href={reasonMeeting.absentReasonFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Current file: {reasonMeeting.absentReasonFileName || 'Open attachment'}
                </a>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReasonDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitAbsentReason} disabled={savingReason || !absentReason.trim()}>
                {savingReason ? 'Saving...' : 'Submit Reason'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);
}
