import { useState, useEffect } from 'react';
import { extractDocumentData } from './services/ocr';
import DocumentUpload from './components/DocumentUpload';
import ProgressSteps from './components/ProgressSteps';
import type { StepStatus } from './components/ProgressSteps';
import WalletConnection from './components/WalletConnection';
import ToastContainer, { useToast } from './components/ToastContainer';
import LoadingSpinner from './components/LoadingSpinner';
import StatusBadge from './components/StatusBadge';
import ActionButton from './components/ActionButton';
import LandingPage from './components/LandingPage';
import type { UploadedDocument } from './types';
import { generateAgeProof } from './services/zkProof';
import './App.css';

type ProcessStep = 'upload' | 'extract' | 'proof' | 'credential' | 'verify';

const STORAGE_KEYS = {
  SHOW_LANDING: 'proofme_showLanding',
  CURRENT_STEP: 'proofme_currentStep',
  EXTRACTED_DATA: 'proofme_extractedData',
  UPLOADED_DOCUMENT: 'proofme_uploadedDocument',
  CONNECTED_ADDRESS: 'proofme_connectedAddress',
  ZK_PROOF: 'proofme_zkProof',
};

function App() {
  // Initialize state from localStorage or defaults
  const [showLanding, setShowLanding] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_LANDING);
    return saved ? saved === 'true' : true;
  });
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(() => {
   
    return null;
  });
  const [connectedAddress, setConnectedAddress] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CONNECTED_ADDRESS) || '';
  });
  const [currentStep, setCurrentStep] = useState<ProcessStep>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP);
    return (saved as ProcessStep) || 'upload';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [zkProof, setZkProof] = useState<{ proof: Uint8Array; publicInputs: string[] } | null>(() => {
    // Note: Uint8Array can't be directly stored in localStorage
    // We'll store it as base64 string
    const saved = localStorage.getItem(STORAGE_KEYS.ZK_PROOF);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          proof: Uint8Array.from(atob(parsed.proof), c => c.charCodeAt(0)),
          publicInputs: parsed.publicInputs,
        };
      } catch {
        return null;
      }
    }
    return null;
  });
  
  // Add useEffect to persist zkProof
  useEffect(() => {
    if (zkProof) {
      const proofToStore = {
        proof: btoa(String.fromCharCode(...zkProof.proof)),
        publicInputs: zkProof.publicInputs,
      };
      localStorage.setItem(STORAGE_KEYS.ZK_PROOF, JSON.stringify(proofToStore));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ZK_PROOF);
    }
  }, [zkProof]);
  const [extractedData, setExtractedData] = useState<any>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXTRACTED_DATA);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const { showToast, removeToast, toasts } = useToast();

  // Handle reload: if on extract step but no document (can't restore File)
  useEffect(() => {
    if (currentStep === 'extract' && !uploadedDocument) {
      if (extractedData) {
        // If we have extracted data, move to proof step
        setCurrentStep('proof');
      } else {
        // If we have nothing, go back to upload
        setCurrentStep('upload');
      }
    }
  }, [currentStep, uploadedDocument, extractedData]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_LANDING, String(showLanding));
  }, [showLanding]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStep);
  }, [currentStep]);

  useEffect(() => {
    if (extractedData) {
      localStorage.setItem(STORAGE_KEYS.EXTRACTED_DATA, JSON.stringify(extractedData));
    } else {
      localStorage.removeItem(STORAGE_KEYS.EXTRACTED_DATA);
    }
  }, [extractedData]);

  useEffect(() => {
    if (uploadedDocument) {
      // Store document metadata (without File object which can't be serialized)
      const docToStore = {
        preview: uploadedDocument.preview,
        documentType: uploadedDocument.documentType,
        extractedData: uploadedDocument.extractedData,
        fileName: uploadedDocument.file?.name,
        fileSize: uploadedDocument.file?.size,
        fileType: uploadedDocument.file?.type,
      };
      localStorage.setItem(STORAGE_KEYS.UPLOADED_DOCUMENT, JSON.stringify(docToStore));
    } else {
      localStorage.removeItem(STORAGE_KEYS.UPLOADED_DOCUMENT);
    }
  }, [uploadedDocument]);

  useEffect(() => {
    if (connectedAddress) {
      localStorage.setItem(STORAGE_KEYS.CONNECTED_ADDRESS, connectedAddress);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CONNECTED_ADDRESS);
    }
  }, [connectedAddress]);

  const steps = [
    { id: 1, label: 'Upload', status: getStepStatus('upload') as StepStatus },
    { id: 2, label: 'Extract', status: getStepStatus('extract') as StepStatus },
    { id: 3, label: 'Generate Proof', status: getStepStatus('proof') as StepStatus },
    { id: 4, label: 'Create Credential', status: getStepStatus('credential') as StepStatus },
    { id: 5, label: 'Verify', status: getStepStatus('verify') as StepStatus },
  ];

  function getStepStatus(step: ProcessStep): StepStatus {
    const stepOrder: ProcessStep[] = ['upload', 'extract', 'proof', 'credential', 'verify'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  }

  const handleDocumentUploaded = (document: UploadedDocument): void => {
    // Only allow upload if wallet is connected
    if (!connectedAddress) {
      showToast('Please connect your wallet first before uploading a document', 'warning');
      return;
    }
    
    setUploadedDocument(document);
    setCurrentStep('extract');
    showToast('Document uploaded successfully!', 'success');
  };

  const handleError = (message: string) => {
    showToast(message, 'error');
  };

  const handleProcessDocument = async () => {
    if (!uploadedDocument) return;

    setIsProcessing(true);
    setCurrentStep('extract');
    showToast('Extracting data from document...', 'info');

    try {
      const extracted = await extractDocumentData(
        uploadedDocument.file,
        uploadedDocument.documentType
      );
      
      setExtractedData(extracted);
      uploadedDocument.extractedData = extracted;
      setUploadedDocument({ ...uploadedDocument });
      
      setCurrentStep('proof');
      setIsProcessing(false);
      showToast('Data extracted successfully!', 'success');
    } catch (error) {
      setIsProcessing(false);
      const fullMessage = error instanceof Error ? error.message : 'Failed to extract data';
      
      // Log full error to console for debugging
      console.error('Document extraction error:', fullMessage);
      
      // Show a concise message in toast, with first line of error
      const toastMessage = fullMessage.split('\n')[0] || 'Failed to extract data from document';
      showToast(toastMessage + ' (Check console for details)', 'error');
      handleError(toastMessage);
    }
  };

  const handleGenerateProof = async () => {
    if (!extractedData) return;

    setIsProcessing(true);
    setCurrentStep('proof');
    showToast('Generating zero-knowledge proof...', 'info');

    try {
      // Initialize Noir on first use
      const { initializeNoir } = await import('./services/zkProof');
      await initializeNoir();
      
      // Generate proof
      const proofResult = await generateAgeProof(extractedData.birthdate, 18);
      setZkProof(proofResult);
      
      setCurrentStep('credential');
      setIsProcessing(false);
      showToast('Proof generated successfully!', 'success');
    } catch (error) {
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate proof';
      console.error('Proof generation error:', errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  const handleCreateCredential = async () => {
    if (!connectedAddress) {
      showToast('Please connect your wallet first', 'warning');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('credential');
    showToast('Creating credential on KILT...', 'info');

    // Simulate credential creation
    setTimeout(() => {
      setCurrentStep('verify');
      setIsProcessing(false);
      showToast('Credential created successfully!', 'success');
    }, 2500);
  };

  const handleVerify = async () => {
    setIsProcessing(true);
    setCurrentStep('verify');
    showToast('Verifying credential...', 'info');

    // Simulate verification
    setTimeout(() => {
      setIsProcessing(false);
      showToast('Verification complete!', 'success');
    }, 2000);
  };

  const handleGetStarted = () => {
    setShowLanding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReupload = (): void => {
    // Reset all document-related state
    setUploadedDocument(null);
    setExtractedData(null);
    setCurrentStep('upload');
    setIsProcessing(false);
    showToast('You can now upload a new document', 'info');
  };

  const handleReturnToLanding = (): void => {
    setShowLanding(true);
    // Clear all state when returning to landing
    setUploadedDocument(null);
    setExtractedData(null);
    setCurrentStep('upload');
    setIsProcessing(false);
    // Optionally clear wallet connection too
    // setConnectedAddress('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (showLanding) {
    return (
      <div className="app">
        <LandingPage onGetStarted={handleGetStarted} />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <button onClick={handleReturnToLanding} className="return-to-landing-button" title="Return to landing page">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>
            <div>
              <h1>Universal KYC Passport</h1>
              <p>Self-Sovereign Identity System</p>
            </div>
          </div>
          <WalletConnection
            onConnect={setConnectedAddress}
            connectedAddress={connectedAddress}
          />
        </div>
      </header>
      
      <main className="app-main">
        <ProgressSteps steps={steps} />

        {isProcessing && currentStep === 'extract' && (
          <LoadingSpinner size="large" message="Extracting data from document..." />
        )}

        {isProcessing && currentStep === 'proof' && (
          <LoadingSpinner size="large" message="Generating zero-knowledge proof..." />
        )}

        {isProcessing && currentStep === 'credential' && (
          <LoadingSpinner size="large" message="Creating credential on KILT..." />
        )}

        {isProcessing && currentStep === 'verify' && (
          <LoadingSpinner size="large" message="Verifying credential..." />
        )}

        {!isProcessing && (
          <>
            {currentStep === 'upload' && (
              <>
                {!connectedAddress ? (
                  <div className="step-content">
                    <div className="info-card warning">
                      <h3>Wallet Connection Required</h3>
                      <p className="info-text">
                        Please connect your wallet before uploading a document. 
                        This ensures your credentials are securely linked to your wallet address.
                      </p>
                      <div className="action-section">
                        <p className="warning-text">Connect your wallet using the button in the header above.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <DocumentUpload
                    onDocumentUploaded={handleDocumentUploaded}
                    onError={handleError}
                  />
                )}
              </>
            )}

            {currentStep === 'extract' && !uploadedDocument && extractedData && (
              <div className="step-content">
                <div className="info-card warning">
                  <h3>Document Not Available</h3>
                  <p className="info-text">
                    The document file cannot be restored after reload. However, your extracted data is still available.
                  </p>
                  <div className="data-display" style={{ marginTop: '1rem' }}>
                    <div className="data-item">
                      <span className="data-label">Birthdate:</span>
                      <span className="data-value">{extractedData.birthdate}</span>
                    </div>
                    <div className="data-item">
                      <span className="data-label">Document Number:</span>
                      <span className="data-value">{extractedData.documentNumber}</span>
                    </div>
                  </div>
                  <div className="action-section">
                    <ActionButton
                      onClick={() => setCurrentStep('proof')}
                      label="Continue to Generate Proof"
                      variant="primary"
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <path d="M2 17l10 5 10-5" />
                          <path d="M2 12l10 5 10-5" />
                        </svg>
                      }
                    />
                    <button onClick={handleReupload} className="reupload-button">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Upload New Document
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'extract' && uploadedDocument && (
              <div className="step-content">
                <div className="info-card">
                  <h3>Document Uploaded</h3>
                  <div className="data-display">
                    <div className="data-item">
                      <span className="data-label">File:</span>
                      <span className="data-value">{uploadedDocument.file.name}</span>
                    </div>
                    <div className="data-item">
                      <span className="data-label">Type:</span>
                      <span className="data-value">{uploadedDocument.documentType}</span>
                    </div>
                  </div>
                  {uploadedDocument.preview && (
                    <div className="preview-image-container" style={{ marginTop: '1rem' }}>
                      <img 
                        src={uploadedDocument.preview} 
                        alt="Document preview" 
                        style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }}
                      />
                    </div>
                  )}
                  <StatusBadge status="success" label="Ready to Process" />
                </div>
                <div className="action-section">
                  <ActionButton
                    onClick={handleProcessDocument}
                    label="Extract Data from Document"
                    variant="primary"
                    loading={isProcessing}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    }
                  />
                  <button onClick={handleReupload} className="reupload-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Reupload Document
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'proof' && extractedData && (
              <div className="step-content">
                <div className="info-card">
                  <h3>Extracted Data</h3>
                  <div className="data-display">
                    <div className="data-item">
                      <span className="data-label">Birthdate:</span>
                      <span className="data-value">{extractedData.birthdate}</span>
                    </div>
                    <div className="data-item">
                      <span className="data-label">Document Number:</span>
                      <span className="data-value">{extractedData.documentNumber}</span>
                    </div>
                  </div>
                  <StatusBadge status="success" label="Data Extracted" />
                </div>
                <div className="action-section">
                  <ActionButton
                    onClick={handleGenerateProof}
                    label="Generate ZK Proof"
                    variant="primary"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    }
                  />
                  <button onClick={handleReupload} className="reupload-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Reupload Document
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'credential' && (
              <div className="step-content">
                <div className="info-card">
                  <h3>Proof Generated</h3>
                  <StatusBadge status="success" label="Proof Ready" />
                  <p className="info-text">Your zero-knowledge proof has been generated successfully.</p>
                </div>
                <div className="action-section">
                  <ActionButton
                    onClick={handleCreateCredential}
                    label="Create KILT Credential"
                    variant="secondary"
                    disabled={!connectedAddress}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                    }
                  />
                  {!connectedAddress && (
                    <p className="warning-text">Connect your wallet to create credential</p>
                  )}
                  <button onClick={handleReupload} className="reupload-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Reupload Document
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'verify' && (
              <div className="step-content">
                <div className="info-card success">
                  <h3>Credential Created</h3>
                  <StatusBadge status="success" label="Credential Active" />
                  <p className="info-text">Your credential has been stored on KILT Protocol.</p>
                </div>
                <div className="action-section">
                  <ActionButton
                    onClick={handleVerify}
                    label="Verify Credential"
                    variant="primary"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    }
                  />
                  <button onClick={handleReupload} className="reupload-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Reupload Document
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
