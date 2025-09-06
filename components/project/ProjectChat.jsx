
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '@/api/entities';
import { ProjectFile } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // New import
import {
  Send,
  Paperclip,
  Download,
  MessageCircle,
  Clock,
  User as UserIcon,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectChat({ project, user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null); // New ref for the scrollable chat area
  const fileInputRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const projectMessages = await ChatMessage.filter(
        { project_id: project.id },
        '-created_date',
        100
      );
      setMessages(projectMessages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 30000); // Poll for new messages every 30 seconds
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await ChatMessage.create({
        project_id: project.id,
        sender_id: user.id,
        message: newMessage.trim(),
        message_type: 'text',
        timestamp: new Date().toISOString()
      });

      setNewMessage('');
      loadMessages(); // Reload messages to show the new one
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload file
      const { file_url } = await UploadFile({ file });

      // Create file record
      await ProjectFile.create({
        project_id: project.id,
        file_name: file.name,
        file_url: file_url,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id
      });

      // Send chat message with file
      await ChatMessage.create({
        project_id: project.id,
        sender_id: user.id,
        message: `Shared a file: ${file.name}`,
        message_type: 'file',
        file_url: file_url,
        file_name: file.name,
        file_type: file.type,
        timestamp: new Date().toISOString()
      });

      loadMessages();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 168) { // Less than a week
      return format(date, 'EEE HH:mm');
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const getSenderName = (senderId) => {
    // Check if it's the current user
    if (senderId === user.id) {
      return 'You';
    }

    // Check if it's the client
    if (senderId === project.client_id) {
      return project.client_name || 'Client';
    }

    // Check if it's a team member
    const teamMember = project.team_members_info?.find(member => member.id === senderId);
    if (teamMember) {
      return `${teamMember.first_name} ${teamMember.last_name}`;
    }

    // Check if it's the project manager
    if (senderId === project.project_manager_id && project.project_manager_info) {
      return `${project.project_manager_info.first_name} ${project.project_manager_info.last_name}`;
    }

    return 'Unknown User';
  };

  const getSenderInitials = (senderId) => {
    if (senderId === user.id) {
      return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`;
    }

    if (senderId === project.client_id) {
      return `${project.client_first_name?.[0] || ''}${project.client_last_name?.[0] || ''}`;
    }

    const teamMember = project.team_members_info?.find(member => member.id === senderId);
    if (teamMember) {
      return `${teamMember.first_name?.[0] || ''}${teamMember.last_name?.[0] || ''}`;
    }

    if (senderId === project.project_manager_id && project.project_manager_info) {
      return `${project.project_manager_info.first_name?.[0] || ''}${project.project_manager_info.last_name?.[0] || ''}`;
    }

    return 'U';
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 p-1">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Project Chat</h2>
            <p className="text-muted-foreground">Loading chat messages...</p>
          </div>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 p-1">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Chat</h2>
          <p className="text-muted-foreground">Communicate with your project team and clients.</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow bg-secondary/50 rounded-lg p-4 overflow-y-auto space-y-6" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
            <p className="text-muted-foreground">Start the conversation with your team and clients.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender_id === user.id ? 'flex-row-reverse' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                {getSenderInitials(message.sender_id)}
              </div>

              <div className={`flex flex-col max-w-[70%] ${message.sender_id === user.id ? 'items-end' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {getSenderName(message.sender_id)}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatMessageTime(message.timestamp || message.created_date)}
                  </span>
                </div>

                <div className={`rounded-lg p-3 ${
                  message.sender_id === user.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border'
                }`}>
                  {message.message_type === 'file' ? (
                    <div className="flex items-center gap-2">
                      {message.file_type?.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      <span className="flex-1">{message.file_name || 'File'}</span>
                      {message.file_url && (
                        <a
                          href={message.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-70"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </Button>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1"
          />

          <Button type="submit" disabled={sending || !newMessage.trim()}>
            {sending ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
