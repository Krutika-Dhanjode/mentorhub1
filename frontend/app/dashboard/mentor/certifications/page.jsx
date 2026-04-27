'use client';
import { toast } from "sonner";

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Clock, Award, TrendingUp, FileText, Paperclip, Star, MessageSquare, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

export default function MentorCertificationsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [certifications, setCertifications] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCertification, setSelectedCertification] = useState(null);
    const [isVerifyOpen, setIsVerifyOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [verificationData, setVerificationData] = useState({
        score: '',
        feedback: '',
    });
    const [rejectionFeedback, setRejectionFeedback] = useState('');
    const [dataLoading, setDataLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('all');
    const [editActionId, setEditActionId] = useState(null);

    const fetchData = async () => {
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
        const batchIds = (batchData || []).map(b => b.id);

        if (batchIds.length === 0) {
            setCertifications([]);
            setDataLoading(false);
            return;
        }

        // Get student assignments from batch_students
        const { data: assignmentData, error: assignmentError } = await supabase
            .from('batch_students')
            .select('student_id, batch_id')
            .in('batch_id', batchIds);

        if (assignmentError) {
            console.error('Error fetching batch assignments:', assignmentError.message);
            setDataLoading(false);
            return;
        }

        const studentIds = Array.from(new Set((assignmentData || []).map(a => a.student_id).filter(Boolean)));
        setStudents(studentIds.map(id => ({ profile_id: id })));

        if (studentIds.length === 0) {
            setCertifications([]);
            setDataLoading(false);
            return;
        }

        // Get student names and PRNs
        const { data: userData } = await supabase
            .from('users')
            .select('id, name, prn')
            .in('id', studentIds);
        const usersById = new Map((userData || []).map(u => [u.id, u]));

        // Get all certifications for these students
        const { data: certData, error: certError } = await supabase
            .from('progress')
            .select('*')
            .in('student_id', studentIds)
            .not('entry_type', 'in', '(cgpa,marks)')
            .order('created_at', { ascending: false });

        if (certError) {
            console.error('Error fetching certifications:', certError.message);
            setCertifications([]);
            setDataLoading(false);
            return;
        }

        const assignmentMap = new Map((assignmentData || []).map(a => [a.student_id, a.batch_id]));

        const formattedCerts = certData.map(cert => {
            const typeValue = cert.entry_type || cert.certification_type || 'achievement';
            const certificationType = typeValue === 'marks' ? 'cgpa'
                : typeValue === 'skill' || typeValue === 'certification' ? 'certification'
                : ['hackathon', 'sports', 'competition', 'achievement'].includes(typeValue)
                    ? typeValue
                    : 'achievement';

            const matchedUser = usersById.get(cert.student_id);

            return {
                ...cert,
                batch_id: assignmentMap.get(cert.student_id),
                certification_type: certificationType,
                verification_status: cert.verification_status || 'pending',
                mentor_score: cert.mentor_score != null ? Number(cert.mentor_score) : (cert.score != null ? Number(cert.score) : null),
                mentor_feedback: cert.mentor_feedback || null,
                verified_at: cert.verified_at || null,
                studentName: matchedUser?.name || 'Unknown',
                studentPrn: matchedUser?.prn || 'Unknown',
            };
        });

        setCertifications(formattedCerts);
        setDataLoading(false);
    };

    useEffect(() => {
        if (!loading && user) {
            fetchData();
        }
    }, [loading, user]);

    const handleVerify = async () => {
        if (!selectedCertification || !verificationData.score) return;

        try {
            const response = await fetch('/api/mentor/verify-certification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    certificationId: selectedCertification.id,
                    score: parseFloat(verificationData.score),
                    feedback: verificationData.feedback,
                    action: 'verify',
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            toast.success('Certification verified successfully!');
            setIsVerifyOpen(false);
            setSelectedCertification(null);
            setVerificationData({ score: '', feedback: '' });
            await fetchData();
        } catch (error) {
            toast.error('Failed to verify certification: ' + error.message);
        }
    };

    const handleReject = async () => {
        if (!selectedCertification) return;

        try {
            const response = await fetch('/api/mentor/verify-certification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    certificationId: selectedCertification.id,
                    feedback: rejectionFeedback,
                    action: 'reject',
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            toast.success('Certification rejected!');
            setIsRejectOpen(false);
            setSelectedCertification(null);
            setRejectionFeedback('');
            await fetchData();
        } catch (error) {
            toast.error('Failed to reject certification: ' + error.message);
        }
    };

    const openVerifyDialog = (cert) => {
        setEditActionId(null);
        setSelectedCertification(cert);
        setVerificationData({
            score: cert.mentor_score != null ? String(cert.mentor_score) : '',
            feedback: cert.mentor_feedback || '',
        });
        setIsVerifyOpen(true);
    };

    const openRejectDialog = (cert) => {
        setEditActionId(null);
        setSelectedCertification(cert);
        setRejectionFeedback(cert.mentor_feedback || '');
        setIsRejectOpen(true);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'verified':
                return <CheckCircle className="w-4 h-4 text-green-600"/>;
            case 'rejected':
                return <XCircle className="w-4 h-4 text-red-600"/>;
            default:
                return <Clock className="w-4 h-4 text-yellow-600"/>;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'verified':
                return 'bg-green-500/20 text-green-600';
            case 'rejected':
                return 'bg-red-500/20 text-red-600';
            default:
                return 'bg-yellow-500/20 text-yellow-600';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
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

    const filteredCertifications = useMemo(() => {
        return certifications.filter(cert => {
            const matchesStatus = filterStatus === 'all' || cert.verification_status === filterStatus;
            const matchesType = filterType === 'all' || cert.certification_type === filterType;
            const matchesBatch = selectedBatchId === 'all' || cert.batch_id === selectedBatchId;
            return matchesStatus && matchesType && matchesBatch;
        });
    }, [certifications, filterStatus, filterType, selectedBatchId]);

    const stats = useMemo(() => {
        const total = certifications.length;
        const pending = certifications.filter(c => c.verification_status === 'pending').length;
        const verified = certifications.filter(c => c.verification_status === 'verified').length;
        const rejected = certifications.filter(c => c.verification_status === 'rejected').length;

        return { total, pending, verified, rejected };
    }, [certifications]);

    const typeDistribution = useMemo(() => {
        const types = {};
        certifications.forEach(cert => {
            types[cert.certification_type] = (types[cert.certification_type] || 0) + 1;
        });
        return Object.entries(types).map(([type, count]) => ({ type, count }));
    }, [certifications]);

    if (loading || dataLoading) {
        return <p className="text-sm text-muted-foreground p-6">Loading certifications...</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Student Certifications</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Review and verify student certifications and achievements.
                    </p>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 border-border bg-card">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600"/>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Total</p>
                            <h3 className="text-2xl font-bold text-foreground">{stats.total}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-border bg-card">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/20 rounded-lg">
                            <Clock className="w-6 h-6 text-yellow-600"/>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Pending</p>
                            <h3 className="text-2xl font-bold text-foreground">{stats.pending}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-border bg-card">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600"/>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Verified</p>
                            <h3 className="text-2xl font-bold text-foreground">{stats.verified}</h3>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-border bg-card">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-lg">
                            <XCircle className="w-6 h-6 text-red-600"/>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Rejected</p>
                            <h3 className="text-2xl font-bold text-foreground">{stats.rejected}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <div className="mb-6">
                <Card className="border-border bg-card p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Certification Types</h2>
                    <ResponsiveContainer width="100%" height={170}>
                        <PieChart>
                            <Pie
                                data={typeDistribution}
                                cx="50%"
                                cy="50%"
                                outerRadius={50}
                                fill="#8884d8"
                                dataKey="count"
                                label={({ type, count }) => `${type}: ${count}`}
                            >
                                {typeDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                                ))}
                            </Pie>
                            <ChartTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-border bg-card p-6">
                <div className="flex flex-wrap gap-4 mb-4">
                    <div className="space-y-2">
                        <Label>Batch</Label>
                        <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                            <SelectTrigger className="bg-card border-border w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Batches</SelectItem>
                                {batches.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="bg-card border-border w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="bg-card border-border w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="certification">Certification</SelectItem>
                                <SelectItem value="hackathon">Hackathon</SelectItem>
                                <SelectItem value="sports">Sports</SelectItem>
                                <SelectItem value="competition">Competition</SelectItem>
                                <SelectItem value="achievement">Achievement</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Certifications Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-foreground font-semibold">Student</TableHead>
                            <TableHead className="text-foreground font-semibold">Type</TableHead>
                            <TableHead className="text-foreground font-semibold">Title</TableHead>
                            <TableHead className="text-foreground font-semibold">Status</TableHead>
                            <TableHead className="text-foreground font-semibold">Score</TableHead>
                            <TableHead className="text-foreground font-semibold">Date</TableHead>
                            <TableHead className="text-foreground font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCertifications.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                    No certifications found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCertifications.map((cert) => (
                                <TableRow key={cert.id} className="border-border hover:bg-secondary/30 transition-colors">
                                    <TableCell className="font-medium text-foreground">
                                        <div>
                                            <p>{cert.studentName}</p>
                                            <p className="text-sm text-muted-foreground">{cert.studentPrn}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getTypeColor(cert.certification_type)}>
                                            {cert.certification_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <div className="space-y-1">
                                            <p className="font-medium">{cert.title}</p>
                                            <p className="text-sm text-muted-foreground truncate">{cert.description}</p>
                                            {cert.attachments?.length > 0 && (
                                                <a href={cert.attachments[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                    <Paperclip className="h-3 w-3"/>
                                                    View attachment
                                                </a>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusColor(cert.verification_status)}>
                                            <span className="flex items-center gap-1">
                                                {getStatusIcon(cert.verification_status)}
                                                {cert.verification_status}
                                            </span>
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {cert.mentor_score ? (
                                            <Badge className="bg-blue-500/20 text-blue-600">
                                                {cert.mentor_score}/10
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(cert.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setEditActionId((current) => (current === cert.id ? null : cert.id))}
                                            >
                                                <Pencil className="w-3 h-3 mr-1"/>
                                                Edit
                                            </Button>

                                            {editActionId === cert.id && (
                                                <>
                                                    <Badge className="h-7 px-2 text-xs bg-blue-500/20 text-blue-700">
                                                        Score: {cert.mentor_score != null ? `${cert.mentor_score}/10` : '-'}
                                                    </Badge>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => openVerifyDialog(cert)}
                                                    >
                                                        <CheckCircle className="w-3 h-3 mr-1"/>
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => openRejectDialog(cert)}
                                                    >
                                                        <XCircle className="w-3 h-3 mr-1"/>
                                                        Reject
                                                    </Button>
                                                </>
                                            )}

                                            <Dialog open={isVerifyOpen && selectedCertification?.id === cert.id} onOpenChange={(open) => {
                                                setIsVerifyOpen(open);
                                            }}>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>{cert.verification_status === 'pending' ? 'Verify Certification' : 'Edit Verification'}</DialogTitle>
                                                        <DialogDescription>
                                                            Review and score this certification submission.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 mt-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="score">Score (0-10)</Label>
                                                            <Input
                                                                id="score"
                                                                type="number"
                                                                min="0"
                                                                max="10"
                                                                step="0.1"
                                                                value={verificationData.score}
                                                                onChange={(e) => setVerificationData({...verificationData, score: e.target.value})}
                                                                placeholder="8.5"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="feedback">Feedback (Optional)</Label>
                                                            <Textarea
                                                                id="feedback"
                                                                value={verificationData.feedback}
                                                                onChange={(e) => setVerificationData({...verificationData, feedback: e.target.value})}
                                                                placeholder="Great work! Well done on completing this certification."
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button variant="outline" onClick={() => setIsVerifyOpen(false)}>
                                                                Cancel
                                                            </Button>
                                                            <Button onClick={handleVerify} disabled={!verificationData.score}>
                                                                {cert.verification_status === 'pending' ? 'Verify & Score' : 'Update Verification'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            <Dialog open={isRejectOpen && selectedCertification?.id === cert.id} onOpenChange={(open) => {
                                                setIsRejectOpen(open);
                                            }}>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>{cert.verification_status === 'pending' ? 'Reject Certification' : 'Edit Rejection'}</DialogTitle>
                                                        <DialogDescription>
                                                            Provide feedback for why this certification is being rejected.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 mt-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="rejection-feedback">Feedback</Label>
                                                            <Textarea
                                                                id="rejection-feedback"
                                                                value={rejectionFeedback}
                                                                onChange={(e) => setRejectionFeedback(e.target.value)}
                                                                placeholder="Please provide more details or resubmit with proper documentation."
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
                                                                Cancel
                                                            </Button>
                                                            <Button variant="destructive" onClick={handleReject}>
                                                                {cert.verification_status === 'pending' ? 'Reject' : 'Update Rejection'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            {cert.mentor_feedback && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => toast.info(`Feedback: ${cert.mentor_feedback}`)}
                                                >
                                                    <MessageSquare className="w-4 h-4 mr-1"/>
                                                    View Feedback
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
