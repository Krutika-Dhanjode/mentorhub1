'use client'

import { useState } from 'react'
import { Search, Users, ChevronDown, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Student {
  id: string
  name: string
  prn: string
  email: string
  cgpa: number
  status: 'Good Standing' | 'At Risk' | 'Excellent'
  batch: string
}

interface Mentor {
  id: string
  name: string
  email: string
  students: Student[]
}

const mentorsWithStudents: Mentor[] = [
  {
    id: '1',
    name: 'Prof. Anita Singh',
    email: 'anita.singh@university.edu',
    students: [
      { id: '1', name: 'Aarav Patel', prn: 'CS001', email: 'aarav.patel@college.edu', cgpa: 8.5, status: 'Good Standing', batch: 'Batch A' },
      { id: '2', name: 'Priya Sharma', prn: 'CS002', email: 'priya.sharma@college.edu', cgpa: 9.2, status: 'Excellent', batch: 'Batch A' },
      { id: '3', name: 'Rohan Kumar', prn: 'CS003', email: 'rohan.kumar@college.edu', cgpa: 7.1, status: 'Good Standing', batch: 'Batch B' },
    ],
  },
  {
    id: '2',
    name: 'Dr. Rahul Verma',
    email: 'rahul.verma@university.edu',
    students: [
      { id: '4', name: 'Anaya Singh', prn: 'CS004', email: 'anaya.singh@college.edu', cgpa: 6.8, status: 'At Risk', batch: 'Batch C' },
      { id: '5', name: 'Vikram Desai', prn: 'CS005', email: 'vikram.desai@college.edu', cgpa: 8.9, status: 'Excellent', batch: 'Batch C' },
    ],
  },
  {
    id: '3',
    name: 'Prof. Neha Gupta',
    email: 'neha.gupta@university.edu',
    students: [
      { id: '6', name: 'Kavya Reddy', prn: 'CS006', email: 'kavya.reddy@college.edu', cgpa: 7.8, status: 'Good Standing', batch: 'Batch D' },
      { id: '7', name: 'Arjun Nair', prn: 'CS007', email: 'arjun.nair@college.edu', cgpa: 9.0, status: 'Excellent', batch: 'Batch D' },
      { id: '8', name: 'Sneha Joshi', prn: 'CS008', email: 'sneha.joshi@college.edu', cgpa: 6.5, status: 'At Risk', batch: 'Batch E' },
      { id: '9', name: 'Rahul Pandey', prn: 'CS009', email: 'rahul.pandey@college.edu', cgpa: 8.2, status: 'Good Standing', batch: 'Batch E' },
    ],
  },
]

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedMentors, setExpandedMentors] = useState<string[]>(['1', '2', '3'])

  const toggleMentor = (mentorId: string) => {
    setExpandedMentors((prev) =>
      prev.includes(mentorId)
        ? prev.filter((id) => id !== mentorId)
        : [...prev, mentorId]
    )
  }

  const getStatusColor = (status: Student['status']) => {
    switch (status) {
      case 'Excellent':
        return 'bg-primary/20 text-primary'
      case 'Good Standing':
        return 'bg-accent/20 text-accent'
      case 'At Risk':
        return 'bg-destructive/20 text-destructive'
    }
  }

  const filteredMentors = mentorsWithStudents.map((mentor) => ({
    ...mentor,
    students: mentor.students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.prn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((m) => m.students.length > 0 || !searchTerm)

  const totalStudents = mentorsWithStudents.reduce((acc, m) => acc + m.students.length, 0)
  const excellentStudents = mentorsWithStudents.reduce(
    (acc, m) => acc + m.students.filter((s) => s.status === 'Excellent').length,
    0
  )
  const atRiskStudents = mentorsWithStudents.reduce(
    (acc, m) => acc + m.students.filter((s) => s.status === 'At Risk').length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Students</h1>
        <p className="text-muted-foreground text-sm mt-1">View all students organized by their mentors</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-border bg-card">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Total Students</p>
            <h3 className="text-3xl font-bold text-foreground">{totalStudents}</h3>
          </div>
        </Card>
        <Card className="p-6 border-border bg-card">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Excellent Performers</p>
            <h3 className="text-3xl font-bold text-primary">{excellentStudents}</h3>
          </div>
        </Card>
        <Card className="p-6 border-border bg-card">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">At Risk</p>
            <h3 className="text-3xl font-bold text-destructive">{atRiskStudents}</h3>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, PRN, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
      </div>

      {/* Students by Mentor */}
      <div className="space-y-4">
        {filteredMentors.map((mentor) => (
          <Card key={mentor.id} className="border-border overflow-hidden">
            <Collapsible
              open={expandedMentors.includes(mentor.id)}
              onOpenChange={() => toggleMentor(mentor.id)}
            >
              <CollapsibleTrigger className="w-full px-6 py-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                {expandedMentors.includes(mentor.id) ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-foreground">{mentor.name}</h3>
                  <p className="text-sm text-muted-foreground">{mentor.email}</p>
                </div>
                <Badge className="bg-primary/20 text-primary">
                  {mentor.students.length} Students
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-foreground font-semibold">Name</TableHead>
                        <TableHead className="text-foreground font-semibold">PRN</TableHead>
                        <TableHead className="text-foreground font-semibold">Email</TableHead>
                        <TableHead className="text-foreground font-semibold">Batch</TableHead>
                        <TableHead className="text-center text-foreground font-semibold">CGPA</TableHead>
                        <TableHead className="text-foreground font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mentor.students.map((student) => (
                        <TableRow key={student.id} className="border-border hover:bg-secondary/30 transition-colors">
                          <TableCell className="font-medium text-foreground">{student.name}</TableCell>
                          <TableCell className="text-muted-foreground">{student.prn}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{student.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{student.batch}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-foreground">{student.cgpa}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(student.status)}>{student.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  )
}
