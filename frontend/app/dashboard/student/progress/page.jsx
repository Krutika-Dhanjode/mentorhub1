'use client';
import { toast } from "sonner";

import { useEffect, useMemo, useState } from 'react';
import { Plus, TrendingUp, Award, FileText, Upload, Paperclip } from 'lucide-react';
import { CartesianGrid, Bar, BarChart, XAxis, YAxis } from 'recharts';
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
    const [dataLoading, setDataLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const [newEntry, setNewEntry] = useState({
        type: '',
        title: '',
        description: '',
        value: '',
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
            const typeValue = entry.entry_type || entry.certification_type || 'achievement';
            const certificationType = typeValue === 'marks' ? 'cgpa'
                : typeValue === 'skill' || typeValue === 'certification' ? 'certification'
                : ['hackathon', 'sports', 'competition', 'achievement'].includes(typeValue)
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
            score: newEntry.value ? Number(newEntry.value) : null,
            value_text: newEntry.value || null,
            attachments: attachmentUrl ? [attachmentUrl] : [],
            attachment_names: attachmentName ? [attachmentName] : [],
        });
        if (error) {
            toast.error('Error saving progress: ' + error.message);
            setIsSaving(false);
            return;
        }
        setNewEntry({ type: '', title: '', description: '', value: '' });
        setSelectedFile(null);
        setIsAddOpen(false);
        setIsSaving(false);
        await fetchProgress();
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
    const hasHackathonData = hackathonChartData.length > 0;
    const hasSportsData = sportsChartData.length > 0;
    const hasCompetitionData = competitionChartData.length > 0;
    const hasAchievementData = achievementChartData.length > 0;

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

              {newEntry.type && (<div className="space-y-2">
                  <Label htmlFor="value">{newEntry.type === 'cgpa' ? 'CGPA' : 'Score (out of 10)'}</Label>
                  <Input id="value" placeholder={newEntry.type === 'cgpa' ? '8.9' : '8.5'} type="number" step="0.1" min="0" max="10" value={newEntry.value} onChange={(event) => setNewEntry({ ...newEntry, value: event.target.value })} className="bg-card border-border"/>
                </div>)}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Add the full details of the progress update" value={newEntry.description} onChange={(event) => setNewEntry({ ...newEntry, description: event.target.value })} className="bg-card border-border"/>
              </div>

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
        }}>
                  Cancel
                </Button>
                <Button onClick={handleAddProgress} disabled={isSaving || !newEntry.type || !newEntry.title || !newEntry.description}>
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
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} animationDuration={700} barSize={24}/>
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

      {/* Activity-specific Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasHackathonData && (
          <Card className="border-border bg-card p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Hackathon Performance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your hackathon participation scores.
                </p>
              </div>
              <Badge className="bg-orange-500/20 text-orange-600">
                {hackathonChartData.length} entries
              </Badge>
            </div>
            <ChartContainer className="h-48 w-full" config={{
                  score: {
                      label: 'Score',
                      color: 'hsl(25, 95%, 53%)',
                  },
              }}>
              <BarChart data={hackathonChartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }} barCategoryGap="2%">
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8}/>
                <YAxis tickLine={false} axisLine={false} width={60} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}/>
                <ChartTooltip cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} content={<ChartTooltipContent formatter={(value) => [
                      `${value}/10`,
                      'Score',
                  ]}/>}/>
                <Bar dataKey="score" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} animationDuration={700} barSize={20}/>
              </BarChart>
            </ChartContainer>
          </Card>
        )}

        {hasSportsData && (
          <Card className="border-border bg-card p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Sports Performance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your sports activity scores.
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-600">
                {sportsChartData.length} entries
              </Badge>
            </div>
            <ChartContainer className="h-48 w-full" config={{
                  score: {
                      label: 'Score',
                      color: 'hsl(142, 76%, 36%)',
                  },
              }}>
              <BarChart data={sportsChartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }} barCategoryGap="2%">
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8}/>
                <YAxis tickLine={false} axisLine={false} width={60} domain={[0, 2, 4, 6, 8, 10]}/>
                <ChartTooltip cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} content={<ChartTooltipContent formatter={(value) => [
                      `${value}/10`,
                      'Score',
                  ]}/>}/>
                <Bar dataKey="score" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} animationDuration={700} barSize={20}/>
              </BarChart>
            </ChartContainer>
          </Card>
        )}

        {hasCompetitionData && (
          <Card className="border-border bg-card p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Competition Performance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your competition participation scores.
                </p>
              </div>
              <Badge className="bg-purple-500/20 text-purple-600">
                {competitionChartData.length} entries
              </Badge>
            </div>
            <ChartContainer className="h-48 w-full" config={{
                  score: {
                      label: 'Score',
                      color: 'hsl(262, 83%, 58%)',
                  },
              }}>
              <BarChart data={competitionChartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }} barCategoryGap="2%">
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8}/>
                <YAxis tickLine={false} axisLine={false} width={60} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}/>
                <ChartTooltip cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} content={<ChartTooltipContent formatter={(value) => [
                      `${value}/10`,
                      'Score',
                  ]}/>}/>
                <Bar dataKey="score" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} animationDuration={700} barSize={20}/>
              </BarChart>
            </ChartContainer>
          </Card>
        )}

        {hasAchievementData && (
          <Card className="border-border bg-card p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Achievement Scores</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your general achievement scores.
                </p>
              </div>
              <Badge className="bg-secondary text-foreground">
                {achievementChartData.length} entries
              </Badge>
            </div>
            <ChartContainer className="h-48 w-full" config={{
                  score: {
                      label: 'Score',
                      color: 'hsl(var(--secondary))',
                  },
              }}>
              <BarChart data={achievementChartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }} barCategoryGap="2%">
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8}/>
                <YAxis tickLine={false} axisLine={false} width={60} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}/>
                <ChartTooltip cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} content={<ChartTooltipContent formatter={(value) => [
                      `${value}/10`,
                      'Score',
                  ]}/>}/>
                <Bar dataKey="score" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} animationDuration={700} barSize={20}/>
              </BarChart>
            </ChartContainer>
          </Card>
        )}
      </div>

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {progress.length === 0 ? (<TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
                        <Badge className="bg-blue-500/20 text-blue-600">
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
                  </TableRow>)))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>);
}
