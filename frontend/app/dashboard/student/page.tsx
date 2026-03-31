'use client'

import { useState, useEffect } from 'react'
import { Upload, BookOpen, TrendingUp, MessageSquare, Calendar, Plus, Download } from 'lucide-react'
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'

interface Meeting {
  id: string
  title: string
  description: string
  scheduled_at: string
  mentor_name: string
  batch_name?: string
  status: string
}

interface Batch {
  id: string
  name: string
  year: string
  department?: string
}

const cgpaData = [
  { semester: 'S1', cgpa: 7.8 },
  { semester: 'S2', cgpa: 8.1 },
  { semester: 'S3', cgpa: 8.3 },
  { semester: 'S4', cgpa: 8.5 },
  { semester: 'S5', cgpa: 8.7 },
  { semester: 'S6', cgpa: 8.9 },
]

export default function StudentDashboard() {
  const { user, loading } = useUser()
  const supabase = createClient()

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [studentData, setStudentData] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)

  // Fetch student profile and batches
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user) return

      // Get student profile
      const { data: student } = await supabase
        .from('students')
        .select(`
          *,
          users!inner(name, email)
        `)
        .eq('profile_id', user.id)
        .single()

      if (student) {
        setStudentData({
          ...student,
          name: student.users?.name || 'Unknown',
          email: student.users?.email || '',
        })

        // Get student's batches
        if (student.batch_id) {
          const { data: batchData } = await supabase
            .from('batches')
            .select('*')
            .eq('id', student.batch_id)

          setBatches(batchData || [])
        }
      }

      setDataLoading(false)
    }

    if (!loading && user) fetchStudentData()
  }, [loading, user])

  // Fetch meetings from student's batches
  useEffect(() => {
    const fetchMeetings = async () => {
      if (!user || batches.length === 0) return

      const batchIds = batches.map(b => b.id)

      const { data } = await supabase
        .from('meetings')
        .select(`
          *,
          users!mentor_id(name)
        `)
        .in('batch_id', batchIds)
        .order('scheduled_at', { ascending: false })

      const formattedMeetings = (data || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description || 'No description',
        scheduled_at: m.scheduled_at,
        mentor_name: m.users?.name || 'Unknown Mentor',
        batch_name: batches.find(b => b.id === m.batch_id)?.name,
        status: m.status || 'Scheduled'
      }))

      setMeetings(formattedMeetings)
    }

    fetchMeetings()
  }, [user, batches])

  // Subscribe to realtime updates for meetings
  useEffect(() => {
    if (!user || batches.length === 0) return

    const batchIds = batches.map(b => b.id)

    const meetingsSubscription = supabase
      .channel('student-meetings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `batch_id=in.(${batchIds.join(',')})`,
        },
        (payload) => {
          console.log('Meeting change:', payload)
          // Refresh meetings
          fetchMeetings()
        }
      )
      .subscribe()

    return () => {
      meetingsSubscription.unsubscribe()
    }
  }, [user, batches])

  const fetchMeetings = async () => {
    if (!user || batches.length === 0) return

    const batchIds = batches.map(b => b.id)

    const { data } = await supabase
      .from('meetings')
      .select(`
        *,
        users!mentor_id(name)
      `)
      .in('batch_id', batchIds)
      .order('scheduled_at', { ascending: false })

    const formattedMeetings = (data || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description || 'No description',
      scheduled_at: m.scheduled_at,
      mentor_name: m.users?.name || 'Unknown Mentor',
      batch_name: batches.find(b => b.id === m.batch_id)?.name,
      status: m.status || 'Scheduled'
    }))

    setMeetings(formattedMeetings)
  }

  const getQueryStatusColor = (status: string) => {
    return status === 'Answered' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'
  }

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Your Progress</h2>
          <p className="text-muted-foreground mt-1">Track your academic journey and mentorship</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
            <Plus className="w-4 h-4" />
            Ask Query
          </Button>
          <Button variant="outline" className="border-border bg-card hover:bg-secondary gap-2">
            <Upload className="w-4 h-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Profile Summary */}
      <Card className="p-6 border-border bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">Name</p>
            <p className="text-lg font-semibold text-foreground">{studentData?.name || 'Unknown'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">PRN</p>
            <p className="text-lg font-semibold text-foreground">{studentData?.prn || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">Current CGPA</p>
            <p className="text-lg font-semibold text-primary">{studentData?.cgpa || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">Batch</p>
            <p className="text-lg font-semibold text-foreground">
              {batches.length > 0 ? batches[0].name : 'Not Assigned'}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-border bg-card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">Meetings Attended</p>
              <h3 className="text-3xl font-bold text-foreground">{meetings.length}</h3>
              <p className="text-xs text-accent font-medium mt-2">From your batch</p>
            </div>
            <div className="text-accent opacity-20 p-3 rounded-lg bg-accent/10">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">Active Skills</p>
              <h3 className="text-3xl font-bold text-foreground">8</h3>
              <p className="text-xs text-primary font-medium mt-2">+2 this semester</p>
            </div>
            <div className="text-primary opacity-20 p-3 rounded-lg bg-primary/10">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">Queries Resolved</p>
              <h3 className="text-3xl font-bold text-foreground">15</h3>
              <p className="text-xs text-blue-500 font-medium mt-2">All answered</p>
            </div>
            <div className="text-blue-500 opacity-20 p-3 rounded-lg bg-blue-500/10">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* CGPA Progress Chart */}
      <Card className="p-6 border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">CGPA Progress</h3>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cgpaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" domain={[7, 10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: `1px solid var(--color-border)`,
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="cgpa"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-primary)', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent Meetings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Meetings</h3>
          <Button variant="outline" className="border-border bg-card hover:bg-secondary">
            View All
          </Button>
        </div>

        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-foreground font-semibold">Title</TableHead>
                  <TableHead className="text-foreground font-semibold">Mentor</TableHead>
                  <TableHead className="text-foreground font-semibold">Date & Time</TableHead>
                  <TableHead className="text-foreground font-semibold">Batch</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No meetings scheduled for your batch yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  meetings.map((meeting) => (
                    <TableRow key={meeting.id} className="border-border hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium text-foreground">{meeting.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{meeting.mentor_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(meeting.scheduled_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{meeting.batch_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {meeting.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* File Upload */}
      <Card className="p-8 border-2 border-dashed border-border bg-secondary/30 hover:border-primary/50 transition-colors duration-200">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-foreground">Upload Progress Files</p>
            <p className="text-sm text-muted-foreground">
              Drag and drop your certificates, projects, or documents here
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Browse Files
          </Button>
        </div>
      </Card>
    </div>
  )
}
