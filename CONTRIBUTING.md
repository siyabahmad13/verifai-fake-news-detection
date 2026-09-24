# Contributing to VERIFAI

Thank you for your interest in contributing to **VERIFAI — AI-Powered Fake News Detection System**! We welcome contributions from researchers, developers, and data scientists.

---

## 1. Code of Conduct

Please adhere to standard open-source conventions:
- Be respectful and constructive in all discussions, issues, and code reviews.
- Focus on empirical accuracy, algorithmic transparency, and ethical AI safeguards.
- Never commit plain-text credentials, proprietary data, or unvetted external scripts.

---

## 2. Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/verifai-fake-news-detection.git
   cd verifai-fake-news-detection
   ```
3. **Create a virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. **Copy the environment configuration**:
   ```bash
   cp .env.example .env
   ```
5. **Run database migrations & checks**:
   ```bash
   python manage.py migrate
   python manage.py check
   ```

---

## 3. Branching Strategy

- `main`: Production-ready, stable codebase.
- `feature/<feature-name>`: New capabilities (e.g. `feature/roberta-classifier`, `feature/pdf-export`).
- `fix/<bug-name>`: Bug fixes and security patches (e.g. `fix/ssrf-timeout`, `fix/token-highlight`).

---

## 4. Development & Code Quality Guidelines

- **Style**: Follow PEP 8 for Python backend code.
- **Modularity**: Do not place business logic in views or serializers. Business logic belongs in service classes under `apps/<app_name>/`.
- **Model Decoupling**: If adding or experimenting with a new ML model, subclass `BasePredictor` in `apps/ml_engine/predictor.py`. Never hard-code model inferences directly into Django views.
- **Typing & Docs**: Use Python type hints and docstrings on public methods.

---

## 5. Running Automated Tests

Before submitting a Pull Request, verify that all 33 automated unit tests pass:

```bash
cd backend
python manage.py test
```

Expected output:
```
Ran 33 tests in ...
OK
```

---

## 6. Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of `siyabahmad13/verifai-fake-news-detection`.
3. Provide a clear description of changes, rationale, and test results in the PR template.
4. Ensure all CI workflow checks pass.
