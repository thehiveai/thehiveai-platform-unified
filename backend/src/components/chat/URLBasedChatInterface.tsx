// Enhanced URL-based chat interface with file attachments, copy, feedback, and more
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { getUserDisplayName, getModelDisplayName } from "@/lib/hotContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  attachments?: FileAttachment[];
}

interface FileAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  category: string;
}

interface Thread {
  id: string;
  title: string;
  created_at: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextWindow?: number;
  pricing?: {
    input: number;
    output: number;
  };
  available: boolean;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  result?: FileAttachment;
}

interface URLBasedChatInterfaceProps {
  threadId?: string;
}

const SUPPORTED_TYPES = {
  'application/pdf': { icon: FileText, label: 'PDF', color: 'bg-red-100 text-red-800' },
  'application/msword': { icon: FileText, label: 'DOC', color: 'bg-blue-100 text-blue-800' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, label: 'DOCX', color: 'bg-blue-100 text-blue-800' },
  'text/plain': { icon: FileText, label: 'TXT', color: 'bg-gray-100 text-gray-800' },
  'text/csv': { icon: Database, label: 'CSV', color: 'bg-green-100 text-green-800' },
  'application/json': { icon: Database, label: 'JSON', color: 'bg-purple-100 text-purple-800' },
  'image/jpeg': { icon: Image, label: 'JPG', color: 'bg-orange-100 text-orange-800' },
  'image/png': { icon: Image, label: 'PNG', color: 'bg-orange-100 text-orange-800' },
  'image/gif': { icon: Image, label: 'GIF', color: 'bg-orange-100 text-orange-800' },
  'image/webp': { icon: Image, label: 'WEBP', color: 'bg-orange-100 text-orange-800' },
  'application/vnd.ms-excel': { icon: Database, label: 'XLS', color: 'bg-green-100 text-green-800' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: Database, label: 'XLSX', color: 'bg-green-100 text-green-800' },
  'application/vnd.ms-powerpoint': { icon: FileText, label: 'PPT', color: 'bg-yellow-100 text-yellow-800' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: FileText, label: 'PPTX', color: 'bg-yellow-100 text-yellow-800' },
};

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

export default function URLBasedChatInterface({ threadId }: URLBasedChatInterfaceProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { data: session } = useSession();
  
  // State
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  
  // New enhanced features
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const [conversationalMode, setConversationalMode] = useState<boolean>(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [audioPermissionStatus, setAudioPermissionStatus] = useState<string>('unknown');
  const [showAudioDiagnostics, setShowAudioDiagnostics] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isTestingMicrophone, setIsTestingMicrophone] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const [isContinuousListening, setIsContinuousListening] = useState<boolean>(false);
  const [continuousListeningStream, setContinuousListeningStream] = useState<MediaStream | null>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load threads and models on mount
  useEffect(() => {
    loadThreads();
    loadAvailableModels();
    checkAudioPermissions();
    loadAudioDevices();
  }, []);

  // Audio diagnostic functions
  const checkAudioPermissions = async () => {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setAudioPermissionStatus(permission.state);
        console.log('🎤 AUDIO DEBUG - Permission status:', permission.state);
      } else {
        console.log('🎤 AUDIO DEBUG - Permissions API not supported');
        setAudioPermissionStatus('unknown');
      }
    } catch (error) {
      console.error('🎤 AUDIO DEBUG - Permission check failed:', error);
      setAudioPermissionStatus('error');
    }
  };

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioDevices(audioInputs);
      console.log('🎤 AUDIO DEBUG - Available audio devices:', audioInputs);
      
      if (audioInputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('🎤 AUDIO DEBUG - Failed to enumerate devices:', error);
    }
  };

  const testMicrophone = async () => {
    if (isTestingMicrophone) {
      // Stop current test
      setIsTestingMicrophone(false);
      setAudioLevel(0);
      return;
    }

    try {
      console.log('🎤 AUDIO TEST - Starting microphone test (EXACT same as main mic)...');
      setIsTestingMicrophone(true);
      
      // Use EXACTLY the same getUserMedia call as the working startRecording function
      console.log('🎤 AUDIO TEST - Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('🎤 AUDIO TEST - Microphone access granted, stream:', stream);
      console.log('🎤 AUDIO TEST - Audio tracks:', stream.getAudioTracks());
      
      // Create audio context for level monitoring
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Create MediaRecorder for testing (same as main mic)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('🎤 AUDIO TEST - Audio data available:', event.data.size, 'bytes');
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        console.log('🎤 AUDIO TEST - Recording stopped, creating playback URL...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setTestAudioUrl(audioUrl);
        console.log('🎤 AUDIO TEST - Recording saved for playback, blob size:', audioBlob.size);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('🎤 AUDIO TEST - MediaRecorder error:', event);
      };
      
      // Start recording (same as main mic)
      mediaRecorder.start(1000); // Record in 1-second chunks
      console.log('🎤 AUDIO TEST - MediaRecorder started');
      
      let testDuration = 5000; // 5 seconds
      const startTime = Date.now();
      
      const checkAudioLevel = () => {
        if (!isTestingMicrophone) {
          console.log('🎤 AUDIO TEST - Test stopped by user');
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 128) * 100);
        
        setAudioLevel(normalizedLevel);
        
        // Log every 10th frame to avoid spam
        if (Math.random() < 0.1) {
          console.log('🎤 AUDIO TEST - Raw audio level:', average, 'normalized:', normalizedLevel.toFixed(1) + '%');
        }
        
        if (Date.now() - startTime < testDuration && isTestingMicrophone) {
          requestAnimationFrame(checkAudioLevel);
        } else {
          console.log('🎤 AUDIO TEST - Test duration completed, stopping...');
          mediaRecorder.stop();
          stream.getTracks().forEach(track => {
            console.log('🎤 AUDIO TEST - Stopping track:', track.label);
            track.stop();
          });
          audioContext.close();
          setIsTestingMicrophone(false);
          setAudioLevel(0);
          toast.success('🎤 Microphone test completed! Check if recording was saved for playback.');
        }
      };
      
      // Start monitoring immediately
      checkAudioLevel();
      toast.success('🎤 Testing microphone for 5 seconds... Speak loudly and watch the level bar!');
      
    } catch (error: any) {
      console.error('🎤 AUDIO TEST - Microphone test failed:', error);
      toast.error(`Microphone test failed: ${error.message}`);
      setIsTestingMicrophone(false);
      setAudioLevel(0);
    }
  };

  const playTestAudio = () => {
    if (testAudioUrl) {
      const audio = new Audio(testAudioUrl);
      audio.play().then(() => {
        toast.success('🔊 Playing back your recorded audio...');
      }).catch((error) => {
        console.error('🔊 Playback failed:', error);
        toast.error('Audio playback failed. Check browser audio settings.');
      });
    }
  };

  const testSpeakerOutput = () => {
    // Generate a test tone
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1); // 1 second tone
    
    toast.success('🔊 Playing test tone... You should hear a beep!');
  };

  const requestMicrophonePermission = async () => {
    try {
      console.log('🎤 AUDIO DEBUG - Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('🎤 AUDIO DEBUG - Permission granted, stream:', stream);
      stream.getTracks().forEach(track => track.stop());
      await checkAudioPermissions();
      await loadAudioDevices();
      toast.success('Microphone permission granted!');
    } catch (error: any) {
      console.error('🎤 AUDIO DEBUG - Permission request failed:', error);
      toast.error(`Permission request failed: ${error.message}`);
    }
  };

  // Continuous listening functions
  const startContinuousListening = async () => {
    try {
      console.log('🎤 CONTINUOUS - Starting continuous listening...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setContinuousListeningStream(stream);
      setIsContinuousListening(true);

      // Set up voice activity detection
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let isRecordingVoice = false;
      let voiceStartTime = 0;
      let silenceStartTime = 0;
      let mediaRecorder: MediaRecorder | null = null;
      let audioChunks: Blob[] = [];

      const VOICE_THRESHOLD = 30; // Adjust based on testing
      const MIN_VOICE_DURATION = 1000; // 1 second minimum
      const SILENCE_DURATION = 2000; // 2 seconds of silence to stop

      const checkVoiceActivity = () => {
        if (!isContinuousListening) {
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = (average / 128) * 100;

        const now = Date.now();

        if (normalizedLevel > VOICE_THRESHOLD) {
          // Voice detected
          if (!isRecordingVoice) {
            console.log('🎤 CONTINUOUS - Voice detected, starting recording...');
            voiceStartTime = now;
            isRecordingVoice = true;
            
            // Start recording
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
              audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = async () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              console.log('🎤 CONTINUOUS - Processing voice input...');
              await processAudioInput(audioBlob);
            };
            
            mediaRecorder.start();
            toast.info('🎤 Listening... Speak now!');
          }
          silenceStartTime = 0; // Reset silence timer
        } else {
          // Silence detected
          if (isRecordingVoice) {
            if (silenceStartTime === 0) {
              silenceStartTime = now;
            } else if (now - silenceStartTime > SILENCE_DURATION) {
              // Enough silence, stop recording
              const voiceDuration = now - voiceStartTime;
              if (voiceDuration > MIN_VOICE_DURATION && mediaRecorder) {
                console.log('🎤 CONTINUOUS - Silence detected, stopping recording...');
                mediaRecorder.stop();
                isRecordingVoice = false;
                silenceStartTime = 0;
                toast.success('🎤 Processing speech...');
              }
            }
          }
        }

        requestAnimationFrame(checkVoiceActivity);
      };

      checkVoiceActivity();
      toast.success('🎤 Continuous listening enabled! Speak anytime.');
      
    } catch (error: any) {
      console.error('🎤 CONTINUOUS - Failed to start continuous listening:', error);
      toast.error(`Failed to start continuous listening: ${error.message}`);
      setIsContinuousListening(false);
    }
  };

  const stopContinuousListening = () => {
    console.log('🎤 CONTINUOUS - Stopping continuous listening...');
    
    if (continuousListeningStream) {
      continuousListeningStream.getTracks().forEach(track => track.stop());
      setContinuousListeningStream(null);
    }
    
    setIsContinuousListening(false);
    toast.success('🎤 Continuous listening disabled.');
  };

  // Effect to handle conversational mode changes
  useEffect(() => {
    console.log('🔧 CONVERSATIONAL MODE - useEffect triggered!');
    console.log('🔧 CONVERSATIONAL MODE - conversationalMode:', conversationalMode);
    console.log('🔧 CONVERSATIONAL MODE - isContinuousListening:', isContinuousListening);
    
    if (conversationalMode && !isContinuousListening) {
      // When conversational mode is enabled, start continuous listening
      console.log('🔧 CONVERSATIONAL MODE - Starting continuous listening...');
      startContinuousListening();
    } else if (!conversationalMode && isContinuousListening) {
      // When conversational mode is disabled, stop continuous listening
      console.log('🔧 CONVERSATIONAL MODE - Stopping continuous listening...');
      stopContinuousListening();
    } else {
      console.log('🔧 CONVERSATIONAL MODE - No action needed');
    }
  }, [conversationalMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (continuousListeningStream) {
        continuousListeningStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [continuousListeningStream]);

  // Load thread messages when threadId changes
  useEffect(() => {
    if (threadId) {
      loadThreadMessages(threadId);
    } else {
      setMessages([]);
    }
  }, [threadId]);

  const loadThreads = async () => {
    try {
      const response = await fetch('/api/threads');
      const data = await response.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setThreadsLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      
      if (data.success) {
        setAvailableProviders(data.providers || []);
        setAvailableModels(data.models || []);
        
        // Set default provider to first available one
        if (data.providers && data.providers.length > 0 && !selectedProvider) {
          const firstProvider = data.providers[0];
          setSelectedProvider(firstProvider.id);
          
          // Set default model to first available model from first provider
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

  const loadThreadMessages = async (id: string) => {
    try {
      setThreadLoading(true);
      const response = await fetch(`/api/threads/${id}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load thread messages:', error);
      setMessages([]);
    } finally {
      setThreadLoading(false);
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

  const handleThreadClick = (id: string) => {
    if (editingThreadId === id) return; // Don't navigate if editing
    router.push(`/chat/${id}`);
  };

  const startEditing = (thread: Thread, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    setEditingThreadId(thread.id);
    setEditingTitle(thread.title || '');
  };

  const saveTitle = async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() })
      });

      if (response.ok) {
        // Update local state
        setThreads(prev => prev.map(t => 
          t.id === threadId ? { ...t, title: editingTitle.trim() } : t
        ));
      }
    } catch (error) {
      console.error('Failed to update thread title:', error);
    } finally {
      setEditingThreadId(null);
      setEditingTitle('');
    }
  };

  const cancelEditing = () => {
    setEditingThreadId(null);
    setEditingTitle('');
  };

  // Get provider from model ID - map to chat API expected values
  const getProviderFromModel = (modelId: string): string => {
    const model = availableModels.find(m => m.id === modelId);
    const provider = model?.provider || 'openai';
    // Map 'anthropic' to 'claude' for the chat API
    return provider === 'anthropic' ? 'claude' : provider;
  };

  // Handle sign out - properly clear Azure AD session
  const handleSignOut = async () => {
    try {
      // First clear NextAuth session
      await signOut({ redirect: false });
      
      // Then redirect to Azure AD logout endpoint
      const currentUrl = window.location.origin;
      const azureLogoutUrl = `/api/auth/azure-logout?post_logout_redirect_uri=${encodeURIComponent(currentUrl)}`;
      
      // Redirect to Azure logout
      window.location.href = azureLogoutUrl;
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback to regular signOut if Azure logout fails
      await signOut({ callbackUrl: '/' });
    }
  };

  // File upload functions
  const handleFileSelect = (files: FileList | null) => {
    if (!files || !threadId) return;

    const newUploads: UploadProgress[] = Array.from(files).map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Process each file
    newUploads.forEach((upload, index) => {
      uploadFile(upload.file, uploads.length + index);
    });
  };

  const uploadFile = async (file: File, uploadIndex: number) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('threadId', threadId || '');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploads(prev => prev.map((upload, i) => 
          i === uploadIndex && upload.status === 'uploading'
            ? { ...upload, progress: Math.min(upload.progress + 10, 90) }
            : upload
        ));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      setUploads(prev => prev.map((upload, i) => 
        i === uploadIndex
          ? { 
              ...upload, 
              progress: 100, 
              status: 'completed' as const,
              result: result.file 
            }
          : upload
      ));

      setAttachments(prev => [...prev, result.file]);
      toast.success(`File "${result.file.filename}" uploaded successfully`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploads(prev => prev.map((upload, i) => 
        i === uploadIndex
          ? { 
              ...upload, 
              status: 'error' as const,
              error: errorMessage 
            }
          : upload
      ));

      toast.error(`Upload failed: ${errorMessage}`);
    }
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttachment = (fileId: string) => {
    setAttachments(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('🎤 Microphone access granted, stream:', stream);
      console.log('🎤 Audio tracks:', stream.getAudioTracks());
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('🎤 Audio data available:', event.data.size, 'bytes');
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('🎤 Audio blob created:', audioBlob.size, 'bytes');
        await processAudioInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('🎤 MediaRecorder error:', event);
        toast.error('Recording error occurred');
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      toast.success('🎤 Recording started... Speak now!');
      console.log('🎤 MediaRecorder started');
    } catch (error: any) {
      console.error('🎤 Failed to start recording:', error);
      toast.error(`Failed to start recording: ${error.message}. Please check microphone permissions.`);
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
      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      toast.info('Processing speech...');

      // Send to our server-side speech endpoint
      const response = await fetch('/api/speech', {
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
        
        // Show which service was used
        const serviceInfo = result.service ? ` (${result.service})` : '';
        toast.success(`Speech converted to text!${serviceInfo}`);
        
        // Show note if fallback was used
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

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
    toast.success(feedback === 'positive' ? 'Thanks for the positive feedback!' : 'Thanks for the feedback. We\'ll work to improve.');
  };

  const retryMessage = (messageId: string) => {
    // Find the message and resend
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
      status: 'sending',
      attachments: attachments.length > 0 ? attachments : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      let currentThreadId = threadId;

      // Create thread if none exists
      if (!currentThreadId) {
        const threadResponse = await fetch('/api/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: message.substring(0, 50) })
        });
        const threadData = await threadResponse.json();
        currentThreadId = threadData.thread.id;
      }

      // Send message to API with selected model and attachments
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: currentThreadId,
          message,
          provider: getProviderFromModel(selectedModel),
          modelId: selectedModel,
          attachments: attachments.map(a => a.id),
          conversationalMode: conversationalMode
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

      // Clear attachments after successful send
      setAttachments([]);
      setUploads([]);
      setShowFileUpload(false);

      // Navigate to thread URL if we created a new thread
      if (!threadId && currentThreadId) {
        router.push(`/chat/${currentThreadId}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
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

  const getFileIcon = (mimeType: string) => {
    const typeInfo = SUPPORTED_TYPES[mimeType as keyof typeof SUPPORTED_TYPES];
    return typeInfo?.icon || File;
  };

  const getFileLabel = (mimeType: string) => {
    const typeInfo = SUPPORTED_TYPES[mimeType as keyof typeof SUPPORTED_TYPES];
    return typeInfo?.label || 'FILE';
  };

  const getFileColor = (mimeType: string) => {
    const typeInfo = SUPPORTED_TYPES[mimeType as keyof typeof SUPPORTED_TYPES];
    return typeInfo?.color || 'bg-gray-100 text-gray-800';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getStatusIcon = (status?: string) => {
    switch (status) {
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

  const getModelDisplayName = (modelId?: string) => {
    if (!modelId) return 'Assistant';
    return MODEL_DISPLAY_NAMES[modelId] || modelId;
  };

  const getProviderColor = (provider?: string) => {
    if (!provider) return 'bg-gray-100 text-gray-800';
    return PROVIDER_COLORS[provider] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div 
      className="flex h-full bg-gray-900"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center">
          <div className="text-center text-blue-600">
            <Upload className="h-16 w-16 mx-auto mb-4" />
            <p className="text-xl font-semibold">Drop files here to upload</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Conversations</h3>
            <button
              onClick={() => router.push('/chat')}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              New Chat
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {threadsLoading ? (
            <div className="text-gray-400">Loading threads...</div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                    threadId === thread.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                  onClick={() => handleThreadClick(thread.id)}
                >
                  <div className="flex items-center justify-between">
                    {editingThreadId === thread.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(thread.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        onBlur={() => saveTitle(thread.id)}
                        className="flex-1 bg-gray-600 text-white px-2 py-1 rounded text-sm focus:outline-none focus:bg-gray-500"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {thread.title || 'Untitled conversation'}
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            {new Date(thread.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => startEditing(thread, e)}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-600 rounded transition-opacity"
                          title="Rename conversation"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-semibold text-white">
              The Hive AI Platform
            </h1>
            {selectedModel && (
              <Badge className={getProviderColor(getProviderFromModel(selectedModel))}>
                {getModelDisplayName(selectedModel)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyConversation}
              disabled={messages.length === 0}
              className="text-white hover:bg-gray-700"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.success('Sharing functionality would be implemented here')}
              disabled={messages.length === 0}
              className="text-white hover:bg-gray-700"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white hover:bg-gray-700"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSignOut}
              variant="destructive"
              size="sm"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Always visible model selector */}
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
                    {availableProviders.length === 0 ? (
                      <option value="">No providers available</option>
                    ) : (
                      availableProviders.map((provider) => (
                        <option 
                          key={provider.id} 
                          value={provider.id}
                          disabled={!provider.available}
                        >
                          {provider.name} {!provider.available ? '(Unavailable)' : ''}
                        </option>
                      ))
                    )}
                  </select>

                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                    disabled={!selectedProvider}
                  >
                    {!selectedProvider ? (
                      <option value="">Select a provider first</option>
                    ) : getModelsForProvider(selectedProvider).length === 0 ? (
                      <option value="">No models available</option>
                    ) : (
                      getModelsForProvider(selectedProvider).map((model) => (
                        <option 
                          key={model.id} 
                          value={model.id}
                          disabled={!model.available}
                        >
                          {model.name} {!model.available ? '(Unavailable)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={conversationalMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  console.log('🔧 CONVERSATIONAL MODE - Button clicked! Current state:', conversationalMode);
                  setConversationalMode(!conversationalMode);
                  console.log('🔧 CONVERSATIONAL MODE - New state will be:', !conversationalMode);
                  if (!conversationalMode) {
                    console.log('🔧 CONVERSATIONAL MODE - Enabling conversational mode...');
                    toast.success('🧠 Conversational Mode Enabled', {
                      description: 'AI will now remember information across all conversations for personalized responses.',
                      duration: 4000
                    });
                  } else {
                    console.log('🔧 CONVERSATIONAL MODE - Disabling conversational mode...');
                    toast.success('🔒 Conversational Mode Disabled', {
                      description: 'AI will not remember information from previous conversations. Each chat is independent.',
                      duration: 4000
                    });
                  }
                }}
                className={conversationalMode 
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
                  : "text-white border-gray-600 hover:bg-gray-700"
                }
                title={conversationalMode ? "Click to disable conversational mode" : "Click to enable conversational mode"}
              >
                {conversationalMode ? (
                  <>
                    <div className="w-2 h-2 bg-green-200 rounded-full animate-pulse mr-2"></div>
                    💬 Conversational Mode ON
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    💬 Conversational Mode OFF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-white border-gray-600 hover:bg-gray-700"
                onClick={() => {
                  console.log('Info button clicked, conversationalMode:', conversationalMode);
                  if (conversationalMode) {
                    toast('🧠 Conversational Mode Active', {
                      description: 'AI remembers information from all your previous conversations across threads. This includes personal details, preferences, and ongoing discussions.',
                      duration: 5000
                    });
                    alert('🧠 Conversational Mode Active\n\nAI remembers information from all your previous conversations across threads. This includes personal details, preferences, and ongoing discussions.');
                  } else {
                    toast('🔒 Privacy Mode Active', {
                      description: 'Conversational mode is disabled. AI will not remember information from previous conversations. Each chat is independent for privacy.',
                      duration: 5000
                    });
                    alert('🔒 Privacy Mode Active\n\nConversational mode is disabled. AI will not remember information from previous conversations. Each chat is independent for privacy.');
                  }
                }}
                title="Click for information about conversational mode"
              >
                ℹ️ Info
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-white border-gray-600 hover:bg-gray-700"
                onClick={() => setShowAudioDiagnostics(!showAudioDiagnostics)}
                title="Audio diagnostics and testing"
              >
                🎤 Audio Test
              </Button>
            </div>
          </div>
        </div>

        {/* Audio Diagnostics Panel */}
        {showAudioDiagnostics && (
          <div className="border-b border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Audio Diagnostics</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAudioDiagnostics(false)}
                className="text-white hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Permission Status</label>
                  <div className={`px-3 py-2 rounded text-sm ${
                    audioPermissionStatus === 'granted' ? 'bg-green-900 text-green-200' :
                    audioPermissionStatus === 'denied' ? 'bg-red-900 text-red-200' :
                    'bg-yellow-900 text-yellow-200'
                  }`}>
                    {audioPermissionStatus}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Audio Devices</label>
                  <div className="px-3 py-2 bg-gray-700 text-white rounded text-sm">
                    {audioDevices.length} device(s) found
                  </div>
                </div>
              </div>

              {audioDevices.length > 0 && (
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Select Microphone</label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                  >
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.substring(0, 8)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Visual Audio Level Indicator */}
              {(isTestingMicrophone || audioLevel > 0) && (
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">
                    Audio Level {isTestingMicrophone ? '(Recording...)' : ''}
                  </label>
                  <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                    <div 
                      className={`h-4 rounded-full transition-all duration-100 ${
                        audioLevel > 70 ? 'bg-red-500' :
                        audioLevel > 40 ? 'bg-yellow-500' :
                        audioLevel > 10 ? 'bg-green-500' :
                        'bg-gray-500'
                      }`}
                      style={{ width: `${Math.max(2, audioLevel)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    {audioLevel.toFixed(1)}% - {
                      audioLevel > 70 ? 'Very Loud' :
                      audioLevel > 40 ? 'Good Level' :
                      audioLevel > 10 ? 'Quiet' :
                      'Very Quiet'
                    }
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Input Testing</label>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={requestMicrophonePermission}
                      className="text-white border-gray-600 hover:bg-gray-700"
                    >
                      Request Permission
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testMicrophone}
                      className={`text-white border-gray-600 hover:bg-gray-700 ${
                        isTestingMicrophone ? 'bg-red-900 border-red-600' : ''
                      }`}
                    >
                      {isTestingMicrophone ? 'Stop Test' : 'Test Microphone'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadAudioDevices}
                      className="text-white border-gray-600 hover:bg-gray-700"
                    >
                      Refresh Devices
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Output Testing</label>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testSpeakerOutput}
                      className="text-white border-gray-600 hover:bg-gray-700"
                    >
                      🔊 Test Speakers
                    </Button>
                    {testAudioUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={playTestAudio}
                        className="text-white border-gray-600 hover:bg-gray-700"
                      >
                        🎵 Play Recording
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (testAudioUrl) {
                          URL.revokeObjectURL(testAudioUrl);
                          setTestAudioUrl(null);
                          toast.success('Test recording cleared');
                        }
                      }}
                      disabled={!testAudioUrl}
                      className="text-white border-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    >
                      🗑️ Clear Recording
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-1">
                <p><strong>Input Testing:</strong></p>
                <p>• Test Microphone: Records for 5 seconds with real-time level display</p>
                <p>• Watch the green/yellow/red level bar while speaking</p>
                <p>• Check browser console (F12) for detailed debugging info</p>
                <p><strong>Output Testing:</strong></p>
                <p>• Test Speakers: Plays a 1-second beep tone</p>
                <p>• Play Recording: Plays back your recorded test audio</p>
                <p>• Make sure your speakers/headphones are not muted</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {threadLoading && (
            <div className="text-center text-gray-400">
              Loading conversation...
            </div>
          )}
          
          {!threadLoading && messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              {threadId ? 'No messages in this conversation yet.' : 'Start a new conversation by typing a message below.'}
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
                    {/* Simple header for assistant messages */}
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

                    {/* File attachments for user messages */}
                    {isUser && message.attachments && message.attachments.length > 0 && (
                      <div className="mb-2 text-xs opacity-80">
                        📎 {message.attachments.length} file{message.attachments.length > 1 ? 's' : ''} attached
                      </div>
                    )}

                    {/* Message content */}
                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>

                    {/* Timestamp at bottom of message */}
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

        {/* File Upload Panel */}
        {showFileUpload && (
          <div className="border-t border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Attach Files</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileUpload(false)}
                className="text-white hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-white">
                  Drop files here or click to upload
                </p>
                <p className="text-sm text-gray-400">
                  Supports documents, images, spreadsheets, and data files
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4"
                >
                  Choose Files
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
                accept=".pdf,.doc,.docx,.txt,.csv,.json,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.ppt,.pptx"
              />
            </div>

            {/* Upload Progress */}
            {uploads.length > 0 && (
              <div className="space-y-3 mt-4">
                <h4 className="font-medium text-white">Uploads</h4>
                {uploads.map((upload, index) => {
                  const IconComponent = getFileIcon(upload.file.type);
                  return (
                    <Card key={index} className="p-4 bg-gray-700">
                      <CardContent className="p-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <IconComponent className="h-8 w-8 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-white truncate">
                                  {upload.file.name}
                                </p>
                                <Badge className={getFileColor(upload.file.type)}>
                                  {getFileLabel(upload.file.type)}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                {upload.status === 'uploading' && (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                )}
                                {upload.status === 'completed' && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                                {upload.status === 'error' && (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeUpload(index)}
                                  className="text-white hover:bg-gray-600"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-1">
                              <p className="text-xs text-gray-400">
                                {formatFileSize(upload.file.size)}
                              </p>
                              {upload.status === 'uploading' && (
                                <Progress value={upload.progress} className="mt-2" />
                              )}
                              {upload.status === 'error' && upload.error && (
                                <p className="text-xs text-red-400 mt-1">{upload.error}</p>
                              )}
                              {upload.status === 'completed' && upload.result && (
                                <p className="text-xs text-green-400 mt-1">
                                  ✓ Ready for AI processing
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="border-t border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-white">Attachments:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-2">
                  <span className="text-sm text-white truncate max-w-32">
                    {attachment.filename}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(attachment.id)}
                    className="h-4 w-4 p-0 text-white hover:bg-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                onClick={() => setShowFileUpload(!showFileUpload)}
                disabled={loading}
                className="text-white hover:bg-gray-700"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

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
                disabled={!input.trim() && attachments.length === 0 || !selectedModel}
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
