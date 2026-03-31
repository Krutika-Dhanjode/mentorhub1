'use client'

import { Calendar, Clock, Users, Video, MapPin, Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Meeting {
  id: string
  title: string
  mentor: string
  students: number
  date: string
  time: string
  type: 'Online' | 'In-Person'
  status: 'Scheduled' | 'Completed' | 'Cancelled'
}

const meetings: Meeting[] = [
  {
    id: '1',
    title: 'Monthly Progress Review',
    mentor: 'Dr. Sarah Johnson',
    students: 8,
    date: '2024-03-15',
    time: '10:00 AM',
    type: 'Online',
    status: 'Scheduled',
  },
  {
    id: '2',
    title: 'Career Guidance Session',
    mentor: 'Prof. Michael Chen',
    students: 6,
    date: '2024-03-14',
    time: '2:00 PM',
    type: 'In-Person',
    status: 'Completed',
  },
  {
    id: '3',
    title: 'Academic Planning',
    mentor: 'Dr. Emily Roberts',
    students: 7,
    date: '2024-03-16',
    time: '11:00 AM',
    type: 'Online',
    status: 'Scheduled',
  },
  {
    id: '4',
    title: 'Project Discussion',
    mentor: 'Prof. James Wilson',
    students: 5,
    date: '2024-03-13',
    time: '3:00 PM',
    type: 'In-Person',
    status: 'Cancelled',
  },
]

const stats = [
  { label: 'Total Meetings', value: '89', icon: <Calendar className="w-5 h-5" /> },
  { label: 'This Week', value: '12', icon: <Clock className="w-5 h-5" /> },
  { label: 'Completion Rate', value: '94%', icon: <Users className="w-5 h-5" /> },
]

export default function HODMeetingsPage() {
  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-primary/20 text-primary'
      case 'Completed':
        return 'bg-accent/20 text-accent'
      case 'Cancelled':
        return 'bg-destructive/20 text-destructive'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meetings Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor all mentor-student meetings</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-4 border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            className="pl-10 bg-input border-border"
          />
        </div>
        <Button variant="outline">Filter</Button>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {meetings.map((meeting) => (
          <Card key={meeting.id} className="p-4 border-border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{meeting.title}</h3>
                  <Badge className={getStatusColor(meeting.status)}>{meeting.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Mentor: {meeting.mentor}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {meeting.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {meeting.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {meeting.students} students
                  </span>
                  <span className="flex items-center gap-1">
                    {meeting.type === 'Online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    {meeting.type}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm">View Details</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
