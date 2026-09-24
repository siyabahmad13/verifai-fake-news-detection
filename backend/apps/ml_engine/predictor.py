"""
VERIFAI — Pluggable Predictor Service
Architected with an Abstract Base Class (BasePredictor) so that future models
(e.g., SVM, fine-tuned Transformers, RoBERTa) can drop in seamlessly
without modifying views, serializers, or API contracts.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional
import logging

from .preprocessing import TextPreprocessor, default_preprocessor
from .model_loader import ModelLoader, model_loader
from .validators import validate_prediction_text
from .exceptions import InferenceError

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    """
    Standardized inference response container.
    Decouples raw model arrays from API views.
    """
    label: str               # "Real" or "Fake"
    raw_label: str           # Raw label from model (e.g., "True" or "Fake")
    confidence: float        # Percentage, e.g. 94.42
    probabilities: Dict[str, float]  # e.g. {"Real": 0.9442, "Fake": 0.0558}
    model_version: str       # e.g. "v1-baseline"
    preprocessed_text: str   # Cleaned tokens passed into vectorizer
    word_count: int          # Length metrics
    char_count: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class BasePredictor(ABC):
    """
    Abstract interface for all VERIFAI classification engines.
    Any future model (Logistic Regression, Linear SVM, BERT, etc.)
    must implement this interface.
    """

    @abstractmethod
    def predict(self, text: str, headline: str = "") -> PredictionResult:
        """Generate authenticity prediction for submitted text and optional headline."""
        pass

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """Return metadata about the underlying algorithm and vectorizer."""
        pass


class TFIDFLogisticPredictor(BasePredictor):
    """
    Baseline ML Predictor utilizing:
    - NLTK TextPreprocessor
    - TF-IDF Vectorizer (50,000 vocabulary)
    - Logistic Regression Classifier
    """

    def __init__(
        self,
        loader: Optional[ModelLoader] = None,
        preprocessor: Optional[TextPreprocessor] = None
    ):
        self.loader = loader or model_loader
        self.preprocessor = preprocessor or default_preprocessor

    def predict(self, text: str, headline: str = "") -> PredictionResult:
        # 1. Validate inputs
        clean_text_input = validate_prediction_text(text, field_name="text")
        clean_headline_input = headline.strip() if headline else ""

        # 2. Combine title and body matching training notebook: content = title + " " + text
        combined_raw = f"{clean_headline_input} {clean_text_input}".strip()

        # 3. Apply exact preprocessing pipeline
        clean_tokens = self.preprocessor.preprocess(combined_raw)

        # 4. Acquire cached model & vectorizer
        model, vectorizer, version = self.loader.load_artifacts()

        # 5. Run inference
        try:
            # Transform text
            feature_vector = vectorizer.transform([clean_tokens])

            # Predict class
            raw_prediction = model.predict(feature_vector)[0]

            # Compute probability / confidence
            probabilities: Dict[str, float] = {}
            confidence = 85.0  # Fallback

            if hasattr(model, 'predict_proba'):
                proba_array = model.predict_proba(feature_vector)[0]
                classes = list(model.classes_)

                # Map model classes ('Fake', 'True') to display classes ('Fake', 'Real')
                for idx, cls_name in enumerate(classes):
                    display_key = "Real" if str(cls_name).lower() in ('true', 'real', '1') else "Fake"
                    probabilities[display_key] = round(float(proba_array[idx]), 4)

                max_prob = max(proba_array)
                confidence = round(float(max_prob) * 100.0, 2)
            else:
                # If model does not support predict_proba (e.g. LinearSVC without Platt scaling)
                normalized_label = "Real" if str(raw_prediction).lower() in ('true', 'real', '1') else "Fake"
                probabilities[normalized_label] = 1.0

            normalized_label = "Real" if str(raw_prediction).lower() in ('true', 'real', '1') else "Fake"

            return PredictionResult(
                label=normalized_label,
                raw_label=str(raw_prediction),
                confidence=confidence,
                probabilities=probabilities,
                model_version=version,
                preprocessed_text=clean_tokens,
                word_count=len(clean_text_input.split()),
                char_count=len(clean_text_input)
            )

        except Exception as e:
            logger.error("Inference failure during prediction: %s", e)
            raise InferenceError(f"Model prediction failed: {str(e)}") from e

    def get_info(self) -> Dict[str, Any]:
        return {
            "predictor_type": "TFIDFLogisticPredictor",
            "model_version": self.loader.get_version(),
            "preprocessor": self.preprocessor.get_metadata(),
            "model_class": "LogisticRegression",
            "vectorizer_class": "TfidfVectorizer",
        }


# Global factory function
def get_active_predictor() -> BasePredictor:
    """
    Factory that returns the current active predictor instance.
    When upgrading the model in the future, return the new Predictor class here.
    """
    return TFIDFLogisticPredictor()
