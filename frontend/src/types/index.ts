export type DocumentType = 'passport' | 'id' | 'driver_license';

export interface ExtractedData {
  // ISO format (YYYY-MM-DD)
  birthdate: string; 
  documentNumber: string;
  documentType: DocumentType;
  country?: string;
  fullName?: string;
}

export interface UploadedDocument {
  file: File;
  preview: string;
  documentType: DocumentType;
  extractedData?: ExtractedData;
  error?: string;
}

