import React from 'react';
import '../styles/pages.css';

export const About = () => {
  return (
    <div className="editorial-page">
      <div className="editorial-container">
        <header className="editorial-header">
          <span className="editorial-tag">Documentation & Overview</span>
          <h1 className="editorial-title">About VerifAI</h1>
          <p className="editorial-lead">
            An AI-assisted content credibility system designed to evaluate digital news articles through
            statistical linguistic analysis and supervised machine learning models.
          </p>
        </header>

        <div className="editorial-body">
          <section className="editorial-section">
            <h2>The Challenge of Digital Misinformation</h2>
            <p>
              The digital information ecosystem produces millions of articles, claims, and headlines daily.
              Fabricated stories frequently mimic legitimate journalistic styling while exploiting emotional
              hyperbole, inflammatory rhetoric, and fabricated source references to influence public opinion.
            </p>
            <p>
              VerifAI was engineered to assist users, researchers, and journalists by identifying stylistic
              and lexical markers commonly associated with fabricated reportage.
            </p>
          </section>

          <section className="editorial-section">
            <h2>System Architecture & Inference</h2>
            <p>
              VerifAI operates using a multi-stage Natural Language Processing (NLP) pipeline:
            </p>
            <ul>
              <li>
                <strong>Text Vectorization:</strong> Raw article bodies are tokenized and transformed into TF-IDF
                feature vectors, measuring term frequency and inverse document frequency across a comprehensive vocabulary.
              </li>
              <li>
                <strong>Supervised Classification:</strong> A calibrated classification algorithm evaluates the
                feature matrix against patterns learned from standard research benchmarks (including ISOT and WELFake datasets).
              </li>
              <li>
                <strong>Confidence Scoring:</strong> Rather than providing a blunt, uncalibrated binary verdict,
                the engine calculates a probabilistic confidence percentage reflecting statistical alignment with known distributions.
              </li>
            </ul>
          </section>

          <section className="editorial-section">
            <h2>Responsible AI & Technical Honesty</h2>
            <div className="callout-box">
              <span className="callout-title">Important Analytical Limitation</span>
              <p className="callout-text">
                No machine learning model possesses omniscience or absolute factual certainty. VerifAI evaluates
                statistical similarity to training data patterns; it cannot independently contact sources or conduct
                physical field investigations. Our assessments should be utilized as analytical indicators alongside
                primary source verification and accredited journalistic fact-checking.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default About;
