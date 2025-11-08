import { useState } from 'react';
import Navigation from './Navigation';
import ActionButton from './ActionButton';
import identityImage from '../assets/identity.jpg';
import lockImage from '../assets/lock.jpg';
import globeImage from '../assets/globe.jpg';
import userImage from '../assets/user.jpg';
import './LandingPage.css';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: 'LOCK',
      title: 'Privacy First',
      description: 'Zero-knowledge proofs ensure your personal data never leaves your device',
      image: lockImage,
    },
    {
      icon: 'GLOBE',
      title: 'Portable Credentials',
      description: 'Use your credentials across any platform - register once, use anywhere',
      image: globeImage,
    },
    {
      icon: 'USER',
      title: 'Self-Sovereign',
      description: 'You control your identity data - no third-party issuer required',
      image: userImage,
    },
    {
      icon: 'ZAP',
      title: 'Fast Verification',
      description: 'Instant proof generation and verification in under 30 seconds',
      image: identityImage,
    },
  ];

  return (
    <div className="landing-page">
      <Navigation onGetStarted={onGetStarted} />
      
      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span>This Is Universal KYC Passport</span>
          </div>
          <h1 className="hero-title">
            We Craft Digital Solutions That Transform And Grow Your Identity
          </h1>
          <p className="hero-description">
            With our professional and up to date development processes, let us take your identity 
            and scale it up to your desired goal. Prove your credentials without revealing personal data.
          </p>
          <div className="hero-actions">
            <ActionButton
              onClick={onGetStarted}
              label="Get Started"
              variant="primary"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              }
            />
            <ActionButton
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              label="Learn More"
              variant="outline"
            />
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-card card-1">
            <img src={lockImage} alt="Privacy" className="card-image" />
            <div className="card-text">VERIFIED</div>
          </div>
          <div className="floating-card card-2">
            <img src={lockImage} alt="ZK Proof" className="card-image" />
            <div className="card-text">ZK PROOF</div>
          </div>
          <div className="floating-card card-3">
            <img src={identityImage} alt="Credential" className="card-image" />
            <div className="card-text">CREDENTIAL</div>
          </div>
        </div>
      </section>

        {/* About Us Section */}
      <section id="about" className="about-section">
        <div className="about-content">
          <div className="about-visual">
            <div className="about-image-container">
              <img src={identityImage} alt="Identity" className="about-image" />
            </div>
          </div>
          <div className="about-text">
            <h2 className="about-title">ABOUT US</h2>
            <h3 className="about-headline">
              We Are Universal KYC Passport, We Are The Identity Builders For a Better Tomorrow. 
              We are The Best Self-Sovereign Identity System In Town.
            </h3>
            <p className="about-description">
              At Universal KYC Passport, we provide exceptional zero-knowledge proof solutions and services. 
              We leverage our large knowledge base to deliver solutions that meet customers' identity needs 
              while maintaining complete privacy and self-sovereignty.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Why Choose Universal KYC Passport?</h2>
          <p className="section-subtitle">
            Built on cutting-edge zero-knowledge technology for maximum privacy and portability
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card ${hoveredFeature === index ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredFeature(index)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              {feature.image ? (
                <div className="feature-image-container">
                  <img src={feature.image} alt={feature.title} className="feature-image" />
                </div>
              ) : (
                <div className="feature-icon">{feature.icon}</div>
              )}
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Simple, secure, and fast - in just 5 steps</p>
        </div>
        <div className="steps-timeline">
          <div className="timeline-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Upload Document</h3>
              <p>Upload your passport, ID, or driver's license</p>
            </div>
          </div>
          <div className="timeline-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Extract Data</h3>
              <p>AI-powered OCR extracts relevant information</p>
            </div>
          </div>
          <div className="timeline-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Generate Proof</h3>
              <p>Create zero-knowledge proof without revealing data</p>
            </div>
          </div>
          <div className="timeline-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Create Credential</h3>
              <p>Store credential on KILT Protocol blockchain</p>
            </div>
          </div>
          <div className="timeline-step">
            <div className="step-number">5</div>
            <div className="step-content">
              <h3>Verify & Use</h3>
              <p>Use your credential across any platform</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-description">
            Join the future of self-sovereign identity. Create your first credential in minutes.
          </p>
          <ActionButton
            onClick={onGetStarted}
            label="Create Your Credential"
            variant="primary"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            }
          />
        </div>
      </section>
    </div>
  );
}

