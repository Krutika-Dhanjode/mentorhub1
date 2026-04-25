import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { certificationId, score, feedback, action } = await req.json();

    if (!certificationId || !action) {
      return NextResponse.json({ error: "certificationId and action are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user (mentor)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the certification entry
    const { data: certification, error: certError } = await supabase
      .from('progress')
      .select('*')
      .eq('id', certificationId)
      .single();

    if (certError || !certification) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    // Verify the mentor has access via batch_students + batches
    const { data: mentorBatches } = await supabase
      .from('batches')
      .select('id')
      .eq('mentor_id', user.id);

    const batchIds = (mentorBatches || []).map(b => b.id);

    if (batchIds.length > 0) {
      const { data: assignment } = await supabase
        .from('batch_students')
        .select('id')
        .eq('student_id', certification.student_id)
        .in('batch_id', batchIds)
        .limit(1);

      if (!assignment || assignment.length === 0) {
        return NextResponse.json({ error: "You can only verify entries for your students" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "You have no batches assigned" }, { status: 403 });
    }

    let updateData = {
      updated_at: new Date().toISOString(),
    };

    if (action === 'verify') {
      if (score === undefined || score < 0 || score > 10) {
        return NextResponse.json({ error: "Score must be between 0 and 10" }, { status: 400 });
      }

      updateData.score = score;
      updateData.verification_status = 'verified';
      updateData.mentor_feedback = feedback || certification.mentor_feedback || null;
      updateData.verified_at = new Date().toISOString();
    } else if (action === 'reject') {
      updateData.verification_status = 'rejected';
      updateData.mentor_feedback = feedback || certification.mentor_feedback || 'Rejected by mentor';
      updateData.verified_at = new Date().toISOString();
    } else {
      return NextResponse.json({ error: "Invalid action. Must be 'verify' or 'reject'" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('progress')
      .update(updateData)
      .eq('id', certificationId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update certification: " + updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Certification ${action}ed successfully` });
  } catch (error) {
    console.error("verify-certification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}