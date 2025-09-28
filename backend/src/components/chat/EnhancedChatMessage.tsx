'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCcw, 
  User, 
  Bot,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
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

interface EnhancedChatMessageProps {
  message: ChatMessage;
  onCopy?: (content: string) => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  onRetry?: (messageId: string) => void;
  showRetry?: boolean;
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
  'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
  'claude-3-opus-20240229': 'Claude 3 Opus',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-pro': 'Gemini Pro'
};

const PROVIDER_COLORS: Record<string, string> = {
  'openai': 'bg-green-100 text-green-800',
  'gemini': 'bg-blue-100 text-blue-800',
  'claude': 'bg-purple-100 text-purple-800',
  'anthropic': 'bg-purple-100 text-purple-800'
};

export function EnhancedChatMessage({ 
  message, 
  onCopy, 
  onFeedback, 
  onRetry,
  showRetry = false 
}: EnhancedChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(message.feedback);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Message copied to clipboard');
      onCopy?.(message.content);
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleFeedback = (feedback: 'positive' | 'negative') => {
    setFeedbackGiven(feedback);
    onFeedback?.(message.id, feedback);
    toast.success(feedback === 'positive' ? 'Thanks for the positive feedback!' : 'Thanks for the feedback. We\'ll work to improve.');
  };

  const handleRetry = () => {
    onRetry?.(message.id);
  };

  const getModelDisplayName = (modelId?: string) => {
    if (!modelId) return null;
    return MODEL_DISPLAY_NAMES[modelId] || modelId;
  };

  const getProviderColor = (provider?: string) => {
    if (!provider) return 'bg-gray-100 text-gray-800';
    return PROVIDER_COLORS[provider] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'streaming':
        return <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <Card className={`${isUser ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {isUser ? (
                  <User className="h-4 w-4 text-blue-600" />
                ) : (
                  <Bot className="h-4 w-4 text-gray-600" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {isUser ? 'You' : 'Assistant'}
                </span>
                {!isUser && message.provider && message.modelId && (
                  <Badge className={getProviderColor(message.provider)}>
                    {getModelDisplayName(message.modelId)}
                  </Badge>
                )}
                {getStatusIcon()}
              </div>
              <span className="text-xs text-gray-500">
                {formatTimestamp(message.created_at)}
              </span>
            </div>

            {/* File Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-3 space-y-2">
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {attachment.category === 'image' ? (
                        <div className="h-8 w-8 bg-orange-100 rounded flex items-center justify-center">
                          📷
                        </div>
                      ) : (
                        <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                          📄
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round(attachment.size / 1024)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Message Content */}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-900">
                {message.content}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 px-2"
                >
                  {copied ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span className="ml-1 text-xs">
                    {copied ? 'Copied!' : 'Copy'}
                  </span>
                </Button>

                {!isUser && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback('positive')}
                      className={`h-8 px-2 ${
                        feedbackGiven === 'positive' ? 'text-green-600 bg-green-50' : ''
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback('negative')}
                      className={`h-8 px-2 ${
                        feedbackGiven === 'negative' ? 'text-red-600 bg-red-50' : ''
                      }`}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>

              {!isUser && showRetry && message.status !== 'streaming' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  className="h-8 px-2"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="ml-1 text-xs">Retry</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
