// Development chat interface - uses dev API endpoints without authentication
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  User,
  Bot,
  CheckCircle,
  AlertCircle,
  Clock,
  Upload,
  File,
  Image,
  FileText,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  provider?: string;
  modelId?: string;
  feedback?: 'positive' | 'negative' | null;
  status?: 'sending' | 'streaming' | 'completed' | 'error';
}

interface Model {
  id: string;
  name: string;
  provider: string;
  available: boolean;
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gpt-4o-mini': 'GPT-4o Mini',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'claude-3-haiku-20240307': 'Claude 3 Haiku'
};

const PROVIDER_COLORS: Record<string, string> = {
  'openai': 'bg-green-100 text-green-800',
  'gemini': 'bg-blue-100 text-blue-800',
  'anthropic': 'bg-purple-100 text-purple-800'
};

export default function DevChatInterface() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load models on mount
  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    try {
      const response = await fetch('/api/dev/models');
      const data = await response.json();
      
      if (data.success) {
        setAvailableProviders(data.providers || []);
        setAvailableModels(data.models || []);
        
        // Set default provider and model
        if (data.providers && data.providers.length > 0) {
          const firstProvider = data.providers[0];
          setSelectedProvider(firstProvider.id);
          
          const firstProviderModels = data.models.filter((m: Model) => m.provider === firstProvider.id && m.available);
          if (firstProviderModels.length > 0) {
            setSelectedModel(firstProviderModels[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load available models:', error);
    } finally {
      setModelsLoading(false);
    }
  };

  // Get models for selected provider
  const getModelsForProvider = (providerId: string): Model[] => {
    return availableModels.filter(model => model.provider === providerId);
  };

  // Handle provider change
  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const providerModels = getModelsForProvider(providerId);
    if (providerModels.length > 0) {
      setSelectedModel(providerModels[0].id);
    } else {
      setSelectedModel('');
    }
  };

  // Get provider from model ID - map to chat API expected values
  const getProviderFromModel = (modelId: string): string => {
    const model = availableModels.find(m => m.id === modelId);
    const provider = model?.provider || 'openai';
    return provider === 'anthropic' ? 'claude' : provider;
  };

  // Voice recording functions
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
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      toast.info('Processing speech...');

      // Use development speech endpoint
      const response = await fetch('/api/dev/speech', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Speech-to-text service unavailable');
      }

      const transcribedText = result.text;

      if (transcribedText && transcribedText.trim()) {
        setInput(prev => prev + (prev ? ' ' : '') + transcribedText);
        
        const serviceInfo = result.service ? ` (${result.service})` : '';
        toast.success(`Speech converted to text!${serviceInfo}`);
        
        if (result.note) {
          toast.info(result.note);
        }
      } else {
        toast.warning('No speech detected. Please try again.');
      }
    } catch (error: any) {
      console.error('Speech processing error:', error);
      toast.error(`Speech processing failed: ${error.message}`);
    }
  };

  // Message functions
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Message copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
    toast.success(feedback === 'positive' ? 'Thanks for the positive feedback!' : 'Thanks for the feedback. We\'ll work to improve.');
  };

  const retryMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex > 0) {
      const userMessage = messages[messageIndex - 1];
      if (userMessage.role === 'user') {
        setInput(userMessage.content);
        toast.success('Message loaded for retry');
      }
    }
  };

  const cancelMessage = () => {
    if (currentStreamingMessageId) {
      setCurrentStreamingMessageId(null);
      setLoading(false);
      toast.success('Request cancelled');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !selectedModel) return;

    const message = input.trim();
    setInput("");
    setLoading(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
      status: 'sending'
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Send message to development API
      const response = await fetch('/api/dev/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          provider: getProviderFromModel(selectedModel),
          modelId: selectedModel
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      // Add empty assistant message
      const assistantMessageObj: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        provider: getProviderFromModel(selectedModel),
        modelId: selectedModel,
        status: 'streaming'
      };
      setMessages(prev => [...prev, assistantMessageObj]);
      setCurrentStreamingMessageId(assistantMessageObj.id);

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
          
          // Update the assistant message
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.id === assistantMessageObj.id) {
              newMessages[newMessages.length - 1] = {
                ...lastMessage,
                content: assistantMessage,
                status: 'streaming'
              };
            }
            return newMessages;
          });
        }
      }

      // Mark as completed
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.id === assistantMessageObj.id) {
          newMessages[newMessages.length - 1] = {
            ...lastMessage,
            status: 'completed'
          };
        }
        return newMessages;
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, there was an error processing your message.",
        created_at: new Date().toISOString(),
        status: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setCurrentStreamingMessageId(null);
    }
  };

  const getModelDisplayName = (modelId?: string) => {
    if (!modelId) return 'Assistant';
    return MODEL_DISPLAY_NAMES[modelId] || modelId;
  };

  const getProviderColor = (provider?: string) => {
    if (!provider) return 'bg-gray-100 text-gray-800';
    return PROVIDER_COLORS[provider] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex h-full bg-gray-900">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-semibold text-white">
              The Hive AI Platform - Development Mode
            </h1>
            {selectedModel && (
              <Badge className={getProviderColor(getProviderFromModel(selectedModel))}>
                {getModelDisplayName(selectedModel)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
              DEV MODE
            </Badge>
          </div>
        </div>

        {/* Model selector */}
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {modelsLoading ? (
                <div className="px-3 py-1 bg-gray-700 text-gray-400 rounded text-sm">
                  Loading models...
                </div>
              ) : (
                <>
                  <select
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                  >
                    {availableProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                    disabled={!selectedProvider}
                  >
                    {getModelsForProvider(selectedProvider).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2 bg-green-900 border border-green-600 rounded-lg px-3 py-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-100 text-sm font-medium">
                  💬 Conversational Mode Active
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-white border-gray-600 hover:bg-gray-700"
                onClick={() => toast.success('Development Mode: All features are simulated for testing purposes. Voice and chat functionality work without authentication.')}
                title="Click for more info about development mode"
              >
                ℹ️ Info
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              Start a new conversation by typing a message below or using voice input.
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                <div className={`max-w-[70%] ${isUser ? 'order-2' : 'order-1'}`}>
                  <div className={`rounded-lg p-4 ${
                    isUser 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900 border'
                  }`}>
                    {/* Header for assistant messages */}
                    {!isUser && (
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">
                            {message.provider && message.modelId 
                              ? getModelDisplayName(message.modelId)
                              : 'AI Assistant'
                            }
                          </span>
                          {message.provider && (
                            <Badge className={getProviderColor(message.provider)}>
                              {message.provider.charAt(0).toUpperCase() + message.provider.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessage(message.content)}
                            className="h-6 px-2 text-xs"
                            title="Copy message"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryMessage(message.id)}
                            className="h-6 px-2 text-xs"
                            title="Retry this response"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(message.id, 'positive')}
                            className={`h-6 px-1 ${
                              message.feedback === 'positive' ? 'text-green-600' : 'text-gray-400'
                            }`}
                            title="Good response"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(message.id, 'negative')}
                            className={`h-6 px-1 ${
                              message.feedback === 'negative' ? 'text-red-600' : 'text-gray-400'
                            }`}
                            title="Poor response"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Message content */}
                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>

                    {/* Timestamp */}
                    <div className={`text-xs mt-3 pt-2 border-t ${
                      isUser ? 'border-blue-500 text-blue-100' : 'border-gray-200 text-gray-500'
                    } flex justify-between items-center`}>
                      <span>
                        {new Date(message.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                      {isUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyMessage(message.content)}
                          className="h-6 px-2 text-xs text-blue-100 hover:text-white hover:bg-blue-700"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg animate-pulse">
                <div className="text-xs opacity-70 mb-1">{getModelDisplayName(selectedModel)}</div>
                <div>...</div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="min-h-[60px] max-h-32 resize-none bg-gray-700 text-white border-gray-600 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
                className={`text-white hover:bg-gray-700 ${isRecording ? 'text-red-400 bg-red-900' : ''}`}
                title={isRecording ? "Stop recording" : "Start voice recording"}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>

            {loading ? (
              <Button
                variant="destructive"
                onClick={cancelMessage}
                className="px-8 py-3 text-lg font-semibold"
                size="lg"
              >
                <StopCircle className="h-5 w-5 mr-2" />
                Cancel
              </Button>
            ) : (
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || !selectedModel}
                className="px-8 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Send className="h-5 w-5 mr-2" />
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
