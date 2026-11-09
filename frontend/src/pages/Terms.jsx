import React from 'react';
import '../styles/pages.css';

export const Terms = () => {
  return (
    <div className="editorial-page">
      <div className="editorial-container">
        <header className="editorial-header">
          <span className="editorial-tag">Terms & User Agreement</span>
          <h1 className="editorial-title">Terms of Service</h1>
          <p className="editorial-lead">
            Guidelines governing the use of the VerifAI platform, its machine learning verification API,
            and associated services.
          </p>
        </header>

        <div className="editorial-body">
          <section className="editorial-section">
            <h2>Purpose of Service</h2>
            <p>
              VerifAI is provided as an analytical and educational research platform to evaluate digital text
              for stylometric indicators of misinformation. The service is intended to support critical inquiry,
              journalism research, and media literacy.
            </p>
          </section>

          <section className="editorial-section">
            <h2>Limitation of Factual Certainty</h2>
            <p>
              By using VerifAI, you expressly acknowledge and agree that:
            </p>
            <ul>
              <li>
                Output classifications (such as REAL or FAKE) and numerical confidence percentages represent
                algorithmic estimations based on trained datasets, not absolute or legal certifications of truth.
              </li>
              <li>
                VerifAI does not replace authoritative fact-checking organizations, legal review, or primary source
                journalistic investigation.
              </li>
              <li>
                The operators of VerifAI disclaim all liability for any decisions, publications, or actions taken
                in reliance upon system predictions.
              </li>
            </ul>
          </section>

          <section className="editorial-section">
            <h2>Acceptable Use</h2>
            <p>
              Users agree not to:
            </p>
            <ul>
              <li>Subject the platform to automated high-frequency request floods designed to degrade service availability.</li>
              <li>Attempt unauthorized penetration testing, reverse-engineering of private backend endpoints, or token forging.</li>
              <li>Submit unlawful, defamatory, or abusive material prohibited by law.</li>
            </ul>
          </section>

          <section className="editorial-section">
            <h2>Service Modifications</h2>
            <p>
              We reserve the right to refine model versions, update prediction thresholds, or temporarily modify
              service endpoints to ensure operational integrity and model security.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
