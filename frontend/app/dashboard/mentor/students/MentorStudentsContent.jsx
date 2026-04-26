'use client';
import { toast } from "sonner";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Users, UserPlus, FolderPlus, ChevronRight, Trash2, Download, Upload, Edit, Calendar, MessageSquare } from 'lucide-react';
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
function MentorStudentsPageContent({ initialSearch = '' }) {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
    const [deletingBatchId, setDeletingBatchId] = useState(null);
    const [removingStudentId, setRemovingStudentId] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [importingReport, setImportingReport] = useState(false);
    const [reportBatchId, setReportBatchId] = useState('all');
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [comparisonBatchId, setComparisonBatchId] = useState('');
    const [comparisonData, setComparisonData] = useState([]);
    const [isComparisonLoading, setIsComparisonLoading] = useState(false);
    const [comparisonMessage, setComparisonMessage] = useState('');
    const [isEditDatesOpen, setIsEditDatesOpen] = useState(false);
    const [editingDatesStudent, setEditingDatesStudent] = useState(null);
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editStatus, setEditStatus] = useState('Good Standing');
    const [missingMigration, setMissingMigration] = useState(false);
    const reportFileInputRef = useRef(null);
    const comparisonBarColors = ['#ff2d55', '#9acd32', '#1ea7d5', '#f4ce14', '#ff7a00', '#7c4dff', '#00c2a8'];
    // New student form
    const [newStudent, setNewStudent] = useState({
        prn: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
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
        let assignmentData = [];
        let assignmentError = null;
        let requiresMigration = false;

        if (batchIds.length > 0) {
            const result = await supabase
                .from('batch_students')
                .select('id, batch_id, student_id, student_name, start_date, end_date, status')
                .in('batch_id', batchIds);
            
            if (result.error && result.error.message.includes('column')) {
                // Fallback if start_date, end_date, or status columns don't exist yet
                requiresMigration = true;
                const fallbackResult = await supabase
                    .from('batch_students')
                    .select('id, batch_id, student_id, student_name')
                    .in('batch_id', batchIds);
                assignmentData = fallbackResult.data || [];
                assignmentError = fallbackResult.error;
            } else {
                assignmentData = result.data || [];
                assignmentError = result.error;
            }
        }

        if (assignmentError) {
            console.error('Error fetching batch assignments:', assignmentError.message);
            return;
        }

        if (requiresMigration) {
            console.warn('Database missing new columns: start_date, end_date, status');
            setMissingMigration(true);
        } else {
            setMissingMigration(false);
        }
        const studentIds = Array.from(new Set((assignmentData || []).map((assignment) => assignment.student_id).filter(Boolean)));
        let usersById = new Map();
        let allMeetings = [];
        let attendanceData = [];

        if (studentIds.length > 0) {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, name, email, role, prn, cgpa, created_at')
                .in('id', studentIds);
            if (userError) {
                console.error('Error fetching users:', userError.message);
                return;
            }
            usersById = new Map((userData || []).map((entry) => [entry.id, entry]));

            if (batchIds.length > 0) {
                const { data: meetingsData } = await supabase
                    .from('meetings')
                    .select('id, batch_id, scheduled_at')
                    .in('batch_id', batchIds);
                allMeetings = meetingsData || [];
            }

            const { data: attendanceDataRows } = await supabase
                .from('meeting_attendance')
                .select('student_id, meeting_id, present')
                .in('student_id', studentIds);
            attendanceData = attendanceDataRows || [];
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
            const regDate = matchedUser?.created_at ? new Date(matchedUser.created_at) : new Date(0);
            
            // Calculate student-specific meeting count: only meetings held on or after registration date
            const studentMeetings = (allMeetings || []).filter(m => 
                m.batch_id === assignment.batch_id && 
                new Date(m.scheduled_at) >= regDate
            );
            const totalMeetingsForStudent = studentMeetings.length;
            const attendedCountForStudent = (attendanceData || []).filter(a => 
                a.student_id === assignment.student_id && 
                a.present && 
                studentMeetings.some(sm => sm.id === a.meeting_id)
            ).length;

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
                status: assignment.status || 'Good Standing',
                startDate: assignment.start_date || '',
                endDate: assignment.end_date || '',
                attendance: `${attendedCountForStudent}/${totalMeetingsForStudent}`,
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
    const searchTerm = initialSearch || '';
    const filteredStudents = students.filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.prn.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBatch = !selectedBatch || s.batch === selectedBatch;
        return matchesSearch && matchesBatch;
    });
    const handleAddStudent = async () => {
        if (!newStudent.prn || !newStudent.batch)
            return;
        const selectedBatch = batches.find((batch) => batch.name === newStudent.batch);
        if (!selectedBatch) {
            toast.error('Selected batch not found.');
            return;
        }
        const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id, name, email, role, prn, cgpa')
            .eq('prn', newStudent.prn.trim())
            .eq('role', 'student')
            .maybeSingle();
        if (userError || !existingUser) {
            toast.error('Student with this PRN not found. Ensure the student exists.');
            return;
        }
        const { data: existingAssignment, error: existingAssignmentError } = await supabase
            .from('batch_students')
            .select('id')
            .eq('batch_id', selectedBatch.id)
            .eq('student_id', existingUser.id)
            .maybeSingle();
        if (existingAssignmentError) {
            toast.error('Error checking batch assignment: ' + existingAssignmentError.message);
            return;
        }
        if (existingAssignment) {
            toast.error('This student is already assigned to the selected batch.');
            setNewStudent({ prn: '', startDate: '', endDate: '', batch: '' });
            setIsAddStudentOpen(false);
            return;
        }
        const { data: newAssignment, error: batchStudentError } = await supabase
            .from('batch_students')
            .insert({
            batch_id: selectedBatch.id,
            student_id: existingUser.id,
            student_name: existingUser.name || 'Unknown',
            start_date: newStudent.startDate || null,
            end_date: newStudent.endDate || null,
        })
            .select('id')
            .single();
        if (batchStudentError) {
            toast.error('Error saving batch assignment: ' + batchStudentError.message);
            return;
        }
        try {
            // Get mentor's full name from user data
            let mentorName = user?.user_metadata?.name || user?.name || 'Mentor';
            if (!mentorName || mentorName === user?.email) {
                // Fetch from database if not available
                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', user.id)
                    .single();
                mentorName = userData?.name || 'Mentor';
            }

            await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentEmail: existingUser.email,
                    studentName: existingUser.name,
                    actionType: 'batch_allocation',
                    message: `You have been allocated to the batch: ${selectedBatch.name}`,
                    mentorName: mentorName,
                })
            });
        } catch (emailErr) {
            console.error('Failed to send notification email:', emailErr);
        }
        const student = {
            id: newAssignment?.id || `${existingUser.id}-${selectedBatch.id}`,
            assignmentId: newAssignment?.id || null,
            batchId: selectedBatch.id,
            userId: existingUser.id,
            name: existingUser.name || 'Unknown',
            prn: existingUser.prn || newStudent.prn,
            email: existingUser.email || '',
            batch: selectedBatch.name,
            cgpa: existingUser.cgpa ?? 0,
            status: 'Good Standing',
            startDate: newStudent.startDate || '',
            endDate: newStudent.endDate || '',
        };
        setStudents([...students, student]);
        setBatches(batches.map((batch) => batch.id === selectedBatch.id
            ? { ...batch, studentCount: batch.studentCount + 1 }
            : batch));
        setNewStudent({ prn: '', startDate: '', endDate: '', batch: '' });
        setIsAddStudentOpen(false);
        toast.success('Student added to batch successfully!');
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
            toast.error('Error creating batch: ' + error.message);
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
        toast.success('Batch created successfully!');
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
            toast.error('Error deleting batch meetings: ' + meetingError.message);
            return;
        }
        const { error } = await supabase
            .from('batches')
            .delete()
            .eq('id', batch.id)
            .eq('mentor_id', user.id);
        setDeletingBatchId(null);
        if (error) {
            toast.error('Error deleting batch: ' + error.message);
            return;
        }
        if (selectedBatch === batch.name) {
            setSelectedBatch(null);
        }
        await fetchData();
        toast.success('Batch deleted successfully!');
    };
    const handleUpdateDates = async () => {
        if (!editingDatesStudent || !editingDatesStudent.assignmentId) {
            toast.error('Cannot update dates: Missing assignment ID');
            return;
        }
        const { error } = await supabase
            .from('batch_students')
            .update({
                start_date: editStartDate || null,
                end_date: editEndDate || null,
            })
            .eq('id', editingDatesStudent.assignmentId);

        if (error) {
            toast.error('Error updating dates: ' + error.message);
            return;
        }

        setStudents(current => current.map(s => 
            s.id === editingDatesStudent.id ? { ...s, startDate: editStartDate, endDate: editEndDate } : s
        ));
        setEditingDatesStudent(null);
        setIsEditDatesOpen(false);
        toast.success('Dates updated successfully!');
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
            toast.error('Unable to remove student from batch: ' + error.message);
            return;
        }
        await fetchData();
        toast.success('Student removed from batch successfully.');
    };
    const csvEscape = (value) => {
        if (value === null || value === undefined)
            return '';
        const text = String(value).replace(/"/g, '""');
        return `"${text}"`;
    };
    const normalizeImportValue = (value) => {
        if (value === null || value === undefined)
            return '';
        return String(value).trim().replace(/^'+/, '').trim();
    };
    const parseCsvText = (text) => {
        const rows = [];
        let row = [];
        let value = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];
            if (char === '"') {
                if (inQuotes && text[i + 1] === '"') {
                    value += '"';
                    i += 1;
                }
                else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (char === ',' && !inQuotes) {
                row.push(value);
                value = '';
                continue;
            }
            if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && text[i + 1] === '\n') {
                    i += 1;
                }
                row.push(value);
                const hasContent = row.some((cell) => String(cell || '').trim().length > 0);
                if (hasContent) {
                    rows.push(row);
                }
                row = [];
                value = '';
                continue;
            }
            value += char;
        }
        row.push(value);
        if (row.some((cell) => String(cell || '').trim().length > 0)) {
            rows.push(row);
        }
        return rows;
    };
    const parseDateForImport = (rawValue) => {
        const text = normalizeImportValue(rawValue);
        if (!text)
            return { provided: false, value: null };
        const lowered = text.toLowerCase();
        if (['n/a', 'na', '-', 'null', 'none'].includes(lowered)) {
            return { provided: true, value: null };
        }
        const normalized = text.replace(/\./g, '/').replace(/\\/g, '/');
        const yyyyMmDdMatch = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (yyyyMmDdMatch) {
            const [, year, month, day] = yyyyMmDdMatch;
            return { provided: true, value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
        }
        const ddMmYyyyMatch = normalized.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (ddMmYyyyMatch) {
            const [, day, month, year] = ddMmYyyyMatch;
            return { provided: true, value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
        }
        const parsed = new Date(text);
        if (!Number.isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            return { provided: true, value: `${year}-${month}-${day}` };
        }
        return { provided: false, value: null };
    };
    const parseNumberForImport = (rawValue) => {
        const text = normalizeImportValue(rawValue);
        if (!text)
            return { provided: false, value: null };
        const lowered = text.toLowerCase();
        if (['n/a', 'na', '-', 'null', 'none'].includes(lowered)) {
            return { provided: true, value: null };
        }
        const parsed = Number(text);
        if (Number.isNaN(parsed)) {
            return { provided: false, value: null };
        }
        return { provided: true, value: parsed };
    };
    const handleImportUpdatedReport = async (event) => {
        if (!user)
            return;
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast.error('Please upload the edited report as a CSV file.');
            event.target.value = '';
            return;
        }
        setImportingReport(true);
        try {
            const csvText = await file.text();
            const parsedRows = parseCsvText(csvText);
            if (parsedRows.length < 2) {
                toast.error('The uploaded report is empty.');
                return;
            }
            const headers = parsedRows[0].map((header) => normalizeImportValue(header).toLowerCase());
            const headerIndex = (name) => headers.findIndex((header) => header === name.toLowerCase());
            const idxName = headerIndex('name');
            const idxPrn = headerIndex('prn');
            const idxBatchName = headerIndex('batch name');
            const idxEmail = headerIndex('email');
            const idxReportScore = headerIndex('report score');
            const idxCgpa = headerIndex('cgpa');
            const idxJoiningDate = headerIndex('joining date in batch');
            const idxEndingDate = headerIndex('ending date in batch');
            if (idxPrn === -1 && idxEmail === -1 && idxName === -1) {
                toast.error('Report must include at least one identifier column: PRN, Email, or Name.');
                return;
            }
            const { data: mentorBatches, error: batchError } = await supabase
                .from('batches')
                .select('id, name')
                .eq('mentor_id', user.id);
            if (batchError) {
                toast.error('Unable to read mentor batches: ' + batchError.message);
                return;
            }
            const batchIds = (mentorBatches || []).map((batch) => batch.id);
            if (batchIds.length === 0) {
                toast.error('No mentor batches found.');
                return;
            }
            const { data: assignments, error: assignmentError } = await supabase
                .from('batch_students')
                .select('id, batch_id, student_id, start_date, end_date')
                .in('batch_id', batchIds);
            if (assignmentError) {
                toast.error('Unable to read batch assignments: ' + assignmentError.message);
                return;
            }
            const studentIds = Array.from(new Set((assignments || []).map((row) => row.student_id).filter(Boolean)));
            const { data: studentRows, error: studentError } = await supabase
                .from('users')
                .select('id, name, email, prn, cgpa')
                .in('id', studentIds);
            if (studentError) {
                toast.error('Unable to read student records: ' + studentError.message);
                return;
            }
            const { data: reportRows } = await supabase
                .from('progress')
                .select('id, student_id, score, created_at')
                .in('student_id', studentIds)
                .eq('entry_type', 'report')
                .order('created_at', { ascending: false });
            const batchNameById = new Map((mentorBatches || []).map((batch) => [batch.id, batch.name || '']));
            const studentById = new Map((studentRows || []).map((row) => [row.id, row]));
            const studentIdByPrn = new Map((studentRows || [])
                .filter((row) => normalizeImportValue(row.prn))
                .map((row) => [normalizeImportValue(row.prn).toLowerCase(), row.id]));
            const studentIdByEmail = new Map((studentRows || [])
                .filter((row) => normalizeImportValue(row.email))
                .map((row) => [normalizeImportValue(row.email).toLowerCase(), row.id]));
            const assignmentsByStudent = new Map();
            (assignments || []).forEach((assignment) => {
                if (!assignmentsByStudent.has(assignment.student_id)) {
                    assignmentsByStudent.set(assignment.student_id, []);
                }
                assignmentsByStudent.get(assignment.student_id)?.push(assignment);
            });
            const latestReportByStudent = new Map();
            (reportRows || []).forEach((row) => {
                if (!latestReportByStudent.has(row.student_id)) {
                    latestReportByStudent.set(row.student_id, row);
                }
            });
            let matchedRows = 0;
            let updatedUsers = 0;
            let updatedAssignments = 0;
            let updatedScores = 0;
            let skippedRows = 0;
            for (let rowIndex = 1; rowIndex < parsedRows.length; rowIndex += 1) {
                const row = parsedRows[rowIndex];
                const getCell = (index) => (index >= 0 ? row[index] : '');
                const importedPrn = normalizeImportValue(getCell(idxPrn));
                const importedEmail = normalizeImportValue(getCell(idxEmail)).toLowerCase();
                const importedName = normalizeImportValue(getCell(idxName));
                const importedBatchName = normalizeImportValue(getCell(idxBatchName));
                let studentId = '';
                if (importedPrn && studentIdByPrn.has(importedPrn.toLowerCase())) {
                    studentId = studentIdByPrn.get(importedPrn.toLowerCase()) || '';
                }
                else if (importedEmail && studentIdByEmail.has(importedEmail)) {
                    studentId = studentIdByEmail.get(importedEmail) || '';
                }
                else if (importedName) {
                    const byName = (studentRows || []).find((candidate) => normalizeImportValue(candidate.name).toLowerCase() === importedName.toLowerCase());
                    studentId = byName?.id || '';
                }
                if (!studentId) {
                    skippedRows += 1;
                    continue;
                }
                const currentStudent = studentById.get(studentId);
                if (!currentStudent) {
                    skippedRows += 1;
                    continue;
                }
                const studentAssignments = assignmentsByStudent.get(studentId) || [];
                const targetAssignment = importedBatchName
                    ? studentAssignments.find((assignment) => normalizeImportValue(batchNameById.get(assignment.batch_id)).toLowerCase() === importedBatchName.toLowerCase())
                    : studentAssignments[0];
                const userPatch = {};
                if (idxName >= 0 && importedName && importedName !== normalizeImportValue(currentStudent.name)) {
                    userPatch.name = importedName;
                }
                if (idxPrn >= 0 && importedPrn && importedPrn !== normalizeImportValue(currentStudent.prn)) {
                    userPatch.prn = importedPrn;
                }
                if (idxEmail >= 0 && importedEmail && importedEmail !== normalizeImportValue(currentStudent.email).toLowerCase()) {
                    userPatch.email = importedEmail;
                }
                if (idxCgpa >= 0) {
                    const parsedCgpa = parseNumberForImport(getCell(idxCgpa));
                    if (parsedCgpa.provided && parsedCgpa.value !== null && Number(currentStudent.cgpa) !== Number(parsedCgpa.value)) {
                        userPatch.cgpa = parsedCgpa.value;
                    }
                }
                if (Object.keys(userPatch).length > 0) {
                    const { error: userUpdateError } = await supabase
                        .from('users')
                        .update(userPatch)
                        .eq('id', studentId);
                    if (!userUpdateError) {
                        updatedUsers += 1;
                    }
                }
                if (targetAssignment) {
                    const startDateParsed = idxJoiningDate >= 0 ? parseDateForImport(getCell(idxJoiningDate)) : { provided: false, value: null };
                    const endDateParsed = idxEndingDate >= 0 ? parseDateForImport(getCell(idxEndingDate)) : { provided: false, value: null };
                    const assignmentPatch = {};
                    if (startDateParsed.provided) {
                        assignmentPatch.start_date = startDateParsed.value;
                    }
                    if (endDateParsed.provided) {
                        assignmentPatch.end_date = endDateParsed.value;
                    }
                    if (Object.keys(assignmentPatch).length > 0) {
                        const { error: assignmentUpdateError } = await supabase
                            .from('batch_students')
                            .update(assignmentPatch)
                            .eq('student_id', studentId)
                            .eq('batch_id', targetAssignment.batch_id);
                        if (!assignmentUpdateError) {
                            updatedAssignments += 1;
                        }
                    }
                }
                if (idxReportScore >= 0) {
                    const parsedScore = parseNumberForImport(getCell(idxReportScore));
                    if (parsedScore.provided && parsedScore.value !== null) {
                        const existingReport = latestReportByStudent.get(studentId);
                        if (existingReport) {
                            const { error: scoreUpdateError } = await supabase
                                .from('progress')
                                .update({
                                score: parsedScore.value,
                                value_text: String(parsedScore.value),
                            })
                                .eq('id', existingReport.id);
                            if (!scoreUpdateError) {
                                updatedScores += 1;
                            }
                        }
                        else {
                            const { data: insertedRow, error: insertScoreError } = await supabase
                                .from('progress')
                                .insert({
                                student_id: studentId,
                                entry_type: 'report',
                                title: 'Imported Report Score',
                                description: 'Updated via uploaded Excel report',
                                score: parsedScore.value,
                                value_text: String(parsedScore.value),
                            })
                                .select('id, student_id, score, created_at')
                                .single();
                            if (!insertScoreError && insertedRow) {
                                latestReportByStudent.set(studentId, insertedRow);
                                updatedScores += 1;
                            }
                        }
                    }
                }
                matchedRows += 1;
            }
            await fetchData();
            toast.success(`Import complete. Matched: ${matchedRows}, Users updated: ${updatedUsers}, Batch dates updated: ${updatedAssignments}, Report scores updated: ${updatedScores}, Skipped: ${skippedRows}.`);
        }
        catch (error) {
            toast.error(`Unable to import updated report: ${error?.message || 'Unknown error'}`);
        }
        finally {
            setImportingReport(false);
            event.target.value = '';
        }
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
                toast.error('Unable to fetch mentor batches: ' + batchError.message);
                return;
            }
            const selectedScopeBatchId = targetBatchId || (reportBatchId === 'all' ? null : reportBatchId);
            const scopedBatches = selectedScopeBatchId
                ? (mentorBatches || []).filter((batch) => batch.id === selectedScopeBatchId)
                : (mentorBatches || []);
            const batchIds = scopedBatches.map((batch) => batch.id);
            if (batchIds.length === 0) {
                toast.success('No batches found for the selected report scope.');
                return;
            }
            const { data: assignments, error: assignmentError } = await supabase
                .from('batch_students')
                .select('batch_id, student_id, start_date, end_date')
                .in('batch_id', batchIds);
            if (assignmentError) {
                toast.error('Unable to fetch batch assignments: ' + assignmentError.message);
                return;
            }
            const uniqueStudentIds = Array.from(new Set((assignments || []).map((entry) => entry.student_id).filter(Boolean)));
            if (uniqueStudentIds.length === 0) {
                toast.success('No students found in the selected report scope.');
                return;
            }
            const { data: studentRows, error: studentError } = await supabase
                .from('users')
                .select('id, name, email, prn, cgpa, created_at')
                .in('id', uniqueStudentIds);
            if (studentError) {
                toast.error('Unable to fetch student details: ' + studentError.message);
                return;
            }
            const { data: progressRows, error: progressError } = await supabase
                .from('progress')
                .select('student_id, entry_type, score, created_at')
                .in('student_id', uniqueStudentIds);
            if (progressError) {
                toast.error('Unable to fetch student progress data: ' + progressError.message);
                return;
            }
            const { data: meetingsData, error: meetingsError } = await supabase
                .from('meetings')
                .select('id, batch_id, scheduled_at')
                .in('batch_id', batchIds);
            if (meetingsError) {
                toast.error('Unable to fetch meetings data: ' + meetingsError.message);
                return;
            }
            const meetingIds = (meetingsData || []).map((meeting) => meeting.id).filter(Boolean);
            let attendanceRows = [];
            if (meetingIds.length > 0) {
                const { data: fetchedAttendanceRows, error: attendanceError } = await supabase
                    .from('meeting_attendance')
                    .select('student_id, meeting_id, present')
                    .in('student_id', uniqueStudentIds)
                    .in('meeting_id', meetingIds);
                if (attendanceError) {
                    toast.error('Unable to fetch attendance data: ' + attendanceError.message);
                    return;
                }
                attendanceRows = fetchedAttendanceRows || [];
            }
            const batchNameById = new Map(scopedBatches.map((batch) => [batch.id, batch.name]));
            const studentById = new Map((studentRows || []).map((student) => [student.id, student]));
            const progressCountByStudent = new Map();
            const latestReportScoreByStudent = new Map();
            (progressRows || []).forEach((entry) => {
                const currentCount = progressCountByStudent.get(entry.student_id) || 0;
                progressCountByStudent.set(entry.student_id, currentCount + 1);
                if (entry.entry_type === 'report' && entry.score !== null && entry.score !== undefined && !Number.isNaN(Number(entry.score))) {
                    const current = latestReportScoreByStudent.get(entry.student_id);
                    const currentTime = current?.createdAt ? new Date(current.createdAt).getTime() : -1;
                    const nextTime = entry.created_at ? new Date(entry.created_at).getTime() : 0;
                    if (!current || nextTime >= currentTime) {
                        latestReportScoreByStudent.set(entry.student_id, {
                            score: Number(entry.score),
                            createdAt: entry.created_at,
                        });
                    }
                }
            });
            const meetingToBatchId = new Map((meetingsData || []).map((meeting) => [meeting.id, meeting.batch_id]));
            const attendanceByStudentBatch = new Map();
            (attendanceRows || []).forEach((row) => {
                if (!row.present)
                    return;
                const batchId = meetingToBatchId.get(row.meeting_id);
                if (!batchId || !row.student_id)
                    return;
                const key = `${row.student_id}::${batchId}`;
                const currentCount = attendanceByStudentBatch.get(key) || 0;
                attendanceByStudentBatch.set(key, currentCount + 1);
            });
            const columns = [
                { key: 'name', label: 'Name' },
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
            const header = columns.map((column) => csvEscape(column.label)).join(',');
            const formatDateForExport = (value) => {
                if (!value)
                    return 'N/A';
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) {
                    return String(value);
                }
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `'${yyyy}-${mm}-${dd}`;
            };
            const formatPrnForExport = (value) => {
                if (value === null || value === undefined || value === '') {
                    return 'N/A';
                }
                return `'${String(value)}`;
            };
            const rows = (assignments || []).map((assignment) => {
                const student = studentById.get(assignment.student_id);
                const attendanceKey = `${assignment.student_id}::${assignment.batch_id}`;
                const s = studentById.get(assignment.student_id);
                const regDate = s?.created_at ? new Date(s.created_at) : new Date(0);
                
                // Filter meetings for this specific student
                const studentMeetings = (meetingsData || []).filter(m => 
                    m.batch_id === assignment.batch_id && 
                    new Date(m.scheduled_at) >= regDate
                );
                
                const attCount = (attendanceRows || []).filter(att => 
                    att.student_id === assignment.student_id && 
                    att.present && 
                    studentMeetings.some(sm => sm.id === att.meeting_id)
                ).length;
                
                const reportScore = latestReportScoreByStudent.get(assignment.student_id)?.score ?? 'N/A';
                const rowData = {
                    name: s?.name || 'N/A',
                    prn: s?.prn ? `'${String(s.prn)}` : 'N/A',
                    batch_name: batchNameById.get(assignment.batch_id) || 'N/A',
                    email: s?.email || 'N/A',
                    meetings_attended: `${attCount}/${studentMeetings.length}`,
                    progress_count: progressCountByStudent.get(assignment.student_id) || 0,
                    report_score: reportScore,
                    cgpa: s?.cgpa ?? 'N/A',
                    joining_date: formatDateForExport(assignment.start_date),
                    ending_date: formatDateForExport(assignment.end_date),
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
          <input ref={reportFileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportUpdatedReport}/>
          <Button variant="outline" className="gap-2" onClick={() => reportFileInputRef.current?.click()} disabled={importingReport}>
            <Upload className="w-4 h-4"/>
            {importingReport ? 'Importing Report...' : 'Upload Updated Report'}
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
                  <Label htmlFor="studentPrn">Student PRN</Label>
                  <Input id="studentPrn" placeholder="Enter PRN (e.g. CS001)" value={newStudent.prn} onChange={(e) => setNewStudent({ ...newStudent, prn: e.target.value })} className="bg-card border-border"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentStartDate">Start Date (Optional)</Label>
                  <Input id="studentStartDate" type="date" value={newStudent.startDate} onChange={(e) => setNewStudent({ ...newStudent, startDate: e.target.value })} className="bg-card border-border"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentEndDate">End Date (Optional)</Label>
                  <Input id="studentEndDate" type="date" value={newStudent.endDate} onChange={(e) => setNewStudent({ ...newStudent, endDate: e.target.value })} className="bg-card border-border"/>
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
                  <Button onClick={handleAddStudent} disabled={!newStudent.prn || !newStudent.batch}>
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
                <Link href={`/dashboard/mentor/batches/${batch.id}/chat`} onClick={(event) => event.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="shrink-0 text-accent hover:text-accent" title={`Open ${batch.name} group chat`}>
                    <MessageSquare className="w-4 h-4"/>
                  </Button>
                </Link>
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
                <TableHead className="text-foreground font-semibold">Batch</TableHead>
                <TableHead className="text-foreground font-semibold">Dates</TableHead>
                <TableHead className="text-foreground font-semibold">Attendance</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Actions</TableHead>
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
                  <TableCell>
                    <Badge variant="outline">{student.batch}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {student.startDate ? `Start: ${student.startDate}` : 'Start: -'}
                    <br />
                    {student.endDate ? `End: ${student.endDate}` : 'End: -'}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {student.attendance}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(student.status)}>{student.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={(e) => {
                        e.stopPropagation();
                        setEditingDatesStudent(student);
                        setEditStartDate(student.startDate || '');
                        setEditEndDate(student.endDate || '');
                        setIsEditDatesOpen(true);
                      }} title="Edit Dates">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStudentFromBatch(student);
                      }} disabled={removingStudentId === student.id} title="Remove Student">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Link href={`/dashboard/mentor/students/${student.userId}`}>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                          Report
                          <ChevronRight className="ml-1 h-3 w-3"/>
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isEditDatesOpen} onOpenChange={setIsEditDatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student Dates</DialogTitle>
            <DialogDescription>
              Update the start and end dates for {editingDatesStudent?.name} in {editingDatesStudent?.batch}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="editStartDate">Start Date (Optional)</Label>
              <Input id="editStartDate" type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="bg-card border-border"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEndDate">End Date (Optional)</Label>
              <Input id="editEndDate" type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="bg-card border-border"/>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditDatesOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateDates}>Save Dates</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);
}

export default MentorStudentsPageContent;
