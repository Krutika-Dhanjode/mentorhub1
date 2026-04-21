import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import MentorStudentsContent from './MentorStudentsContent';

export const dynamic = 'force-dynamic';

export default async function MentorStudentsPage({ searchParams }) {
  const params = await searchParams;
  const queryValue = params?.q;
  const initialSearch = Array.isArray(queryValue) ? queryValue[0] || '' : queryValue || '';

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
      <MentorStudentsContent initialSearch={initialSearch} />
    </Suspense>
  );
}
