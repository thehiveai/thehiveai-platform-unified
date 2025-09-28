'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Database, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface FileUploadProps {
  threadId: string;
  onFileUploaded: (file: UploadedFile) => void;
  onError: (error: string) => void;
}

interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  category: string;
  hasExtractedText: boolean;
  extractedText?: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  result?: UploadedFile;
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

export function FileUpload({ threadId, onFileUploaded, onError }: FileUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

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
      formData.append('threadId', threadId);

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

      onFileUploaded(result.file);

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

      onError(errorMessage);
    }
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
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

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            Drop files here or click to upload
          </p>
          <p className="text-sm text-gray-500">
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
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Uploads</h4>
          {uploads.map((upload, index) => {
            const IconComponent = getFileIcon(upload.file.type);
            return (
              <Card key={index} className="p-4">
                <CardContent className="p-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <IconComponent className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
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
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-xs text-gray-500">
                          {formatFileSize(upload.file.size)}
                        </p>
                        {upload.status === 'uploading' && (
                          <Progress value={upload.progress} className="mt-2" />
                        )}
                        {upload.status === 'error' && upload.error && (
                          <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                        )}
                        {upload.status === 'completed' && upload.result?.hasExtractedText && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Text extracted for AI processing
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
  );
}
