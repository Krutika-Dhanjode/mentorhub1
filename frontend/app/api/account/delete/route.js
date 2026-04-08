import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
const isIgnorableSchemaError = (error) => {
    if (!error?.code)
        return false;
    return error.code === '42P01' || error.code === '42703';
};
async function deleteWhereEquals(admin, table, column, value) {
    const { error } = await admin.from(table).delete().eq(column, value);
    if (error && !isIgnorableSchemaError(error)) {
        throw new Error(error.message || `Failed deleting from ${table}.${column}`);
    }
}
async function removeUserStoragePrefix(admin, bucket, userId) {
    const { data, error } = await admin.storage
        .from(bucket)
        .list(userId, { limit: 1000, offset: 0 });
    if (error) {
        // Ignore bucket-not-found / permission differences between environments.
        return;
    }
    const filePaths = (data || [])
        .map((entry) => entry.name)
        .filter(Boolean)
        .map((name) => `${userId}/${name}`);
    if (filePaths.length === 0)
        return;
    await admin.storage.from(bucket).remove(filePaths);
}
export async function DELETE() {
    try {
        const sessionClient = await createSupabaseServerClient();
        const { data: { user }, error: authError, } = await sessionClient.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { supabaseUrl } = getSupabaseEnv();
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY configuration.' }, { status: 500 });
        }
        const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const userId = user.id;
        // Remove storage objects tied to this user (best-effort).
        await removeUserStoragePrefix(admin, 'student-profile-photos', userId);
        await removeUserStoragePrefix(admin, 'student-progress', userId);
        // Delete dependent rows first (compatible across current and legacy schemas).
        await deleteWhereEquals(admin, 'guidance_messages', 'student_id', userId);
        await deleteWhereEquals(admin, 'guidance_messages', 'mentor_id', userId);
        await deleteWhereEquals(admin, 'mentors', 'hod_id', userId);
        await deleteWhereEquals(admin, 'mentors', 'mentor_user_id', userId);
        await deleteWhereEquals(admin, 'batch_students', 'student_id', userId);
        await deleteWhereEquals(admin, 'batches', 'mentor_id', userId);
        await deleteWhereEquals(admin, 'meetings', 'student_id', userId);
        await deleteWhereEquals(admin, 'meetings', 'mentor_id', userId);
        await deleteWhereEquals(admin, 'progress', 'student_id', userId);
        await deleteWhereEquals(admin, 'progress', 'mentor_id', userId);
        await deleteWhereEquals(admin, 'progress_entries', 'mentor_id', userId);
        await deleteWhereEquals(admin, 'queries', 'student_id', userId);
        await deleteWhereEquals(admin, 'queries', 'mentor_id', userId);
        await deleteWhereEquals(admin, 'notifications', 'user_id', userId);
        await deleteWhereEquals(admin, 'students', 'id', userId);
        await deleteWhereEquals(admin, 'students', 'profile_id', userId);
        await deleteWhereEquals(admin, 'students', 'mentor_id', userId);
        await deleteWhereEquals(admin, 'profiles', 'id', userId);
        await deleteWhereEquals(admin, 'users', 'id', userId);
        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
        if (deleteAuthError) {
            throw new Error(deleteAuthError.message || 'Failed to delete auth user');
        }
        return NextResponse.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to delete account';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
