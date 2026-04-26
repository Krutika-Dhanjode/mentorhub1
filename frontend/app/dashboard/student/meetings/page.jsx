'use client';
import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, User, Layers3, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
export default function StudentMeetingsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [meetings, setMeetings] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
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
            const meetingIds = Array.from(new Set((meetingData || []).map((meeting) => meeting.id).filter(Boolean)));
            const { data: attendanceData } = meetingIds.length > 0
                ? await supabase
                    .from('meeting_attendance')
                    .select('meeting_id, present')
                    .eq('student_id', user.id)
                    .in('meeting_id', meetingIds)
                : { data: [] };
            const attendanceByMeetingId = new Map((attendanceData || []).map((row) => [row.meeting_id, Boolean(row.present)]));
            const mentorIds = Array.from(new Set((meetingData || []).map((meeting) => meeting.mentor_id).filter(Boolean)));
            const { data: mentorData } = mentorIds.length > 0
                ? await supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', mentorIds)
                : { data: [] };
            const mentorMap = new Map((mentorData || []).map((mentor) => [mentor.id, mentor]));
            const batchMap = new Map((batchData || []).map((batch) => [batch.id, batch.name]));
            const formattedMeetings = (meetingData || []).map((meeting) => ({
                id: meeting.id,
                title: meeting.title,
                description: meeting.description || 'No description provided',
                scheduledAt: meeting.scheduled_at,
                status: meeting.status || 'Scheduled',
                mentorName: mentorMap.get(meeting.mentor_id)?.name || 'Unknown Mentor',
                mentorEmail: mentorMap.get(meeting.mentor_id)?.email || '',
                batchName: batchMap.get(meeting.batch_id) || 'Unknown Batch',
                attendancePresent: attendanceByMeetingId.has(meeting.id) ? attendanceByMeetingId.get(meeting.id) : null,
            }));
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
        <Card className="border-border p-6">
          <p className="text-sm font-medium text-muted-foreground">Total Meetings</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{meetings.length}</p>
        </Card>
        <Card className="border-border p-6">
          <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
          <p className="mt-2 text-3xl font-bold text-primary">{upcomingMeetings.length}</p>
        </Card>
        <Card className="border-border p-6">
          <p className="text-sm font-medium text-muted-foreground">Completed / Past</p>
          <p className="mt-2 text-3xl font-bold text-accent">{pastMeetings.length}</p>
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
                    <Badge className={`${getAttendanceBadge(meeting.attendancePresent).className} px-2 py-0.5 text-xs`}>
                      {getAttendanceBadge(meeting.attendancePresent).label}
                    </Badge>
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
                      {meeting.mentorName} • {meeting.batchName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(meeting.scheduledAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{meeting.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={`${getStatusColor(meeting.status)} px-2 py-0.5 text-xs`}>{meeting.status}</Badge>
                    <Badge className={`${getAttendanceBadge(meeting.attendancePresent).className} px-2 py-0.5 text-xs`}>
                      {getAttendanceBadge(meeting.attendancePresent).label}
                    </Badge>
                  </div>
                </div>
              </Card>))}
          </div>)}
      </div>
    </div>);
}
