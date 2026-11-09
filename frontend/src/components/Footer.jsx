import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/footer.css';

export const Footer = () => {
  return (
    <footer className="footer-root">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand & Mission */}
          <div className="footer-col brand-col">
            <span className="footer-brand">VerifAI</span>
            <p className="footer-tagline">
              AI-assisted news verification and content credibility analysis.
              Evaluating text stylometrics and statistical patterns to combat misinformation.
            </p>
          </div>

          {/* Product Navigation */}
          <div className="footer-col">
            <h4 className="footer-heading">Product</h4>
            <ul className="footer-links">
              <li>
                <Link to="/detector">News Test</Link>
              </li>
              <li>
                <Link to="/history">Prediction History</Link>
              </li>
            </ul>
          </div>

          {/* Information */}
          <div className="footer-col">
            <h4 className="footer-heading">Information</h4>
            <ul className="footer-links">
              <li>
                <Link to="/about">About VerifAI</Link>
              </li>
              <li>
                <Link to="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Responsible AI Disclaimer & Legal */}
        <div className="footer-bottom">
          <div className="footer-disclaimer">
            Responsible AI Notice: VerifAI produces statistical authenticity predictions based on trained
            machine learning models. Predictions should be utilized as analytical indicators alongside verified
            journalistic fact-checking, not as definitive determinations of absolute truth.
          </div>
          <div className="footer-legal">
            <span>&copy; {new Date().getFullYear()} VerifAI Platform. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
