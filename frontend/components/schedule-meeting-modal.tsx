'use client'

import { useState } from 'react'
import { X, Calendar, Clock, MapPin, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Student {
  id: string;
  name: string;
  prn: string;
}

interface Batch {
  id: string;
  name: string;
}

interface ScheduleMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (meetingData: {
    title: string
    studentName: string
    studentId: string
    batchId?: string
    date: string
    time: string
    venue: string
    description: string
    topics: string[]
  }) => void
  students: Student[]
  batches: Batch[]
}

export default function ScheduleMeetingModal({
  isOpen,
  onClose,
  onSchedule,
  students,
  batches
}: ScheduleMeetingModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    studentId: '',
    batchId: '',
    date: '',
    time: '',
    venue: '',
    description: '',
    topic: '',
  })

  const [topics, setTopics] = useState<string[]>([])

  const handleAddTopic = () => {
    if (formData.topic.trim() && !topics.includes(formData.topic)) {
      setTopics([...topics, formData.topic])
      setFormData({ ...formData, topic: '' })
    }
  }

  const handleRemoveTopic = (topicToRemove: string) => {
    setTopics(topics.filter((t) => t !== topicToRemove))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const selectedStudent = students.find(s => s.id === formData.studentId)
    if (!selectedStudent) {
      alert("Please select a student")
      return
    }

    if (!formData.title || !formData.date || !formData.time || !formData.venue) {
      alert("Please fill in all required fields")
      return
    }

    onSchedule({
      title: formData.title,
      studentName: selectedStudent.name,
      studentId: formData.studentId,
      batchId: formData.batchId || undefined,
      date: formData.date,
      time: formData.time,
      venue: formData.venue,
      description: formData.description || topics.join(', '),
      topics: topics.length > 0 ? topics : ['General Discussion'],
    })

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      title: '',
      studentId: '',
      batchId: '',
      date: '',
      time: '',
      venue: '',
      description: '',
      topic: '',
    })
    setTopics([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Schedule Meeting</h2>
          <button
            onClick={resetForm}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-foreground font-medium mb-2 block">
              Meeting Title
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter meeting title"
              className="border-border bg-background text-foreground focus:ring-primary"
            />
          </div>

          {/* Student Selection */}
          <div>
            <Label htmlFor="student" className="text-foreground font-medium mb-2 block">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Student
              </div>
            </Label>
            <select
              id="student"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a student...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.prn})
                </option>
              ))}
            </select>
          </div>

          {/* Batch Selection (Optional) */}
          <div>
            <Label htmlFor="batch" className="text-foreground font-medium mb-2 block">
              Select Batch (Optional)
            </Label>
            <select
              id="batch"
              value={formData.batchId}
              onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a batch...</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-foreground font-medium mb-2 block">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </div>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="border-border bg-background text-foreground focus:ring-primary"
              />
            </div>

            <div>
              <Label htmlFor="time" className="text-foreground font-medium mb-2 block">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time
                </div>
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="border-border bg-background text-foreground focus:ring-primary"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <Label htmlFor="venue" className="text-foreground font-medium mb-2 block">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Meeting Venue
              </div>
            </Label>
            <select
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select venue...</option>
              <option value="Room 101">Room 101</option>
              <option value="Room 205">Room 205</option>
              <option value="Room 301">Room 301</option>
              <option value="Lab 1">Lab 1</option>
              <option value="Online (Teams)">Online (Teams)</option>
              <option value="Online (Zoom)">Online (Zoom)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-foreground font-medium mb-2 block">
              Meeting Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter meeting description or agenda"
              className="border-border bg-background text-foreground focus:ring-primary min-h-[80px]"
            />
          </div>

          {/* Topics */}
          <div>
            <Label htmlFor="topic" className="text-foreground font-medium mb-2 block">
              Discussion Topics
            </Label>
            <div className="flex gap-2 mb-3">
              <Input
                id="topic"
                placeholder="Add a topic (e.g., Academic Progress)"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTopic()
                  }
                }}
                className="border-border bg-background text-foreground focus:ring-primary"
              />
              <Button
                type="button"
                onClick={handleAddTopic}
                className="bg-secondary hover:bg-secondary/90 text-foreground"
              >
                Add
              </Button>
            </div>

            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <div
                    key={topic}
                    className="bg-primary/20 text-primary px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(topic)}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-muted hover:bg-muted/90 text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title || !formData.studentId || !formData.date || !formData.time || !formData.venue}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              Schedule Meeting
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
