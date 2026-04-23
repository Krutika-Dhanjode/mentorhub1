'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Users, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

export default function StudentBatchChatIndexPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [batches, setBatches] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function fetchBatches() {
      if (!user) return;
      const supabase = createClient();

      // Get all batch IDs the student belongs to
      const { data: assignments, error: assignError } = await supabase
        .from('batch_students')
        .select('batch_id')
        .eq('student_id', user.id);

      if (assignError || !assignments?.length) {
        setDataLoading(false);
        return;
      }

      const batchIds = assignments.map((a) => a.batch_id).filter(Boolean);

      // Fetch batch details
      const { data: batchData } = await supabase
        .from('batches')
        .select('id, name, department, year, mentor_id')
        .in('id', batchIds)
        .order('name', { ascending: true });

      if (!batchData?.length) { setDataLoading(false); return; }

      // Get mentor names
      const mentorIds = [...new Set(batchData.map((b) => b.mentor_id).filter(Boolean))];
      const { data: mentorData } = mentorIds.length
        ? await supabase.from('users').select('id, name').in('id', mentorIds)
        : { data: [] };

      const mentorById = new Map((mentorData || []).map((m) => [m.id, m.name]));

      setBatches(
        batchData.map((b) => ({
          ...b,
          mentorName: mentorById.get(b.mentor_id) || 'Unknown Mentor',
        }))
      );
      setDataLoading(false);
    }

    if (!loading && user) fetchBatches();
  }, [loading, user]);

  if (loading || dataLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          Batch Chat
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a batch to open its group chat room.
        </p>
      </div>

      {batches.length === 0 ? (
        <Card className="border-border p-8 text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-full">
              <Users className="w-8 h-8 text-primary/60" />
            </div>
          </div>
          <p className="font-medium text-foreground">No batches found</p>
          <p className="text-sm text-muted-foreground">
            You haven&apos;t been assigned to any batch yet. Ask your mentor to add you.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {batches.map((batch) => (
            <Card
              key={batch.id}
              className="border-border p-5 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200 group"
              onClick={() => router.push(`/dashboard/student/batches/${batch.id}/chat`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {batch.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Mentor: {batch.mentorName}
                    </p>
                  </div>
                </div>
                {batch.year && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {batch.year}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-primary/70 mt-3 font-medium">
                Click to open group chat →
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
