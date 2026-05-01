'use client';
import { useEffect, useMemo, useState } from 'react';
import { Award, TrendingUp, Users, Target, Star, Trophy, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, LabelList, Tooltip } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

export default function MentorAnalyticsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('all');
    const [selectedComparisonCategory, setSelectedComparisonCategory] = useState('overall');
    const [analyticsData, setAnalyticsData] = useState({
        certifications: [],
        students: [],
        performance: {},
    });
    const [dataLoading, setDataLoading] = useState(true);
    const [expandedStudents, setExpandedStudents] = useState({});

    const fetchAnalyticsData = async () => {
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
        if (selectedBatchId !== 'all') {
            batchIds = batchIds.filter(id => id === selectedBatchId);
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

        // Get student names and PRN from users table
        const { data: userData } = await supabase
            .from('users')
            .select('id, name, prn')
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
                name: (usersById.get(sid)?.name || 'Unknown') + (usersById.get(sid)?.prn ? ` (${usersById.get(sid).prn})` : ''),
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

            const actualScore = scoreValue || 0;
            if (category === 'cgpa') {
                // CGPA entries don't need verification
                categoryStats[category].verified++;
                categoryStats[category].totalScore += actualScore;
                performance[studentId].categories.cgpa.push({
                    score: actualScore,
                    title: entry.title || entry.certification_name || 'CGPA Entry',
                    createdAt: entry.created_at,
                    verificationStatus: 'verified',
                });
            } else if (entry.verification_status === 'verified') {
                categoryStats[category].verified++;
                categoryStats[category].totalScore += actualScore;
                performance[studentId].categories[category].push({
                    score: actualScore,
                    title: entry.title || entry.certification_name || 'Untitled Entry',
                    createdAt: entry.created_at,
                    verificationStatus: entry.verification_status,
                });
                performance[studentId].overall.totalScore += actualScore;
                performance[studentId].overall.count++;
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
            const categories = Object.entries(data.categories).map(([category, entries]) => ({
                category,
                avgScore: entries.length > 0 ? Number((entries.reduce((sum, item) => sum + item.score, 0) / entries.length).toFixed(1)) : 0,
                count: entries.length,
                entries,
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

    useEffect(() => {
        if (!loading && user) {
            fetchAnalyticsData();
        } else if (!loading && !user) {
            setDataLoading(false);
        }
    }, [loading, user, selectedBatchId]);

    const overallBatchScore = useMemo(() => {
        if (analyticsData.students.length === 0) return 0;
        const activeStudents = analyticsData.students.filter(s => s.totalEntries > 0);
        if (activeStudents.length === 0) return 0;
        const total = activeStudents.reduce((sum, s) => sum + s.overallAvg, 0);
        return Number((total / activeStudents.length).toFixed(1));
    }, [analyticsData.students]);

    const topPerformers = useMemo(() => {
        return analyticsData.students
            .filter(s => s.overallAvg > 0)
            .sort((a, b) => b.overallAvg - a.overallAvg)
            .slice(0, 5);
    }, [analyticsData.students]);

    const strugglingStudents = useMemo(() => {
        return analyticsData.students
            .filter(student => student.totalEntries === 0 || student.overallAvg < 7)
            .sort((a, b) => a.overallAvg - b.overallAvg)
            .slice(0, 5);
    }, [analyticsData.students]);

    const categoryChartData = useMemo(() => {
        return Object.entries(analyticsData.categoryStats || {}).map(([category, stats]) => ({
            category: category.charAt(0).toUpperCase() + category.slice(1),
            total: stats.total,
            verified: stats.verified,
            avgScore: stats.avgScore,
        }));
    }, [analyticsData.categoryStats]);

    const comparisonCategoryOptions = useMemo(() => ([
        { value: 'overall', label: 'Overall' },
        { value: 'certification', label: 'Certification' },
        { value: 'hackathon', label: 'Hackathon' },
        { value: 'sports', label: 'Sports' },
        { value: 'competition', label: 'Competition' },
        { value: 'cgpa', label: 'CGPA' },
        { value: 'achievement', label: 'Achievement' },
    ]), []);
    const comparisonBarColors = useMemo(() => ([
        '#2563eb',
        '#16a34a',
        '#d97706',
        '#dc2626',
        '#7c3aed',
        '#0891b2',
        '#db2777',
        '#4f46e5',
    ]), []);

    const selectedComparisonCategoryLabel = useMemo(() => {
        return comparisonCategoryOptions.find((option) => option.value === selectedComparisonCategory)?.label || 'Overall';
    }, [comparisonCategoryOptions, selectedComparisonCategory]);

    const studentComparisonData = useMemo(() => {
        const mapped = analyticsData.students.map((student) => {
            const prnMatch = student.name.match(/\((.*?)\)/);
            const prnPart = prnMatch ? prnMatch[1] : '';
            const shortName = student.name.replace(/\(.*?\)/, '').trim().split(' ').slice(0, 2).join(' ');
            const tickValue = `${shortName}|${prnPart}`;

            if (selectedComparisonCategory === 'overall') {
                return {
                    name: tickValue,
                    avgScore: student.overallAvg || 0,
                    fullName: student.name,
                    entries: student.totalEntries || 0,
                };
            }

            const categoryScores = analyticsData.performance?.[student.studentId]?.categories?.[selectedComparisonCategory] || [];
            const avgCategoryScore = categoryScores.length > 0
                ? Number((categoryScores.reduce((sum, entry) => sum + entry.score, 0) / categoryScores.length).toFixed(1))
                : 0;

            return {
                name: tickValue,
                avgScore: avgCategoryScore,
                fullName: student.name,
                entries: categoryScores.length,
            };
        });

        return mapped.sort((a, b) => b.avgScore - a.avgScore || a.fullName.localeCompare(b.fullName));
    }, [analyticsData.performance, analyticsData.students, selectedComparisonCategory]);

    const detailedStudentComparisonData = useMemo(() => {
        return analyticsData.students.map(student => {
            const prnMatch = student.name.match(/\((.*?)\)/);
            const prnPart = prnMatch ? prnMatch[1] : '';
            const shortName = student.name.replace(/\(.*?\)/, '').trim().split(' ').slice(0, 2).join(' ');
            const tickValue = `${shortName}|${prnPart}`;

            const data = {
                name: tickValue,
                fullName: student.name,
                overallAvg: student.overallAvg || 0,
            };
            
            const cats = ['hackathon', 'cgpa', 'certification', 'competition', 'sports', 'achievement'];
            cats.forEach(cat => {
                data[cat] = 0;
                data[`${cat}Count`] = 0;
            });
            
            student.categories.forEach(catData => {
                data[catData.category] = catData.avgScore || 0;
                data[`${catData.category}Count`] = catData.count || 0;
            });
            return data;
        }).sort((a, b) => b.overallAvg - a.overallAvg || a.fullName.localeCompare(b.fullName));
    }, [analyticsData.students]);

    const comparisonExtremes = useMemo(() => {
        if (studentComparisonData.length === 0) {
            return { top: [], low: [] };
        }
        const topScore = studentComparisonData[0].avgScore;
        const lowScore = studentComparisonData[studentComparisonData.length - 1].avgScore;
        return {
            top: studentComparisonData.filter(s => s.avgScore === topScore),
            low: studentComparisonData.filter(s => s.avgScore === lowScore),
        };
    }, [studentComparisonData]);

    const toggleStudentDetails = (studentId) => {
        setExpandedStudents(prev => ({
            ...prev,
            [studentId]: !prev[studentId],
        }));
    };

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
                            <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                                <SelectTrigger className="w-48 bg-card border-border">
                                    <SelectValue placeholder="All Batches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Batches</SelectItem>
                                    {batches.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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

    const renderStackedName = (fullName) => {
        if (!fullName) return null;
        const match = fullName.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
            return (
                <div className="flex flex-col items-start">
                    <span>{match[1]}</span>
                    <span className="text-xs text-muted-foreground font-normal">({match[2]})</span>
                </div>
            );
        }
        return <span>{fullName}</span>;
    };

    const CustomXAxisTick = (props) => {
        const { x, y, payload } = props;
        const [name, prn] = (payload.value || '').split('|');
        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="end" fill="hsl(var(--muted-foreground))" transform="rotate(-35)" style={{ fontSize: '11px', fontWeight: 500 }}>
                    <tspan x={0} dy="0">{name}</tspan>
                    {prn && <tspan x={0} dy="1.2em" style={{ fontSize: '10px' }}>({prn})</tspan>}
                </text>
            </g>
        );
    };

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
                    {batches.length > 0 && (
                        <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                            <SelectTrigger className="w-48 bg-card border-border">
                                <SelectValue placeholder="All Batches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Batches</SelectItem>
                                {batches.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {categoryChartData.map((category) => (
                    <Card key={category.category} className="p-4 border-border bg-card">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-foreground">{category.category}</h3>
                            <Badge className="bg-primary/20 text-primary text-xs">
                                {category.verified}/{category.total}
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Verified</span>
                                <span className="font-medium">{category.verified}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="border-border bg-card p-6 mb-6">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <h2 className="text-xl font-semibold text-foreground">{selectedComparisonCategoryLabel} Student Comparison</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Filter</span>
                        <Select value={selectedComparisonCategory} onValueChange={setSelectedComparisonCategory}>
                            <SelectTrigger className="w-44 bg-card border-border">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {comparisonCategoryOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <ChartContainer className="h-96 w-full" config={{
                    avgScore: { label: `${selectedComparisonCategoryLabel} Score`, color: 'hsl(var(--primary))' },
                }}>
                    <BarChart data={studentComparisonData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }} barCategoryGap="2%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} height={70} tick={<CustomXAxisTick />} />
                        <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}/>
                        <ChartTooltip cursor={{ fill: 'var(--accent)' }} content={<ChartTooltipContent labelFormatter={(label, payload) => renderStackedName(payload?.[0]?.payload?.fullName || label)} formatter={(value) => [`${value}/10`, `${selectedComparisonCategoryLabel} Avg Score`]} />}/>
                        <Bar dataKey="avgScore" radius={[4, 4, 0, 0]} animationDuration={700} barSize={25}>
                            {studentComparisonData.map((entry, index) => (
                                <Cell key={`comparison-bar-${entry.fullName}-${index}`} fill={comparisonBarColors[index % comparisonBarColors.length]} />
                            ))}
                            <LabelList dataKey="entries" position="top" offset={8} formatter={(value) => `Count: ${value}`} style={{ fontSize: '11px', fill: 'hsl(var(--muted-foreground))' }} />
                        </Bar>
                    </BarChart>
                </ChartContainer>
                {comparisonExtremes.top && comparisonExtremes.low && comparisonExtremes.top.length > 0 && comparisonExtremes.low.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Top Performer{comparisonExtremes.top.length > 1 ? 's' : ''} ({selectedComparisonCategoryLabel})</p>
                                <div className="text-sm font-semibold text-foreground">{comparisonExtremes.top.map((s, i) => <div key={i}>{renderStackedName(s.fullName)}</div>)}</div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-green-700">{comparisonExtremes.top[0].avgScore}/10</p>
                            </div>
                        </div>
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Low Performer{comparisonExtremes.low.length > 1 ? 's' : ''} ({selectedComparisonCategoryLabel})</p>
                                <div className="text-sm font-semibold text-foreground">{comparisonExtremes.low.map((s, i) => <div key={i}>{renderStackedName(s.fullName)}</div>)}</div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-red-700">{comparisonExtremes.low[0].avgScore}/10</p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <Card className="border-border bg-card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">Detailed Category Comparison</h2>
                </div>
                <div className="overflow-x-auto pb-4">
                    <div style={{ minWidth: `max(100%, ${detailedStudentComparisonData.length * 200}px)` }} className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={detailedStudentComparisonData} margin={{ left: 12, right: 12, top: 20, bottom: 0 }} barCategoryGap="35%" barGap={0}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} height={70} tick={<CustomXAxisTick />} />
                                <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}/>
                                <Tooltip 
                                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const studentName = payload[0].payload.fullName || label;
                                            return (
                                                <div className="bg-card border border-border p-3 rounded-lg shadow-sm">
                                                    <div className="font-semibold text-foreground mb-2">{renderStackedName(studentName)}</div>
                                                    {payload.map((entry, index) => {
                                                        const count = entry.payload[`${entry.dataKey}Count`] || 0;
                                                        return (
                                                            <div key={index} className="flex items-center gap-2 text-sm mb-1">
                                                                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
                                                                <span className="text-muted-foreground capitalize">{entry.name}:</span>
                                                                <span className="font-medium text-foreground">{entry.value}/10 (Count: {count})</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="hackathon" name="hackathon" fill="#60a5fa" radius={[4, 4, 0, 0]} minPointSize={3} />
                                <Bar dataKey="cgpa" name="cgpa" fill="#16a34a" radius={[4, 4, 0, 0]} minPointSize={3} />
                                <Bar dataKey="certification" name="certification" fill="#f97316" radius={[4, 4, 0, 0]} minPointSize={3} />
                                <Bar dataKey="competition" name="competition" fill="#dc2626" radius={[4, 4, 0, 0]} minPointSize={3} />
                                <Bar dataKey="sports" name="sports" fill="#7c3aed" radius={[4, 4, 0, 0]} minPointSize={3} />
                                <Bar dataKey="achievement" name="achievement" fill="#db2777" radius={[4, 4, 0, 0]} minPointSize={3} />
                            </BarChart>
                        </ResponsiveContainer>
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
                                    <div className="font-medium text-foreground">{renderStackedName(student.name)}</div>
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
                                    <div className="font-medium text-foreground">{renderStackedName(student.name)}</div>
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

            <Card className="border-border bg-card p-4">
                <h2 className="text-lg font-semibold text-foreground mb-3">Detailed Performance Breakdown</h2>
                <div className="space-y-4">
                    {analyticsData.students.map((student) => (
                        <div key={student.studentId} className="border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="text-xl font-medium text-foreground">{renderStackedName(student.name)}</div>
                                    <button
                                        type="button"
                                        onClick={() => toggleStudentDetails(student.studentId)}
                                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-primary hover:bg-secondary/30"
                                    >
                                        <span>Details</span>
                                        {expandedStudents[student.studentId] ? (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                    <Badge className="bg-primary/20 text-primary">Overall: {student.overallAvg}/10</Badge>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {student.categories.map((cat) => (
                                    <div key={cat.category} className="w-[170px]">
                                        <div className="w-full p-2 rounded-lg bg-secondary/20">
                                            <p className="text-sm font-medium text-muted-foreground capitalize text-center">{cat.category}</p>
                                            <p className="text-base font-bold text-foreground text-center">{cat.avgScore}/10</p>
                                            <p className="text-xs text-muted-foreground text-center">{cat.count} entries</p>
                                        </div>
                                        {expandedStudents[student.studentId] && (
                                            <div className="mt-2 rounded-lg border border-border bg-card p-2 space-y-2">
                                                {cat.entries.map((entry, index) => (
                                                    <div key={`${cat.category}-entry-${index}`} className="rounded border border-border/70 p-2 text-left">
                                                        <p className="text-xs font-medium text-foreground truncate" title={entry.title}>{entry.title}</p>
                                                        <p className="text-xs text-muted-foreground">Score: {entry.score}/10</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
