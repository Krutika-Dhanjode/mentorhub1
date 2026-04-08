'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Users, UserPlus, FolderPlus, ChevronRight, Trash2, Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
export default function MentorStudentsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
    const [deletingBatchId, setDeletingBatchId] = useState(null);
    const [removingStudentId, setRemovingStudentId] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [reportBatchId, setReportBatchId] = useState('all');
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [comparisonBatchId, setComparisonBatchId] = useState('');
    const [comparisonData, setComparisonData] = useState([]);
    const [isComparisonLoading, setIsComparisonLoading] = useState(false);
    const [comparisonMessage, setComparisonMessage] = useState('');
    const comparisonBarColors = ['#ff2d55', '#9acd32', '#1ea7d5', '#f4ce14', '#ff7a00', '#7c4dff', '#00c2a8'];
    // New student form
    const [newStudent, setNewStudent] = useState({
        name: '',
        email: '',
        batch: '',
    });
    // New batch form
    const [newBatch, setNewBatch] = useState({
        name: '',
        className: '',
    });
    const fetchData = async () => {
        if (!user)
            return;
        const { data: batchData, error: batchError } = await supabase
            .from('batches')
            .select('id, name')
            .eq('mentor_id', user.id)
            .order('name', { ascending: true });
        if (batchError) {
            console.error('Error fetching batches:', batchError.message);
            return;
        }
        const batchIds = (batchData || []).map((batch) => batch.id);
        const { data: assignmentData, error: assignmentError } = batchIds.length > 0
            ? await supabase
                .from('batch_students')
                .select('id, batch_id, student_id, student_name')
                .in('batch_id', batchIds)
            : { data: [], error: null };
        if (assignmentError) {
            console.error('Error fetching batch assignments:', assignmentError.message);
            return;
        }
        const studentIds = Array.from(new Set((assignmentData || []).map((assignment) => assignment.student_id).filter(Boolean)));
        let usersById = new Map();
        if (studentIds.length > 0) {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, name, email, role, prn, cgpa')
                .in('id', studentIds);
            if (userError) {
                console.error('Error fetching users:', userError.message);
                return;
            }
            usersById = new Map((userData || []).map((entry) => [entry.id, entry]));
        }
        const formattedBatches = (batchData || []).map((batch) => ({
            id: batch.id,
            name: batch.name,
            className: 'Batch',
            studentCount: (assignmentData || []).filter((assignment) => assignment.batch_id === batch.id).length,
        }));
        setBatches(formattedBatches);
        const batchNameById = new Map((batchData || []).map((batch) => [batch.id, batch.name]));
        const formattedStudents = (assignmentData || []).map((assignment, index) => {
            const matchedUser = usersById.get(assignment.student_id);
            return {
                id: assignment.id || `${assignment.student_id}-${assignment.batch_id}`,
                assignmentId: assignment.id || null,
                batchId: assignment.batch_id,
                userId: assignment.student_id,
                name: matchedUser?.name || assignment.student_name || 'Unknown',
                prn: matchedUser?.prn || `CS${String(index + 1).padStart(3, '0')}`,
                email: matchedUser?.email || '',
                batch: batchNameById.get(assignment.batch_id) || 'Unknown Batch',
                cgpa: matchedUser?.cgpa ?? 0,
                status: 'Good Standing',
            };
        });
        setStudents(formattedStudents);
    };
    useEffect(() => {
        if (!loading && user)
            fetchData();
    }, [loading, user]);
    useEffect(() => {
        if (reportBatchId === 'all')
            return;
        const exists = batches.some((batch) => batch.id === reportBatchId);
        if (!exists)
            setReportBatchId('all');
    }, [batches, reportBatchId]);
    useEffect(() => {
        if (!batches.length) {
            setComparisonBatchId('');
            return;
        }
        const exists = batches.some((batch) => batch.id === comparisonBatchId);
        if (!exists) {
            setComparisonBatchId(batches[0].id);
        }
    }, [batches, comparisonBatchId]);
    const searchTerm = searchParams.get('q') || '';
    const filteredStudents = students.filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.prn.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBatch = !selectedBatch || s.batch === selectedBatch;
        return matchesSearch && matchesBatch;
    });
    const handleAddStudent = async () => {
        if (!newStudent.name || !newStudent.email || !newStudent.batch)
            return;
        const selectedBatch = batches.find((batch) => batch.name === newStudent.batch);
        if (!selectedBatch) {
            alert('Selected batch not found.');
            return;
        }
        const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id, name, email, role, prn, cgpa')
            .ilike('email', newStudent.email.trim())
            .eq('role', 'student')
            .maybeSingle();
        if (userError || !existingUser) {
            alert('Student must already exist in users before assigning to a batch.');
            return;
        }
        const { data: existingAssignment, error: existingAssignmentError } = await supabase
            .from('batch_students')
            .select('id')
            .eq('batch_id', selectedBatch.id)
            .eq('student_id', existingUser.id)
            .maybeSingle();
        if (existingAssignmentError) {
            alert('Error checking batch assignment: ' + existingAssignmentError.message);
            return;
        }
        if (existingAssignment) {
            alert('This student is already assigned to the selected batch.');
            setNewStudent({ name: '', email: '', batch: '' });
            setIsAddStudentOpen(false);
            return;
        }
        const { error: batchStudentError } = await supabase
            .from('batch_students')
            .insert({
            batch_id: selectedBatch.id,
            student_id: existingUser.id,
            student_name: existingUser.name || newStudent.name,
        });
        if (batchStudentError) {
            alert('Error saving batch assignment: ' + batchStudentError.message);
            return;
        }
        const student = {
            id: `${existingUser.id}-${selectedBatch.id}`,
            assignmentId: null,
            batchId: selectedBatch.id,
            userId: existingUser.id,
            name: existingUser.name || newStudent.name,
            prn: existingUser.prn || `CS${String(students.length + 1).padStart(3, '0')}`,
            email: existingUser.email || newStudent.email,
            batch: selectedBatch.name,
            cgpa: existingUser.cgpa ?? 0,
            status: 'Good Standing',
        };
        setStudents([...students, student]);
        setBatches(batches.map((batch) => batch.id === selectedBatch.id
            ? { ...batch, studentCount: batch.studentCount + 1 }
            : batch));
        setNewStudent({ name: '', email: '', batch: '' });
        setIsAddStudentOpen(false);
        alert('Student added to batch successfully!');
    };
    const handleCreateBatch = async () => {
        if (!user)
            return;
        if (!newBatch.name.trim() || !newBatch.className.trim()) {
            return;
        }
        const { data, error } = await supabase
            .from('batches')
            .insert({
            name: newBatch.name.trim(),
            mentor_id: user.id,
        })
            .select('id, name')
            .single();
        if (error) {
            alert('Error creating batch: ' + error.message);
            return;
        }
        const createdBatch = {
            id: data.id,
            name: data.name,
            className: newBatch.className.trim() || 'Batch',
            studentCount: 0,
        };
        setBatches((current) => [...current, createdBatch].sort((a, b) => a.name.localeCompare(b.name)));
        setNewBatch({ name: '', className: '' });
        setIsCreateBatchOpen(false);
        alert('Batch created successfully!');
    };
    const handleDeleteBatch = async (batch) => {
        if (!user)
            return;
        const confirmed = window.confirm(`Delete batch "${batch.name}"? This will also remove its meetings and student assignments.`);
        if (!confirmed)
            return;
        setDeletingBatchId(batch.id);
        const { error: meetingError } = await supabase
            .from('meetings')
            .delete()
            .eq('batch_id', batch.id)
            .eq('mentor_id', user.id);
        if (meetingError) {
            setDeletingBatchId(null);
            alert('Error deleting batch meetings: ' + meetingError.message);
            return;
        }
        const { error } = await supabase
            .from('batches')
            .delete()
            .eq('id', batch.id)
            .eq('mentor_id', user.id);
        setDeletingBatchId(null);
        if (error) {
            alert('Error deleting batch: ' + error.message);
            return;
        }
        if (selectedBatch === batch.name) {
            setSelectedBatch(null);
        }
        await fetchData();
        alert('Batch deleted successfully!');
    };
    const handleRemoveStudentFromBatch = async (student) => {
        const confirmed = window.confirm(`Remove ${student.name} from batch "${student.batch}"? This will also remove them from your mentoring list for that batch.`);
        if (!confirmed)
            return;
        setRemovingStudentId(student.id);
        let query = supabase
            .from('batch_students')
            .delete()
            .eq('batch_id', student.batchId)
            .eq('student_id', student.userId);
        if (student.assignmentId) {
            query = query.eq('id', student.assignmentId);
        }
        const { error } = await query;
        setRemovingStudentId(null);
        if (error) {
            alert('Unable to remove student from batch: ' + error.message);
            return;
        }
        await fetchData();
        alert('Student removed from batch successfully.');
    };
    const csvEscape = (value) => {
        if (value === null || value === undefined)
            return '';
        const text = String(value).replace(/"/g, '""');
        return `"${text}"`;
    };
    const handleDownloadProgressExcel = async (targetBatchId = null) => {
        if (!user)
            return;
        setExporting(true);
        try {
            const { data: mentorBatches, error: batchError } = await supabase
                .from('batches')
                .select('id, name')
                .eq('mentor_id', user.id)
                .order('name', { ascending: true });
            if (batchError) {
                alert('Unable to fetch mentor batches: ' + batchError.message);
                return;
            }
            const selectedScopeBatchId = targetBatchId || (reportBatchId === 'all' ? null : reportBatchId);
            const scopedBatches = selectedScopeBatchId
                ? (mentorBatches || []).filter((batch) => batch.id === selectedScopeBatchId)
                : (mentorBatches || []);
            const batchIds = scopedBatches.map((batch) => batch.id);
            if (batchIds.length === 0) {
                alert('No batches found for the selected report scope.');
                return;
            }
            const { data: assignments, error: assignmentError } = await supabase
                .from('batch_students')
                .select('batch_id, student_id')
                .in('batch_id', batchIds);
            if (assignmentError) {
                alert('Unable to fetch batch assignments: ' + assignmentError.message);
                return;
            }
            const uniqueStudentIds = Array.from(new Set((assignments || []).map((entry) => entry.student_id).filter(Boolean)));
            if (uniqueStudentIds.length === 0) {
                alert('No students found in the selected report scope.');
                return;
            }
            const { data: studentRows, error: studentError } = await supabase
                .from('users')
                .select('id, name, email, prn')
                .in('id', uniqueStudentIds)
                .eq('role', 'student');
            if (studentError) {
                alert('Unable to fetch student details: ' + studentError.message);
                return;
            }
            const { data: progressRows, error: progressError } = await supabase
                .from('progress')
                .select('student_id, entry_type, title, description, score, value_text, created_at')
                .in('student_id', uniqueStudentIds)
                .order('created_at', { ascending: false });
            if (progressError) {
                alert('Unable to fetch student progress data: ' + progressError.message);
                return;
            }
            const batchNameById = new Map(scopedBatches.map((batch) => [batch.id, batch.name]));
            const batchNamesByStudent = new Map();
            const progressSummaryByStudent = new Map();
            (assignments || []).forEach((entry) => {
                const studentId = entry.student_id;
                const batchName = batchNameById.get(entry.batch_id);
                if (!studentId || !batchName)
                    return;
                if (!batchNamesByStudent.has(studentId)) {
                    batchNamesByStudent.set(studentId, []);
                }
                const current = batchNamesByStudent.get(studentId) || [];
                if (!current.includes(batchName)) {
                    current.push(batchName);
                }
                batchNamesByStudent.set(studentId, current);
            });
            (progressRows || []).forEach((entry) => {
                const studentId = entry.student_id;
                if (!studentId)
                    return;
                const existing = progressSummaryByStudent.get(studentId) || {
                    totalEntries: 0,
                    marksEntries: 0,
                    skillEntries: 0,
                    reportEntries: 0,
                    latestType: 'N/A',
                    latestTitle: 'N/A',
                    latestValue: 'N/A',
                    latestDescription: 'N/A',
                    latestDate: 'N/A',
                };
                existing.totalEntries += 1;
                if (entry.entry_type === 'marks')
                    existing.marksEntries += 1;
                if (entry.entry_type === 'skill')
                    existing.skillEntries += 1;
                if (entry.entry_type === 'report')
                    existing.reportEntries += 1;
                if (existing.latestDate === 'N/A') {
                    existing.latestType = entry.entry_type || 'N/A';
                    existing.latestTitle = entry.title || 'N/A';
                    existing.latestValue = entry.value_text || (entry.score != null ? String(entry.score) : 'N/A');
                    existing.latestDescription = entry.description || 'N/A';
                    existing.latestDate = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A';
                }
                progressSummaryByStudent.set(studentId, existing);
            });
            const columns = [
                { key: 'name', label: 'Name' },
                { key: 'prn', label: 'PRN' },
                { key: 'email', label: 'Email' },
                { key: 'batch_names', label: 'Batch' },
                { key: 'total_entries', label: 'Total Progress Entries' },
                { key: 'marks_entries', label: 'Marks Entries' },
                { key: 'skill_entries', label: 'Skill Entries' },
                { key: 'report_entries', label: 'Report Entries' },
                { key: 'latest_type', label: 'Latest Entry Type' },
                { key: 'latest_title', label: 'Latest Entry Title' },
                { key: 'latest_value', label: 'Latest Entry Value' },
                { key: 'latest_description', label: 'Latest Entry Description' },
                { key: 'latest_date', label: 'Latest Entry Date' },
            ];
            const header = columns.map((column) => csvEscape(column.label)).join(',');
            const rows = (studentRows || []).map((student) => {
                const summary = progressSummaryByStudent.get(student.id);
                const rowData = {
                    name: student.name || 'N/A',
                    prn: student.prn || 'N/A',
                    email: student.email || 'N/A',
                    batch_names: (batchNamesByStudent.get(student.id) || []).join(' | ') || 'N/A',
                    total_entries: summary?.totalEntries ?? 0,
                    marks_entries: summary?.marksEntries ?? 0,
                    skill_entries: summary?.skillEntries ?? 0,
                    report_entries: summary?.reportEntries ?? 0,
                    latest_type: summary?.latestType || 'N/A',
                    latest_title: summary?.latestTitle || 'N/A',
                    latest_value: summary?.latestValue || 'N/A',
                    latest_description: summary?.latestDescription || 'N/A',
                    latest_date: summary?.latestDate || 'N/A',
                };
                return columns.map((column) => csvEscape(rowData[column.key])).join(',');
            });
            const csvContent = `\uFEFF${[header, ...rows].join('\n')}`;
            const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const scopeName = selectedScopeBatchId
                ? (scopedBatches[0]?.name || 'selected-batch')
                : 'all-batches';
            link.href = url;
            link.download = `mentor-students-progress-report-${scopeName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        }
        finally {
            setExporting(false);
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Excellent':
                return 'bg-primary/20 text-primary';
            case 'Good Standing':
                return 'bg-accent/20 text-accent';
            case 'At Risk':
                return 'bg-destructive/20 text-destructive';
        }
    };
    const comparisonStudents = useMemo(() => {
        if (!comparisonBatchId) {
            return [];
        }
        return students.filter((student) => student.batchId === comparisonBatchId);
    }, [students, comparisonBatchId]);
    const comparisonBatchName = useMemo(() => {
        if (!comparisonBatchId) {
            return '';
        }
        return batches.find((batch) => batch.id === comparisonBatchId)?.name || '';
    }, [batches, comparisonBatchId]);
    useEffect(() => {
        const loadComparisonData = async () => {
            if (!isComparisonOpen) {
                return;
            }
            if (!comparisonBatchId) {
                setComparisonData([]);
                setComparisonMessage('Select a batch to view comparison.');
                return;
            }
            const studentIds = Array.from(new Set(comparisonStudents.map((student) => student.userId).filter(Boolean)));
            if (studentIds.length === 0) {
                setComparisonData([]);
                setComparisonMessage('No students found in the selected batch.');
                return;
            }
            setIsComparisonLoading(true);
            setComparisonMessage('');
            const { data: progressRows, error: progressError } = await supabase
                .from('progress')
                .select('student_id, entry_type, score, created_at')
                .in('student_id', studentIds)
                .eq('entry_type', 'report');
            setIsComparisonLoading(false);
            if (progressError) {
                setComparisonData([]);
                setComparisonMessage('Unable to load report comparison right now.');
                return;
            }
            const summaryByStudent = new Map(comparisonStudents.map((student) => [student.userId, {
                    studentName: student.name,
                    reportEntries: 0,
                    reportScoreTotal: 0,
                    reportScoreCount: 0,
                }]));
            (progressRows || []).forEach((row) => {
                const current = summaryByStudent.get(row.student_id);
                if (!current) {
                    return;
                }
                current.reportEntries += 1;
                if (row.score !== null && row.score !== undefined && !Number.isNaN(Number(row.score))) {
                    current.reportScoreTotal += Number(row.score);
                    current.reportScoreCount += 1;
                }
            });
            const formatted = Array.from(summaryByStudent.values())
                .map((entry) => ({
                studentName: entry.studentName,
                reportEntries: entry.reportEntries,
                avgReportScore: entry.reportScoreCount > 0
                    ? Number((entry.reportScoreTotal / entry.reportScoreCount).toFixed(2))
                    : 0,
            }))
                .sort((a, b) => b.reportEntries - a.reportEntries || b.avgReportScore - a.avgReportScore);
            setComparisonData(formatted);
            if (formatted.every((entry) => entry.reportEntries === 0)) {
                setComparisonMessage('No report entries are available yet for this batch.');
            }
        };
        loadComparisonData();
    }, [isComparisonOpen, comparisonBatchId, comparisonStudents, supabase]);
    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Students</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your assigned students and batches</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <Select value={reportBatchId} onValueChange={setReportBatchId}>
            <SelectTrigger className="w-[220px] bg-card border-border">
              <SelectValue placeholder="Select report scope"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students (All Batches)</SelectItem>
              {batches.map((batch) => (<SelectItem key={batch.id} value={batch.id}>
                  {batch.name}
                </SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => handleDownloadProgressExcel()} disabled={exporting}>
            <Download className="w-4 h-4"/>
            {exporting ? 'Preparing Excel...' : 'Download Excel Report'}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setIsComparisonOpen(true)}>
            <BarChart3 className="w-4 h-4"/>
            Show Comparison
          </Button>
          <Dialog open={isCreateBatchOpen} onOpenChange={setIsCreateBatchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FolderPlus className="w-4 h-4"/>
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
                  <Input id="batchName" placeholder="e.g., Batch C, Morning Group" value={newBatch.name} onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })} className="bg-card border-border"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchClass">Class</Label>
                  <Input id="batchClass" placeholder="e.g., B.Tech CS-A, M.Tech IT" value={newBatch.className} onChange={(e) => setNewBatch({ ...newBatch, className: e.target.value })} className="bg-card border-border"/>
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
                <UserPlus className="w-4 h-4"/>
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
                  <Input id="studentName" placeholder="Full name" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} className="bg-card border-border"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentEmail">Email</Label>
                  <Input id="studentEmail" type="email" placeholder="student@college.edu" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} className="bg-card border-border"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentBatch">Batch</Label>
                  <Select value={newStudent.batch} onValueChange={(value) => setNewStudent({ ...newStudent, batch: value })}>
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue placeholder="Select batch"/>
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((batch) => (<SelectItem key={batch.id} value={batch.name}>{batch.name} ({batch.className})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsAddStudentOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddStudent} disabled={!newStudent.name || !newStudent.email || !newStudent.batch}>
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
        <Card className={`p-4 border-border cursor-pointer transition-all hover:shadow-md ${!selectedBatch ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedBatch(null)}>
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary"/>
            <div>
              <p className="font-semibold text-foreground">All Students</p>
              <p className="text-sm text-muted-foreground">{students.length} students</p>
            </div>
          </div>
        </Card>
        {batches.map((batch) => (<Card key={batch.id} className={`p-4 border-border cursor-pointer transition-all hover:shadow-md ${selectedBatch === batch.name ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedBatch(batch.name)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-accent"/>
                <div>
                  <p className="font-semibold text-foreground">{batch.name}</p>
                  <p className="text-xs text-muted-foreground">{batch.className}</p>
                  <p className="text-sm text-muted-foreground">{batch.studentCount} students</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="shrink-0 text-primary hover:text-primary" onClick={(event) => {
                event.stopPropagation();
                handleDownloadProgressExcel(batch.id);
            }} disabled={exporting} title={`Download ${batch.name} report`}>
                  <Download className="w-4 h-4"/>
                </Button>
                <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={(event) => {
                event.stopPropagation();
                handleDeleteBatch(batch);
            }} disabled={deletingBatchId === batch.id}>
                  <Trash2 className="w-4 h-4"/>
                </Button>
              </div>
            </div>
          </Card>))}
      </div>

      <Dialog open={isComparisonOpen} onOpenChange={setIsComparisonOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Student Comparison</DialogTitle>
            <DialogDescription>
              Select a batch, then compare students using their report activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="w-full sm:w-[280px]">
              <Select value={comparisonBatchId} onValueChange={setComparisonBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch for comparison"/>
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (<SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {comparisonBatchName && (<p className="text-sm text-muted-foreground">
                Batch: <span className="font-medium text-foreground">{comparisonBatchName}</span>
              </p>)}
            <div className="h-[320px] w-full">
              {isComparisonLoading ? (<div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Loading report comparison...
                </div>) : comparisonData.length === 0 ? (<div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  {comparisonMessage || 'No comparison data available.'}
                </div>) : (<ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 14, right: 16, left: 10, bottom: 28 }}>
                    <CartesianGrid stroke="#9ca3af" strokeDasharray="0" vertical={false} opacity={0.45}/>
                    <XAxis dataKey="studentName" tickLine={{ stroke: '#222', strokeWidth: 1.5 }} axisLine={{ stroke: '#222', strokeWidth: 2 }} tick={{ fill: '#111827', fontSize: 12, fontWeight: 600 }}/>
                    <YAxis allowDecimals={false} tickLine={{ stroke: '#222', strokeWidth: 1.5 }} axisLine={{ stroke: '#222', strokeWidth: 2 }} tick={{ fill: '#111827', fontSize: 12, fontWeight: 600 }}/>
                    <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: 'rgba(255,255,255,0.95)' }} labelStyle={{ color: '#111827', fontWeight: 700 }} formatter={(value, name) => [
                    value,
                    name === 'reportEntries' ? 'Report Entries' : 'Avg Report Score',
                ]}/>
                    <Bar dataKey="reportEntries" name="Report Entries" stroke="#374151" strokeWidth={1.2} radius={[4, 4, 0, 0]}>
                      {comparisonData.map((entry, index) => (<Cell key={`report-cell-${entry.studentName}-${index}`} fill={comparisonBarColors[index % comparisonBarColors.length]}/>))}
                      <LabelList dataKey="studentName" position="insideBottom" angle={-90} offset={10} fill="#111827" fontSize={12} fontWeight={700}/>
                    </Bar>
                    <Bar dataKey="avgReportScore" name="Avg Report Score" fill="#ffffff" stroke="#6b7280" strokeWidth={1.2} radius={[4, 4, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>)}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <TableHead className="text-right text-foreground font-semibold">Student Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (<TableRow key={student.id} className="border-border hover:bg-secondary/30 transition-colors cursor-pointer group">
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
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveStudentFromBatch(student)} disabled={removingStudentId === student.id}>
                        {removingStudentId === student.id ? 'Removing...' : 'Remove'}
                      </Button>
                      <Link href={`/dashboard/mentor/students/${student.userId}`}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="w-4 h-4 text-primary"/>
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>);
}
