'use client';
import { toast } from "sonner";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Download, Plus, Search, Users, BookOpen, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

const escapePdfText = (value) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const csvEscape = (value) => {
    if (value === null || value === undefined)
        return '';
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
};

const buildPdfBlob = (lines) => {
    const linesPerPage = 32;
    const pages = [];
    for (let index = 0; index < lines.length; index += linesPerPage) {
        pages.push(lines.slice(index, index + linesPerPage));
    }
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    let objectIndex = 1;
    const addObject = (content) => {
        offsets.push(pdf.length);
        pdf += `${objectIndex} 0 obj\n${content}\nendobj\n`;
        objectIndex += 1;
        return objectIndex - 1;
    };
    const fontObject = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const pageObjectIds = [];
    pages.forEach((pageLines) => {
        const streamLines = pageLines.map((line, lineIndex) => {
            const y = 780 - lineIndex * 22;
            return `BT /F1 12 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
        });
        const streamContent = streamLines.join('\n');
        const contentObject = addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
        pageObjectIds.push(addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`));
    });
    const pagesObjectId = addObject(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`);
    pdf = pdf.replace('/Parent 0 0 R', `/Parent ${pagesObjectId} 0 R`);
    const catalogObjectId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${offsets.length}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${offsets.length} /Root ${catalogObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: 'application/pdf' });
};

export default function AdminMentorsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [mentors, setMentors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dataLoading, setDataLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [selectedMentorIds, setSelectedMentorIds] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedMentorId, setExpandedMentorId] = useState(null);
    const [newMentor, setNewMentor] = useState({
        name: '',
        email: '',
    });

    const fetchMentors = async () => {
        if (!user)
            return;
        setDataLoading(true);
        const { data: mentorLinks, error: mentorLinkError } = await supabase
            .from('mentors')
            .select('mentor_user_id')
            .eq('hod_id', user.id);
        if (mentorLinkError) {
            console.error('Error fetching mentor mappings:', mentorLinkError.message);
            setMentors([]);
            setDataLoading(false);
            return;
        }
        const mentorIds = (mentorLinks || []).map((link) => link.mentor_user_id);
        if (mentorIds.length === 0) {
            setMentors([]);
            setDataLoading(false);
            return;
        }
        const { data: mentorData, error: mentorError } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .in('id', mentorIds)
            .eq('role', 'mentor')
            .order('name', { ascending: true });
        if (mentorError) {
            console.error('Error fetching mentors:', mentorError.message);
            setMentors([]);
            setDataLoading(false);
            return;
        }
        const { data: batchData } = mentorIds.length > 0
            ? await supabase
                .from('batches')
                .select('id, mentor_id, name')
                .in('mentor_id', mentorIds)
            : { data: [] };
        const batchIds = (batchData || []).map((batch) => batch.id);
        const { data: assignmentData } = batchIds.length > 0
            ? await supabase
                .from('batch_students')
                .select('batch_id, student_id, student_name')
                .in('batch_id', batchIds)
            : { data: [] };
        const studentIds = Array.from(new Set((assignmentData || []).map((assignment) => assignment.student_id).filter(Boolean)));
        const { data: studentUsers } = studentIds.length > 0
            ? await supabase
                .from('users')
                .select('id, name, full_name, prn')
                .in('id', studentIds)
            : { data: [] };
        const studentMap = new Map((studentUsers || []).map((student) => [student.id, student]));
        const formattedMentors = (mentorData || []).map((mentor) => {
            const mentorBatches = (batchData || []).filter((batch) => batch.mentor_id === mentor.id);
            const mentorBatchIds = mentorBatches.map((batch) => batch.id);
            const uniqueStudents = new Set((assignmentData || [])
                .filter((assignment) => mentorBatchIds.includes(assignment.batch_id))
                .map((assignment) => assignment.student_id));
            return {
                id: mentor.id,
                name: mentor.full_name || mentor.name || 'Unknown Mentor',
                email: mentor.email || '',
                batchCount: mentorBatches.length,
                studentCount: uniqueStudents.size,
                batches: mentorBatches.map((batch) => ({
                    id: batch.id,
                    name: batch.name,
                    students: (assignmentData || [])
                        .filter((assignment) => assignment.batch_id === batch.id)
                        .map((assignment) => {
                        const matchedStudent = studentMap.get(assignment.student_id);
                        return {
                            id: assignment.student_id,
                            name: matchedStudent?.full_name || matchedStudent?.name || assignment.student_name || 'Unknown Student',
                            prn: matchedStudent?.prn || 'N/A',
                        };
                    }),
                })),
            };
        });
        setMentors(formattedMentors);
        setDataLoading(false);
    };

    useEffect(() => {
        if (!loading && user) {
            fetchMentors();
        }
    }, [loading, user]);

    const filteredMentors = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query)
            return mentors;
        return mentors.filter((mentor) => mentor.name.toLowerCase().includes(query) ||
            mentor.email.toLowerCase().includes(query));
    }, [mentors, searchTerm]);

    const handleAddMentor = async () => {
        if (!user || !newMentor.name.trim() || !newMentor.email.trim())
            return;
        setIsSaving(true);
        const normalizedEmail = newMentor.email.trim().toLowerCase();
        const { data: existingMentor, error: lookupError } = await supabase
            .from('users')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();
        if (lookupError) {
            toast.error('Unable to check existing mentor: ' + lookupError.message);
            setIsSaving(false);
            return;
        }
        const payload = {
            name: newMentor.name.trim(),
            full_name: newMentor.name.trim(),
            email: normalizedEmail,
            role: 'mentor',
        };
        const newMentorUserId = crypto.randomUUID();
        const { error } = existingMentor
            ? await supabase.from('users').update(payload).eq('id', existingMentor.id)
            : await supabase.from('users').insert({
                id: newMentorUserId,
                ...payload,
            });
        if (error) {
            toast.error('Unable to save mentor: ' + error.message);
            setIsSaving(false);
            return;
        }
        const mentorUserId = existingMentor?.id || newMentorUserId;
        const { error: linkError } = await supabase
            .from('mentors')
            .upsert({
            hod_id: user.id,
            mentor_user_id: mentorUserId,
        }, { onConflict: 'hod_id,mentor_user_id' });
        if (linkError) {
            toast.error('Unable to map mentor to Admin: ' + linkError.message);
            setIsSaving(false);
            return;
        }
        setNewMentor({ name: '', email: '' });
        setIsAddOpen(false);
        setIsSaving(false);
        await fetchMentors();
    };

    const toggleMentorSelection = (id) => {
        setSelectedMentorIds((current) => current.includes(id) ? current.filter((i) => i !== id) : [...current, id]);
    };

    const toggleSelectAll = (checked) => {
        if (checked) {
            setSelectedMentorIds(mentors.map((m) => m.id));
        }
        else {
            setSelectedMentorIds([]);
        }
    };

    const handleGenerateReport = async () => {
        if (selectedMentorIds.length === 0)
            return;
        const allLines = [
            'Mentor Mentee Hub - Multi-Mentor Report',
            `Generated on: ${new Date().toLocaleDateString()}`,
            '',
        ];
        for (const mentorId of selectedMentorIds) {
            const mentor = mentors.find((item) => item.id === mentorId);
            if (!mentor)
                continue;
            const { data: batchData, error: batchError } = await supabase
                .from('batches')
                .select('id, name')
                .eq('mentor_id', mentorId)
                .order('name', { ascending: true });
            if (batchError) {
                toast.error(`Unable to load batches for ${mentor.name}: ${batchError.message}`);
                continue;
            }
            const batchIds = (batchData || []).map((batch) => batch.id);
            const { data: assignmentData } = batchIds.length > 0
                ? await supabase
                    .from('batch_students')
                    .select('batch_id, student_id, student_name')
                    .in('batch_id', batchIds)
                : { data: [] };
            const studentIds = Array.from(new Set((assignmentData || []).map((row) => row.student_id).filter(Boolean)));
            const { data: studentUsers } = studentIds.length > 0
                ? await supabase
                    .from('users')
                    .select('id, name, full_name, prn, cgpa')
                    .in('id', studentIds)
                : { data: [] };
            const { data: progressData } = studentIds.length > 0
                ? await supabase
                    .from('progress')
                    .select('student_id, score, value_text, created_at')
                    .in('student_id', studentIds)
                : { data: [] };
            const latestMarksByStudent = new Map();
            (progressData || []).forEach((entry) => {
                if (!latestMarksByStudent.has(entry.student_id)) {
                    latestMarksByStudent.set(entry.student_id, entry.value_text || (entry.score != null ? String(entry.score) : 'N/A'));
                }
            });
            const batchNameById = new Map((batchData || []).map((batch) => [batch.id, batch.name]));
            const userById = new Map((studentUsers || []).map((student) => [student.id, student]));
            const reportRows = (assignmentData || []).map((assignment) => {
                const matchedStudent = userById.get(assignment.student_id);
                return {
                    batchName: batchNameById.get(assignment.batch_id) || 'Unknown Batch',
                    studentName: matchedStudent?.full_name || matchedStudent?.name || assignment.student_name || 'Unknown Student',
                    prn: matchedStudent?.prn || 'N/A',
                    marks: latestMarksByStudent.get(assignment.student_id) || String(matchedStudent?.cgpa ?? 'N/A'),
                };
            });
            allLines.push('========================================');
            allLines.push(`MENTOR: ${mentor.name} (${mentor.email})`);
            allLines.push(`Total Batches: ${mentor.batchCount}, Total Students: ${mentor.studentCount}`);
            allLines.push('========================================');
            allLines.push('');
            if (reportRows.length === 0) {
                allLines.push('No students assigned to this mentor yet.');
            }
            else {
                reportRows.forEach((row) => {
                    allLines.push(`Batch: ${row.batchName}`);
                    allLines.push(`Student: ${row.studentName}`);
                    allLines.push(`PRN: ${row.prn}`);
                    allLines.push(`Marks: ${row.marks}`);
                    allLines.push('----------------------------------------');
                });
            }
            allLines.push('');
            allLines.push('');
        }
        const blob = buildPdfBlob(allLines);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `mentors-report-${new Date().toISOString().split('T')[0]}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        setIsReportOpen(false);
    };

    const totalStudents = mentors.reduce((sum, mentor) => sum + mentor.studentCount, 0);
    const totalBatches = mentors.reduce((sum, mentor) => sum + mentor.batchCount, 0);

    const handleDownloadExcel = async () => {
        if (selectedMentorIds.length === 0)
            return;
        const columns = [
            { key: 'mentorName', label: 'Mentor Name' },
            { key: 'name', label: 'Student Name' },
            { key: 'prn', label: 'PRN' },
            { key: 'batch_name', label: 'Batch Name' },
            { key: 'email', label: 'Email' },
            { key: 'meetings_attended', label: 'Meetings Attended' },
            { key: 'progress_count', label: 'No of Progress Added' },
            { key: 'report_score', label: 'Report Score' },
            { key: 'cgpa', label: 'CGPA' },
            { key: 'joining_date', label: 'Joining Date in Batch' },
            { key: 'ending_date', label: 'Ending Date in Batch' },
        ];
        const allRows = [];
        for (const mentorId of selectedMentorIds) {
            const mentor = mentors.find((item) => item.id === mentorId);
            if (!mentor)
                continue;
            const { data: batchData, error: batchError } = await supabase
                .from('batches')
                .select('id, name')
                .eq('mentor_id', mentorId)
                .order('name', { ascending: true });
            if (batchError) {
                toast.error(`Unable to load batches for ${mentor.name}: ${batchError.message}`);
                continue;
            }
            const batchIds = (batchData || []).map((batch) => batch.id);
            let assignmentResult = batchIds.length > 0
                ? await supabase
                    .from('batch_students')
                    .select('batch_id, student_id, student_name, start_date, end_date')
                    .in('batch_id', batchIds)
                : { data: [] };
            if (assignmentResult.error && assignmentResult.error.message?.toLowerCase().includes('column')) {
                assignmentResult = await supabase
                    .from('batch_students')
                    .select('batch_id, student_id, student_name, joining_date, ending_date')
                    .in('batch_id', batchIds);
            }
            if (assignmentResult.error && assignmentResult.error.message?.toLowerCase().includes('column')) {
                assignmentResult = await supabase
                    .from('batch_students')
                    .select('batch_id, student_id, student_name')
                    .in('batch_id', batchIds);
            }
            if (assignmentResult.error) {
                toast.error(`Unable to load batch assignments for ${mentor.name}: ${assignmentResult.error.message}`);
                continue;
            }
            const assignmentData = assignmentResult.data || [];
            const studentIds = Array.from(new Set((assignmentData || []).map((row) => row.student_id).filter(Boolean)));
            const { data: studentUsers } = studentIds.length > 0
                ? await supabase
                    .from('users')
                    .select('id, name, email, prn, cgpa, created_at')
                    .in('id', studentIds)
                : { data: [] };
            const { data: progressData } = studentIds.length > 0
                ? await supabase
                    .from('progress')
                    .select('student_id, entry_type, score, value_text, created_at')
                    .in('student_id', studentIds)
                : { data: [] };
            const { data: meetingsData } = batchIds.length > 0
                ? await supabase
                    .from('meetings')
                    .select('id, batch_id, scheduled_at')
                    .in('batch_id', batchIds)
                : { data: [] };
            const meetingIds = (meetingsData || []).map((m) => m.id);
            const { data: attendanceData } = studentIds.length > 0 && meetingIds.length > 0
                ? await supabase
                    .from('meeting_attendance')
                    .select('student_id, meeting_id, present')
                    .in('student_id', studentIds)
                    .in('meeting_id', meetingIds)
                : { data: [] };
            const latestReportScoreByStudent = new Map();
            const progressCountByStudent = new Map();
            (progressData || []).forEach((entry) => {
                const count = progressCountByStudent.get(entry.student_id) || 0;
                progressCountByStudent.set(entry.student_id, count + 1);
                if (entry.entry_type === 'report') {
                    if (!latestReportScoreByStudent.has(entry.student_id)) {
                        latestReportScoreByStudent.set(entry.student_id, entry.value_text || (entry.score != null ? String(entry.score) : 'N/A'));
                    }
                }
            });
            const studentMap = new Map((studentUsers || []).map((s) => [s.id, s]));
            const batchNameById = new Map((batchData || []).map((b) => [b.id, b.name]));
            const formatDate = (val) => {
                if (!val)
                    return 'N/A';
                const d = new Date(val);
                if (isNaN(d.getTime()))
                    return String(val);
                return `'${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            };
            const mentorRows = (assignmentData || []).map((assignment) => {
                const s = studentMap.get(assignment.student_id);
                const regDate = s?.created_at ? new Date(s.created_at) : new Date(0);
                const studentMeetings = (meetingsData || []).filter((m) => m.batch_id === assignment.batch_id &&
                    new Date(m.scheduled_at) >= regDate);
                const attCount = (attendanceData || []).filter((att) => att.student_id === assignment.student_id &&
                    att.present &&
                    studentMeetings.some((sm) => sm.id === att.meeting_id)).length;
                const rowData = {
                    mentorName: mentor.name,
                    name: s?.name || assignment.student_name || 'N/A',
                    prn: s?.prn ? `'${s.prn}` : 'N/A',
                    batch_name: batchNameById.get(assignment.batch_id) || 'N/A',
                    email: s?.email || 'N/A',
                    meetings_attended: `${attCount}/${studentMeetings.length}`,
                    progress_count: progressCountByStudent.get(assignment.student_id) || 0,
                    report_score: latestReportScoreByStudent.get(assignment.student_id) || 'N/A',
                    cgpa: s?.cgpa ?? 'N/A',
                    joining_date: formatDate(assignment.start_date ?? assignment.joining_date),
                    ending_date: formatDate(assignment.endDate || assignment.end_date || assignment.ending_date),
                };
                return columns.map((col) => csvEscape(rowData[col.key])).join(',');
            });
            allRows.push(...mentorRows);
        }
        const header = columns.map((col) => csvEscape(col.label)).join(',');
        const csvContent = `\uFEFF${[header, ...allRows].join('\n')}`;
        const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `mentors-combined-report-${new Date().toISOString().split('T')[0]}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        setIsReportOpen(false);
    };

    return (<div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Mentors Overview</h2>
          <p className="mt-1 text-muted-foreground">
            View only the mentors added by this Admin, along with their real batches and students.
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-border bg-card hover:bg-secondary">
                <Download className="h-4 w-4"/>
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Mentor Report</DialogTitle>
                <DialogDescription>Select the mentors you want to include in the report.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Select Mentors</Label>
                    <div className="flex items-center gap-2">
                       <Checkbox id="selectAll" checked={selectedMentorIds.length === mentors.length && mentors.length > 0} onCheckedChange={toggleSelectAll}/>
                       <Label htmlFor="selectAll" className="text-xs text-muted-foreground cursor-pointer">Select All</Label>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto rounded-md border border-border p-2 space-y-1">
                    {mentors.map((mentor) => (<div key={mentor.id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-secondary/50 rounded-sm transition-colors">
                        <Checkbox id={`mentor-${mentor.id}`} checked={selectedMentorIds.includes(mentor.id)} onCheckedChange={() => toggleMentorSelection(mentor.id)}/>
                        <Label htmlFor={`mentor-${mentor.id}`} className="flex-1 text-sm cursor-pointer py-1">
                          {mentor.name}
                          <span className="ml-2 text-xs text-muted-foreground">({mentor.studentCount} students)</span>
                        </Label>
                      </div>))}
                    {mentors.length === 0 && (<p className="text-center py-4 text-sm text-muted-foreground">No mentors added yet.</p>)}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
            setIsReportOpen(false);
            setSelectedMentorIds([]);
        }}>Cancel</Button>
                  <Button variant="secondary" onClick={handleDownloadExcel} disabled={selectedMentorIds.length === 0}>Download Excel</Button>
                  <Button onClick={handleGenerateReport} disabled={selectedMentorIds.length === 0}>Download PDF</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4"/>
                Add Mentor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Mentor</DialogTitle>
                <DialogDescription>Add a mentor by name and email for this Admin.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mentorName">Mentor Name</Label>
                  <Input id="mentorName" value={newMentor.name} onChange={(event) => setNewMentor((current) => ({ ...current, name: event.target.value }))}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mentorEmail">Mentor Email</Label>
                  <Input id="mentorEmail" type="email" value={newMentor.email} onChange={(event) => setNewMentor((current) => ({ ...current, email: event.target.value }))}/>
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
              <Users className="h-6 w-6"/>
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
              <BookOpen className="h-6 w-6"/>
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
              <BarChart3 className="h-6 w-6"/>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input placeholder="Search mentors by name or email..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-10"/>
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
              {dataLoading ? (<TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading mentors...
                  </TableCell>
                </TableRow>) : filteredMentors.length === 0 ? (<TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No mentors added by this Admin yet.
                  </TableCell>
                </TableRow>) : (filteredMentors.flatMap((mentor) => {
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
                        <Button variant="ghost" size="icon" onClick={() => setExpandedMentorId((current) => current === mentor.id ? null : mentor.id)}>
                          {expandedMentorId === mentor.id ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                        </Button>
                      </TableCell>
                    </TableRow>,
            ];
            if (expandedMentorId === mentor.id) {
                rows.push(<TableRow key={`${mentor.id}-details`} className="bg-secondary/20">
                        <TableCell colSpan={6} className="p-4">
                          {mentor.batches.length === 0 ? (<p className="text-sm text-muted-foreground">No batches assigned to this mentor yet.</p>) : (<div className="space-y-4">
                               {mentor.batches.map((batch) => (<div key={batch.id} className="rounded-lg border bg-background p-4">
                                   <p className="font-semibold text-foreground">{batch.name}</p>
                                   {batch.students.length === 0 ? (<p className="mt-2 text-sm text-muted-foreground">No students in this batch yet.</p>) : (<div className="mt-3 flex flex-wrap gap-2">
                                       {batch.students.map((student) => (<Link key={student.id} href={`/dashboard/hod/students/${student.id}`} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-foreground hover:border-primary hover:text-primary">
                                           <span>{student.name}</span>
                                           <span className="text-muted-foreground">({student.prn})</span>
                                         </Link>))}
                                     </div>)}
                                 </div>))}
                             </div>)}
                        </TableCell>
                      </TableRow>);
            }
            return rows;
        }))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>);
}
