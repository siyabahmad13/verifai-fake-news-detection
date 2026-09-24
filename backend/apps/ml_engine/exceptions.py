"""
VERIFAI — ML Engine Custom Exceptions
Centralized exception hierarchy for preprocessing, model loading, and inference.
"""


class MLEngineError(Exception):
    """Base exception for all ML Engine operations."""
    pass


class ModelNotFoundError(MLEngineError):
    """Raised when the model artifact file cannot be located on disk."""
    pass


class VectorizerNotFoundError(MLEngineError):
    """Raised when the TF-IDF vectorizer artifact file cannot be located."""
    pass


class ModelCorruptError(MLEngineError):
    """Raised when unpickling fails or artifact is not a valid scikit-learn estimator."""
    pass


class PreprocessingError(MLEngineError):
    """Raised when tokenization or cleaning fails on input text."""
    pass


class InferenceError(MLEngineError):
    """Raised when prediction or probability computation fails."""
    pass


class InputValidationError(MLEngineError):
    """Raised when submitted text violates minimum length or content policies."""
    pass
