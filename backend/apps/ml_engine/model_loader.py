"""
VERIFAI — Model Loader & In-Memory Cache Service
Thread-safe singleton responsible for loading, validating, caching, and hot-swapping
trained scikit-learn models and vectorizers without restarting the Django process.
"""

import os
import pickle
import threading
import logging
from pathlib import Path
from typing import Tuple, Any, Optional
from django.conf import settings
from .exceptions import ModelNotFoundError, VectorizerNotFoundError, ModelCorruptError

logger = logging.getLogger(__name__)


class ModelLoader:
    """
    Thread-safe Singleton that caches ML models and vectorizers in memory.
    Supports runtime re-loading when models are upgraded or retrained.
    """
    _instance: Optional['ModelLoader'] = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(ModelLoader, cls).__new__(cls)
                    cls._instance._model = None
                    cls._instance._vectorizer = None
                    cls._instance._model_version = "v1-baseline"
                    cls._instance._model_path = None
                    cls._instance._vectorizer_path = None
                    cls._instance._is_loaded = False
        return cls._instance

    def _resolve_path(self, path_str: str) -> Path:
        """Resolve relative or absolute path against BASE_DIR."""
        p = Path(path_str)
        if not p.is_absolute():
            p = settings.BASE_DIR / p
        return p.resolve()

    def load_artifacts(
        self,
        model_path: Optional[str] = None,
        vectorizer_path: Optional[str] = None,
        version: str = "v1-baseline",
        force_reload: bool = False
    ) -> Tuple[Any, Any, str]:
        """
        Loads the classifier and vectorizer into memory if not already cached.
        Thread-safe; multiple concurrent requests share the same cached object.
        """
        if self._is_loaded and not force_reload:
            return self._model, self._vectorizer, self._model_version

        with self._lock:
            # Double-checked locking
            if self._is_loaded and not force_reload:
                return self._model, self._vectorizer, self._model_version

            target_model_path = self._resolve_path(
                model_path or getattr(settings, 'ML_MODEL_PATH', '../ml/fake_news_model.pkl')
            )
            target_vec_path = self._resolve_path(
                vectorizer_path or getattr(settings, 'TFIDF_VECTORIZER_PATH', '../ml/tfidf_vectorizer.pkl')
            )

            # 1. Verify existence of model file
            if not target_model_path.exists():
                logger.error("Model file not found at: %s", target_model_path)
                raise ModelNotFoundError(f"Model artifact not found at: {target_model_path}")

            # 2. Verify existence of vectorizer file
            if not target_vec_path.exists():
                logger.error("Vectorizer file not found at: %s", target_vec_path)
                raise VectorizerNotFoundError(f"Vectorizer artifact not found at: {target_vec_path}")

            # 3. Unpickle model
            try:
                with open(target_model_path, 'rb') as f:
                    loaded_model = pickle.load(f)
            except Exception as e:
                logger.error("Failed to unpickle model file: %s", e)
                raise ModelCorruptError(f"Corrupt or invalid model file: {e}") from e

            # 4. Unpickle vectorizer
            try:
                with open(target_vec_path, 'rb') as f:
                    loaded_vectorizer = pickle.load(f)
            except Exception as e:
                logger.error("Failed to unpickle vectorizer file: %s", e)
                raise ModelCorruptError(f"Corrupt or invalid vectorizer file: {e}") from e

            # 5. Verify interfaces
            if not hasattr(loaded_model, 'predict'):
                raise ModelCorruptError("Loaded model object does not implement a .predict() method.")
            if not hasattr(loaded_vectorizer, 'transform'):
                raise ModelCorruptError("Loaded vectorizer object does not implement a .transform() method.")

            # Store in cache
            self._model = loaded_model
            self._vectorizer = loaded_vectorizer
            self._model_version = version
            self._model_path = str(target_model_path)
            self._vectorizer_path = str(target_vec_path)
            self._is_loaded = True

            logger.info(
                "Successfully loaded ML model (version=%s) from %s and vectorizer from %s",
                version, target_model_path.name, target_vec_path.name
            )

            return self._model, self._vectorizer, self._model_version

    def reload(
        self,
        model_path: Optional[str] = None,
        vectorizer_path: Optional[str] = None,
        version: str = "v1-enhanced"
    ) -> Tuple[Any, Any, str]:
        """Explicitly reloads or hot-swaps active model artifacts at runtime."""
        return self.load_artifacts(
            model_path=model_path,
            vectorizer_path=vectorizer_path,
            version=version,
            force_reload=True
        )

    def is_loaded(self) -> bool:
        return self._is_loaded

    def get_version(self) -> str:
        return self._model_version


# Global accessor
model_loader = ModelLoader()
