import { useState, useRef } from 'react';
import type { DocumentType, UploadedDocument } from '../types';
import ActionButton from './ActionButton';
import CustomSelect from './CustomSelect';
import './DocumentUpload.css';

interface DocumentUploadProps {
  onDocumentUploaded: (document: UploadedDocument) => void;
  onError?: (message: string) => void;
  onProcess?: () => void;
  isProcessing?: boolean;
}

export default function DocumentUpload({ 
  onDocumentUploaded, 
  onError,
  onProcess,
  isProcessing = false 
}: DocumentUploadProps) {
  const [documentType, setDocumentType] = useState<DocumentType>('passport');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      onError?.('Please upload a JPEG, PNG, or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError?.('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreview(result);
        
        // Create uploaded document object
        const uploadedDoc: UploadedDocument = {
          file,
          preview: result,
          documentType,
        };
        onDocumentUploaded(uploadedDoc);
      };
      reader.readAsDataURL(file);
    } else {
      // For PDFs, we'll handle differently
      const uploadedDoc: UploadedDocument = {
        file,
        preview: '',
        documentType,
      };
      onDocumentUploaded(uploadedDoc);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="document-upload">
      <h2>Upload Identity Document</h2>
      
      {/* Document Type Selection */}
      <div className="document-type-selector">
        <label>Document Type:</label>
        <CustomSelect
          value={documentType}
          onChange={(value) => setDocumentType(value as DocumentType)}
          disabled={!!uploadedFile}
          options={[
            { value: 'passport', label: 'Passport' },
            { value: 'id', label: 'ID Card' },
            { value: 'driver_license', label: "Driver's License" },
          ]}
        />
      </div>

      {/* Upload Area */}
      {!uploadedFile ? (
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="upload-content">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>Drag and drop your document here, or click to browse</p>
            <p className="upload-hint">Supports: JPEG, PNG, PDF (Max 10MB)</p>
          </div>
        </div>
      ) : (
        <div className="uploaded-preview">
          <div className="preview-header">
            <span className="file-name">{uploadedFile.name}</span>
            <button onClick={handleRemove} className="remove-btn">
              Remove
            </button>
          </div>
          {preview && (
            <div className="preview-image">
              <img src={preview} alt="Document preview" />
            </div>
          )}
          {uploadedFile.type === 'application/pdf' && (
            <div className="pdf-preview">
              <p>📄 PDF Document: {uploadedFile.name}</p>
            </div>
          )}
          {onProcess && (
            <div className="document-actions">
              <ActionButton
                onClick={onProcess}
                label="Process Document"
                variant="primary"
                loading={isProcessing}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

