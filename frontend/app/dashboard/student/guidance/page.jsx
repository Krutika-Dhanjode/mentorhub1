"use client";
import { toast } from "sonner";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Paperclip, Send, Pencil, Trash, X, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
export default function StudentGuidancePage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [mentors, setMentors] = useState([]);
    const [selectedMentorId, setSelectedMentorId] = useState("");
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    // Edit state
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editDraft, setEditDraft] = useState("");

    const selectedMentor = useMemo(() => mentors.find((mentor) => mentor.id === selectedMentorId) || null, [mentors, selectedMentorId]);
    const fetchMentors = async () => {
        if (!user)
            return;
        setDataLoading(true);
        const { data: assignmentData, error: assignmentError } = await supabase
            .from("batch_students")
            .select("batch_id")
            .eq("student_id", user.id);
        if (assignmentError) {
            console.error("Error fetching student batches:", assignmentError.message);
            setDataLoading(false);
            return;
        }
        const batchIds = Array.from(new Set((assignmentData || []).map((assignment) => assignment.batch_id).filter(Boolean)));
        if (batchIds.length === 0) {
            setMentors([]);
            setSelectedMentorId("");
            setDataLoading(false);
            return;
        }
        const { data: batchData, error: batchError } = await supabase
            .from("batches")
            .select("id, name, mentor_id")
            .in("id", batchIds);
        if (batchError) {
            console.error("Error fetching batches:", batchError.message);
            setDataLoading(false);
            return;
        }
        const mentorIds = Array.from(new Set((batchData || []).map((batch) => batch.mentor_id).filter(Boolean)));
        const { data: mentorData, error: mentorError } = mentorIds.length > 0
            ? await supabase
                .from("users")
                .select("id, name, email")
                .in("id", mentorIds)
            : { data: [], error: null };
        if (mentorError) {
            console.error("Error fetching mentors:", mentorError.message);
            setDataLoading(false);
            return;
        }
        const batchNamesByMentor = new Map();
        (batchData || []).forEach((batch) => {
            if (!batch.mentor_id)
                return;
            if (!batchNamesByMentor.has(batch.mentor_id)) {
                batchNamesByMentor.set(batch.mentor_id, []);
            }
            batchNamesByMentor.get(batch.mentor_id)?.push(batch.name);
        });
        const mentorOptions = (mentorData || []).map((mentor) => ({
            id: mentor.id,
            name: mentor.name || "Unknown Mentor",
            email: mentor.email || "",
            batchNames: batchNamesByMentor.get(mentor.id) || [],
        }));
        setMentors(mentorOptions);
        setSelectedMentorId((current) => current || mentorOptions[0]?.id || "");
        setDataLoading(false);
    };
    const fetchMessages = async (mentorId) => {
        if (!user || !mentorId) {
            setMessages([]);
            return;
        }
        const { data, error } = await supabase
            .from("guidance_messages")
            .select("id, message, sender_role, created_at, attachment_url, attachment_name, attachment_type")
            .eq("student_id", user.id)
            .eq("mentor_id", mentorId)
            .order("created_at", { ascending: true });
        if (error) {
            console.error("Error fetching guidance messages:", error.message);
            return;
        }
        setMessages((data || []).map((message) => ({
            id: message.id,
            message: message.message,
            senderRole: message.sender_role,
            createdAt: message.created_at,
            attachmentUrl: message.attachment_url || "",
            attachmentName: message.attachment_name || "",
            attachmentType: message.attachment_type || "",
        })));
    };
    useEffect(() => {
        if (!loading && user) {
            fetchMentors();
        }
    }, [loading, user]);
    useEffect(() => {
        if (selectedMentorId) {
            fetchMessages(selectedMentorId);
        }
    }, [selectedMentorId, user?.id]);
    useEffect(() => {
        if (!user)
            return;
        const channel = supabase
            .channel(`student-guidance-${user.id}`)
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "guidance_messages",
            filter: `student_id=eq.${user.id}`,
        }, () => {
            if (selectedMentorId) {
                fetchMessages(selectedMentorId);
            }
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, selectedMentorId]);
    const handleSend = async () => {
        if (!user || !selectedMentorId || (!draft.trim() && !selectedFile))
            return;
        setSending(true);
        let attachmentUrl = "";
        let attachmentName = "";
        let attachmentType = "";
        let attachmentPath = "";
        if (selectedFile) {
            const validType = selectedFile.type === "application/pdf" || selectedFile.type.startsWith("image/");
            if (!validType) {
                setSending(false);
                toast.error("Only PDF and image files are allowed.");
                return;
            }
            if (selectedFile.size > 8 * 1024 * 1024) {
                setSending(false);
                toast.error("File size must be 8MB or less.");
                return;
            }
            const sanitizedFileName = selectedFile.name.replace(/\s+/g, "-");
            attachmentPath = `${user.id}/${Date.now()}-${sanitizedFileName}`;
            const { error: uploadError } = await supabase
                .storage
                .from("guidance-attachments")
                .upload(attachmentPath, selectedFile, { upsert: false });
            if (uploadError) {
                setSending(false);
                toast.error("Unable to upload attachment: " + uploadError.message);
                return;
            }
            const { data: publicUrlData } = supabase
                .storage
                .from("guidance-attachments")
                .getPublicUrl(attachmentPath);
            attachmentUrl = publicUrlData?.publicUrl || "";
            attachmentName = selectedFile.name;
            attachmentType = selectedFile.type || "";
        }
        const messageText = draft.trim() || "Shared a reference attachment.";
        const { error } = await supabase.from("guidance_messages").insert({
            student_id: user.id,
            mentor_id: selectedMentorId,
            sender_role: "student",
            message: messageText,
            attachment_url: attachmentUrl || null,
            attachment_name: attachmentName || null,
            attachment_type: attachmentType || null,
            attachment_path: attachmentPath || null,
        });
        setSending(false);
        if (error) {
            toast.error("Unable to send your message: " + error.message);
            return;
        }
        setDraft("");
        setSelectedFile(null);
        await fetchMessages(selectedMentorId);
    };

    const handleEditMessage = async (messageId) => {
        if (!editDraft.trim()) return;
        const { error } = await supabase
            .from("guidance_messages")
            .update({ message: editDraft })
            .eq("id", messageId);
            
        if (error) {
            toast.error("Unable to update message: " + error.message);
        } else {
            toast.success("Message updated");
            setEditingMessageId(null);
            fetchMessages(selectedMentorId);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        const { error } = await supabase
            .from("guidance_messages")
            .delete()
            .eq("id", messageId);
            
        if (error) {
            toast.error("Unable to delete message: " + error.message);
        } else {
            toast.success("Message deleted");
            fetchMessages(selectedMentorId);
        }
    };

    if (loading || dataLoading) {
        return (<Card className="p-6">
        <p className="text-muted-foreground">Loading guidance...</p>
      </Card>);
    }
    return (<div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Guidance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask your mentor about academic, batch, or personal guidance issues.
        </p>
      </div>

      {mentors.length === 0 ? (<Card className="p-6">
          <p className="text-muted-foreground">
            You are not assigned to any mentor yet, so guidance chat is not available.
          </p>
        </Card>) : (<div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Your Mentors</h2>
            <div className="space-y-3">
              {mentors.map((mentor) => (<button key={mentor.id} type="button" onClick={() => setSelectedMentorId(mentor.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedMentorId === mentor.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/40"}`}>
                  <p className="font-medium text-foreground">{mentor.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Batches: {mentor.batchNames.join(", ") || "Not assigned"}
                  </p>
                </button>))}
            </div>
          </Card>

          <Card className="flex h-[750px] flex-col p-4">
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold">
                {selectedMentor?.name || "Select a mentor"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedMentor?.email || "Choose a mentor to start chatting"}
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {messages.length === 0 ? (<div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <MessageSquare className="mb-3 h-10 w-10 opacity-40"/>
                  <p>No guidance messages yet.</p>
                  <p className="text-sm">Ask your first question below.</p>
                </div>) : (messages.map((message) => (<div key={message.id} className={`group relative max-w-[68%] rounded-xl px-3 py-2 ${message.senderRole === "student"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"}`}>
                    {editingMessageId === message.id ? (
                      <div className="flex flex-col gap-2">
                        <Textarea 
                          className="min-h-20 bg-background text-foreground"
                          value={editDraft} 
                          onChange={(e) => setEditDraft(e.target.value)} 
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setEditingMessageId(null)}>
                            <X className="mr-1 h-4 w-4"/> Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleEditMessage(message.id)} variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Check className="mr-1 h-4 w-4"/> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                    {message.attachmentUrl && (<div className="mt-1.5 rounded-md border border-border/60 bg-background/40 p-1.5">
                        {message.attachmentType?.startsWith("image/") ? (<a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="block">
                            <img src={message.attachmentUrl} alt={message.attachmentName || "Guidance attachment"} className="max-h-52 rounded-md object-contain"/>
                          </a>) : (<a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
                            <Paperclip className="h-4 w-4"/>
                            {message.attachmentName || "Open attachment"}
                          </a>)}
                      </div>)}
                    <div className="mt-1.5 flex items-center justify-between">
                    <p className={`text-[11px] ${message.senderRole === "student"
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"}`}>
                      {new Date(message.createdAt).toLocaleString()}
                    </p>
                      {message.senderRole === "student" && (
                        <div className="flex items-center gap-2 text-primary-foreground/80">
                          <button onClick={() => { setEditingMessageId(message.id); setEditDraft(message.message); }} className="hover:text-white transition-colors" title="Edit message">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteMessage(message.id)} className="hover:text-red-300" title="Delete message">
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                  )}
                  </div>)))}
            </div>

            <div className="border-t pt-4">
              <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Describe your issue or question for your mentor..." className="min-h-16"/>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Input type="file" id="file-upload" className="peer sr-only" accept="application/pdf,image/*" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}/>
                  <label htmlFor="file-upload" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80">
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                  </label>
                  <p className="max-w-[200px] truncate text-xs text-muted-foreground sm:max-w-xs">
                    {selectedFile ? selectedFile.name : "Attach file (optional)"}
                  </p>
                </div>
                <Button onClick={handleSend} disabled={sending || !selectedMentorId || (!draft.trim() && !selectedFile)}>
                  <Send className="mr-2 h-4 w-4"/>
                  {sending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </Card>
        </div>)}
    </div>);
}
