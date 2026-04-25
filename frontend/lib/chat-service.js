import { createClient } from './supabase/client';

export const chatService = {
  /**
   * Fetch messages for a specific batch
   */
  async getBatchMessages(batchId) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('batch_messages')
      .select(`
        id,
        message,
        created_at,
        user_id,
        file_url,
        file_name,
        file_type,
        users!inner(name, full_name, role)
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return data.map(msg => ({
      id: msg.id,
      message: msg.message,
      createdAt: msg.created_at,
      userId: msg.user_id,
      fileUrl: msg.file_url || null,
      fileName: msg.file_name || null,
      fileType: msg.file_type || null,
      senderName: msg.users?.name || msg.users?.full_name || 'Unknown User',
      senderRole: msg.users?.role || 'user'
    }));
  },

  /**
   * Send a new text message to a batch
   */
  async sendMessage(batchId, userId, message) {
    if (!message.trim()) return null;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('batch_messages')
      .insert([{ batch_id: batchId, user_id: userId, message: message.trim() }])
      .select(`
        id, message, created_at, user_id, file_url, file_name, file_type,
        users!inner(name, full_name, role)
      `)
      .single();

    if (error) throw error;

    fetch('/api/batch-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId,
        senderId: userId,
        senderName: data.users?.name || data.users?.full_name || 'User',
        message: data.message
      })
    }).catch(err => console.error("Notification trigger error:", err));

    return {
      id: data.id,
      message: data.message,
      createdAt: data.created_at,
      userId: data.user_id,
      fileUrl: data.file_url || null,
      fileName: data.file_name || null,
      fileType: data.file_type || null,
      senderName: data.users?.name || data.users?.full_name || 'Unknown User',
      senderRole: data.users?.role || 'user'
    };
  },

  /**
   * Upload a file to Supabase Storage and send it as a message
   */
  async sendFileMessage(batchId, userId, file, caption = '') {
    const supabase = createClient();

    // Upload file to storage
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${batchId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw new Error('File upload failed: ' + uploadError.message);

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

    // Insert message record with file info and optional caption
    const { data, error } = await supabase
      .from('batch_messages')
      .insert([{
        batch_id: batchId,
        user_id: userId,
        message: caption || '',
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
      }])
      .select(`
        id, message, created_at, user_id, file_url, file_name, file_type,
        users!inner(name, full_name, role)
      `)
      .single();

    if (error) throw error;

    fetch('/api/batch-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId,
        senderId: userId,
        senderName: data.users?.name || data.users?.full_name || 'User',
        message: data.message || 'Attached a file'
      })
    }).catch(err => console.error("Notification trigger error:", err));

    return {
      id: data.id,
      message: data.message,
      createdAt: data.created_at,
      userId: data.user_id,
      fileUrl: data.file_url,
      fileName: data.file_name,
      fileType: data.file_type,
      senderName: data.users?.name || data.users?.full_name || 'Unknown User',
      senderRole: data.users?.role || 'user'
    };
  },

  /**
   * Subscribe to new messages for a specific batch via Supabase Realtime
   */
  subscribeToMessages(batchId, onNewMessage) {
    const supabase = createClient();

    return supabase
      .channel(`batch_${batchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'batch_messages',
          filter: `batch_id=eq.${batchId}`
        },
        async (payload) => {
          const { data: userData, error } = await supabase
            .from('users')
            .select('name, full_name, role')
            .eq('id', payload.new.user_id)
            .single();

          if (!error && userData) {
            onNewMessage({
              id: payload.new.id,
              message: payload.new.message,
              createdAt: payload.new.created_at,
              userId: payload.new.user_id,
              fileUrl: payload.new.file_url || null,
              fileName: payload.new.file_name || null,
              fileType: payload.new.file_type || null,
              senderName: userData.name || userData.full_name || 'Unknown User',
              senderRole: userData.role || 'user'
            });
          }
        }
      )
      .subscribe();
  }
};
