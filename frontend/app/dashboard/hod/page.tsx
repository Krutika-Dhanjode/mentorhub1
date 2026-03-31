'use client'

import { useState, useEffect } from 'react'
import { Users, Calendar, BookOpen, Plus, TrendingUp, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'

interface Meeting {
  id: string
  title: string
  description: string
  scheduled_at: string
  mentor_name: string
  student_name: string
  batch_name?: string
  status: string
}

interface Batch {
  id: string
  name: string
  year: string
  department?: string
  mentor_name?: string
  student_count: number
}

interface MentorStats {
  id: string
  name: string
  student_count: number
  meeting_count: number
  batch_count: number
}

export default function HodDashboard() {
  const { user, loading } = useUser()
  const supabase = createClient()

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [mentorStats, setMentorStats] = useState<MentorStats[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Fetch all meetings
  useEffect(() => {
    const fetchMeetings = async () => {
      const { data } = await supabase
        .from('meetings')
        .select(`
          *,
          users!mentor_id(name),
          students(
            users!profile_id(name)
          ),
          batches(name)
        `)
        .order('scheduled_at', { ascending: false })

      const formattedMeetings = (data || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description || 'No description',
        scheduled_at: m.scheduled_at,
        mentor_name: m.users?.name || 'Unknown Mentor',
        student_name: m.students?.users?.name || 'Unknown Student',
        batch_name: m.batches?.name,
        status: m.status || 'Scheduled'
      }))

      setMeetings(formattedMeetings)
    }

    if (!loading) fetchMeetings()
  }, [loading])

  // Fetch all batches
  useEffect(() => {
    const fetchBatches = async () => {
      const { data } = await supabase
        .from('batches')
        .select(`
          *,
          users!mentor_id(name)
        `)

      const formattedBatches = (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        year: b.year,
        department: b.department,
        mentor_name: b.users?.name,
        student_count: b.student_count || 0
      }))

      setBatches(formattedBatches)
    }

    if (!loading) fetchBatches()
  }, [loading])

  // Fetch mentor statistics
  useEffect(() => {
    const fetchMentorStats = async () => {
      // Get all mentors
      const { data: mentors } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'mentor')

      if (mentors) {
        const stats = await Promise.all(
          mentors.map(async (mentor) => {
            // Count students for this mentor
            const { count: studentCount } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('mentor_id', mentor.id)

            // Count meetings for this mentor
            const { count: meetingCount } = await supabase
              .from('meetings')
              .select('*', { count: 'exact', head: true })
              .eq('mentor_id', mentor.id)

            // Count batches for this mentor
            const { count: batchCount } = await supabase
              .from('batches')
              .select('*', { count: 'exact', head: true })
              .eq('mentor_id', mentor.id)

            return {
              id: mentor.id,
              name: mentor.name,
              student_count: studentCount || 0,
              meeting_count: meetingCount || 0,
              batch_count: batchCount || 0
            }
          })
        )

        setMentorStats(stats)
      }

      setDataLoading(false)
    }

    if (!loading) fetchMentorStats()
  }, [loading])

  // Subscribe to realtime updates
  useEffect(() => {
    const meetingsSubscription = supabase
      .channel('hod-meetings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
        },
        (payload) => {
          console.log('Meeting change:', payload)
          // Refresh meetings
          fetchMeetings()
        }
      )
      .subscribe()

    const batchesSubscription = supabase
      .channel('hod-batches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches',
        },
        (payload) => {
          console.log('Batch change:', payload)
          // Refresh batches
          fetchBatches()
        }
      )
      .subscribe()

    return () => {
      meetingsSubscription.unsubscribe()
      batchesSubscription.unsubscribe()
    }
  }, [])

  const fetchMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select(`
        *,
        users!mentor_id(name),
        students(
          users!profile_id(name)
        ),
        batches(name)
      `)
      .order('scheduled_at', { ascending: false })

    const formattedMeetings = (data || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description || 'No description',
      scheduled_at: m.scheduled_at,
      mentor_name: m.users?.name || 'Unknown Mentor',
      student_name: m.students?.users?.name || 'Unknown Student',
      batch_name: m.batches?.name,
      status: m.status || 'Scheduled'
    }))

    setMeetings(formattedMeetings)
  }

  const fetchBatches = async () => {
    const { data } = await supabase
      .from('batches')
      .select(`
        *,
        users!mentor_id(name)
      `)

    const formattedBatches = (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      year: b.year,
      department: b.department,
      mentor_name: b.users?.name,
      student_count: b.student_count || 0
    }))

    setBatches(formattedBatches)
  }

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading HOD dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">HOD Dashboard</h2>
          <p className="text-muted-foreground mt-1">Oversee all mentorship activities and batches</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            Create Batch
          </Button>
          <Button variant="outline" className="border-border bg-card hover:bg-secondary gap-2">
            <Users className="w-4 h-4" />
            Assign Mentors
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 border-border bg-card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">Total Meetings</p>
              <h3 className="text-3xl font-bold text-foreground">{meetings.length}</h3>
              <p className="text-xs text-accent font-medium mt-2">All scheduled</p>
            </div>
            <div className="text-accent opacity-20 p-3 rounded-lg bg-accent/10">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">Active Batches</p>
              <h3 className="text-3xl font-bold text-foreground">{batches.length}</h3>
              <p className="text-xs text-primary font-medium mt-2">Across departments</p>
            </div>
            <div className="text-primary opacity-20 p-3 rounded-lg bg-primary/10">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">Total Students</p>
              <h3 className="text-3xl font-bold text-foreground">
                {batches.reduce((sum, batch) => sum + batch.student_count, 0)}
              </h3>
              <p className="text-xs text-blue-500 font-medium mt-2">Under mentorship</p>
            </div>
            <div className="text-blue-500 opacity-20 p-3 rounded-lg bg-blue-500/10">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">Active Mentors</p>
              <h3 className="text-3xl font-bold text-foreground">{mentorStats.length}</h3>
              <p className="text-xs text-green-500 font-medium mt-2">Faculty members</p>
            </div>
            <div className="text-green-500 opacity-20 p-3 rounded-lg bg-green-500/10">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Mentor Performance */}
      <Card className="p-6 border-border">
        <h3 className="text-lg font-semibold mb-4">Mentor Performance Overview</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentor Name</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Meetings</TableHead>
                <TableHead>Batches</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentorStats.map((mentor) => (
                <TableRow key={mentor.id}>
                  <TableCell className="font-medium">{mentor.name}</TableCell>
                  <TableCell>{mentor.student_count}</TableCell>
                  <TableCell>{mentor.meeting_count}</TableCell>
                  <TableCell>{mentor.batch_count}</TableCell>
                  <TableCell>
                    <Badge variant={mentor.student_count > 0 ? "default" : "secondary"}>
                      {mentor.student_count > 0 ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* All Meetings */}
      <Card className="p-6 border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">All Meetings</h3>
          <Button variant="outline" className="border-border bg-card hover:bg-secondary">
            View All
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.slice(0, 10).map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell className="font-medium">{meeting.title}</TableCell>
                  <TableCell>{meeting.mentor_name}</TableCell>
                  <TableCell>{meeting.student_name}</TableCell>
                  <TableCell>{meeting.batch_name || 'N/A'}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(meeting.scheduled_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{meeting.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* All Batches */}
      <Card className="p-6 border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">All Batches</h3>
          <Button variant="outline" className="border-border bg-card hover:bg-secondary">
            Manage Batches
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Name</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.name}</TableCell>
                  <TableCell>{batch.year}</TableCell>
                  <TableCell>{batch.department || 'N/A'}</TableCell>
                  <TableCell>{batch.mentor_name || 'Unassigned'}</TableCell>
                  <TableCell>{batch.student_count}</TableCell>
                  <TableCell>
                    <Badge variant={batch.student_count > 0 ? "default" : "secondary"}>
                      {batch.student_count > 0 ? "Active" : "Empty"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}