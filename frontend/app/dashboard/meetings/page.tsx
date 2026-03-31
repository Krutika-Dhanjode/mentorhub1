'use client'

import { useState } from 'react'
import { Plus, Calendar, Clock, MapPin, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ScheduleMeetingModal from '@/components/schedule-meeting-modal'

interface Meeting {
  id: string
  participantName: string
  mentorName?: string
  date: string
  time: string
  venue: string
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  topics: string[]
}

const meetings: Meeting[] = [
  {
    id: '1',
    participantName: 'Aarav Patel',
    mentorName: 'Dr. Sarah Johnson',
    date: 'Mar 30, 2024',
    time: '10:00 AM',
    venue: 'Room 301',
    status: 'Scheduled',
    topics: ['Academic Progress', 'Career Planning'],
  },
  {
    id: '2',
    participantName: 'Priya Sharma',
    mentorName: 'Dr. Sarah Johnson',
    date: 'Mar 31, 2024',
    time: '2:00 PM',
    venue: 'Online (Teams)',
    status: 'Scheduled',
    topics: ['Project Review', 'Internship Opportunities'],
  },
  {
    id: '3',
    participantName: 'Rohan Kumar',
    mentorName: 'Prof. Michael Chen',
    date: 'Mar 25, 2024',
    time: '3:30 PM',
    venue: 'Room 205',
    status: 'Completed',
    topics: ['Course Selection', 'Study Tips'],
  },
  {
    id: '4',
    participantName: 'Anaya Singh',
    mentorName: 'Dr. Emily Roberts',
    date: 'Mar 20, 2024',
    time: '11:00 AM',
    venue: 'Room 101',
    status: 'Cancelled',
    topics: ['Academic Support'],
  },
  {
    id: '5',
    participantName: 'Vikram Desai',
    mentorName: 'Prof. Michael Chen',
    date: 'Apr 01, 2024',
    time: '9:00 AM',
    venue: 'Lab 1',
    status: 'Scheduled',
    topics: ['Practical Session', 'Debugging'],
  },
]

export default function MeetingsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [allMeetings, setAllMeetings] = useState(meetings)

  const handleScheduleMeeting = (meetingData: {
    studentName: string
    date: string
    time: string
    venue: string
    topics: string[]
  }) => {
    const newMeeting: Meeting = {
      id: (allMeetings.length + 1).toString(),
      participantName: meetingData.studentName,
      mentorName: 'Your Name',
      date: meetingData.date,
      time: meetingData.time,
      venue: meetingData.venue,
      status: 'Scheduled',
      topics: meetingData.topics,
    }
    setAllMeetings([newMeeting, ...allMeetings])
    setIsModalOpen(false)
  }

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

  const upcomingMeetings = allMeetings.filter((m) => m.status === 'Scheduled')
  const pastMeetings = allMeetings.filter((m) => m.status !== 'Scheduled')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meetings</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage mentorship meetings</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-border bg-card">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Total Meetings</p>
            <h3 className="text-3xl font-bold text-foreground">{allMeetings.length}</h3>
          </div>
        </Card>
        <Card className="p-6 border-border bg-card">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Upcoming</p>
            <h3 className="text-3xl font-bold text-primary">{upcomingMeetings.length}</h3>
          </div>
        </Card>
        <Card className="p-6 border-border bg-card">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Completed</p>
            <h3 className="text-3xl font-bold text-accent">{allMeetings.filter((m) => m.status === 'Completed').length}</h3>
          </div>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Upcoming Meetings</h2>
        <div className="space-y-4">
          {upcomingMeetings.map((meeting) => (
            <Card
              key={meeting.id}
              className="p-6 border-border hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{meeting.participantName}</h3>
                    <p className="text-sm text-muted-foreground">
                      with {meeting.mentorName || 'Mentor'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {meeting.date}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {meeting.time}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {meeting.venue}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {meeting.topics.map((topic, i) => (
                      <Badge key={i} className="bg-secondary text-foreground">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Badge className={getStatusColor(meeting.status)}>{meeting.status}</Badge>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Past Meetings */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Past Meetings</h2>
        <div className="space-y-3">
          {pastMeetings.map((meeting) => (
            <Card key={meeting.id} className="p-4 border-border hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{meeting.participantName}</h4>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {meeting.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {meeting.time}
                    </span>
                  </div>
                </div>
                <Badge className={getStatusColor(meeting.status)}>{meeting.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSchedule={handleScheduleMeeting}
      />
    </div>
  )
}
