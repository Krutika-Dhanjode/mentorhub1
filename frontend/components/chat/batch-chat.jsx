'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, X, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chatService } from '@/lib/chat-service';
import { toast } from 'sonner';
import Image from 'next/image';

// ─── Date helpers ────────────────────────────────────────────────────────────
function getDateLabel(isoString) {
  const msgDate = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(msgDate, today)) return 'Today';
  if (sameDay(msgDate, yesterday)) return 'Yesterday';

  return msgDate.toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function msgDateKey(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ─── Date separator chip ─────────────────────────────────────────────────────
function DateSeparator({ label }) {
  return (
    <div className="flex items-center justify-center my-3 select-none">
      <span className="bg-background/80 backdrop-blur-sm border border-border text-muted-foreground text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
        {label}
      </span>
    </div>
  );
}

// ─── Floating date pill (shows current date section while scrolling) ──────────
function FloatingDatePill({ label, visible }) {
  return (
    <div
      className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 transition-all duration-300 pointer-events-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <span className="bg-sidebar/90 backdrop-blur-md border border-border text-foreground text-[11px] font-semibold px-3 py-1 rounded-full shadow-md">
        {label}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function BatchChat({ batchId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);

  // Floating date pill state
  const [floatingDate, setFloatingDate] = useState('');
  const [showFloatingDate, setShowFloatingDate] = useState(false);
  const floatingTimerRef = useRef(null);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Load messages & realtime subscription ───────────────────────────────────
  useEffect(() => {
    let subscription;

    const init = async () => {
      try {
        setIsLoading(true);
        const data = await chatService.getBatchMessages(batchId);
        setMessages(data || []);

        subscription = chatService.subscribeToMessages(batchId, (newMsg) => {
          setMessages((cur) => {
            if (cur.some((m) => m.id === newMsg.id)) return cur;
            return [...cur, newMsg];
          });
        });
      } catch {
        toast.error('Failed to load chat messages');
      } finally {
        setIsLoading(false);
      }
    };

    if (batchId) init();
    return () => { if (subscription) subscription.unsubscribe(); };
  }, [batchId]);

  // ── Auto-scroll to bottom on new messages ───────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Floating date pill on scroll ────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || messages.length === 0) return;

    // Find which date separator is currently near top of visible area
    const separators = container.querySelectorAll('[data-date-sep]');
    let currentLabel = getDateLabel(messages[0].createdAt);

    separators.forEach((sep) => {
      const rect = sep.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (rect.top <= containerRect.top + 48) {
        currentLabel = sep.getAttribute('data-date-sep');
      }
    });

    setFloatingDate(currentLabel);
    setShowFloatingDate(true);

    // Hide after 1.5s of no scrolling
    clearTimeout(floatingTimerRef.current);
    floatingTimerRef.current = setTimeout(() => setShowFloatingDate(false), 1500);
  }, [messages]);

  useEffect(() => () => clearTimeout(floatingTimerRef.current), []);

  // ── File select ─────────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10 MB.');
      return;
    }
    const isImage = file.type.startsWith('image/');
    setFilePreview({ file, previewUrl: isImage ? URL.createObjectURL(file) : null, isImage });
    e.target.value = '';
  };

  const clearFilePreview = () => {
    if (filePreview?.previewUrl) URL.revokeObjectURL(filePreview.previewUrl);
    setFilePreview(null);
  };

  // ── Send text / file ────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();

    if (filePreview) {
      setIsUploading(true);
      const caption = newMessage.trim();
      const file = filePreview.file;
      setNewMessage('');
      clearFilePreview();
      try {
        const sent = await chatService.sendFileMessage(batchId, currentUserId, file, caption);
        if (sent) setMessages((p) => (p.some((m) => m.id === sent.id) ? p : [...p, sent]));
      } catch (err) {
        toast.error(err.message || 'Failed to send file');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (!newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    try {
      const sent = await chatService.sendMessage(batchId, currentUserId, text);
      if (sent) setMessages((p) => (p.some((m) => m.id === sent.id) ? p : [...p, sent]));
    } catch {
      toast.error('Failed to send message');
      setNewMessage(text);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isImage = (type) => type?.startsWith('image/');

  // ── Build message list with date groups ─────────────────────────────────────
  const renderMessages = () => {
    const rendered = [];
    let lastKey = '';

    messages.forEach((msg) => {
      const key = msgDateKey(msg.createdAt);
      if (key !== lastKey) {
        const label = getDateLabel(msg.createdAt);
        rendered.push(
          <div key={`sep-${key}`} data-date-sep={label}>
            <DateSeparator label={label} />
          </div>
        );
        lastKey = key;
      }

      const isMe = msg.userId === currentUserId;
      const hasFile = !!msg.fileUrl;
      const hasText = !!msg.message?.trim();

      rendered.push(
        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          {/* Sender label */}
          {!isMe && (
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="text-xs font-semibold text-foreground">{msg.senderName}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                msg.senderRole === 'mentor' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
              }`}>
                {msg.senderRole}
              </span>
            </div>
          )}

          {/* Bubble */}
          <div className={`max-w-[75%] rounded-2xl shadow-sm overflow-hidden ${
            isMe
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-background text-foreground rounded-bl-sm border border-border'
          }`}>

            {/* Image */}
            {hasFile && isImage(msg.fileType) && (
              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                <div className="relative w-56 h-44 overflow-hidden">
                  <Image src={msg.fileUrl} alt={msg.fileName || 'Image'} fill
                    className="object-cover hover:opacity-90 transition-opacity cursor-pointer" unoptimized />
                </div>
              </a>
            )}

            {/* Non-image file */}
            {hasFile && !isImage(msg.fileType) && (
              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" download={msg.fileName}
                className={`flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity ${hasText ? 'border-b border-white/10' : ''}`}>
                <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-primary/10'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{msg.fileName || 'File'}</p>
                  <p className={`text-[10px] ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    Tap to download
                  </p>
                </div>
                <Download className="w-4 h-4 shrink-0 opacity-70" />
              </a>
            )}

            {/* Text / caption */}
            {hasText && <p className="text-sm whitespace-pre-wrap px-4 py-2">{msg.message}</p>}

            {/* Timestamp */}
            <div className={`text-[10px] px-3 pb-1.5 text-right ${
              isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
            }`}>
              {formatTime(msg.createdAt)}
            </div>
          </div>
        </div>
      );
    });

    return rendered;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center bg-card rounded-xl border border-border">
        <p className="text-muted-foreground animate-pulse">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh] border border-border rounded-xl bg-card overflow-hidden shadow-sm">

      {/* ── Messages area ── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Floating date pill */}
        <FloatingDatePill label={floatingDate} visible={showFloatingDate} />

        {/* Scrollable list */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-4 space-y-3 bg-secondary/30"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <div className="bg-primary/10 p-4 rounded-full">
                <Send className="w-6 h-6 text-primary opacity-80" />
              </div>
              <p>No messages yet.</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            renderMessages()
          )}
        </div>
      </div>

      {/* ── File preview bar ── */}
      {filePreview && (
        <div className="px-3 pt-2 bg-card border-t border-border">
          <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-2.5">
            {filePreview.isImage ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                <Image src={filePreview.previewUrl} alt="Preview" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground">{filePreview.file.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {(filePreview.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button type="button" onClick={clearFilePreview}
              className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Input area ── */}
      <div className="p-3 bg-card border-t border-border">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            onChange={handleFileSelect} />

          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0 disabled:opacity-50"
            title="Attach file or image">
            <Paperclip className="w-5 h-5" />
          </button>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={filePreview ? 'Add a caption (optional)...' : 'Type a message...'}
            className="flex-1 rounded-full bg-input border-border focus-visible:ring-primary shadow-sm"
            autoComplete="off"
            disabled={isUploading}
          />

          <Button type="submit" size="icon"
            disabled={(!newMessage.trim() && !filePreview) || isUploading}
            className="rounded-full h-10 w-10 shrink-0 bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100">
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
