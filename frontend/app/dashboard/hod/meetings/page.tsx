'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Clock, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'

interface HodMeeting {
  id: string
  title: string
  mentorName: string
  batchName: string
  scheduledAt: string
  status: string
  studentCount: number
  description: string
}

export default function HODMeetingsPage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const [meetings, setMeetings] = useState<HodMeeting[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchMeetings = async () => {
      if (!user) return

      setDataLoading(true)

      const { data: mentorLinks, error: mentorLinkError } = await supabase
        .from('mentors')
        .select('mentor_user_id')
        .eq('hod_id', user.id)

      if (mentorLinkError) {
        console.error('Error fetching HOD mentor mappings:', mentorLinkError.message)
        setMeetings([])
        setDataLoading(false)
        return
      }

      const mentorIds = (mentorLinks || []).map((link: any) => link.mentor_user_id)
      if (mentorIds.length === 0) {
        setMeetings([])
        setDataLoading(false)
        return
      }

      const { data: mentorData, error: mentorError } = await supabase
        .from('users')
        .select('id, name, full_name')
        .in('id', mentorIds)

      if (mentorError) {
        console.error('Error fetching HOD mentors:', mentorError.message)
        setMeetings([])
        setDataLoading(false)
        return
      }

      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('id, title, description, scheduled_at, status, mentor_id, batch_id')
        .in('mentor_id', mentorIds)
        .order('scheduled_at', { ascending: false })

      if (meetingError) {
        console.error('Error fetching meetings:', meetingError.message)
        setMeetings([])
        setDataLoading(false)
        return
      }

      const batchIds = Array.from(new Set((meetingData || []).map((meeting: any) => meeting.batch_id).filter(Boolean)))

      const { data: batchData } = batchIds.length > 0
        ? await supabase
            .from('batches')
            .select('id, name')
            .in('id', batchIds)
        : { data: [] }

      const { data: assignmentData } = batchIds.length > 0
        ? await supabase
            .from('batch_students')
            .select('batch_id, student_id')
            .in('batch_id', batchIds)
        : { data: [] }

      const mentorMap = new Map((mentorData || []).map((mentor: any) => [mentor.id, mentor.full_name || mentor.name || 'Unknown Mentor']))
      const batchMap = new Map((batchData || []).map((batch: any) => [batch.id, batch.name]))

      const formattedMeetings: HodMeeting[] = (meetingData || []).map((meeting: any) => ({
        id: meeting.id,
        title: meeting.title || 'Meeting',
        mentorName: mentorMap.get(meeting.mentor_id) || 'Unknown Mentor',
        batchName: batchMap.get(meeting.batch_id) || 'Unknown Batch',
        scheduledAt: meeting.scheduled_at,
        status: meeting.status || 'Scheduled',
        studentCount: (assignmentData || []).filter((assignment: any) => assignment.batch_id === meeting.batch_id).length,
        description: meeting.description || 'No description provided',
      }))

      setMeetings(formattedMeetings)
      setDataLoading(false)
    }

    if (!loading && user) {
      fetchMeetings()
    }
  }, [loading, user])

  const filteredMeetings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return meetings

    return meetings.filter((meeting) =>
      meeting.title.toLowerCase().includes(query) ||
      meeting.mentorName.toLowerCase().includes(query) ||
      meeting.batchName.toLowerCase().includes(query),
    )
  }, [meetings, searchTerm])

  const upcomingCount = meetings.filter((meeting) => {
    const date = new Date(meeting.scheduledAt)
    return !Number.isNaN(date.getTime()) && date >= new Date()
  }).length

  const completedCount = meetings.filter((meeting) => meeting.status === 'Completed').length

  const getStatusColor = (status: string) => {
    if (status === 'Completed') return 'bg-accent/20 text-accent'
    if (status === 'Cancelled') return 'bg-destructive/20 text-destructive'
    if (status === 'In Progress') return 'bg-blue-500/20 text-blue-500'
    return 'bg-primary/20 text-primary'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meetings Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track only the meetings conducted by mentors added by this HOD.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4 border-border">
          <p className="text-sm text-muted-foreground">Total Meetings</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{meetings.length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-sm text-muted-foreground">Upcoming Meetings</p>
          <p className="mt-2 text-3xl font-bold text-primary">{upcomingCount}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-sm text-muted-foreground">Completed Meetings</p>
          <p className="mt-2 text-3xl font-bold text-accent">{completedCount}</p>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search mentor meetings..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">Refresh</Button>
      </div>

      <div className="space-y-4">
        {dataLoading ? (
          <Card className="p-6 border-border">
            <p className="text-sm text-muted-foreground">Loading meetings...</p>
          </Card>
        ) : filteredMeetings.length === 0 ? (
          <Card className="p-6 border-border">
            <p className="text-sm text-muted-foreground">
              No meetings found for the mentors added by this HOD.
            </p>
          </Card>
        ) : (
          filteredMeetings.map((meeting) => (
            <Card key={meeting.id} className="p-4 border-border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{meeting.title}</h3>
                    <Badge className={getStatusColor(meeting.status)}>{meeting.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Mentor: {meeting.mentorName}</p>
                  <p className="text-sm text-muted-foreground">Batch: {meeting.batchName}</p>
                  <p className="text-sm text-muted-foreground">{meeting.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleDateString() : 'Date not set'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleTimeString() : 'Time not set'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.studentCount} students
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
