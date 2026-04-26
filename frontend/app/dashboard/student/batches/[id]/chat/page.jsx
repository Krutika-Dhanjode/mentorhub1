'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BatchChat } from '@/components/chat/batch-chat';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function StudentBatchChatPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id;
  const { user, loading: userLoading } = useUser();
  const [batch, setBatch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBatchDetails() {
      if (!user) return;
      
      const supabase = createClient();
      try {
        // First verify student belongs to the batch
        const { data: studentAssignment, error: studentError } = await supabase
          .from('batch_students')
          .select('id')
          .eq('batch_id', batchId)
          .eq('student_id', user.id)
          .single();

        if (studentError || !studentAssignment) {
          toast.error("You don't have access to this group guidance.");
          router.push('/dashboard/student');
          return;
        }

        // Fetch batch details
        const { data: batchData, error: batchError } = await supabase
          .from('batches')
          .select('*')
          .eq('id', batchId)
          .single();

        if (batchError || !batchData) {
          toast.error("Batch not found.");
          router.push('/dashboard/student');
          return;
        }

        setBatch(batchData);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load batch details.");
      } finally {
        setIsLoading(false);
      }
    }

    if (!userLoading) {
      if (user?.role !== 'student') {
        router.push('/dashboard');
        return;
      }
      fetchBatchDetails();
    }
  }, [batchId, user, userLoading, router]);

  if (userLoading || isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push('/dashboard/student')}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {batch.name} Group Chat
          </h1>
          <p className="text-sm text-muted-foreground">
            {batch.department} • Batch {batch.year}
          </p>
        </div>
      </div>

      {/* Chat Component */}
      <BatchChat batchId={batch.id} currentUserId={user.id} />
    </div>
  );
}
