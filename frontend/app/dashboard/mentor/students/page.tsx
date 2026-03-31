'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, UserPlus, FolderPlus, ChevronRight } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface Student {
  id: string
  userId: string
  name: string
  prn: string
  email: string
  batch: string
  cgpa: number
  status: 'Good Standing' | 'At Risk' | 'Excellent'
}

interface Batch {
  id: string
  name: string
  className: string
  studentCount: number
}

export default function MentorStudentsPage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false)
  
  // New student form
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    batch: '',
  })
  
  // New batch form
  const [newBatch, setNewBatch] = useState({
    name: '',
    className: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('id, name')
        .order('name', { ascending: true })

      if (batchError) {
        console.error('Error fetching batches:', batchError.message)
        return
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('batch_students')
        .select('id, batch_id, student_id, student_name')

      if (assignmentError) {
        console.error('Error fetching batch assignments:', assignmentError.message)
        return
      }

      const studentIds = Array.from(
        new Set((assignmentData || []).map((assignment: any) => assignment.student_id).filter(Boolean))
      )

      let usersById = new Map<string, any>()

      if (studentIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .in('id', studentIds)

        if (userError) {
          console.error('Error fetching users:', userError.message)
          return
        }

        usersById = new Map((userData || []).map((entry: any) => [entry.id, entry]))
      }

      const formattedBatches: Batch[] = (batchData || []).map((batch: any) => ({
        id: batch.id,
        name: batch.name,
        className: 'Batch',
        studentCount: (assignmentData || []).filter((assignment: any) => assignment.batch_id === batch.id).length,
      }))

      setBatches(formattedBatches)

      const batchNameById = new Map((batchData || []).map((batch: any) => [batch.id, batch.name]))

      const formattedStudents: Student[] = (assignmentData || []).map((assignment: any, index: number) => {
        const matchedUser = usersById.get(assignment.student_id)

        return {
          id: assignment.id || `${assignment.student_id}-${assignment.batch_id}`,
          userId: assignment.student_id,
          name: matchedUser?.name || assignment.student_name || 'Unknown',
          prn: `CS${String(index + 1).padStart(3, '0')}`,
          email: matchedUser?.email || '',
          batch: batchNameById.get(assignment.batch_id) || 'Unknown Batch',
          cgpa: 0,
          status: 'Good Standing',
        }
      })

      setStudents(formattedStudents)
    }

    if (!loading && user) fetchData()
  }, [loading, user])

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.prn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBatch = !selectedBatch || s.batch === selectedBatch
    return matchesSearch && matchesBatch
  })

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.batch) return

    const selectedBatch = batches.find((batch) => batch.name === newStudent.batch)
    if (!selectedBatch) {
      alert('Selected batch not found.')
      return
    }

    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .ilike('email', newStudent.email.trim())
      .eq('role', 'student')
      .maybeSingle()

    if (userError || !existingUser) {
      alert('Student must already exist in users before assigning to a batch.')
      return
    }

    const { data: existingAssignment, error: existingAssignmentError } = await supabase
      .from('batch_students')
      .select('id')
      .eq('batch_id', selectedBatch.id)
      .eq('student_id', existingUser.id)
      .maybeSingle()

    if (existingAssignmentError) {
      alert('Error checking batch assignment: ' + existingAssignmentError.message)
      return
    }

    if (existingAssignment) {
      alert('This student is already assigned to the selected batch.')
      setNewStudent({ name: '', email: '', batch: '' })
      setIsAddStudentOpen(false)
      return
    }

    const { error: batchStudentError } = await supabase
      .from('batch_students')
      .insert({
        batch_id: selectedBatch.id,
        student_id: existingUser.id,
        student_name: existingUser.name || newStudent.name,
      })

    if (batchStudentError) {
      alert('Error saving batch assignment: ' + batchStudentError.message)
      return
    }

    const student: Student = {
      id: `${existingUser.id}-${selectedBatch.id}`,
      name: existingUser.name || newStudent.name,
      prn: `CS${String(students.length + 1).padStart(3, '0')}`,
      email: existingUser.email || newStudent.email,
      batch: selectedBatch.name,
      cgpa: 0,
      status: 'Good Standing',
    }

    setStudents([...students, student])
    setBatches(batches.map((batch) =>
      batch.id === selectedBatch.id
        ? { ...batch, studentCount: batch.studentCount + 1 }
        : batch
    ))
    setNewStudent({ name: '', email: '', batch: '' })
    setIsAddStudentOpen(false)
    alert('Student added to batch successfully!')
  }

  const handleCreateBatch = async () => {
    if (!user) return

    if (!newBatch.name.trim() || !newBatch.className.trim()) {
      return
    }

    const { data, error } = await supabase
      .from('batches')
      .insert({
        name: newBatch.name.trim(),
        mentor_id: user.id,
      })
      .select('id, name')
      .single()

    if (error) {
      alert('Error creating batch: ' + error.message)
      return
    }

    const createdBatch: Batch = {
      id: data.id,
      name: data.name,
      className: newBatch.className.trim() || 'Batch',
      studentCount: 0,
    }

    setBatches((current) =>
      [...current, createdBatch].sort((a, b) => a.name.localeCompare(b.name))
    )
    setNewBatch({ name: '', className: '' })
    setIsCreateBatchOpen(false)
    alert('Batch created successfully!')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Students</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your assigned students and batches</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isCreateBatchOpen} onOpenChange={setIsCreateBatchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FolderPlus className="w-4 h-4" />
                Create Batch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Batch</DialogTitle>
                <DialogDescription>Create a new batch to organize your students</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="batchName">Batch Name</Label>
                  <Input
                    id="batchName"
                    placeholder="e.g., Batch C, Morning Group"
                    value={newBatch.name}
                    onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                    className="bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchClass">Class</Label>
                  <Input
                    id="batchClass"
                    placeholder="e.g., B.Tech CS-A, M.Tech IT"
                    value={newBatch.className}
                    onChange={(e) => setNewBatch({ ...newBatch, className: e.target.value })}
                    className="bg-card border-border"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsCreateBatchOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateBatch} disabled={!newBatch.name.trim() || !newBatch.className.trim()}>Create Batch</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <UserPlus className="w-4 h-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student to Batch</DialogTitle>
                <DialogDescription>Add a student to your mentorship group</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input
                    id="studentName"
                    placeholder="Full name"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentEmail">Email</Label>
                  <Input
                    id="studentEmail"
                    type="email"
                    placeholder="student@college.edu"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentBatch">Batch</Label>
                  <Select value={newStudent.batch} onValueChange={(value) => setNewStudent({ ...newStudent, batch: value })}>
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.name}>{batch.name} ({batch.className})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsAddStudentOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleAddStudent} 
                    disabled={!newStudent.name || !newStudent.email || !newStudent.batch}
                  >
                    Add Student
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Batches Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`p-4 border-border cursor-pointer transition-all hover:shadow-md ${!selectedBatch ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedBatch(null)}
        >
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold text-foreground">All Students</p>
              <p className="text-sm text-muted-foreground">{students.length} students</p>
            </div>
          </div>
        </Card>
        {batches.map((batch) => (
          <Card 
            key={batch.id}
            className={`p-4 border-border cursor-pointer transition-all hover:shadow-md ${selectedBatch === batch.name ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedBatch(batch.name)}
          >
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-accent" />
              <div>
                <p className="font-semibold text-foreground">{batch.name}</p>
                <p className="text-xs text-muted-foreground">{batch.className}</p>
                <p className="text-sm text-muted-foreground">{batch.studentCount} students</p>
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
            placeholder="Search by name, PRN, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
      </div>

      {/* Students Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground font-semibold">Name</TableHead>
                <TableHead className="text-foreground font-semibold">PRN</TableHead>
                <TableHead className="text-foreground font-semibold">Email</TableHead>
                <TableHead className="text-foreground font-semibold">Batch</TableHead>
                <TableHead className="text-center text-foreground font-semibold">CGPA</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-border hover:bg-secondary/30 transition-colors cursor-pointer group">
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/dashboard/mentor/students/${student.userId}`} className="hover:text-primary transition-colors">
                      {student.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{student.prn}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{student.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.batch}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold text-foreground">{student.cgpa || '-'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(student.status)}>{student.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/mentor/students/${student.userId}`}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </Button>
                    </Link>
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
