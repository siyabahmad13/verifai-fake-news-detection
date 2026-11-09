import React from 'react';
import '../styles/pages.css';

export const Privacy = () => {
  return (
    <div className="editorial-page">
      <div className="editorial-container">
        <header className="editorial-header">
          <span className="editorial-tag">Legal & Data Handling</span>
          <h1 className="editorial-title">Privacy Policy</h1>
          <p className="editorial-lead">
            Transparent information regarding how VerifAI collects, processes, and stores data submitted
            through the platform.
          </p>
        </header>

        <div className="editorial-body">
          <section className="editorial-section">
            <h2>Information We Collect</h2>
            <p>
              VerifAI collects only the minimum necessary data required to facilitate verification and maintain
              user accounts:
            </p>
            <ul>
              <li>
                <strong>Account Credentials:</strong> When you register an account, we collect your name, email address,
                and securely hashed password.
              </li>
              <li>
                <strong>Submitted Content:</strong> News article text, headlines, and URLs submitted for verification
                are stored to generate prediction logs and populate your personal prediction history.
              </li>
              <li>
                <strong>Usage Telemetry:</strong> Standard HTTP request logs (IP address, browser user-agent, request timestamp)
                are processed for security monitoring, rate limiting, and system reliability.
              </li>
            </ul>
          </section>

          <section className="editorial-section">
            <h2>How Information Is Used</h2>
            <p>
              Data submitted to VerifAI is utilized strictly for:
            </p>
            <ul>
              <li>Executing real-time machine learning predictions and computing confidence statistics.</li>
              <li>Maintaining your authenticated verification history.</li>
              <li>Preventing denial-of-service attacks and abusive automated scraping.</li>
            </ul>
            <p>
              We do not sell, rent, or monetize your submitted article text, personal credentials, or analysis history
              to third-party advertising networks.
            </p>
          </section>

          <section className="editorial-section">
            <h2>Data Retention & Security</h2>
            <p>
              Passwords are protected using industry-standard cryptographic hashing (PBKDF2 with SHA-256). All API
              communications occur over secure transport layers. Authenticated users may request the deletion of their
              accounts and verification records by contacting system administrators.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
