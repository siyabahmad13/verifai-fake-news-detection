"""
VERIFAI — Controlled Model Retraining & Evaluation Engine
Executes complete ML training pipeline:
Data cleaning -> Preprocessing -> Stratified Split -> TF-IDF fitting ->
Model training -> Comprehensive evaluation -> Artifact serialization -> MLModelVersion creation.
"""

import os
import pickle
import logging
from pathlib import Path
from typing import Dict, Any, Optional

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

from django.conf import settings
from django.utils import timezone
from apps.ml_engine.preprocessing import default_preprocessor
from .models import Dataset, MLModelVersion
from .validator import validate_dataset_file

logger = logging.getLogger(__name__)


class ModelTrainingService:
    """
    Executes controlled retraining jobs without blocking normal web requests.
    Supports experimentation across Logistic Regression, Linear SVM, and Naive Bayes.
    """

    MODEL_FACTORIES = {
        'logreg': lambda: LogisticRegression(max_iter=1000, random_state=42),
        'svm': lambda: CalibratedClassifierCV(LinearSVC(random_state=42, max_iter=2000)),
        'naive_bayes': lambda: MultinomialNB(),
    }

    def __init__(
        self,
        dataset: Dataset,
        version_tag: str,
        model_type: str = 'logreg',
        max_features: int = 50000,
        notes: str = ""
    ):
        self.dataset = dataset
        self.version_tag = version_tag.strip()
        self.model_type = model_type.lower()
        self.max_features = max_features
        self.notes = notes

        if self.model_type not in self.MODEL_FACTORIES:
            raise ValueError(f"Unsupported model type '{model_type}'. Choose from: {list(self.MODEL_FACTORIES.keys())}")

    def train(self, auto_activate: bool = False) -> MLModelVersion:
        """
        Execute full training and evaluation workflow.
        Returns the created MLModelVersion instance.
        """
        logger.info(
            "Starting retraining job for version '%s' on dataset '%s' (%s)",
            self.version_tag, self.dataset.name, self.model_type
        )

        # 1. Validate Dataset File
        val_report = validate_dataset_file(self.dataset.file)
        if not val_report['is_valid']:
            raise ValueError(f"Dataset failed validation: {'; '.join(val_report['errors'])}")

        text_col = val_report['text_column']
        label_col = val_report['label_column']
        has_title = val_report['has_title_column']

        # 2. Load DataFrame
        file_path = self.dataset.file.path
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
        else:
            df = pd.read_excel(file_path)

        # 3. Clean Data & Drop Missing / Duplicates
        df = df.dropna(subset=[text_col, label_col])
        df = df.drop_duplicates(subset=[text_col])

        # Normalize labels
        valid_real = {'true', 'real', '1', '1.0'}
        df['clean_label'] = df[label_col].astype(str).str.lower().str.strip().apply(
            lambda x: 'Real' if x in valid_real else 'Fake'
        )

        # 4. Construct Content: Combine title + text if available
        if has_title:
            title_col = [c for c in df.columns if str(c).lower() == 'title'][0]
            df['raw_content'] = df[title_col].fillna('').astype(str) + " " + df[text_col].astype(str)
        else:
            df['raw_content'] = df[text_col].astype(str)

        # 5. Preprocess Text
        logger.info("Applying NLTK preprocessing to %d articles...", len(df))
        df['processed_text'] = df['raw_content'].apply(default_preprocessor.preprocess)

        # Filter out rows that became empty after stopword removal
        df = df[df['processed_text'].str.strip() != ""]

        X = df['processed_text']
        y = df['clean_label']

        # 6. Stratified Train/Test Split (80/20)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )

        logger.info(
            "Split complete: %d training samples, %d testing samples",
            len(X_train), len(X_test)
        )

        # 7. Fit TF-IDF Vectorizer ONLY on Training Data
        vectorizer = TfidfVectorizer(max_features=self.max_features)
        X_train_tfidf = vectorizer.fit_transform(X_train)
        X_test_tfidf = vectorizer.transform(X_test)

        # 8. Train Model
        classifier = self.MODEL_FACTORIES[self.model_type]()
        classifier.fit(X_train_tfidf, y_train)

        # 9. Evaluate Performance
        y_pred = classifier.predict(X_test_tfidf)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, pos_label='Fake', zero_division=0))
        rec = float(recall_score(y_test, y_pred, pos_label='Fake', zero_division=0))
        f1 = float(f1_score(y_test, y_pred, pos_label='Fake', zero_division=0))
        cm = confusion_matrix(y_test, y_pred, labels=['Fake', 'Real']).tolist()

        logger.info(
            "Evaluation for %s: Acc=%.4f, Prec=%.4f, Rec=%.4f, F1=%.4f",
            self.version_tag, acc, prec, rec, f1
        )

        # 10. Serialize Artifacts to Disk
        artifact_dir = Path(settings.MEDIA_ROOT) / 'models' / self.version_tag
        artifact_dir.mkdir(parents=True, exist_ok=True)

        model_filename = f"model_{self.version_tag}.pkl"
        vectorizer_filename = f"vectorizer_{self.version_tag}.pkl"

        model_file_path = artifact_dir / model_filename
        vec_file_path = artifact_dir / vectorizer_filename

        with open(model_file_path, 'wb') as f:
            pickle.dump(classifier, f)

        with open(vec_file_path, 'wb') as f:
            pickle.dump(vectorizer, f)

        # 11. Create MLModelVersion Record
        model_name_display = {
            'logreg': 'Logistic Regression',
            'svm': 'Calibrated Linear SVM',
            'naive_bayes': 'Multinomial Naive Bayes'
        }.get(self.model_type, self.model_type)

        model_version = MLModelVersion.objects.create(
            version=self.version_tag,
            model_name=model_name_display,
            vectorizer_name=f"TfidfVectorizer(max_features={self.max_features})",
            dataset=self.dataset,
            dataset_name=self.dataset.name,
            dataset_size=len(df),
            train_size=len(X_train),
            test_size=len(X_test),
            accuracy=round(acc, 4),
            precision=round(prec, 4),
            recall=round(rec, 4),
            f1_score=round(f1, 4),
            confusion_matrix=cm,
            evaluation_type='random_heldout_split',
            model_path=str(model_file_path),
            vectorizer_path=str(vec_file_path),
            is_active=False,
            notes=self.notes or f"Trained on {self.dataset.name} via ModelTrainingService.",
            training_date=timezone.now()
        )

        if auto_activate:
            model_version.activate()
            logger.info("Model version '%s' automatically activated.", self.version_tag)

        return model_version
