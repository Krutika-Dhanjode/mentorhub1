'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layers3, Users, UserRound, Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'

interface BatchAssignment {
  batchId: string
  batchName: string
  department?: string
  year?: string
  mentorName: string
  mentorEmail: string
  classmates: Array<{
    id: string
    name: string
    email: string
  }>
}

export default function StudentBatchesPage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const [assignments, setAssignments] = useState<BatchAssignment[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    const fetchBatchData = async () => {
      if (!user) return

      setDataLoading(true)

      const { data: myAssignments, error: myAssignmentsError } = await supabase
        .from('batch_students')
        .select('batch_id')
        .eq('student_id', user.id)

      if (myAssignmentsError) {
        console.error('Error fetching student batches:', myAssignmentsError.message)
        setAssignments([])
        setDataLoading(false)
        return
      }

      const batchIds = Array.from(new Set((myAssignments || []).map((entry: any) => entry.batch_id).filter(Boolean)))

      if (batchIds.length === 0) {
        setAssignments([])
        setDataLoading(false)
        return
      }

      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('id, name, department, year, mentor_id')
        .in('id', batchIds)
        .order('name', { ascending: true })

      if (batchError) {
        console.error('Error fetching batch details:', batchError.message)
        setAssignments([])
        setDataLoading(false)
        return
      }

      const mentorIds = Array.from(new Set((batchData || []).map((batch: any) => batch.mentor_id).filter(Boolean)))

      const { data: mentorData } = mentorIds.length > 0
        ? await supabase
            .from('users')
            .select('id, name, email')
            .in('id', mentorIds)
        : { data: [] }

      const { data: peerAssignments, error: peerAssignmentsError } = await supabase
        .from('batch_students')
        .select('batch_id, student_id, student_name')
        .in('batch_id', batchIds)

      if (peerAssignmentsError) {
        console.error('Error fetching classmates:', peerAssignmentsError.message)
        setAssignments([])
        setDataLoading(false)
        return
      }

      const peerIds = Array.from(new Set((peerAssignments || []).map((entry: any) => entry.student_id).filter(Boolean)))

      const { data: peerUsers } = peerIds.length > 0
        ? await supabase
            .from('users')
            .select('id, name, email')
            .in('id', peerIds)
        : { data: [] }

      const mentorsById = new Map((mentorData || []).map((mentor: any) => [mentor.id, mentor]))
      const peersById = new Map((peerUsers || []).map((peer: any) => [peer.id, peer]))

      const formattedAssignments: BatchAssignment[] = (batchData || []).map((batch: any) => ({
        batchId: batch.id,
        batchName: batch.name,
        department: batch.department,
        year: batch.year,
        mentorName: mentorsById.get(batch.mentor_id)?.name || 'Unknown Mentor',
        mentorEmail: mentorsById.get(batch.mentor_id)?.email || '',
        classmates: (peerAssignments || [])
          .filter((entry: any) => entry.batch_id === batch.id)
          .map((entry: any) => ({
            id: entry.student_id,
            name: peersById.get(entry.student_id)?.name || entry.student_name || 'Unknown Student',
            email: peersById.get(entry.student_id)?.email || '',
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))

      setAssignments(formattedAssignments)
      setDataLoading(false)
    }

    if (!loading && user) {
      fetchBatchData()
    }
  }, [loading, user])

  const totalClassmates = useMemo(
    () => assignments.reduce((sum, batch) => sum + batch.classmates.length, 0),
    [assignments],
  )

  if (loading || dataLoading) {
    return <p className="text-sm text-muted-foreground">Loading your batches...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Batches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View the batches you belong to, your mentor, and the other students in each batch.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/15 p-3">
              <Layers3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assigned Batches</p>
              <p className="text-2xl font-bold text-foreground">{assignments.length}</p>
            </div>
          </div>
        </Card>

        <Card className="border-border p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/15 p-3">
              <UserRound className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mentors Connected</p>
              <p className="text-2xl font-bold text-foreground">
                {new Set(assignments.map((entry) => entry.mentorName)).size}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-border p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/15 p-3">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Students Across Batches</p>
              <p className="text-2xl font-bold text-foreground">{totalClassmates}</p>
            </div>
          </div>
        </Card>
      </div>

      {assignments.length === 0 ? (
        <Card className="border-border p-6">
          <p className="text-sm text-muted-foreground">
            You have not been added to any batch yet. Ask your mentor to assign you to a batch.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {assignments.map((assignment) => (
            <Card key={assignment.batchId} className="border-border p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-foreground">{assignment.batchName}</h2>
                    <Badge variant="outline">{assignment.year || 'Current Batch'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Department: {assignment.department || 'Not specified'}
                  </p>
                  <div className="rounded-xl bg-secondary/40 p-4">
                    <p className="text-sm font-medium text-foreground">Mentor</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{assignment.mentorName}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {assignment.mentorEmail || 'Email not available'}
                    </p>
                  </div>
                </div>

                <div className="w-full max-w-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Students In This Batch</h3>
                    <Badge className="bg-primary/15 text-primary">
                      {assignment.classmates.length} students
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {assignment.classmates.map((student) => (
                      <div key={`${assignment.batchId}-${student.id}`} className="rounded-xl border border-border bg-card p-4">
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {student.email || 'Email not available'}
                        </p>
                        {student.id === user?.id && (
                          <Badge className="mt-3 bg-accent/20 text-accent">You</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
