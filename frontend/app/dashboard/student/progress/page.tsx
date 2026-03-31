'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Plus, TrendingUp, Award, FileText, Upload, Paperclip } from 'lucide-react'
import { CartesianGrid, Bar, BarChart, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'

interface ProgressEntry {
  id: string
  entryType: 'marks' | 'skill' | 'report'
  title: string
  description: string
  valueText: string
  numericValue: number | null
  attachmentNames: string[]
  attachmentUrls: string[]
  createdAt: string
}

export default function StudentProgressPage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const [progress, setProgress] = useState<ProgressEntry[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [newEntry, setNewEntry] = useState({
    type: '' as 'marks' | 'skill' | 'report' | '',
    title: '',
    description: '',
    value: '',
  })

  const fetchProgress = async () => {
    if (!user) return

    setDataLoading(true)

    const { data, error } = await supabase
      .from('progress')
      .select('id, entry_type, title, description, score, value_text, attachments, attachment_names, created_at, date')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching progress entries:', error.message)
      setProgress([])
      setDataLoading(false)
      return
    }

    const formattedEntries: ProgressEntry[] = (data || []).map((entry: any) => ({
      id: entry.id,
      entryType: entry.entry_type,
      title: entry.title,
      description: entry.description || 'No description provided',
      valueText: entry.value_text || (entry.score != null ? String(entry.score) : ''),
      numericValue: entry.score != null ? Number(entry.score) : null,
      attachmentNames: entry.attachment_names || [],
      attachmentUrls: entry.attachments || [],
      createdAt: entry.created_at || entry.date,
    }))

    setProgress(formattedEntries)
    setDataLoading(false)
  }

  useEffect(() => {
    if (!loading && user) {
      fetchProgress()
    }
  }, [loading, user])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleAddProgress = async () => {
    if (!user || !newEntry.type || !newEntry.title || !newEntry.description) return

    setIsSaving(true)

    let attachmentUrl = ''
    let attachmentName = ''

    if (selectedFile) {
      const sanitizedFileName = selectedFile.name.replace(/\s+/g, '-')
      const attachmentPath = `${user.id}/${Date.now()}-${sanitizedFileName}`

      const { error: uploadError } = await supabase
        .storage
        .from('student-progress')
        .upload(attachmentPath, selectedFile, {
          upsert: false,
        })

      if (uploadError) {
        alert('File upload failed: ' + uploadError.message)
        setIsSaving(false)
        return
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('student-progress')
        .getPublicUrl(attachmentPath)

      attachmentUrl = publicUrlData.publicUrl
      attachmentName = selectedFile.name
    }

    const { error } = await supabase
      .from('progress')
      .insert({
        student_id: user.id,
        entry_type: newEntry.type,
        title: newEntry.title,
        description: newEntry.description,
        score: newEntry.type === 'marks' && newEntry.value ? Number(newEntry.value) || null : null,
        value_text: newEntry.type === 'marks' ? newEntry.value : null,
        attachments: attachmentUrl ? [attachmentUrl] : [],
        attachment_names: attachmentName ? [attachmentName] : [],
      })

    if (error) {
      alert('Error saving progress: ' + error.message)
      setIsSaving(false)
      return
    }

    setNewEntry({ type: '', title: '', description: '', value: '' })
    setSelectedFile(null)
    setIsAddOpen(false)
    setIsSaving(false)
    await fetchProgress()
  }

  const getTypeIcon = (type: ProgressEntry['entryType']) => {
    switch (type) {
      case 'marks':
        return <TrendingUp className="w-5 h-5" />
      case 'skill':
        return <Award className="w-5 h-5" />
      case 'report':
        return <FileText className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: ProgressEntry['entryType']) => {
    switch (type) {
      case 'marks':
        return 'bg-primary/20 text-primary'
      case 'skill':
        return 'bg-accent/20 text-accent'
      case 'report':
        return 'bg-secondary text-foreground'
    }
  }

  const marksCount = useMemo(() => progress.filter((entry) => entry.entryType === 'marks').length, [progress])
  const skillsCount = useMemo(() => progress.filter((entry) => entry.entryType === 'skill').length, [progress])
  const reportsCount = useMemo(() => progress.filter((entry) => entry.entryType === 'report').length, [progress])
  const marksChartData = useMemo(() => {
    return [...progress]
      .filter((entry) => entry.entryType === 'marks' && entry.numericValue != null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((entry, index) => ({
        label: `Entry ${index + 1}`,
        date: new Date(entry.createdAt).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
        }),
        score: entry.numericValue as number,
      }))
  }, [progress])
  const hasMarksTrend = marksChartData.length > 0

  if (loading || dataLoading) {
    return <p className="text-sm text-muted-foreground">Loading your progress...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Progress</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Keep a lifetime record of your marks, certifications, reports, and uploads.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              Add Progress
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Progress Entry</DialogTitle>
              <DialogDescription>
                Save your academic updates and optionally upload a certificate or document.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newEntry.type}
                  onValueChange={(value) => setNewEntry({ ...newEntry, type: value as 'marks' | 'skill' | 'report' })}
                >
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marks">Marks / CGPA</SelectItem>
                    <SelectItem value="skill">Skill / Certification</SelectItem>
                    <SelectItem value="report">Report / Achievement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Semester 6 Results, AWS Certification, Internship Report"
                  value={newEntry.title}
                  onChange={(event) => setNewEntry({ ...newEntry, title: event.target.value })}
                  className="bg-card border-border"
                />
              </div>

              {newEntry.type === 'marks' && (
                <div className="space-y-2">
                  <Label htmlFor="value">CGPA / Marks</Label>
                  <Input
                    id="value"
                    placeholder="8.9 or 89%"
                    value={newEntry.value}
                    onChange={(event) => setNewEntry({ ...newEntry, value: event.target.value })}
                    className="bg-card border-border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add the full details of the progress update"
                  value={newEntry.description}
                  onChange={(event) => setNewEntry({ ...newEntry, description: event.target.value })}
                  className="bg-card border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment">Upload Certificate / Document</Label>
                <Input
                  id="attachment"
                  type="file"
                  onChange={handleFileChange}
                  className="bg-card border-border"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected file: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false)
                    setSelectedFile(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddProgress}
                  disabled={isSaving || !newEntry.type || !newEntry.title || !newEntry.description}
                >
                  {isSaving ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Marks Entries</p>
              <h3 className="text-2xl font-bold text-foreground">{marksCount}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/20 rounded-lg">
              <Award className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Skills Added</p>
              <h3 className="text-2xl font-bold text-foreground">{skillsCount}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary rounded-lg">
              <FileText className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Reports / Achievements</p>
              <h3 className="text-2xl font-bold text-foreground">{reportsCount}</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-border bg-card p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Progress Tracker</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {hasMarksTrend
                ? 'This bar chart shows your marks trend with each entry.'
                : 'Add marks or CGPA entries to see a score trend graph here.'}
            </p>
          </div>
          <Badge className="bg-primary/10 text-primary">
            {progress.length} total entries
          </Badge>
        </div>

        {!hasMarksTrend ? (
          <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 text-sm text-muted-foreground">
            Add a marks/CGPA entry to start a clean trend line graph.
          </div>
        ) : (
          <ChartContainer
            className="h-72 w-full"
            config={{
              score: {
                label: 'Marks / CGPA',
                color: 'hsl(var(--primary))',
              },
            }}
          >
            <BarChart data={marksChartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }} barCategoryGap="2%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
              />
              <ChartTooltip
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label || 'Entry'}
                    formatter={(value) => [
                      `${value}`,
                      'Marks / CGPA',
                    ]}
                  />
                }
              />
              <Bar
                dataKey="score"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                animationDuration={700}
                barSize={32}
              />
            </BarChart>
          </ChartContainer>
        )}
      </Card>

      <Card className="border-border bg-secondary/20 p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Your uploads are stored with your progress history.</p>
            <p className="text-sm text-muted-foreground">
              Add certificates, reports, or supporting documents while creating a progress entry.
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-border">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Progress History</h2>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground font-semibold">Type</TableHead>
                <TableHead className="text-foreground font-semibold">Title</TableHead>
                <TableHead className="text-foreground font-semibold">Description</TableHead>
                <TableHead className="text-foreground font-semibold">Attachment</TableHead>
                <TableHead className="text-foreground font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progress.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No progress entries added yet.
                  </TableCell>
                </TableRow>
              ) : (
                progress.map((entry) => (
                  <TableRow key={entry.id} className="border-border hover:bg-secondary/30 transition-colors">
                    <TableCell>
                      <Badge className={getTypeColor(entry.entryType)}>
                        <span className="flex items-center gap-1">
                          {getTypeIcon(entry.entryType)}
                          {entry.entryType === 'marks' ? 'Marks' : entry.entryType === 'skill' ? 'Skill' : 'Report'}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div className="space-y-2">
                        <p>{entry.title}</p>
                        {entry.valueText && (
                          <Badge className="bg-primary/20 text-primary">{entry.valueText}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md text-muted-foreground">{entry.description}</TableCell>
                    <TableCell>
                      {entry.attachmentUrls.length > 0 ? (
                        <a
                          href={entry.attachmentUrls[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Paperclip className="h-4 w-4" />
                          {entry.attachmentNames[0] || 'Open file'}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">No file</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
