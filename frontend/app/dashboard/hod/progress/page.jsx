'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function formatDateForExport(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeProgressCategory(entry) {
  const typeValue = entry.entry_type || entry.certification_type || 'achievement';
  if (typeValue === 'marks') return 'cgpa';
  if (typeValue === 'skill' || typeValue === 'certification') return 'certification';
  if (['hackathon', 'sports', 'competition', 'achievement', 'cgpa'].includes(typeValue)) return typeValue;
  return 'achievement';
}

export default function HODProgressPage() {
  const { user, loading } = useUser();
  const supabase = createClient();

  const [mentorOptions, setMentorOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [reportRows, setReportRows] = useState([]);
  const [allProgressRows, setAllProgressRows] = useState([]);
  const [selectedMentorId, setSelectedMentorId] = useState('all');
  const [batchSelectionMode, setBatchSelectionMode] = useState('all');
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [selectedComparisonCategory, setSelectedComparisonCategory] = useState('overall');
  const [dataLoading, setDataLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!user) return;
      setDataLoading(true);

      const { data: mentorLinks, error: mentorLinkError } = await supabase
        .from('mentors')
        .select('mentor_user_id')
        .eq('hod_id', user.id);

      if (mentorLinkError) {
        toast.error('Unable to load mentor mappings: ' + mentorLinkError.message);
        setDataLoading(false);
        return;
      }

      const mentorIds = Array.from(new Set((mentorLinks || []).map((row) => row.mentor_user_id).filter(Boolean)));
      if (mentorIds.length === 0) {
        setMentorOptions([]);
        setBatchOptions([]);
        setReportRows([]);
        setDataLoading(false);
        return;
      }

      const { data: mentorsData, error: mentorsError } = await supabase
        .from('users')
        .select('id, name, full_name, email')
        .in('id', mentorIds);

      if (mentorsError) {
        toast.error('Unable to load mentors: ' + mentorsError.message);
        setDataLoading(false);
        return;
      }

      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('id, name, mentor_id')
        .in('mentor_id', mentorIds)
        .order('name', { ascending: true });

      if (batchesError) {
        toast.error('Unable to load batches: ' + batchesError.message);
        setDataLoading(false);
        return;
      }

      const mentorById = new Map(
        (mentorsData || []).map((mentor) => [
          mentor.id,
          mentor.full_name || mentor.name || mentor.email || 'Unknown Mentor',
        ]),
      );

      const batchIds = (batchesData || []).map((batch) => batch.id).filter(Boolean);
      if (batchIds.length === 0) {
        setMentorOptions(
          (mentorsData || []).map((mentor) => ({
            id: mentor.id,
            name: mentor.full_name || mentor.name || mentor.email || 'Unknown Mentor',
          })),
        );
        setBatchOptions([]);
        setReportRows([]);
        setDataLoading(false);
        return;
      }

      let assignments = [];
      let assignmentResult = await supabase
        .from('batch_students')
        .select('batch_id, student_id, start_date, end_date')
        .in('batch_id', batchIds);

      if (assignmentResult.error && assignmentResult.error.message?.toLowerCase().includes('column')) {
        assignmentResult = await supabase
          .from('batch_students')
          .select('batch_id, student_id, joining_date, ending_date')
          .in('batch_id', batchIds);
      }

      if (assignmentResult.error && assignmentResult.error.message?.toLowerCase().includes('column')) {
        assignmentResult = await supabase
          .from('batch_students')
          .select('batch_id, student_id')
          .in('batch_id', batchIds);
      }

      if (assignmentResult.error) {
        toast.error('Unable to load batch assignments: ' + assignmentResult.error.message);
        setDataLoading(false);
        return;
      } else {
        assignments = assignmentResult.data || [];
      }

      const studentIds = Array.from(new Set(assignments.map((row) => row.student_id).filter(Boolean)));
      if (studentIds.length === 0) {
        setMentorOptions(
          (mentorsData || []).map((mentor) => ({
            id: mentor.id,
            name: mentor.full_name || mentor.name || mentor.email || 'Unknown Mentor',
          })),
        );
        setBatchOptions(
          (batchesData || []).map((batch) => ({
            id: batch.id,
            name: batch.name || 'Unnamed Batch',
            mentorId: batch.mentor_id,
            mentorName: mentorById.get(batch.mentor_id) || 'Unknown Mentor',
          })),
        );
        setReportRows([]);
        setDataLoading(false);
        return;
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, name, email, prn, cgpa, created_at')
        .in('id', studentIds);

      if (studentsError) {
        toast.error('Unable to load students: ' + studentsError.message);
        setDataLoading(false);
        return;
      }

      const { data: progressRows, error: progressError } = await supabase
        .from('progress')
        .select('student_id, entry_type, certification_type, score, created_at, verification_status')
        .in('student_id', studentIds);

      if (progressError) {
        toast.error('Unable to load progress data: ' + progressError.message);
        setDataLoading(false);
        return;
      }

      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('id, batch_id, scheduled_at')
        .in('batch_id', batchIds);

      if (meetingsError) {
        toast.error('Unable to load meetings data: ' + meetingsError.message);
        setDataLoading(false);
        return;
      }

      const meetingIds = (meetingsData || []).map((meeting) => meeting.id).filter(Boolean);
      let attendanceRows = [];
      if (meetingIds.length > 0) {
        const { data: fetchedAttendanceRows, error: attendanceError } = await supabase
          .from('meeting_attendance')
          .select('student_id, meeting_id, present')
          .in('student_id', studentIds)
          .in('meeting_id', meetingIds);

        if (attendanceError) {
          toast.error('Unable to load attendance data: ' + attendanceError.message);
          setDataLoading(false);
          return;
        }
        attendanceRows = fetchedAttendanceRows || [];
      }

      const studentById = new Map((studentsData || []).map((student) => [student.id, student]));
      const batchById = new Map((batchesData || []).map((batch) => [batch.id, batch]));

      const progressCountByStudent = new Map();
      const latestReportScoreByStudent = new Map();
      const categoryCountByStudent = new Map();

      (progressRows || []).forEach((entry) => {
        const currentCount = progressCountByStudent.get(entry.student_id) || 0;
        progressCountByStudent.set(entry.student_id, currentCount + 1);
        const category = normalizeProgressCategory(entry);
        const categoryCounts = categoryCountByStudent.get(entry.student_id) || {
          certification_count: 0,
          hackathon_count: 0,
          sports_count: 0,
          competition_count: 0,
          achievement_count: 0,
          cgpa_count: 0,
        };
        categoryCounts[`${category}_count`] = (categoryCounts[`${category}_count`] || 0) + 1;
        categoryCountByStudent.set(entry.student_id, categoryCounts);

        if (entry.entry_type === 'report' && entry.score != null && !Number.isNaN(Number(entry.score))) {
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

      const formattedRows = assignments.map((assignment) => {
        const student = studentById.get(assignment.student_id);
        const batch = batchById.get(assignment.batch_id);
        const mentorName = mentorById.get(batch?.mentor_id) || 'Unknown Mentor';
        const registeredAt = student?.created_at ? new Date(student.created_at) : new Date(0);

        const studentMeetings = (meetingsData || []).filter(
          (meeting) => meeting.batch_id === assignment.batch_id && new Date(meeting.scheduled_at) >= registeredAt,
        );

        const attendedCount = (attendanceRows || []).filter(
          (att) =>
            att.student_id === assignment.student_id &&
            att.present &&
            studentMeetings.some((meeting) => meeting.id === att.meeting_id),
        ).length;

        const reportScore = latestReportScoreByStudent.get(assignment.student_id)?.score ?? 'N/A';
        const categoryCounts = categoryCountByStudent.get(assignment.student_id) || {
          certification_count: 0,
          hackathon_count: 0,
          sports_count: 0,
          competition_count: 0,
          achievement_count: 0,
          cgpa_count: 0,
        };
        const joiningDateValue = assignment.start_date ?? assignment.joining_date ?? null;
        const endingDateValue = assignment.end_date ?? assignment.ending_date ?? null;

        return {
          student_id: assignment.student_id,
          mentor_id: batch?.mentor_id || '',
          mentor_name: mentorName,
          batch_id: assignment.batch_id,
          batch_name: batch?.name || 'N/A',
          name: student?.name || 'N/A',
          prn: student?.prn || 'N/A',
          email: student?.email || 'N/A',
          meetings_attended: `${attendedCount}/${studentMeetings.length}`,
          progress_count: progressCountByStudent.get(assignment.student_id) || 0,
          report_score: reportScore,
          cgpa: student?.cgpa ?? 'N/A',
          certification_count: categoryCounts.certification_count || 0,
          hackathon_count: categoryCounts.hackathon_count || 0,
          sports_count: categoryCounts.sports_count || 0,
          competition_count: categoryCounts.competition_count || 0,
          achievement_count: categoryCounts.achievement_count || 0,
          cgpa_count: categoryCounts.cgpa_count || 0,
          joining_date: formatDateForExport(joiningDateValue),
          ending_date: formatDateForExport(endingDateValue),
        };
      });

      formattedRows.sort(
        (a, b) =>
          a.mentor_name.localeCompare(b.mentor_name) ||
          a.batch_name.localeCompare(b.batch_name) ||
          a.name.localeCompare(b.name),
      );

      setMentorOptions(
        (mentorsData || [])
          .map((mentor) => ({
            id: mentor.id,
            name: mentor.full_name || mentor.name || mentor.email || 'Unknown Mentor',
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setBatchOptions(
        (batchesData || []).map((batch) => ({
          id: batch.id,
          name: batch.name || 'Unnamed Batch',
          mentorId: batch.mentor_id,
          mentorName: mentorById.get(batch.mentor_id) || 'Unknown Mentor',
        })),
      );
      setAllProgressRows(progressRows || []);
      setReportRows(formattedRows);
      setDataLoading(false);
    };

    if (!loading && user) {
      fetchReportData();
    }
  }, [loading, user]);

  const visibleBatches = useMemo(() => {
    if (selectedMentorId === 'all') return batchOptions;
    return batchOptions.filter((batch) => batch.mentorId === selectedMentorId);
  }, [batchOptions, selectedMentorId]);

  const selectedScopeBatchIds = useMemo(() => {
    if (batchSelectionMode === 'specific' && selectedBatchIds.length > 0) return selectedBatchIds;
    return visibleBatches.map((batch) => batch.id);
  }, [batchSelectionMode, selectedBatchIds, visibleBatches]);

  const filteredRows = useMemo(() => {
    return reportRows.filter((row) => {
      const mentorMatch = selectedMentorId === 'all' || row.mentor_id === selectedMentorId;
      const batchMatch = selectedScopeBatchIds.includes(row.batch_id);
      return mentorMatch && batchMatch;
    });
  }, [reportRows, selectedMentorId, selectedScopeBatchIds]);

  const comparisonBarColors = useMemo(
    () => ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#4f46e5'],
    [],
  );

  const scopedStudentIds = useMemo(
    () => Array.from(new Set(filteredRows.map((row) => row.student_id).filter(Boolean))),
    [filteredRows],
  );

  const scopedProgressRows = useMemo(
    () => allProgressRows.filter((entry) => scopedStudentIds.includes(entry.student_id)),
    [allProgressRows, scopedStudentIds],
  );

  const analytics = useMemo(() => {
    const studentInfoById = new Map(filteredRows.map((row) => [row.student_id, row]));
    const performance = {};
    const categoryStats = {
      certification: { total: 0, verified: 0, totalScore: 0 },
      hackathon: { total: 0, verified: 0, totalScore: 0 },
      sports: { total: 0, verified: 0, totalScore: 0 },
      competition: { total: 0, verified: 0, totalScore: 0 },
      cgpa: { total: 0, verified: 0, totalScore: 0 },
      achievement: { total: 0, verified: 0, totalScore: 0 },
    };

    for (const studentId of scopedStudentIds) {
      const row = studentInfoById.get(studentId);
      performance[studentId] = {
        name: row?.name || 'Unknown',
        categories: {
          certification: [],
          hackathon: [],
          sports: [],
          competition: [],
          cgpa: [],
          achievement: [],
        },
        overall: { totalScore: 0, count: 0 },
      };
    }

    (scopedProgressRows || []).forEach((entry) => {
      if (!performance[entry.student_id]) return;
      const category = normalizeProgressCategory(entry);
      const scoreValue = entry.score != null ? Number(entry.score) : null;
      categoryStats[category].total++;

      if (category === 'cgpa') {
        categoryStats[category].verified++;
        if (scoreValue != null && !Number.isNaN(scoreValue)) {
          categoryStats[category].totalScore += scoreValue;
          performance[entry.student_id].categories.cgpa.push(scoreValue);
        }
      } else if (entry.verification_status === 'verified') {
        categoryStats[category].verified++;
        if (scoreValue != null && !Number.isNaN(scoreValue)) {
          categoryStats[category].totalScore += scoreValue;
          performance[entry.student_id].categories[category].push(scoreValue);
          performance[entry.student_id].overall.totalScore += scoreValue;
          performance[entry.student_id].overall.count++;
        }
      }
    });

    Object.keys(categoryStats).forEach((category) => {
      const stat = categoryStats[category];
      stat.avgScore = stat.verified > 0 ? Number((stat.totalScore / stat.verified).toFixed(1)) : 0;
    });

    const students = Object.entries(performance)
      .map(([studentId, data]) => {
        const categories = Object.entries(data.categories)
          .map(([category, scores]) => ({
            category,
            avgScore:
              scores.length > 0
                ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
                : 0,
            count: scores.length,
          }))
          .filter((cat) => cat.count > 0);

        const overallAvg =
          data.overall.count > 0 ? Number((data.overall.totalScore / data.overall.count).toFixed(1)) : 0;

        return {
          studentId,
          name: data.name,
          categories,
          totalEntries: data.overall.count,
          overallAvg,
        };
      })
      .sort((a, b) => b.overallAvg - a.overallAvg);

    return { performance, categoryStats, students };
  }, [filteredRows, scopedProgressRows, scopedStudentIds]);

  const categoryChartData = useMemo(
    () =>
      Object.entries(analytics.categoryStats || {}).map(([category, stats]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        total: stats.total,
        verified: stats.verified,
        avgScore: stats.avgScore,
      })),
    [analytics.categoryStats],
  );

  const comparisonCategoryOptions = useMemo(
    () => [
      { value: 'overall', label: 'Overall' },
      { value: 'certification', label: 'Certification' },
      { value: 'hackathon', label: 'Hackathon' },
      { value: 'sports', label: 'Sports' },
      { value: 'competition', label: 'Competition' },
      { value: 'cgpa', label: 'CGPA' },
      { value: 'achievement', label: 'Achievement' },
    ],
    [],
  );

  const selectedComparisonCategoryLabel = useMemo(
    () => comparisonCategoryOptions.find((option) => option.value === selectedComparisonCategory)?.label || 'Overall',
    [comparisonCategoryOptions, selectedComparisonCategory],
  );

  const studentComparisonData = useMemo(() => {
    const rowByStudentId = new Map(filteredRows.map((row) => [row.student_id, row]));
    const mapped = analytics.students.map((student) => {
      const baseRow = rowByStudentId.get(student.studentId);
      if (selectedComparisonCategory === 'overall') {
        return {
          name: student.name.split(' ').slice(0, 2).join(' '),
          avgScore: student.overallAvg || 0,
          fullName: student.name,
          entries: student.totalEntries || 0,
          prn: baseRow?.prn || 'N/A',
        };
      }

      const categoryScores =
        analytics.performance?.[student.studentId]?.categories?.[selectedComparisonCategory] || [];
      const avgCategoryScore =
        categoryScores.length > 0
          ? Number((categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length).toFixed(1))
          : 0;

      return {
        name: student.name.split(' ').slice(0, 2).join(' '),
        avgScore: avgCategoryScore,
        fullName: student.name,
        entries: categoryScores.length,
        prn: baseRow?.prn || 'N/A',
      };
    });

    return mapped.sort((a, b) => b.avgScore - a.avgScore || a.fullName.localeCompare(b.fullName));
  }, [analytics.performance, analytics.students, filteredRows, selectedComparisonCategory]);

  const comparisonExtremes = useMemo(() => {
    if (studentComparisonData.length === 0) return { top: null, low: null, tiedLow: [] };
    const lowestScore = studentComparisonData[studentComparisonData.length - 1].avgScore;
    const tiedLow = studentComparisonData.filter((student) => student.avgScore === lowestScore);
    return {
      top: studentComparisonData[0],
      low: studentComparisonData[studentComparisonData.length - 1],
      tiedLow,
    };
  }, [studentComparisonData]);

  const sixCategoryStudentChartData = useMemo(() => {
    const categories = ['hackathon', 'certification', 'competition', 'sports', 'achievement', 'cgpa'];
    return analytics.students.map((student) => {
      const categoryData = categories.reduce((acc, category) => {
        const scores = analytics.performance?.[student.studentId]?.categories?.[category] || [];
        const avgScore =
          scores.length > 0 ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : 0;
        acc[`${category}Score`] = avgScore;
        acc[`${category}Count`] = scores.length;
        return acc;
      }, {});

      return {
        name: student.name.split(' ').slice(0, 2).join(' '),
        fullName: student.name,
        ...categoryData,
      };
    });
  }, [analytics.performance, analytics.students]);

  const summaryStats = useMemo(() => {
    const totalEntries = scopedProgressRows.length;
    const verifiedEntries = scopedProgressRows.filter(
      (entry) => normalizeProgressCategory(entry) === 'cgpa' || entry.verification_status === 'verified',
    ).length;
    const activeStudents = analytics.students.filter((student) => student.totalEntries > 0).length;
    return { totalEntries, verifiedEntries, activeStudents };
  }, [analytics.students, scopedProgressRows]);

  useEffect(() => {
    const visibleBatchIds = new Set(visibleBatches.map((batch) => batch.id));
    setSelectedBatchIds((current) => current.filter((id) => visibleBatchIds.has(id)));
  }, [visibleBatches]);

  useEffect(() => {
    if (batchSelectionMode === 'all') {
      setSelectedBatchIds([]);
    }
  }, [batchSelectionMode]);

  const toggleBatchSelection = (batchId, checked) => {
    setSelectedBatchIds((current) => {
      if (checked) {
        return current.includes(batchId) ? current : [...current, batchId];
      }
      return current.filter((id) => id !== batchId);
    });
  };

  const clearBatchSelection = () => setSelectedBatchIds([]);

  const handleDownloadFilteredCsv = async () => {
    setExporting(true);
    try {
      if (filteredRows.length === 0) {
        toast.info('No rows available for the selected filters.');
        return;
      }

      const columns = [
        { key: 'mentor_name', label: 'Mentor' },
        { key: 'name', label: 'Name' },
        { key: 'prn', label: 'PRN' },
        { key: 'batch_name', label: 'Batch Name' },
        { key: 'email', label: 'Email' },
        { key: 'meetings_attended', label: 'Meetings Attended' },
        { key: 'progress_count', label: 'No of Progress Added' },
        { key: 'report_score', label: 'Report Score' },
        { key: 'cgpa', label: 'CGPA' },
        { key: 'certification_count', label: 'Certification Count' },
        { key: 'hackathon_count', label: 'Hackathon Count' },
        { key: 'sports_count', label: 'Sports Count' },
        { key: 'competition_count', label: 'Competition Count' },
        { key: 'achievement_count', label: 'Achievement Count' },
        { key: 'cgpa_count', label: 'CGPA Entry Count' },
        { key: 'joining_date', label: 'Joining Date in Batch' },
        { key: 'ending_date', label: 'Ending Date in Batch' },
      ];

      const header = columns.map((column) => csvEscape(column.label)).join(',');
      const rows = filteredRows.map((row) => columns.map((column) => csvEscape(row[column.key])).join(','));
      const csvContent = `\uFEFF${[header, ...rows].join('\n')}`;
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hod-progress-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <Card className="p-6 border-border">
        <p className="text-sm text-muted-foreground">Loading progress report...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Progress Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by mentor and batch, then review the same report view used in mentor progress exports.
        </p>
      </div>

      <Card className="p-3 border-border space-y-3 max-w-full overflow-hidden">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_220px_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label>Mentor</Label>
            <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
              <SelectTrigger className="h-9 bg-card border-border">
                <SelectValue placeholder="Select mentor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Mentors</SelectItem>
                {mentorOptions.map((mentor) => (
                  <SelectItem key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Batch Scope</Label>
            <Select value={batchSelectionMode} onValueChange={setBatchSelectionMode}>
              <SelectTrigger className="h-9 bg-card border-border">
                <SelectValue placeholder="Select batch scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="specific">Particular Batches</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Batches (checkbox filter)</Label>
              <Button variant="outline" size="sm" onClick={clearBatchSelection}>
                Select All
              </Button>
            </div>
            <div className="max-h-24 overflow-y-auto overflow-x-hidden rounded-md border border-border p-1.5">
              {batchSelectionMode === 'all' ? (
                <p className="text-xs text-muted-foreground px-1 py-1">All visible batches are selected.</p>
              ) : visibleBatches.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1 py-1">No batches available for this mentor.</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {visibleBatches.map((batch) => {
                    const checked = selectedBatchIds.includes(batch.id);
                    return (
                      <label key={batch.id} className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/40">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleBatchSelection(batch.id, Boolean(value))}
                        />
                        <span className="text-sm truncate">{batch.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {batchSelectionMode === 'all'
                ? 'Switch to Particular Batches to choose specific batches.'
                : 'No checkbox selected means all visible batches are included.'}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">These filters apply to all analytics and report sections below.</p>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge className="bg-primary/20 text-primary">Rows: {filteredRows.length}</Badge>
          <Button className="h-9 gap-2" variant="outline" onClick={handleDownloadFilteredCsv} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? 'Preparing Report...' : 'Download Filtered Report'}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4 border-border">
          <p className="text-sm text-muted-foreground">Total Progress Entries</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{summaryStats.totalEntries}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-sm text-muted-foreground">Verified/Counted Entries</p>
          <p className="mt-1 text-2xl font-bold text-primary">{summaryStats.verifiedEntries}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-sm text-muted-foreground">Active Students</p>
          <p className="mt-1 text-2xl font-bold text-accent">{summaryStats.activeStudents}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categoryChartData.map((category) => (
          <Card key={category.category} className="p-4 border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-foreground">{category.category}</h3>
              <Badge className="bg-primary/20 text-primary">
                {category.verified}/{category.total}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verified</span>
                <span className="font-medium">{category.verified}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Score</span>
                <span className="font-medium">{category.avgScore}/10</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card p-4 max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-semibold text-foreground">{selectedComparisonCategoryLabel} Student Comparison</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter</span>
            <Select value={selectedComparisonCategory} onValueChange={setSelectedComparisonCategory}>
              <SelectTrigger className="w-44 bg-card border-border">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {comparisonCategoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ChartContainer
          className="h-80 w-full"
          config={{ avgScore: { label: `${selectedComparisonCategoryLabel} Score`, color: 'hsl(var(--primary))' } }}
        >
          <BarChart data={studentComparisonData} margin={{ left: 12, right: 12, top: 8, bottom: 40 }} barCategoryGap="2%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={-35}
              textAnchor="end"
              height={60}
              style={{ fontSize: '11px' }}
            />
            <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
            <ChartTooltip
              cursor={{ fill: 'var(--accent)' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  formatter={(value) => [`${value}/10`, `${selectedComparisonCategoryLabel} Avg Score`]}
                />
              }
            />
            <Bar dataKey="avgScore" radius={[4, 4, 0, 0]} animationDuration={700} barSize={25}>
              {studentComparisonData.map((entry, index) => (
                <Cell key={`comparison-bar-${entry.fullName}-${index}`} fill={comparisonBarColors[index % comparisonBarColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {comparisonExtremes.top && comparisonExtremes.low && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Top Performer ({selectedComparisonCategoryLabel})
              </p>
              <p className="text-sm font-semibold text-foreground">{comparisonExtremes.top.fullName}</p>
              <p className="text-xs text-muted-foreground">Score: {comparisonExtremes.top.avgScore}/10</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Low Performer ({selectedComparisonCategoryLabel})
              </p>
              {comparisonExtremes.tiedLow.length > 1 ? (
                <div className="space-y-1">
                  {comparisonExtremes.tiedLow.map((student) => (
                    <p key={`${student.fullName}-${student.prn}`} className="text-sm font-semibold text-foreground">
                      {student.fullName} (PRN: {student.prn})
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">Score: {comparisonExtremes.low.avgScore}/10</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    {comparisonExtremes.low.fullName} (PRN: {comparisonExtremes.low.prn})
                  </p>
                  <p className="text-xs text-muted-foreground">Score: {comparisonExtremes.low.avgScore}/10</p>
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="border-border bg-card p-4 max-w-full overflow-hidden">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Student-wise Category Comparison</h2>
          <p className="text-xs text-muted-foreground">
            6 bars per student: Hackathon, Certification, Competition, Sports, Achievement, CGPA.
          </p>
        </div>
        <ChartContainer
          className="h-[420px] w-full"
          config={{
            hackathonScore: { label: 'Hackathon', color: '#16a34a' },
            certificationScore: { label: 'Certification', color: '#9333ea' },
            competitionScore: { label: 'Competition', color: '#ef4444' },
            sportsScore: { label: 'Sports', color: '#f472b6' },
            achievementScore: { label: 'Achievement', color: '#1d4ed8' },
            cgpaScore: { label: 'CGPA', color: '#f59e0b' },
          }}
        >
          <BarChart data={sixCategoryStudentChartData} margin={{ left: 12, right: 12, top: 8, bottom: 64 }} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={-35}
              textAnchor="end"
              height={72}
              style={{ fontSize: '11px' }}
            />
            <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
            <ChartTooltip
              cursor={{ fill: 'var(--accent)' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  formatter={(value, name, item) => {
                    const dataKey = item?.dataKey || '';
                    const categoryPrefix = String(dataKey).replace('Score', '');
                    const count = item?.payload?.[`${categoryPrefix}Count`] ?? 0;
                    return [`${value}/10 (Count: ${count})`, String(name)];
                  }}
                />
              }
            />
            <Bar dataKey="hackathonScore" name="Hackathon" fill="#16a34a" radius={[3, 3, 0, 0]} barSize={14} />
            <Bar dataKey="certificationScore" name="Certification" fill="#9333ea" radius={[3, 3, 0, 0]} barSize={14} />
            <Bar dataKey="competitionScore" name="Competition" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={14} />
            <Bar dataKey="sportsScore" name="Sports" fill="#f472b6" radius={[3, 3, 0, 0]} barSize={14} />
            <Bar dataKey="achievementScore" name="Achievement" fill="#1d4ed8" radius={[3, 3, 0, 0]} barSize={14} />
            <Bar dataKey="cgpaScore" name="CGPA" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={14} />
          </BarChart>
        </ChartContainer>
      </Card>

      <Card className="p-4 border-border max-w-full overflow-hidden">
        {filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No report data found for the selected filters.</p>
        ) : (
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="whitespace-normal break-words text-xs">Mentor</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Name</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">PRN</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Batch</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Email</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Meetings Attended</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Progress Count</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Report Score</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">CGPA</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Certification Count</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Hackathon Count</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Sports Count</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Competition Count</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Achievement Count</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">CGPA Entry Count</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Joining Date</TableHead>
                <TableHead className="whitespace-normal break-words text-xs">Ending Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row, index) => (
                <TableRow key={`${row.batch_id}-${row.email}-${index}`} className="border-border hover:bg-secondary/30">
                  <TableCell className="whitespace-normal break-all text-xs">{row.mentor_name}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.name}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.prn}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.batch_name}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs text-muted-foreground">{row.email}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.meetings_attended}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.progress_count}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.report_score}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.cgpa}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.certification_count}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.hackathon_count}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.sports_count}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.competition_count}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.achievement_count}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.cgpa_count}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.joining_date}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{row.ending_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
