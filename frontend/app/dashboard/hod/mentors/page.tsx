'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Download, Plus, Search, Users, BookOpen, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

interface MentorSummary {
  id: string
  name: string
  email: string
  batchCount: number
  studentCount: number
  batches: Array<{
    id: string
    name: string
    students: Array<{
      id: string
      name: string
      prn: string
    }>
  }>
}

interface ReportStudentRow {
  batchName: string
  studentName: string
  prn: string
  marks: string
}

const escapePdfText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

const buildPdfBlob = (lines: string[]) => {
  const linesPerPage = 32
  const pages = []

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage))
  }

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  let objectIndex = 1

  const addObject = (content: string) => {
    offsets.push(pdf.length)
    pdf += `${objectIndex} 0 obj\n${content}\nendobj\n`
    objectIndex += 1
    return objectIndex - 1
  }

  const fontObject = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const pageObjectIds: number[] = []

  pages.forEach((pageLines) => {
    const streamLines = pageLines.map((line, lineIndex) => {
      const y = 780 - lineIndex * 22
      return `BT /F1 12 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`
    })

    const streamContent = streamLines.join('\n')
    const contentObject = addObject(
      `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`,
    )

    pageObjectIds.push(
      addObject(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`,
      ),
    )
  })

  const pagesObjectId = addObject(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`,
  )

  pdf = pdf.replace('/Parent 0 0 R', `/Parent ${pagesObjectId} 0 R`)

  const catalogObjectId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`)

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${offsets.length}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })

  pdf += `trailer\n<< /Size ${offsets.length} /Root ${catalogObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

export default function HODMentorsPage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const [mentors, setMentors] = useState<MentorSummary[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [selectedMentorId, setSelectedMentorId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [expandedMentorId, setExpandedMentorId] = useState<string | null>(null)
  const [newMentor, setNewMentor] = useState({
    name: '',
    email: '',
  })

  const fetchMentors = async () => {
    if (!user) return

    setDataLoading(true)

    const { data: mentorLinks, error: mentorLinkError } = await supabase
      .from('mentors')
      .select('mentor_user_id')
      .eq('hod_id', user.id)

    if (mentorLinkError) {
      console.error('Error fetching mentor mappings:', mentorLinkError.message)
      setMentors([])
      setDataLoading(false)
      return
    }

    const mentorIds = (mentorLinks || []).map((link: any) => link.mentor_user_id)

    if (mentorIds.length === 0) {
      setMentors([])
      setDataLoading(false)
      return
    }

    const { data: mentorData, error: mentorError } = await supabase
      .from('users')
      .select('id, name, full_name, email')
      .in('id', mentorIds)
      .eq('role', 'mentor')
      .order('name', { ascending: true })

    if (mentorError) {
      console.error('Error fetching mentors:', mentorError.message)
      setMentors([])
      setDataLoading(false)
      return
    }

    const { data: batchData } = mentorIds.length > 0
      ? await supabase
          .from('batches')
          .select('id, mentor_id, name')
          .in('mentor_id', mentorIds)
      : { data: [] }

    const batchIds = (batchData || []).map((batch: any) => batch.id)

    const { data: assignmentData } = batchIds.length > 0
      ? await supabase
          .from('batch_students')
          .select('batch_id, student_id, student_name')
          .in('batch_id', batchIds)
      : { data: [] }

    const studentIds = Array.from(
      new Set((assignmentData || []).map((assignment: any) => assignment.student_id).filter(Boolean)),
    )

    const { data: studentUsers } = studentIds.length > 0
      ? await supabase
          .from('users')
          .select('id, name, full_name, prn')
          .in('id', studentIds)
      : { data: [] }

    const studentMap = new Map((studentUsers || []).map((student: any) => [student.id, student]))

    const formattedMentors: MentorSummary[] = (mentorData || []).map((mentor: any) => {
      const mentorBatches = (batchData || []).filter((batch: any) => batch.mentor_id === mentor.id)
      const mentorBatchIds = mentorBatches.map((batch: any) => batch.id)
      const uniqueStudents = new Set(
        (assignmentData || [])
          .filter((assignment: any) => mentorBatchIds.includes(assignment.batch_id))
          .map((assignment: any) => assignment.student_id),
      )

      return {
        id: mentor.id,
        name: mentor.full_name || mentor.name || 'Unknown Mentor',
        email: mentor.email || '',
        batchCount: mentorBatches.length,
        studentCount: uniqueStudents.size,
        batches: mentorBatches.map((batch: any) => ({
          id: batch.id,
          name: batch.name,
          students: (assignmentData || [])
            .filter((assignment: any) => assignment.batch_id === batch.id)
            .map((assignment: any) => {
              const matchedStudent = studentMap.get(assignment.student_id)
              return {
                id: assignment.student_id,
                name: matchedStudent?.full_name || matchedStudent?.name || assignment.student_name || 'Unknown Student',
                prn: matchedStudent?.prn || 'N/A',
              }
            }),
        })),
      }
    })

    setMentors(formattedMentors)
    setDataLoading(false)
  }

  useEffect(() => {
    if (!loading && user) {
      fetchMentors()
    }
  }, [loading, user])

  const filteredMentors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return mentors

    return mentors.filter((mentor) =>
      mentor.name.toLowerCase().includes(query) ||
      mentor.email.toLowerCase().includes(query),
    )
  }, [mentors, searchTerm])

  const handleAddMentor = async () => {
    if (!user || !newMentor.name.trim() || !newMentor.email.trim()) return

    setIsSaving(true)

    const normalizedEmail = newMentor.email.trim().toLowerCase()

    const { data: existingMentor, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (lookupError) {
      alert('Unable to check existing mentor: ' + lookupError.message)
      setIsSaving(false)
      return
    }

    const payload = {
      name: newMentor.name.trim(),
      full_name: newMentor.name.trim(),
      email: normalizedEmail,
      role: 'mentor',
    }

    const newMentorUserId = crypto.randomUUID()

    const { error } = existingMentor
      ? await supabase.from('users').update(payload).eq('id', existingMentor.id)
      : await supabase.from('users').insert({
          id: newMentorUserId,
          ...payload,
        })

    if (error) {
      alert('Unable to save mentor: ' + error.message)
      setIsSaving(false)
      return
    }

    const mentorUserId = existingMentor?.id || newMentorUserId

    const { error: linkError } = await supabase
      .from('mentors')
      .upsert({
        hod_id: user.id,
        mentor_user_id: mentorUserId,
      }, { onConflict: 'hod_id,mentor_user_id' })

    if (linkError) {
      alert('Unable to map mentor to HOD: ' + linkError.message)
      setIsSaving(false)
      return
    }

    setNewMentor({ name: '', email: '' })
    setIsAddOpen(false)
    setIsSaving(false)
    await fetchMentors()
  }

  const handleGenerateReport = async () => {
    if (!selectedMentorId) return

    const mentor = mentors.find((item) => item.id === selectedMentorId)
    if (!mentor) return

    const { data: batchData, error: batchError } = await supabase
      .from('batches')
      .select('id, name')
      .eq('mentor_id', selectedMentorId)
      .order('name', { ascending: true })

    if (batchError) {
      alert('Unable to load mentor batches: ' + batchError.message)
      return
    }

    const batchIds = (batchData || []).map((batch: any) => batch.id)
    const { data: assignmentData } = batchIds.length > 0
      ? await supabase
          .from('batch_students')
          .select('batch_id, student_id, student_name')
          .in('batch_id', batchIds)
      : { data: [] }

    const studentIds = Array.from(new Set((assignmentData || []).map((row: any) => row.student_id).filter(Boolean)))

    const { data: studentUsers } = studentIds.length > 0
      ? await supabase
          .from('users')
          .select('id, name, full_name, prn, cgpa')
          .in('id', studentIds)
      : { data: [] }

    const { data: progressData } = studentIds.length > 0
      ? await supabase
          .from('progress')
          .select('student_id, score, value_text, created_at')
          .in('student_id', studentIds)
      : { data: [] }

    const latestMarksByStudent = new Map<string, string>()

    ;(progressData || []).forEach((entry: any) => {
      if (!latestMarksByStudent.has(entry.student_id)) {
        latestMarksByStudent.set(
          entry.student_id,
          entry.value_text || (entry.score != null ? String(entry.score) : 'N/A'),
        )
      }
    })

    const batchNameById = new Map((batchData || []).map((batch: any) => [batch.id, batch.name]))
    const userById = new Map((studentUsers || []).map((student: any) => [student.id, student]))

    const reportRows: ReportStudentRow[] = (assignmentData || []).map((assignment: any) => {
      const matchedStudent = userById.get(assignment.student_id)

      return {
        batchName: batchNameById.get(assignment.batch_id) || 'Unknown Batch',
        studentName: matchedStudent?.full_name || matchedStudent?.name || assignment.student_name || 'Unknown Student',
        prn: matchedStudent?.prn || 'N/A',
        marks: latestMarksByStudent.get(assignment.student_id) || String(matchedStudent?.cgpa ?? 'N/A'),
      }
    })

    const lines = [
      'Mentor Mentee Hub - Mentor Report',
      '',
      `Mentor Name: ${mentor.name}`,
      `Mentor Email: ${mentor.email}`,
      `Total Batches: ${mentor.batchCount}`,
      `Total Students: ${mentor.studentCount}`,
      '',
      'Batch and Student Details',
      '----------------------------------------',
    ]

    if (reportRows.length === 0) {
      lines.push('No students assigned to this mentor yet.')
    } else {
      reportRows.forEach((row) => {
        lines.push(`Batch: ${row.batchName}`)
        lines.push(`Student: ${row.studentName}`)
        lines.push(`PRN: ${row.prn}`)
        lines.push(`Marks: ${row.marks}`)
        lines.push('----------------------------------------')
      })
    }

    const blob = buildPdfBlob(lines)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${mentor.name.replace(/\s+/g, '-').toLowerCase()}-report.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
    setIsReportOpen(false)
  }

  const totalStudents = mentors.reduce((sum, mentor) => sum + mentor.studentCount, 0)
  const totalBatches = mentors.reduce((sum, mentor) => sum + mentor.batchCount, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Mentors Overview</h2>
          <p className="mt-1 text-muted-foreground">
            View only the mentors added by this HOD, along with their real batches and students.
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-border bg-card hover:bg-secondary">
                <Download className="h-4 w-4" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Mentor Report</DialogTitle>
                <DialogDescription>Select the mentor you want to export as a PDF.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Select Mentor</Label>
                  <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose mentor" />
                    </SelectTrigger>
                    <SelectContent>
                      {mentors.map((mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id}>
                          {mentor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsReportOpen(false)}>Cancel</Button>
                  <Button onClick={handleGenerateReport} disabled={!selectedMentorId}>Download PDF</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4" />
                Add Mentor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Mentor</DialogTitle>
                <DialogDescription>Add a mentor by name and email for this HOD.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mentorName">Mentor Name</Label>
                  <Input
                    id="mentorName"
                    value={newMentor.name}
                    onChange={(event) => setNewMentor((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mentorEmail">Mentor Email</Label>
                  <Input
                    id="mentorEmail"
                    type="email"
                    value={newMentor.email}
                    onChange={(event) => setNewMentor((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddMentor} disabled={isSaving || !newMentor.name.trim() || !newMentor.email.trim()}>
                    {isSaving ? 'Saving...' : 'Save Mentor'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-6 border-border bg-card">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Mentors Added</p>
              <h3 className="text-3xl font-bold text-foreground">{mentors.length}</h3>
            </div>
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-border bg-card">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Batches</p>
              <h3 className="text-3xl font-bold text-foreground">{totalBatches}</h3>
            </div>
            <div className="rounded-lg bg-accent/10 p-3 text-accent">
              <BookOpen className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-border bg-card">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Students Under Mentors</p>
              <h3 className="text-3xl font-bold text-foreground">{totalStudents}</h3>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-blue-500">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search mentors by name or email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <Card className="border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Mentor List</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Batches</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading mentors...
                  </TableCell>
                </TableRow>
              ) : filteredMentors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No mentors added by this HOD yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMentors.flatMap((mentor) => {
                  const rows = [
                    <TableRow key={mentor.id} className="border-border hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium text-foreground">{mentor.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{mentor.email}</TableCell>
                      <TableCell className="text-center">{mentor.batchCount}</TableCell>
                      <TableCell className="text-center">{mentor.studentCount}</TableCell>
                      <TableCell>
                        <Badge className={mentor.batchCount > 0 ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'}>
                          {mentor.batchCount > 0 ? 'Active' : 'Added'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedMentorId((current) => current === mentor.id ? null : mentor.id)}
                        >
                          {expandedMentorId === mentor.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>,
                  ]

                  if (expandedMentorId === mentor.id) {
                    rows.push(
                      <TableRow key={`${mentor.id}-details`} className="bg-secondary/20">
                        <TableCell colSpan={6} className="p-4">
                          {mentor.batches.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No batches assigned to this mentor yet.</p>
                          ) : (
                            <div className="space-y-4">
                              {mentor.batches.map((batch) => (
                                <div key={batch.id} className="rounded-lg border bg-background p-4">
                                  <p className="font-semibold text-foreground">{batch.name}</p>
                                  {batch.students.length === 0 ? (
                                    <p className="mt-2 text-sm text-muted-foreground">No students in this batch yet.</p>
                                  ) : (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {batch.students.map((student) => (
                                        <Link
                                          key={student.id}
                                          href={`/dashboard/mentor/students/${student.id}`}
                                          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-foreground hover:border-primary hover:text-primary"
                                        >
                                          <span>{student.name}</span>
                                          <span className="text-muted-foreground">({student.prn})</span>
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>,
                    )
                  }

                  return rows
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
