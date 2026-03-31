'use client'

import { useState } from 'react'
import { Plus, Search, Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface Batch {
  name: string
  className: string
  studentCount: number
}

interface Mentor {
  id: string
  name: string
  email: string
  department: string
  batches: Batch[]
  totalStudents: number
}

const initialMentors: Mentor[] = [
  {
    id: '1',
    name: 'Prof. Anita Singh',
    email: 'anita.singh@university.edu',
    department: 'Computer Science',
    batches: [
      { name: 'Batch A', className: 'B.Tech CS-A', studentCount: 8 },
      { name: 'Batch B', className: 'B.Tech CS-B', studentCount: 6 },
    ],
    totalStudents: 14,
  },
  {
    id: '2',
    name: 'Dr. Rahul Verma',
    email: 'rahul.verma@university.edu',
    department: 'Computer Science',
    batches: [
      { name: 'Batch C', className: 'B.Tech CS-A', studentCount: 10 },
    ],
    totalStudents: 10,
  },
  {
    id: '3',
    name: 'Prof. Neha Gupta',
    email: 'neha.gupta@university.edu',
    department: 'Computer Science',
    batches: [
      { name: 'Batch D', className: 'M.Tech CS', studentCount: 5 },
      { name: 'Batch E', className: 'B.Tech CS-B', studentCount: 7 },
    ],
    totalStudents: 12,
  },
  {
    id: '4',
    name: 'Dr. Vikash Sharma',
    email: 'vikash.sharma@university.edu',
    department: 'Computer Science',
    batches: [],
    totalStudents: 0,
  },
]

export default function MentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>(initialMentors)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddMentorOpen, setIsAddMentorOpen] = useState(false)
  const [newMentor, setNewMentor] = useState({
    name: '',
    email: '',
    department: 'Computer Science',
  })

  const filteredMentors = mentors.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddMentor = () => {
    if (newMentor.name && newMentor.email) {
      const mentor: Mentor = {
        id: (mentors.length + 1).toString(),
        name: newMentor.name,
        email: newMentor.email,
        department: newMentor.department,
        batches: [],
        totalStudents: 0,
      }
      setMentors([...mentors, mentor])
      setNewMentor({ name: '', email: '', department: 'Computer Science' })
      setIsAddMentorOpen(false)
    }
  }

  const totalMentors = mentors.length
  const totalBatches = mentors.reduce((acc, m) => acc + m.batches.length, 0)
  const totalStudents = mentors.reduce((acc, m) => acc + m.totalStudents, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mentors</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage mentors and view their assignments</p>
        </div>
        <Dialog open={isAddMentorOpen} onOpenChange={setIsAddMentorOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <UserPlus className="w-4 h-4" />
              Add Mentor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Mentor</DialogTitle>
              <DialogDescription>Add a new mentor to the department</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="mentorName">Name</Label>
                <Input
                  id="mentorName"
                  placeholder="Full name"
                  value={newMentor.name}
                  onChange={(e) => setNewMentor({ ...newMentor, name: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mentorEmail">Email</Label>
                <Input
                  id="mentorEmail"
                  type="email"
                  placeholder="mentor@university.edu"
                  value={newMentor.email}
                  onChange={(e) => setNewMentor({ ...newMentor, email: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mentorDept">Department</Label>
                <Input
                  id="mentorDept"
                  placeholder="Department"
                  value={newMentor.department}
                  onChange={(e) => setNewMentor({ ...newMentor, department: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAddMentorOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleAddMentor} 
                  disabled={!newMentor.name || !newMentor.email}
                >
                  Add Mentor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-border bg-card">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Total Mentors</p>
            <h3 className="text-3xl font-bold text-foreground">{totalMentors}</h3>
          </div>
        </Card>
        <Card className="p-6 border-border bg-card">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Total Batches</p>
            <h3 className="text-3xl font-bold text-primary">{totalBatches}</h3>
          </div>
        </Card>
        <Card className="p-6 border-border bg-card">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Total Students</p>
            <h3 className="text-3xl font-bold text-accent">{totalStudents}</h3>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search mentors by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
      </div>

      {/* Mentors List */}
      <div className="space-y-4">
        {filteredMentors.map((mentor) => (
          <Card key={mentor.id} className="border-border overflow-hidden">
            <Accordion type="single" collapsible>
              <AccordionItem value={mentor.id} className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-secondary/30">
                  <div className="flex items-center gap-4 text-left flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{mentor.name}</h3>
                      <p className="text-sm text-muted-foreground">{mentor.email}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <Badge variant="outline" className="gap-1">
                        {mentor.batches.length} Batches
                      </Badge>
                      <Badge className="bg-primary/20 text-primary gap-1">
                        {mentor.totalStudents} Students
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  {mentor.batches.length > 0 ? (
                    <div className="space-y-3 mt-2">
                      <h4 className="font-medium text-foreground text-sm">Assigned Batches</h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border">
                            <TableHead className="text-foreground">Batch Name</TableHead>
                            <TableHead className="text-foreground">Class</TableHead>
                            <TableHead className="text-center text-foreground">Students</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mentor.batches.map((batch, idx) => (
                            <TableRow key={idx} className="border-border">
                              <TableCell className="font-medium">{batch.name}</TableCell>
                              <TableCell className="text-muted-foreground">{batch.className}</TableCell>
                              <TableCell className="text-center">{batch.studentCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No batches assigned yet
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        ))}
      </div>
    </div>
  )
}
