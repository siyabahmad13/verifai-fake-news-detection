# VERIFAI — Benchmark Datasets Directory

This directory stores datasets used for training, evaluation, and algorithmic benchmarking of the VERIFAI machine learning models.

---

## 1. Pre-Trained Models Included

The repository already includes the pre-trained, production-ready baseline model artifacts inside the `ml/` directory:
- `ml/fake_news_model.pkl` (400 KB) — Logistic Regression Classifier
- `ml/tfidf_vectorizer.pkl` (1.8 MB) — 50,000-feature TF-IDF Vectorizer

**You do NOT need to download the raw dataset to run or test the application.** The backend works immediately upon cloning.

---

## 2. Downloading Raw Training Data (Optional)

If you wish to retrain the models from scratch using the Jupyter notebook (`ml/Verifi-Ai-Model.ipynb`) or upload datasets via the backend API (`/api/datasets/upload/`), download the raw CSVs from Kaggle:

### Primary Dataset: ISOT Fake and Real News Dataset
- **Source**: [Kaggle — ISOT Fake and Real News Dataset](https://www.kaggle.com/datasets/clmentbisaillon/fake-and-real-news-dataset)
- **Publisher**: University of Victoria, ISOT Research Lab
- **Files**:
  - `Fake.csv` (~60 MB): 23,481 unverified political/world articles
  - `True.csv` (~51 MB): 21,417 Reuters-verified wire articles
- **Placement**: Place `Fake.csv` and `True.csv` inside the `ml/` directory.

### Supported External Benchmarks:
1. **WELFake Dataset** (IEEE DataPort): 72,131 articles combining multiple corpora to reduce publisher bias.
2. **LIAR Benchmark** (PolitiFact Corpus): 12,836 labeled short-form claims.

---

## 3. Uploading Datasets via API / Admin

You can upload new CSV or XLSX datasets at runtime without restarting the server:
- **API Endpoint**: `POST /api/datasets/upload/` (Requires Admin Bearer Token)
- **Django Admin**: `http://localhost:8000/admin/datasets/dataset/`

### Required CSV Format:
| Column | Description |
| :--- | :--- |
| `text` (or `content`) | Full body text of the news article (Required) |
| `label` (or `class`) | Ground truth: `Real` / `True` / `1` or `Fake` / `False` / `0` (Required) |
| `title` | Article headline (Optional, recommended) |

The system automatically validates row count, class balance, empty records, and duplicate entries.
