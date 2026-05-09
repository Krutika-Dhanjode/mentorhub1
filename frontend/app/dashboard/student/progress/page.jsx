'use client';
import { toast } from "sonner";

import { useEffect, useMemo, useState } from 'react';
import { Plus, TrendingUp, Award, FileText, Upload, Paperclip, Trash2, Users } from 'lucide-react';
import { CartesianGrid, Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

export default function StudentProgressPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [progress, setProgress] = useState([]);
    const [mentorScore, setMentorScore] = useState(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingEntryId, setDeletingEntryId] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const [categoryComparisonData, setCategoryComparisonData] = useState([]);
    const [peerStudentCount, setPeerStudentCount] = useState(0);
    const [peerNames, setPeerNames] = useState([]);
    const [newEntry, setNewEntry] = useState({
        type: '',
        title: '',
        description: '',
        cgpa: '',
        certificationType: '',
    });

    const fetchProgress = async () => {
        if (!user) return;
        setDataLoading(true);
        const { data: studentProfile } = await supabase
            .from('users')
            .select('mentor_report_score')
            .eq('id', user.id)
            .maybeSingle();
        setMentorScore(studentProfile?.mentor_report_score ?? null);
        const { data, error } = await supabase
            .from('progress')
            .select('*')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching progress entries:', error.message);
            setProgress([]);
            setDataLoading(false);
            return;
        }
        const formattedEntries = (data || []).map((entry) => {
            const rawTypeValue = entry.entry_type || entry.certification_type || 'achievement';
            const typeValue = String(rawTypeValue).trim().toLowerCase();
            const certificationType = typeValue === 'marks' ? 'cgpa'
                : typeValue === 'skill' || typeValue === 'certification' ? 'certification'
                : ['cgpa', 'hackathon', 'sports', 'competition', 'achievement'].includes(typeValue)
                    ? typeValue
                    : 'achievement';
            const isCgpa = certificationType === 'cgpa';

            return {
                id: entry.id,
                entryType: typeValue,
                certificationType,
                title: entry.title,
                description: entry.description || 'No description provided',
                valueText: entry.value_text || (entry.score != null ? String(entry.score) : ''),
                numericValue: entry.score != null ? Number(entry.score) : null,
                attachmentNames: entry.attachment_names || [],
                attachmentUrls: entry.attachments || [],
                createdAt: entry.created_at || entry.date,
                verificationStatus: entry.verification_status || 'pending',
                mentorScore: !isCgpa && entry.score != null ? Number(entry.score) : null,
                mentorFeedback: entry.mentor_feedback || null,
                verifiedAt: entry.verified_at || null,
            };
        });
        setProgress(formattedEntries);

        const normalizeComparisonCategory = (row) => {
            const rawType = row.entry_type || row.certification_type || 'achievement';
            const value = String(rawType).trim().toLowerCase();
            if (value === 'marks' || value === 'cgpa') return 'cgpa';
            if (value === 'skill' || value === 'certification') return 'certification';
            if (['hackathon', 'sports', 'competition', 'achievement'].includes(value)) return value;
            return 'achievement';
        };

        const { data: ownAssignments, error: ownAssignmentsError } = await supabase
            .from('batch_students')
            .select('batch_id')
            .eq('student_id', user.id);

        if (ownAssignmentsError) {
            console.error('Error fetching student batch assignments:', ownAssignmentsError.message);
            setCategoryComparisonData([]);
            setPeerStudentCount(0);
            setDataLoading(false);
            return;
        }

        const batchIds = Array.from(new Set((ownAssignments || []).map((row) => row.batch_id).filter(Boolean)));
        if (batchIds.length === 0) {
            setCategoryComparisonData([]);
            setPeerStudentCount(0);
            setDataLoading(false);
            return;
        }

        const { data: peerAssignments, error: peerAssignmentsError } = await supabase
            .from('batch_students')
            .select('student_id')
            .in('batch_id', batchIds);

        if (peerAssignmentsError) {
            console.error('Error fetching peer assignments:', peerAssignmentsError.message);
            setCategoryComparisonData([]);
            setPeerStudentCount(0);
            setDataLoading(false);
            return;
        }

        const cohortStudentIds = Array.from(new Set((peerAssignments || []).map((row) => row.student_id).filter(Boolean)));
        if (cohortStudentIds.length === 0) {
            setCategoryComparisonData([]);
            setPeerStudentCount(0);
            setDataLoading(false);
            return;
        }

        const { data: cohortProgressRows, error: cohortProgressError } = await supabase
            .from('progress')
            .select('student_id, entry_type, certification_type, score, verification_status')
            .in('student_id', cohortStudentIds);

        if (cohortProgressError) {
            console.error('Error fetching cohort progress:', cohortProgressError.message);
            setCategoryComparisonData([]);
            setPeerStudentCount(0);
            setDataLoading(false);
            return;
        }

        const categories = ['cgpa', 'certification', 'hackathon', 'sports', 'competition', 'achievement'];
        const statsByStudent = new Map();
        cohortStudentIds.forEach((studentId) => {
            statsByStudent.set(studentId, categories.reduce((acc, cat) => {
                acc[cat] = { total: 0, count: 0 };
                return acc;
            }, {}));
        });

        (cohortProgressRows || []).forEach((row) => {
            const studentStats = statsByStudent.get(row.student_id);
            if (!studentStats) return;
            const category = normalizeComparisonCategory(row);
            const scoreValue = row.score != null ? Number(row.score) : null;
            if (scoreValue == null || Number.isNaN(scoreValue)) return;
            const isValid = category === 'cgpa' || row.verification_status === 'verified';
            if (!isValid) return;
            studentStats[category].total += scoreValue;
            studentStats[category].count += 1;
        });

        const peerIds = cohortStudentIds.filter((id) => id !== user.id);
        setPeerStudentCount(peerIds.length);

        let peerNamesList = [];
        const peerNameById = new Map();
        if (peerIds.length > 0) {
            const { data: peerUsers, error: peerUsersError } = await supabase
                .from('users')
                .select('id, name')
                .in('id', peerIds);
            if (peerUsersError) {
                console.error('Error fetching peer names:', peerUsersError.message);
                setPeerNames([]);
            } else {
                (peerUsers || []).forEach((row) => {
                    peerNameById.set(row.id, row.name || 'Unknown');
                });
                peerNamesList = (peerUsers || [])
                    .map((row) => row.name)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
                setPeerNames(peerNamesList);
            }
        } else {
            setPeerNames([]);
        }

        const comparisonRows = [
            { key: 'cgpa', label: 'CGPA', yourFill: '#2563eb', peersFill: '#93c5fd' },
            { key: 'certification', label: 'Certification', yourFill: '#7c3aed', peersFill: '#c4b5fd' },
            { key: 'hackathon', label: 'Hackathon', yourFill: '#ea580c', peersFill: '#fdba74' },
            { key: 'sports', label: 'Sports', yourFill: '#16a34a', peersFill: '#86efac' },
            { key: 'competition', label: 'Competition', yourFill: '#db2777', peersFill: '#f9a8d4' },
            { key: 'achievement', label: 'Achievement', yourFill: '#0891b2', peersFill: '#67e8f9' },
        ].map(({ key, label, yourFill, peersFill }) => {
            const yourStats = statsByStudent.get(user.id)?.[key] || { total: 0, count: 0 };
            const yourAvg = yourStats.count > 0 ? Number((yourStats.total / yourStats.count).toFixed(1)) : 0;

            let peerTotal = 0;
            let peerCount = 0;
            let peerStudentsWithData = 0;
            const peerBreakdownList = [];
            peerIds.forEach((peerId) => {
                const peerStats = statsByStudent.get(peerId)?.[key];
                if (!peerStats || peerStats.count === 0) return;
                peerTotal += peerStats.total;
                peerCount += peerStats.count;
                peerStudentsWithData += 1;
                const peerAvg = Number((peerStats.total / peerStats.count).toFixed(1));
                peerBreakdownList.push(`${peerNameById.get(peerId) || 'Unknown'}: ${peerAvg}`);
            });

            const peersAvg = peerCount > 0 ? Number((peerTotal / peerCount).toFixed(1)) : 0;
            return {
                category: label,
                yourScore: yourAvg,
                peersScore: peersAvg,
                yourCount: yourStats.count,
                peerStudentsWithData,
                peerNamesText: peerStudentsWithData > 0 ? peerNamesList.join(', ') : 'No peer data yet',
                peerBreakdownText: peerBreakdownList.length > 0 ? peerBreakdownList.join(' | ') : 'No peer data yet',
                yourFill,
                peersFill,
            };
        });

        setCategoryComparisonData(comparisonRows);
        setDataLoading(false);
    };

    useEffect(() => {
        if (!loading && user) {
            fetchProgress();
        }
    }, [loading, user]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
    };

    const handleAddProgress = async () => {
        if (!user || !newEntry.type || !newEntry.title || !newEntry.description)
            return;
        const isCgpaEntry = newEntry.type === 'cgpa';
        const parsedCgpa = isCgpaEntry ? Number(newEntry.cgpa) : null;
        if (isCgpaEntry) {
            if (!Number.isFinite(parsedCgpa)) {
                toast.error('Please enter a valid CGPA value.');
                return;
            }
            if (parsedCgpa < 0 || parsedCgpa > 10) {
                toast.error('CGPA must be between 0 and 10.');
                return;
            }
        }
        setIsSaving(true);
        let attachmentUrl = '';
        let attachmentName = '';
        if (selectedFile) {
            const sanitizedFileName = selectedFile.name.replace(/\s+/g, '-');
            const attachmentPath = `${user.id}/${Date.now()}-${sanitizedFileName}`;
            const { error: uploadError } = await supabase
                .storage
                .from('student-progress')
                .upload(attachmentPath, selectedFile, {
                upsert: false,
            });
            if (uploadError) {
                toast.error('File upload failed: ' + uploadError.message);
                setIsSaving(false);
                return;
            }
            const { data: publicUrlData } = supabase
                .storage
                .from('student-progress')
                .getPublicUrl(attachmentPath);
            attachmentUrl = publicUrlData.publicUrl;
            attachmentName = selectedFile.name;
        }
        const { error } = await supabase
            .from('progress')
            .insert({
            student_id: user.id,
            entry_type: newEntry.type,
            title: newEntry.title,
            description: newEntry.description,
            score: isCgpaEntry ? Number(parsedCgpa.toFixed(2)) : null,
            value_text: isCgpaEntry ? parsedCgpa.toFixed(2) : null,
            attachments: attachmentUrl ? [attachmentUrl] : [],
            attachment_names: attachmentName ? [attachmentName] : [],
        });
        if (error) {
            toast.error('Error saving progress: ' + error.message);
            setIsSaving(false);
            return;
        }
        setNewEntry({ type: '', title: '', description: '', cgpa: '', certificationType: '' });
        setSelectedFile(null);
        setIsAddOpen(false);
        setIsSaving(false);
        await fetchProgress();
    };

    const handleDeleteProgress = async (entryId) => {
        if (!user || !entryId)
            return;
        const confirmed = window.confirm('Delete this progress entry permanently?');
        if (!confirmed)
            return;
        setDeletingEntryId(entryId);
        const { error } = await supabase
            .from('progress')
            .delete()
            .eq('id', entryId)
            .eq('student_id', user.id);
        if (error) {
            toast.error('Unable to delete progress entry: ' + error.message);
            setDeletingEntryId(null);
            return;
        }
        setProgress((prev) => prev.filter((entry) => entry.id !== entryId));
        toast.success('Progress entry deleted.');
        setDeletingEntryId(null);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'cgpa':
            case 'marks':
                return <TrendingUp className="w-5 h-5"/>;
            case 'certification':
            case 'skill':
                return <Award className="w-5 h-5"/>;
            case 'hackathon':
                return <Award className="w-5 h-5"/>;
            case 'sports':
                return <Award className="w-5 h-5"/>;
            case 'competition':
                return <Award className="w-5 h-5"/>;
            case 'achievement':
            case 'report':
                return <FileText className="w-5 h-5"/>;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'cgpa':
                return 'bg-primary/20 text-primary';
            case 'certification':
                return 'bg-accent/20 text-accent';
            case 'hackathon':
                return 'bg-orange-500/20 text-orange-600';
            case 'sports':
                return 'bg-green-500/20 text-green-600';
            case 'competition':
                return 'bg-purple-500/20 text-purple-600';
            case 'achievement':
                return 'bg-secondary text-foreground';
        }
    };

    const cgpaCount = useMemo(() => progress.filter((entry) => entry.certificationType === 'cgpa').length, [progress]);
    const certificationsCount = useMemo(() => progress.filter((entry) => entry.certificationType === 'certification').length, [progress]);
    const hackathonsCount = useMemo(() => progress.filter((entry) => entry.certificationType === 'hackathon').length, [progress]);
    const sportsCount = useMemo(() => progress.filter((entry) => entry.certificationType === 'sports').length, [progress]);
    const competitionsCount = useMemo(() => progress.filter((entry) => entry.certificationType === 'competition').length, [progress]);
    const achievementsCount = useMemo(() => progress.filter((entry) => entry.certificationType === 'achievement').length, [progress]);

    const cgpaChartData = useMemo(() => {
        return [...progress]
            .filter((entry) => entry.certificationType === 'cgpa' && entry.numericValue != null)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((entry, index) => ({
                label: `Entry ${index + 1}`,
                date: new Date(entry.createdAt).toLocaleDateString(undefined, {
                    day: '2-digit',
                    month: 'short',
                }),
                score: entry.numericValue,
            }));
    }, [progress]);

    const hackathonChartData = useMemo(() => {
        return [...progress]
            .filter((entry) => entry.certificationType === 'hackathon' && entry.verificationStatus === 'verified' && entry.mentorScore != null)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((entry, index) => ({
                label: entry.title,
                date: new Date(entry.createdAt).toLocaleDateString(undefined, {
                    day: '2-digit',
                    month: 'short',
                }),
                score: entry.mentorScore,
            }));
    }, [progress]);

    const sportsChartData = useMemo(() => {
        return [...progress]
            .filter((entry) => entry.certificationType === 'sports' && entry.verificationStatus === 'verified' && entry.mentorScore != null)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((entry, index) => ({
                label: entry.title,
                date: new Date(entry.createdAt).toLocaleDateString(undefined, {
                    day: '2-digit',
                    month: 'short',
                }),
                score: entry.mentorScore,
            }));
    }, [progress]);

    const competitionChartData = useMemo(() => {
        return [...progress]
            .filter((entry) => entry.certificationType === 'competition' && entry.verificationStatus === 'verified' && entry.mentorScore != null)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((entry, index) => ({
                label: entry.title,
                date: new Date(entry.createdAt).toLocaleDateString(undefined, {
                    day: '2-digit',
                    month: 'short',
                }),
                score: entry.mentorScore,
            }));
    }, [progress]);

    const achievementChartData = useMemo(() => {
        return [...progress]
            .filter((entry) => entry.certificationType === 'achievement' && entry.verificationStatus === 'verified' && entry.mentorScore != null)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((entry, index) => ({
                label: entry.title,
                date: new Date(entry.createdAt).toLocaleDateString(undefined, {
                    day: '2-digit',
                    month: 'short',
                }),
                score: entry.mentorScore,
            }));
    }, [progress]);

    const hasCgpaTrend = cgpaChartData.length > 0;
    
    const summaryChartData = useMemo(() => {
        const calculateAvg = (type) => {
            const entries = progress.filter(e => e.certificationType === type && e.mentorScore != null);
            if (entries.length === 0) return 0;
            return Number((entries.reduce((acc, e) => acc + e.mentorScore, 0) / entries.length).toFixed(1));
        };

        const cgpaAvg = cgpaChartData.length > 0 
            ? Number((cgpaChartData.reduce((acc, e) => acc + e.score, 0) / cgpaChartData.length).toFixed(1)) 
            : 0;

        return [
            { name: 'CGPA', count: cgpaCount, avgScore: cgpaAvg, fill: '#3b82f6' },
            { name: 'Certificates', count: certificationsCount, avgScore: calculateAvg('certification'), fill: '#6366f1' },
            { name: 'Hackathons', count: hackathonsCount, avgScore: calculateAvg('hackathon'), fill: '#f97316' },
            { name: 'Sports', count: sportsCount, avgScore: calculateAvg('sports'), fill: '#22c55e' },
            { name: 'Competitions', count: competitionsCount, avgScore: calculateAvg('competition'), fill: '#a855f7' },
            { name: 'Achievements', count: achievementsCount, avgScore: calculateAvg('achievement'), fill: '#6366f1' },
        ];
    }, [progress, cgpaCount, certificationsCount, hackathonsCount, sportsCount, competitionsCount, achievementsCount, cgpaChartData]);

    if (loading || dataLoading) {
        return <p className="text-sm text-muted-foreground p-6">Loading your progress...</p>;
    }

    return (<div className="space-y-6">
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
              <Plus className="w-4 h-4"/>
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
                <Select value={newEntry.type} onValueChange={(value) => setNewEntry({ ...newEntry, type: value })}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select type"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="cgpa">CGPA</SelectItem>
                    <SelectItem value="hackathon">Hackathon</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="competition">Competition</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="Semester 6 Results, AWS Certification, Internship Report" value={newEntry.title} onChange={(event) => setNewEntry({ ...newEntry, title: event.target.value })} className="bg-card border-border"/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Add the full details of the progress update" value={newEntry.description} onChange={(event) => setNewEntry({ ...newEntry, description: event.target.value })} className="bg-card border-border"/>
              </div>
              {newEntry.type === 'cgpa' && (
                <div className="space-y-2">
                  <Label htmlFor="cgpa">CGPA Score (0 to 10)</Label>
                  <Input
                    id="cgpa"
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    placeholder="e.g. 8.45"
                    value={newEntry.cgpa}
                    onChange={(event) => setNewEntry({ ...newEntry, cgpa: event.target.value })}
                    className="bg-card border-border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="attachment">Upload Certificate / Document</Label>
                <Input id="attachment" type="file" onChange={handleFileChange} className="bg-card border-border"/>
                {selectedFile && (<p className="text-sm text-muted-foreground">
                    Selected file: {selectedFile.name}
                  </p>)}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
            setIsAddOpen(false);
            setSelectedFile(null);
            setNewEntry({ type: '', title: '', description: '', cgpa: '', certificationType: '' });
        }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddProgress}
                  disabled={isSaving || !newEntry.type || !newEntry.title || !newEntry.description || (newEntry.type === 'cgpa' && !newEntry.cgpa)}
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
              <TrendingUp className="w-6 h-6 text-primary"/>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">CGPA Entries</p>
              <h3 className="text-2xl font-bold text-foreground">{cgpaCount}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/20 rounded-lg">
              <Award className="w-6 h-6 text-accent"/>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Certifications</p>
              <h3 className="text-2xl font-bold text-foreground">{certificationsCount}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <Award className="w-6 h-6 text-orange-600"/>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Hackathons</p>
              <h3 className="text-2xl font-bold text-foreground">{hackathonsCount}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Award className="w-6 h-6 text-green-600"/>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Sports</p>
              <h3 className="text-2xl font-bold text-foreground">{sportsCount}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Award className="w-6 h-6 text-purple-600"/>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Competitions</p>
              <h3 className="text-2xl font-bold text-foreground">{competitionsCount}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary rounded-lg">
              <FileText className="w-6 h-6 text-foreground"/>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Achievements</p>
              <h3 className="text-2xl font-bold text-foreground">{achievementsCount}</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">Mentor Score (Out of 10)</p>
          <Badge className="bg-accent/20 text-accent">
            {mentorScore == null ? 'Not given yet' : `${mentorScore}/10`}
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border bg-card p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">CGPA Trend</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {hasCgpaTrend
              ? 'Your CGPA progress over time.'
              : 'Add CGPA entries to see your academic trend here.'}
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary">
              {cgpaChartData.length} entries
            </Badge>
          </div>

          {!hasCgpaTrend ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 text-sm text-muted-foreground">
              Add a CGPA entry to start tracking your academic progress.
            </div>
          ) : (
            <ChartContainer className="h-64 w-full" config={{
                  score: {
                      label: 'CGPA',
                      color: 'hsl(var(--primary))',
                  },
              }}>
              <BarChart data={cgpaChartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }} barCategoryGap="2%">
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8}/>
                <YAxis tickLine={false} axisLine={false} width={60} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}/>
                <ChartTooltip cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.label || 'Entry'} formatter={(value) => [
                      `${value}`,
                      'CGPA',
                  ]}/>}/>
                <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]} animationDuration={700} barSize={24}/>
              </BarChart>
            </ChartContainer>
          )}
        </Card>

        <Card className="border-border bg-card p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Overall Performance</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Combined view of all your activities and achievements.
              </p>
            </div>
            <Badge className="bg-accent/10 text-accent">
              {progress.length} total entries
            </Badge>
          </div>

          <div className="space-y-4">
            {progress.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div className="flex items-center gap-3">
                  <Badge className={getTypeColor(entry.certificationType)}>
                    {getTypeIcon(entry.certificationType)}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{entry.certificationType}</p>
                  </div>
                </div>
                <div className="text-right">
                  {entry.certificationType === 'cgpa' ? (
                    <Badge className="bg-primary/20 text-primary">
                      {entry.valueText}
                    </Badge>
                  ) : entry.mentorScore ? (
                    <Badge className="bg-green-500/20 text-green-600">
                      {entry.mentorScore}/10
                    </Badge>
                  ) : entry.verificationStatus === 'pending' ? (
                    <Badge className="bg-yellow-500/20 text-yellow-600">
                      Pending
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500/20 text-blue-600">
                      {entry.verificationStatus}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Activity Distribution Summary */}
      <Card className="border-border bg-card p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Category-wise Comparison</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Compare your category scores with other students in your batch.
            </p>
          </div>
          <Badge className="bg-blue-500/10 text-blue-700">
            <Users className="h-3.5 w-3.5 mr-1" />
            {peerStudentCount} peers
          </Badge>
        </div>
        {peerNames.length > 0 ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Peers: {peerNames.join(', ')}
          </p>
        ) : null}
        {categoryComparisonData.length === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 text-sm text-muted-foreground">
            Join a batch and add progress entries to see comparison with other students.
          </div>
        ) : (
          <ChartContainer className="h-80 w-full" config={{
            yourScore: { label: 'You', color: '#0ea5e9' },
            peersScore: { label: 'Others Avg', color: '#94a3b8' },
          }}>
            <BarChart data={categoryComparisonData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={44} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => {
                      const isYou = item?.dataKey === 'yourScore';
                      const key = isYou ? 'yourCount' : 'peerStudentsWithData';
                      const extra = item?.payload?.[key] ?? 0;
                      if (isYou) {
                        return [`${value}/10 (Your entries: ${extra})`, String(name)];
                      }
                      const peersLabel = item?.payload?.peerBreakdownText || 'No peer data yet';
                      return [`${value}/10 (Peers with data: ${extra}) | ${peersLabel}`, String(name)];
                    }}
                  />
                }
              />
              <Bar dataKey="yourScore" name="You" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20}>
                {categoryComparisonData.map((entry, index) => (
                  <Cell key={`your-cell-${index}`} fill={entry.yourFill || '#2563eb'} />
                ))}
              </Bar>
              <Bar dataKey="peersScore" name="Others Avg" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={20}>
                {categoryComparisonData.map((entry, index) => (
                  <Cell key={`peers-cell-${index}`} fill={entry.peersFill || '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </Card>

      {/* Activity Distribution Summary */}
      <Card className="border-border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-foreground">Activity Distribution</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Total count of entries across all progress categories.
          </p>
        </div>
        <ChartContainer className="h-80 w-full" config={{
            count: { label: 'Total Entries', color: '#3b82f6' },
            avgScore: { label: 'Average Score', color: '#3b82f6' }
        }}>
          <BarChart data={summaryChartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8}/>
            <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, name, entry) => (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-8">
                  <span className="text-muted-foreground text-xs uppercase">Score</span>
                  <span className="font-bold text-foreground">{value}</span>
                </div>
                <div className="flex items-center justify-between gap-8 border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground text-xs uppercase">Entries</span>
                  <span className="font-bold text-foreground">{entry.payload.count}</span>
                </div>
              </div>
            )} />} />
            <Bar dataKey="avgScore" name="Score" radius={[4, 4, 0, 0]} barSize={40}>
              {summaryChartData.map((entry, index) => (
                <Cell key={`cell-avg-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </Card>

      <Card className="border-border">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Progress History</h2>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground font-semibold">Type</TableHead>
                <TableHead className="text-foreground font-semibold">Title</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-foreground font-semibold">Score</TableHead>
                <TableHead className="text-foreground font-semibold">Attachment</TableHead>
                <TableHead className="text-foreground font-semibold">Date</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progress.length === 0 ? (<TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No progress entries added yet.
                  </TableCell>
                </TableRow>) : (progress.map((entry) => (<TableRow key={entry.id} className="border-border hover:bg-secondary/30 transition-colors">
                    <TableCell>
                      <Badge className={getTypeColor(entry.certificationType)}>
                        <span className="flex items-center gap-1">
                          {getTypeIcon(entry.certificationType)}
                          {entry.certificationType}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div className="space-y-1">
                        <p>{entry.title}</p>
                        <p className="text-sm text-muted-foreground max-w-md truncate">{entry.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        entry.verificationStatus === 'verified' ? 'bg-green-500/20 text-green-600' :
                        entry.verificationStatus === 'rejected' ? 'bg-red-500/20 text-red-600' :
                        'bg-yellow-500/20 text-yellow-600'
                      }>
                        {entry.verificationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.mentorScore ? (
                        <Badge className="bg-blue-500/30 text-blue-700 border border-blue-400/60 font-bold text-base px-3 py-1 shadow-sm">
                          {entry.mentorScore}/10
                        </Badge>
                      ) : entry.certificationType === 'cgpa' ? (
                        <Badge className="bg-primary/20 text-primary">
                          {entry.valueText}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.attachmentUrls.length > 0 ? (<a href={entry.attachmentUrls[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                          <Paperclip className="h-4 w-4"/>
                          {entry.attachmentNames[0] || 'Open file'}
                        </a>) : (<span className="text-sm text-muted-foreground">No file</span>)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteProgress(entry.id)}
                        disabled={deletingEntryId === entry.id}
                        className="h-6 px-1.5 text-[11px] rounded-md gap-1"
                      >
                        <Trash2 className="w-3 h-3"/>
                        {deletingEntryId === entry.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </TableCell>
                  </TableRow>)))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>);
}
