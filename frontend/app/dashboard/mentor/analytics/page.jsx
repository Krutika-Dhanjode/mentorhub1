'use client';
import { useEffect, useMemo, useState } from 'react';
import { Award, TrendingUp, Users, Target, Star, Trophy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

export default function MentorAnalyticsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('all');
    const [pendingBatchId, setPendingBatchId] = useState('all');
    const [analyticsData, setAnalyticsData] = useState({
        certifications: [],
        students: [],
        performance: {},
    });
    const [dataLoading, setDataLoading] = useState(true);

    const fetchAnalyticsData = async (batchFilter = selectedBatchId) => {
        if (!user) return;
        setDataLoading(true);

        // Get all batches for this mentor
        const { data: batchData, error: batchError } = await supabase
            .from('batches')
            .select('id, name')
            .eq('mentor_id', user.id);

        if (batchError) {
            console.error('Error fetching batches:', batchError.message);
            setDataLoading(false);
            return;
        }

        setBatches(batchData || []);
        
        let batchIds = (batchData || []).map(b => b.id);
        if (batchFilter !== 'all') {
            batchIds = batchIds.filter(id => id === batchFilter);
        }

        if (batchIds.length === 0) {
            setAnalyticsData({ certifications: [], students: [], performance: {}, categoryStats: {} });
            setDataLoading(false);
            return;
        }

        // Get all student assignments from batch_students
        const { data: assignmentData, error: assignmentError } = await supabase
            .from('batch_students')
            .select('student_id, student_name, batch_id')
            .in('batch_id', batchIds);

        const batchMap = new Map((assignmentData || []).map(a => [a.student_id, a.batch_id]));

        if (assignmentError) {
            console.error('Error fetching batch assignments:', assignmentError.message);
            setDataLoading(false);
            return;
        }

        // Get unique student IDs
        const studentIds = Array.from(new Set((assignmentData || []).map(a => a.student_id).filter(Boolean)));

        if (studentIds.length === 0) {
            setAnalyticsData({ certifications: [], students: [], performance: {}, categoryStats: {} });
            setDataLoading(false);
            return;
        }

        // Get student names from users table
        const { data: userData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', studentIds);
        const usersById = new Map((userData || []).map(u => [u.id, u]));

        // Get all progress entries for these students
        const { data: progressData, error: progressError } = await supabase
            .from('progress')
            .select('*')
            .in('student_id', studentIds)
            .order('created_at', { ascending: false });

        if (progressError) {
            console.error('Error fetching progress data:', progressError.message);
            setDataLoading(false);
            return;
        }

        // Initialize performance object for ALL students (even those with no progress)
        const performance = {};
        studentIds.forEach(sid => {
            performance[sid] = {
                name: usersById.get(sid)?.name || 'Unknown',
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
        });

        const categoryStats = {
            certification: { total: 0, verified: 0, totalScore: 0 },
            hackathon: { total: 0, verified: 0, totalScore: 0 },
            sports: { total: 0, verified: 0, totalScore: 0 },
            competition: { total: 0, verified: 0, totalScore: 0 },
            cgpa: { total: 0, verified: 0, totalScore: 0 },
            achievement: { total: 0, verified: 0, totalScore: 0 },
        };

        (progressData || []).forEach(entry => {
            const studentId = entry.student_id;
            if (!performance[studentId]) return;

            const typeValue = entry.entry_type || entry.certification_type || 'achievement';
            const category = typeValue === 'marks' ? 'cgpa'
                : typeValue === 'skill' || typeValue === 'certification' ? 'certification'
                : ['hackathon', 'sports', 'competition', 'achievement'].includes(typeValue)
                    ? typeValue
                    : 'achievement';

            const scoreValue = entry.score != null ? Number(entry.score) : null;

            // Count total entries per category regardless of verification
            categoryStats[category].total++;

            if (category === 'cgpa') {
                // CGPA entries don't need verification
                categoryStats[category].verified++;
                if (scoreValue != null) {
                    categoryStats[category].totalScore += scoreValue;
                    performance[studentId].categories.cgpa.push(scoreValue);
                    // Do NOT add CGPA to the overall extracurricular performance metric
                }
            } else if (entry.verification_status === 'verified') {
                categoryStats[category].verified++;
                if (scoreValue != null) {
                    categoryStats[category].totalScore += scoreValue;
                    performance[studentId].categories[category].push(scoreValue);
                    performance[studentId].overall.totalScore += scoreValue;
                    performance[studentId].overall.count++;
                }
            }
            // Unverified entries are only counted in total, no score contribution
        });

        // Calculate category averages
        Object.keys(categoryStats).forEach(category => {
            const stat = categoryStats[category];
            stat.avgScore = stat.verified > 0 ? Number((stat.totalScore / stat.verified).toFixed(1)) : 0;
        });

        // Calculate student averages and rankings
        const studentRankings = Object.entries(performance).map(([studentId, data]) => {
            const categories = Object.entries(data.categories).map(([category, scores]) => ({
                category,
                avgScore: scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0,
                count: scores.length,
            })).filter(cat => cat.count > 0);

            const overallAvg = data.overall.count > 0 ? Number((data.overall.totalScore / data.overall.count).toFixed(1)) : 0;

            return {
                studentId,
                name: data.name,
                batchId: batchMap.get(studentId),
                categories,
                overallAvg,
                totalEntries: data.overall.count,
            };
        }).sort((a, b) => b.overallAvg - a.overallAvg);

        setAnalyticsData({
            certifications: progressData || [],
            students: studentRankings,
            performance,
            categoryStats,
        });
        setDataLoading(false);
    };

    const applyFilters = () => {
        setSelectedBatchId(pendingBatchId);
    };

    const searchParams = useSearchParams();
    const globalSearch = searchParams.get('q')?.trim().toLowerCase() || '';

    useEffect(() => {
        if (!loading && user) {
            fetchAnalyticsData(selectedBatchId);
        } else if (!loading && !user) {
            setDataLoading(false);
        }
    }, [loading, user, selectedBatchId]);

    const filteredStudents = useMemo(() => {
        if (!globalSearch) {
            return analyticsData.students;
        }
        return analyticsData.students.filter((student) => student.name.toLowerCase().includes(globalSearch));
    }, [analyticsData.students, globalSearch]);

    const overallBatchScore = useMemo(() => {
        if (filteredStudents.length === 0) return 0;
        const activeStudents = filteredStudents.filter(s => s.totalEntries > 0);
        if (activeStudents.length === 0) return 0;
        const total = activeStudents.reduce((sum, s) => sum + s.overallAvg, 0);
        return Number((total / activeStudents.length).toFixed(1));
    }, [filteredStudents]);

    const topPerformers = useMemo(() => {
        return filteredStudents
            .filter(s => s.overallAvg > 0)
            .sort((a, b) => b.overallAvg - a.overallAvg)
            .slice(0, 5);
    }, [filteredStudents]);

    const strugglingStudents = useMemo(() => {
        return filteredStudents
            .filter(student => student.totalEntries === 0 || student.overallAvg < 7)
            .sort((a, b) => a.overallAvg - b.overallAvg)
            .slice(0, 5);
    }, [filteredStudents]);

    const categoryChartData = useMemo(() => {
        const totals = {
            certification: { total: 0, verified: 0, totalScore: 0 },
            hackathon: { total: 0, verified: 0, totalScore: 0 },
            sports: { total: 0, verified: 0, totalScore: 0 },
            competition: { total: 0, verified: 0, totalScore: 0 },
            cgpa: { total: 0, verified: 0, totalScore: 0 },
            achievement: { total: 0, verified: 0, totalScore: 0 },
        };

        filteredStudents.forEach((student) => {
            student.categories.forEach((categoryEntry) => {
                totals[categoryEntry.category].verified += categoryEntry.count;
                totals[categoryEntry.category].total += categoryEntry.count;
                totals[categoryEntry.category].totalScore += categoryEntry.avgScore * categoryEntry.count;
            });
        });

        return Object.entries(totals).map(([category, stats]) => ({
            category: category.charAt(0).toUpperCase() + category.slice(1),
            total: stats.total,
            verified: stats.verified,
            avgScore: stats.verified > 0 ? Number((stats.totalScore / stats.verified).toFixed(1)) : 0,
        }));
    }, [filteredStudents]);

    const studentComparisonData = useMemo(() => {
        return filteredStudents
            .slice()
            .sort((a, b) => b.overallAvg - a.overallAvg)
            .map(s => ({
                name: s.name.split(' ').slice(0, 2).join(' '),
                avgScore: s.overallAvg || 0,
                fullName: s.name,
                entries: s.totalEntries || 0
            }));
    }, [filteredStudents]);

    const studentDetailedChartData = useMemo(() => {
        const categoryOrder = ['certification', 'hackathon', 'sports', 'competition', 'cgpa', 'achievement'];
        return filteredStudents.map(student => ({
            studentId: student.studentId,
            name: student.name,
            overallAvg: student.overallAvg,
            totalEntries: student.totalEntries,
            chartData: categoryOrder.map(category => {
                const data = student.categories.find(c => c.category === category);
                return {
                    category: category.charAt(0).toUpperCase() + category.slice(1),
                    avgScore: data?.avgScore || 0,
                    count: data?.count || 0,
                };
            }),
        }));
    }, [analyticsData.students]);

    if (loading || dataLoading) {
        return <p className="text-sm text-muted-foreground p-6">Loading analytics...</p>;
    }

    const hasNoData = analyticsData.students.length === 0 && analyticsData.certifications.length === 0;

    if (hasNoData) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Student Analytics</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Comprehensive view of student performance across all activities.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg border border-primary/20 flex flex-col items-center justify-center">
                            <span className="text-xs font-semibold uppercase tracking-wider">Overall Score</span>
                            <span className="text-2xl font-bold">{overallBatchScore}/10</span>
                        </div>
                        {batches.length > 0 && (
                    <>
                        <Select value={pendingBatchId} onValueChange={setPendingBatchId}>
                            <SelectTrigger className="w-48 bg-card border-border">
                                <SelectValue placeholder="All Students" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Students</SelectItem>
                                {batches.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button size="sm" className="border border-border bg-card hover:bg-secondary" onClick={applyFilters} disabled={pendingBatchId === selectedBatchId}>
                            Apply Filter
                        </Button>
                    </>
                )}
                    </div>
                </div>
                <Card className="p-12 border-border bg-card text-center">
                    <div className="space-y-3">
                        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
                        <h3 className="text-lg font-semibold text-foreground">No Analytics Data Yet</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Analytics will appear here once your students add progress entries (CGPA, certifications, hackathons, etc.) and you verify them.
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Student Analytics</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Comprehensive view of student performance across all activities.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg border border-primary/20 flex flex-col items-center justify-center">
                        <span className="text-xs font-semibold uppercase tracking-wider">Overall Score</span>
                        <span className="text-2xl font-bold">{overallBatchScore}/10</span>
                    </div>
                    {batches.length > 0 && (
                        <>
                            <Select value={pendingBatchId} onValueChange={setPendingBatchId}>
                                <SelectTrigger className="w-48 bg-card border-border">
                                    <SelectValue placeholder="All Students" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Students</SelectItem>
                                    {batches.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button size="sm" className="border border-border bg-card hover:bg-secondary" onClick={applyFilters} disabled={pendingBatchId === selectedBatchId}>
                                Apply Filter
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categoryChartData.map((category) => (
                    <Card key={category.category} className="p-6 border-border bg-card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-foreground">{category.category}</h3>
                            <Badge className="bg-primary/20 text-primary">
                                {category.verified}/{category.total}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Verified</span>
                                <span className="font-medium">{category.verified}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Avg Score</span>
                                <span className="font-medium">{category.avgScore}/10</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="border-border bg-card p-6 mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Student Comparison</h2>
                <ChartContainer className="h-96 w-full" config={{
                    avgScore: { label: 'Overall Score', color: 'hsl(var(--primary))' },
                }}>
                    <BarChart data={studentComparisonData} margin={{ left: 12, right: 12, top: 8, bottom: 40 }} barCategoryGap="2%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-35} textAnchor="end" height={60} style={{ fontSize: '11px' }}/>
                        <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}/>
                        <ChartTooltip cursor={{ fill: 'var(--accent)' }} content={<ChartTooltipContent labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} formatter={(value) => [`${value}/10`, 'Average Score']} />}/>
                        <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={700} barSize={25} />
                    </BarChart>
                </ChartContainer>
            </Card>

            <Card className="border-border bg-card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Category Performance by Student</h2>
                        <p className="text-sm text-muted-foreground">Each student is shown with six category bars; scroll to compare across students.</p>
                    </div>
                </div>
                <div className="overflow-x-auto pb-2 w-full rounded-3xl border border-border bg-surface/50">
                    <div className="flex gap-4 min-w-max flex-nowrap p-4">
                        {studentDetailedChartData.map((student) => (
                            <div key={student.studentId} className="min-w-[320px] shrink-0 rounded-3xl border border-border bg-background p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground truncate">{student.name}</h3>
                                        <p className="text-xs text-muted-foreground">{student.totalEntries} entries</p>
                                    </div>
                                    <Badge className="bg-primary/20 text-primary text-xs">
                                        {student.overallAvg}/10
                                    </Badge>
                                </div>
                                <ChartContainer className="h-56 w-full" config={{
                                    certification: { label: 'Certification', color: '#3b82f6' },
                                    hackathon: { label: 'Hackathon', color: '#10b981' },
                                    sports: { label: 'Sports', color: '#f59e0b' },
                                    competition: { label: 'Competition', color: '#ef4444' },
                                    cgpa: { label: 'CGPA', color: '#8b5cf6' },
                                    achievement: { label: 'Achievement', color: '#ec4899' },
                                }}>
                                    <BarChart data={student.chartData} margin={{ left: 0, right: 0, top: 8, bottom: 40 }} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                        <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} angle={-35} textAnchor="end" height={60} style={{ fontSize: '11px' }}/>
                                        <YAxis tickLine={false} axisLine={false} width={34} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                                        <ChartTooltip cursor={{ fill: 'var(--accent)' }} content={<ChartTooltipContent formatter={(value) => [`${value}/10`, 'Avg Score']} />} />
                                        <Bar dataKey="avgScore" radius={[4, 4, 0, 0]} barSize={20}>
                                            {student.chartData.map((entry, index) => {
                                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {student.chartData.map((category) => (
                                        <div key={category.category} className="rounded-2xl bg-secondary/20 p-2 text-center">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{category.category}</p>
                                            <p className="text-sm font-semibold text-foreground">{category.avgScore}</p>
                                            <p className="text-[11px] text-muted-foreground">{category.count} items</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            <Card className="border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-yellow-600"/>
                    <h2 className="text-xl font-semibold text-foreground">Top Performers</h2>
                </div>
                <div className="space-y-4">
                    {topPerformers.map((student, index) => (
                        <div key={student.studentId} className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">{student.name}</p>
                                    <p className="text-sm text-muted-foreground">{student.totalEntries} entries</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-primary">{student.overallAvg}/10</p>
                                <div className="flex gap-1 mt-1">
                                    {student.categories.slice(0, 3).map((cat) => (
                                        <Badge key={cat.category} className="text-xs" variant="outline">
                                            {cat.category}: {cat.avgScore}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600"/>
                    <h2 className="text-xl font-semibold text-foreground">Students Needing Attention</h2>
                </div>
                <div className="space-y-4">
                    {strugglingStudents.map((student) => (
                        <div key={student.studentId} className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-red-600"/>
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">{student.name}</p>
                                    <p className="text-sm text-muted-foreground">{student.totalEntries} entries</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-red-600">{student.overallAvg}/10</p>
                                <p className="text-sm text-muted-foreground">
                                    {student.totalEntries === 0 ? 'No progress recorded' : 'Needs improvement'}
                                </p>
                            </div>
                        </div>
                    ))}
                    {strugglingStudents.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">All students are performing well! 🎉</p>
                    )}
                </div>
            </Card>

            <Card className="border-border bg-card p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Detailed Performance Breakdown</h2>
                <div className="space-y-6">
                    {analyticsData.students.map((student) => (
                        <div key={student.studentId} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-foreground">{student.name}</h3>
                                <Badge className="bg-primary/20 text-primary">Overall: {student.overallAvg}/10</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {student.categories.map((cat) => (
                                    <div key={cat.category} className="text-center p-3 rounded-lg bg-secondary/20">
                                        <p className="text-sm font-medium text-muted-foreground capitalize">{cat.category}</p>
                                        <p className="text-lg font-bold text-foreground">{cat.avgScore}/10</p>
                                        <p className="text-xs text-muted-foreground">{cat.count} entries</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
