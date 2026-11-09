import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/home.css';

export const Home = () => {
  const { isAuthenticated } = useAuth();
  const analyzeNewsTarget = isAuthenticated ? '/detector' : '/login';
  const analyzeNewsState = isAuthenticated ? undefined : { from: { pathname: '/dashboard' } };

  return (
    <div className="home-root">
      <div className="container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">Machine Learning Misinformation Detection</div>
          <h1 className="hero-headline">Verify the story before you trust it.</h1>
          <p className="hero-subtitle">
            VerifAI evaluates news articles using statistical stylometrics, language patterns, and trained
            probabilistic models to assist readers, journalists, and researchers in identifying fabricated claims.
          </p>
          <div className="hero-actions">
            <Link
              to={analyzeNewsTarget}
              state={analyzeNewsState}
              className="btn-primary btn-lg"
            >
              Analyze News
            </Link>
            <Link to="/about" className="btn-secondary btn-lg">
              Learn More
            </Link>
          </div>
        </section>

        {/* Feature Metrics Strip */}
        <section className="metrics-strip">
          <div className="metric-item">
            <span className="metric-value">94.6%</span>
            <span className="metric-label">Benchmark Accuracy</span>
          </div>
          <div className="metric-item">
            <span className="metric-value">&lt; 150ms</span>
            <span className="metric-label">Inference Latency</span>
          </div>
          <div className="metric-item">
            <span className="metric-value">50,000+</span>
            <span className="metric-label">Articles Evaluated</span>
          </div>
        </section>

        {/* 3-Step Process */}
        <section className="process-section">
          <div className="section-header">
            <span className="section-label">Workflow</span>
            <h2 className="section-title">How VerifAI Works</h2>
            <p className="section-desc">
              A transparent three-step analytical process designed for clarity and speed.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <span className="step-number">STEP 01</span>
              <h3 className="step-title">Submit</h3>
              <p className="step-text">
                Paste the body of a news article or enter a published URL into the verification workbench.
              </p>
            </div>

            <div className="step-card">
              <span className="step-number">STEP 02</span>
              <h3 className="step-title">Analyze</h3>
              <p className="step-text">
                The article is vectorized and processed through our trained supervised learning classifier in real time.
              </p>
            </div>

            <div className="step-card">
              <span className="step-number">STEP 03</span>
              <h3 className="step-title">Review</h3>
              <p className="step-text">
                Inspect the credibility assessment, statistical confidence level, and linguistic pattern indicators.
              </p>
            </div>
          </div>
        </section>

        {/* Why VerifAI Pillars */}
        <section className="pillars-section" style={{ marginTop: '80px' }}>
          <div className="section-header">
            <span className="section-label">Architecture</span>
            <h2 className="section-title">Why VerifAI</h2>
            <p className="section-desc">
              Engineered with focus on reproducibility, explainability, and rigorous statistical analysis.
            </p>
          </div>

          <div className="pillars-grid">
            <div className="pillar-card">
              <h3 className="pillar-title">Stylometric Pattern Detection</h3>
              <p className="pillar-desc">
                Examines syntactic choices, sensationalism markers, emotional hyperbole, and lexical entropy across full texts.
              </p>
            </div>

            <div className="pillar-card">
              <h3 className="pillar-title">Calibrated Confidence Estimation</h3>
              <p className="pillar-desc">
                Outputs probabilistic confidence percentages rather than arbitrary binary declarations, giving complete nuance.
              </p>
            </div>

            <div className="pillar-card">
              <h3 className="pillar-title">Audit History</h3>
              <p className="pillar-desc">
                Authenticated accounts retain a permanent verification log for comparative review, research citations, and reporting.
              </p>
            </div>

            <div className="pillar-card">
              <h3 className="pillar-title">Multi-modal Ingestion</h3>
              <p className="pillar-desc">
                Supports direct plain text analysis with optional headlines, as well as live article extraction via verified URLs.
              </p>
            </div>
          </div>
        </section>

        {/* Responsible AI Notice */}
        <section style={{ marginTop: '80px' }}>
          <div className="responsible-ai-box">
            <h3 className="responsible-ai-title">Responsible AI Commitment</h3>
            <p className="responsible-ai-text">
              VerifAI provides mathematical assessment based on training data patterns and statistical language modeling.
              Machine learning classifications do not constitute infallible determinations of fact. We strongly advocate
              using VerifAI as an analytical decision-support tool in conjunction with primary source attribution and
              professional journalistic standards.
            </p>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section style={{ marginTop: '80px' }}>
          <div className="cta-banner">
            <h2 className="cta-title">Ready to verify an article?</h2>
            <p className="cta-subtitle">
              Test article text or URLs against our trained model and receive instant credibility feedback.
            </p>
            <Link
              to={analyzeNewsTarget}
              state={analyzeNewsState}
              className="btn-primary btn-lg"
            >
              Analyze News
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
