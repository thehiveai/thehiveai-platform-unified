'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  StopCircle, 
  Paperclip, 
  Mic, 
  MicOff,
  Share2,
  Copy,
  Settings,
  Loader2,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from './FileUpload';
import { EnhancedChatMessage } from './EnhancedChatMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  modelId?: string;
  created_at: string;
  feedback?: 'positive' | 'negative' | null;
  status?: 'sending' | 'streaming' | 'completed' | 'error';
  attachments?: FileAttachment[];
}

interface FileAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  category: string;
}

interface EnhancedChatInterfaceProps {
  threadId: string;
  initialMessages?: Message[];
  onSendMessage?: (content: string, attachments?: FileAttachment[]) => void;
  onCancelMessage?: () => void;
  onRetryMessage?: (messageId: string) => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  isStreaming?: boolean;
  availableModels?: Array<{ id: string; name: string; provider: string }>;
}

export function EnhancedChatInterface({
  threadId,
  initialMessages = [],
  onSendMessage,
  onCancelMessage,
  onRetryMessage,
  onFeedback,
  isStreaming = false,
  availableModels = []
}: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update messages when initialMessages change
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString(),
      status: 'sending',
      attachments: attachments.length > 0 ? attachments : undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setAttachments([]);
    setShowFileUpload(false);

    onSendMessage?.(inputValue, attachments);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUploaded = (file: FileAttachment) => {
    setAttachments(prev => [...prev, file]);
    toast.success(`File "${file.filename}" uploaded successfully`);
  };

  const handleFileUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`);
  };

  const removeAttachment = (fileId: string) => {
    setAttachments(prev => prev.filter(f => f.id !== fileId));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudioInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started...');
    } catch (error) {
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped. Processing...');
    }
  };

  const processAudioInput = async (audioBlob: Blob) => {
    try {
      // This would integrate with speech-to-text service
      // For now, we'll show a placeholder
      toast.success('Audio processing would happen here');
      // setInputValue('Transcribed text would appear here');
    } catch (error) {
      toast.error('Failed to process audio');
    }
  };

  const copyConversation = async () => {
    try {
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      await navigator.clipboard.writeText(conversationText);
      toast.success('Conversation copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy conversation');
    }
  };

  const shareConversation = async () => {
    try {
      // This would integrate with sharing API
      toast.success('Sharing functionality would be implemented here');
    } catch (error) {
      toast.error('Failed to share conversation');
    }
  };

  const handleCancel = () => {
    onCancelMessage?.();
    toast.success('Request cancelled');
  };

  const handleRetry = (messageId: string) => {
    onRetryMessage?.(messageId);
    toast.success('Retrying message...');
  };

  const handleMessageFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
    onFeedback?.(messageId, feedback);
  };

  const handleMessageCopy = (content: string) => {
    // Already handled in EnhancedChatMessage component
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">AI Chat</h2>
            {selectedModels.length > 0 && (
              <div className="flex space-x-1">
                {selectedModels.slice(0, 3).map(modelId => {
                  const model = availableModels.find(m => m.id === modelId);
                  return model ? (
                    <Badge key={modelId} variant="secondary" className="text-xs">
                      {model.name}
                    </Badge>
                  ) : null;
                })}
                {selectedModels.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedModels.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyConversation}
              disabled={messages.length === 0}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={shareConversation}
              disabled={messages.length === 0}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Model Selection</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableModels.map(model => (
                <label key={model.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedModels(prev => [...prev, model.id]);
                      } else {
                        setSelectedModels(prev => prev.filter(id => id !== model.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{model.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm">Upload files, ask questions, or share your thoughts</p>
          </div>
        ) : (
          messages.map((message) => (
            <EnhancedChatMessage
              key={message.id}
              message={message}
              onCopy={handleMessageCopy}
              onFeedback={handleMessageFeedback}
              onRetry={handleRetry}
              showRetry={message.role === 'assistant' && message.status === 'error'}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Panel */}
      {showFileUpload && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Attach Files</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFileUpload(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <FileUpload
            threadId={threadId}
            onFileUploaded={handleFileUploaded}
            onError={handleFileUploadError}
          />
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-gray-900">Attachments:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700 truncate max-w-32">
                  {attachment.filename}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(attachment.id)}
                  className="h-4 w-4 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="min-h-[60px] max-h-32 resize-none"
              disabled={isStreaming}
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFileUpload(!showFileUpload)}
              disabled={isStreaming}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isStreaming}
              className={isRecording ? 'text-red-600' : ''}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>

          {isStreaming ? (
            <Button
              variant="destructive"
              onClick={handleCancel}
              className="px-6"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          ) : (
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() && attachments.length === 0}
              className="px-6"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
