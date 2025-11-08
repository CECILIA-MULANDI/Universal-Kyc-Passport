import { useState } from 'react';
import './Navigation.css';

interface NavigationProps {
  onGetStarted: () => void;
}

export default function Navigation({ onGetStarted }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Use scrollIntoView with offset
      const yOffset = -80; // Navigation height
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
      setIsMenuOpen(false);
    }
  };

  return (
    <>
      {isMenuOpen && (
        <div 
          className="nav-overlay"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      <nav className="navigation">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-text">Universal KYC</span>
          </div>
          
          <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
            <a 
              href="#home" 
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('home');
              }} 
              className="nav-link active"
            >
              Home
            </a>
            <a 
              href="#about" 
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('about');
              }} 
              className="nav-link"
            >
              About Us
            </a>
            <a 
              href="#how-it-works" 
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('how-it-works');
              }} 
              className="nav-link"
            >
              How It Works
            </a>
            <a 
              href="#features" 
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('features');
              }} 
              className="nav-link"
            >
              Features
            </a>
            <button onClick={onGetStarted} className="nav-cta">
              GET STARTED →
            </button>
          </div>

          <button 
            className={`nav-toggle ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
    </>
  );
}

