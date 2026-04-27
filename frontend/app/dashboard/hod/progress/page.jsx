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

export default function HODProgressPage() {
  const { user, loading } = useUser();
  const supabase = createClient();

  const [mentorOptions, setMentorOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [reportRows, setReportRows] = useState([]);
  const [allProgressRows, setAllProgressRows] = useState([]);
  const [selectedMentorId, setSelectedMentorId] = useState('all');
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
      const assignmentResult = await supabase
        .from('batch_students')
        .select('batch_id, student_id, start_date, end_date')
        .in('batch_id', batchIds);

      if (assignmentResult.error && assignmentResult.error.message?.toLowerCase().includes('column')) {
        const fallbackAssignments = await supabase
          .from('batch_students')
          .select('batch_id, student_id')
          .in('batch_id', batchIds);
        if (fallbackAssignments.error) {
          toast.error('Unable to load batch assignments: ' + fallbackAssignments.error.message);
          setDataLoading(false);
          return;
        }
        assignments = fallbackAssignments.data || [];
      } else if (assignmentResult.error) {
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

      (progressRows || []).forEach((entry) => {
        const currentCount = progressCountByStudent.get(entry.student_id) || 0;
        progressCountByStudent.set(entry.student_id, currentCount + 1);

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
          joining_date: formatDateForExport(assignment.start_date),
          ending_date: formatDateForExport(assignment.end_date),
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
    if (selectedBatchIds.length > 0) return selectedBatchIds;
    return visibleBatches.map((batch) => batch.id);
  }, [selectedBatchIds, visibleBatches]);

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

  const normalizeCategory = (entry) => {
    const typeValue = entry.entry_type || entry.certification_type || 'achievement';
    if (typeValue === 'marks') return 'cgpa';
    if (typeValue === 'skill' || typeValue === 'certification') return 'certification';
    if (['hackathon', 'sports', 'competition', 'achievement', 'cgpa'].includes(typeValue)) return typeValue;
    return 'achievement';
  };

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
      const category = normalizeCategory(entry);
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
    const mapped = analytics.students.map((student) => {
      if (selectedComparisonCategory === 'overall') {
        return {
          name: student.name.split(' ').slice(0, 2).join(' '),
          avgScore: student.overallAvg || 0,
          fullName: student.name,
          entries: student.totalEntries || 0,
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
      };
    });

    return mapped.sort((a, b) => b.avgScore - a.avgScore || a.fullName.localeCompare(b.fullName));
  }, [analytics.performance, analytics.students, selectedComparisonCategory]);

  const comparisonExtremes = useMemo(() => {
    if (studentComparisonData.length === 0) return { top: null, low: null };
    return {
      top: studentComparisonData[0],
      low: studentComparisonData[studentComparisonData.length - 1],
    };
  }, [studentComparisonData]);

  const summaryStats = useMemo(() => {
    const totalEntries = scopedProgressRows.length;
    const verifiedEntries = scopedProgressRows.filter(
      (entry) => normalizeCategory(entry) === 'cgpa' || entry.verification_status === 'verified',
    ).length;
    const activeStudents = analytics.students.filter((student) => student.totalEntries > 0).length;
    return { totalEntries, verifiedEntries, activeStudents };
  }, [analytics.students, scopedProgressRows]);

  useEffect(() => {
    const visibleBatchIds = new Set(visibleBatches.map((batch) => batch.id));
    setSelectedBatchIds((current) => current.filter((id) => visibleBatchIds.has(id)));
  }, [visibleBatches]);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Progress Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by mentor and batch, then review the same report view used in mentor progress exports.
        </p>
      </div>

      <Card className="p-4 border-border space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label>Mentor</Label>
            <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
              <SelectTrigger className="bg-card border-border">
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
            <div className="flex items-center justify-between">
              <Label>Batches (checkbox filter)</Label>
              <Button variant="outline" size="sm" onClick={clearBatchSelection}>
                Select All
              </Button>
            </div>
            <div className="max-h-32 overflow-auto rounded-md border border-border p-2">
              {visibleBatches.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1 py-1">No batches available for this mentor.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {visibleBatches.map((batch) => {
                    const checked = selectedBatchIds.includes(batch.id);
                    return (
                      <label key={batch.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleBatchSelection(batch.id, Boolean(value))}
                        />
                        <span className="text-sm">{batch.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              No checkbox selected means all visible batches are included.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">These filters apply to all analytics and report sections below.</p>

        <div className="flex items-center gap-3 flex-wrap">
          <Badge className="bg-primary/20 text-primary">Rows: {filteredRows.length}</Badge>
          <Button className="gap-2" variant="outline" onClick={handleDownloadFilteredCsv} disabled={exporting}>
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

      <Card className="border-border bg-card p-4">
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
              <p className="text-sm font-semibold text-foreground">{comparisonExtremes.low.fullName}</p>
              <p className="text-xs text-muted-foreground">Score: {comparisonExtremes.low.avgScore}/10</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 border-border">
        {filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No report data found for the selected filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Mentor</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>PRN</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Meetings Attended</TableHead>
                <TableHead>Progress Count</TableHead>
                <TableHead>Report Score</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead>Ending Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row, index) => (
                <TableRow key={`${row.batch_id}-${row.email}-${index}`} className="border-border hover:bg-secondary/30">
                  <TableCell>{row.mentor_name}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.prn}</TableCell>
                  <TableCell>{row.batch_name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.email}</TableCell>
                  <TableCell>{row.meetings_attended}</TableCell>
                  <TableCell>{row.progress_count}</TableCell>
                  <TableCell>{row.report_score}</TableCell>
                  <TableCell>{row.cgpa}</TableCell>
                  <TableCell>{row.joining_date}</TableCell>
                  <TableCell>{row.ending_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
