/**
 * VERIFAI — Mock Data & Realistic Datasets
 * Pre-configured samples, benchmark metrics, and initial scan records
 */

const VERIFAI_DATA = {
  // Preset news articles for instant detector testing
  presets: {
    fake: {
      title: "SHOCKING: Secret Government Lab Leaks Revolutionary Fuel Pill That Oil Barons Banned",
      text: `BREAKING EXCLUSIVE: An anonymous whistleblower from an undisclosed military facility has leaked classified documents revealing that scientists created an indestructible miracle fuel pill back in 1984. 

Insiders confirm that dropping just ONE single synthetic tablet into any standard automobile fuel tank creates perpetual kinetic energy, completely eliminating the need for gasoline forever! Big Oil executives and corrupt federal agencies immediately conspired to silence the researchers and buried the patent in an underground vault to protect their trillion-dollar profits.

Mainstream media will NEVER report this shocking discovery! Millions of citizens are waking up to this monstrous coverup. Share this urgent report with everyone you know before it is scrubbed from the internet!`,
      source: "unverified-whistleblower-leak.co",
      expectedVerdict: "FAKE",
      confidence: 96.8,
      credibilityScore: 14,
      metrics: {
        sensationalism: 94, // 0 - 100 (high is bad)
        sourceAttribution: 8,  // 0 - 100 (low is bad)
        linguisticCohesion: 38,
        emotionalBias: 92
      },
      flaggedTokens: [
        { word: "SHOCKING", reason: "Hyperbolic clickbait adjective" },
        { word: "Secret Government Lab", reason: "Unsubstantiated conspiratorial framing" },
        { word: "miracle fuel pill", reason: "Pseudoscientific sensational claim" },
        { word: "perpetual kinetic energy", reason: "Violates fundamental thermodynamic principles" },
        { word: "conspired to silence", reason: "Standard paranoid conspiracy trope" },
        { word: "Mainstream media will NEVER report", reason: "Classic epistemic closure signal" },
        { word: "monstrous coverup", reason: "Extreme affective emotional polarization" },
        { word: "before it is scrubbed", reason: "Manufactured urgency tactic" }
      ],
      verifiedTokens: []
    },

    real: {
      title: "European Space Agency Confirms Clean Launch of Biomass Observation Satellite From Kourou",
      text: `PARIS (Reuters) — The European Space Agency (ESA) successfully launched its Earth observation satellite, Biomass, aboard a Vega-C rocket from the Kourou spaceport in French Guiana early on Thursday, agency officials confirmed in an official press briefing.

The five-year scientific mission aims to construct high-resolution 3D maps of the planet's tropical and boreal forests to measure carbon sequestration with unprecedented accuracy. According to Dr. Elena Vance, lead project scientist at the ESA Climate Directorate, the satellite carries an advanced P-band synthetic aperture radar capable of penetrating deep through dense forest canopies.

"By directly weighing the biomass stored in global forest systems, we can finally reduce the uncertainty in international climate forecasting models," Dr. Vance told accredited reporters. The mission data will be made openly available to atmospheric researchers worldwide under the Copernicus Open Access programme.`,
      source: "reuters.com/science",
      expectedVerdict: "REAL",
      confidence: 94.4,
      credibilityScore: 92,
      metrics: {
        sensationalism: 6,
        sourceAttribution: 94,
        linguisticCohesion: 91,
        emotionalBias: 8
      },
      flaggedTokens: [],
      verifiedTokens: [
        { word: "PARIS (Reuters)", reason: "Standard accredited wire service dateline" },
        { word: "European Space Agency (ESA)", reason: "Recognized international scientific body" },
        { word: "confirmed in an official press briefing", reason: "Verifiable official provenance" },
        { word: "According to Dr. Elena Vance", reason: "Attributed named specialist source" },
        { word: "P-band synthetic aperture radar", reason: "Precise empirical instrumentation terminology" },
        { word: "Copernicus Open Access programme", reason: "Referenced verifiable scientific framework" }
      ]
    },

    mixed: {
      title: "City Council Considers Experimental Smart Traffic Algorithm Amid Citizen Privacy Debate",
      text: `METROPOLIS — Municipal planners debated a proposal on Tuesday to deploy artificial intelligence camera systems along central metropolitan corridors in an effort to curb peak-hour congestion by 18 percent.

While municipal transit officials cite preliminary computer simulations demonstrating reduced intersection idling, local civil liberties advocates raised concerns regarding potential biometric surveillance. Unconfirmed neighborhood blog posts alleged that the systems would automatically issue facial recognition fines without judicial oversight, though city legal counsel clarified that the prototype cameras lack biometric processing hardware.

The preliminary vote has been scheduled for next month's council session following public commentary.`,
      source: "metropoliscitygazette.org",
      expectedVerdict: "QUESTIONABLE",
      confidence: 72.1,
      credibilityScore: 58,
      metrics: {
        sensationalism: 38,
        sourceAttribution: 62,
        linguisticCohesion: 79,
        emotionalBias: 42
      },
      flaggedTokens: [
        { word: "Unconfirmed neighborhood blog posts alleged", reason: "Secondary unverified attribution" },
        { word: "without judicial oversight", reason: "Unverified contentious claim" }
      ],
      verifiedTokens: [
        { word: "city legal counsel clarified", reason: "Direct institutional rebuttal included" },
        { word: "preliminary vote has been scheduled", reason: "Standard municipal procedural timeline" }
      ]
    }
  },

  // Default initial scan history for demonstration
  initialHistory: [
    {
      id: "scan-9021",
      timestamp: "2026-09-17 09:42",
      headline: "European Space Agency Confirms Clean Launch of Biomass Observation Satellite",
      verdict: "REAL",
      confidence: 94.4,
      credibilityScore: 92,
      source: "Direct Text Ingestion",
      wordCount: 168
    },
    {
      id: "scan-9020",
      timestamp: "2026-09-16 18:15",
      headline: "SHOCKING: Secret Government Lab Leaks Revolutionary Fuel Pill That Oil Barons Banned",
      verdict: "FAKE",
      confidence: 96.8,
      credibilityScore: 14,
      source: "unverified-whistleblower-leak.co",
      wordCount: 142
    },
    {
      id: "scan-9019",
      timestamp: "2026-09-15 14:02",
      headline: "Global Central Banks Conspire to Erase All Physical Currency Overnight",
      verdict: "FAKE",
      confidence: 91.2,
      credibilityScore: 18,
      source: "freedom-patriot-wire.net",
      wordCount: 210
    },
    {
      id: "scan-9018",
      timestamp: "2026-09-14 11:20",
      headline: "Peer-Reviewed Lancet Study Documents Phase III Efficacy of Dual-Target Oncology Molecule",
      verdict: "REAL",
      confidence: 97.1,
      credibilityScore: 96,
      source: "thelancet.com/journals",
      wordCount: 340
    },
    {
      id: "scan-9017",
      timestamp: "2026-09-12 16:50",
      headline: "City Council Considers Experimental Smart Traffic Algorithm Amid Citizen Privacy Debate",
      verdict: "QUESTIONABLE",
      confidence: 72.1,
      credibilityScore: 58,
      source: "metropoliscitygazette.org",
      wordCount: 125
    }
  ],

  // Academic Benchmark Matrix (for index and methodology pages)
  benchmarks: {
    overallAccuracy: "94.6%",
    f1Score: "0.942",
    avgLatency: "118ms",
    trainingCorpusSize: "72,400+ Articles",
    datasets: [
      { name: "ISOT Fake News Dataset", records: "44,898 articles", accuracy: "95.1%", domain: "World / Political" },
      { name: "LIAR Benchmark (PolitiFact)", records: "12,836 statements", accuracy: "89.4%", domain: "Short Claims" },
      { name: "WELFake Unified Corpus", records: "72,131 articles", accuracy: "94.2%", domain: "Balanced News" }
    ]
  }
};

// Expose globally
window.VERIFAI_DATA = VERIFAI_DATA;
