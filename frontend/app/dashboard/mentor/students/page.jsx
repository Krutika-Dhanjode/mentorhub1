import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import MentorStudentsContent from './MentorStudentsContent';

export const dynamic = 'force-dynamic';

export default function MentorStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Card className="border-border p-6">
            <p className="text-sm text-muted-foreground">Loading students dashboard...</p>
          </Card>
        </div>
      }
    >
      <MentorStudentsContent />
    </Suspense>
  );
}
