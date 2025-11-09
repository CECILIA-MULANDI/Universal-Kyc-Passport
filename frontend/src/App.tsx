import { useState } from 'react';
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
import './App.css';

type ProcessStep = 'upload' | 'extract' | 'proof' | 'credential' | 'verify';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<ProcessStep>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const { showToast, removeToast, toasts } = useToast();

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

    // Simulate proof generation
    setTimeout(() => {
      setCurrentStep('credential');
      setIsProcessing(false);
      showToast('Proof generated successfully!', 'success');
    }, 3000);
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
          <div>
            <h1>Universal KYC Passport</h1>
            <p>Self-Sovereign Identity System</p>
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
