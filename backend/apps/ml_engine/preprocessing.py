"""
VERIFAI — ML Text Preprocessor Service
Implements the exact preprocessing pipeline used during prototype model training:
1. Lowercase conversion
2. Punctuation removal (via str.maketrans)
3. Word tokenization (via NLTK word_tokenize)
4. English stopwords removal
5. Rejoining filtered tokens
"""

import string
import logging
from typing import List, Set
from .exceptions import PreprocessingError

logger = logging.getLogger(__name__)


class TextPreprocessor:
    """
    Standardized, reusable text preprocessor.
    Ensures identical text transformation across training, evaluation, and inference.
    """
    _stopwords_cache: Set[str] = None
    _punctuation_table = str.maketrans("", "", string.punctuation)

    def __init__(self, version: str = "v1-baseline"):
        self.version = version
        self._ensure_stopwords()

    @classmethod
    def _ensure_stopwords(cls) -> Set[str]:
        """Load and cache NLTK English stopwords once per process."""
        if cls._stopwords_cache is None:
            try:
                from nltk.corpus import stopwords
                cls._stopwords_cache = set(stopwords.words("english"))
            except Exception as e:
                logger.warning("NLTK stopwords download check: %s. Using fallback list.", e)
                try:
                    import nltk
                    nltk.download("stopwords", quiet=True)
                    from nltk.corpus import stopwords
                    cls._stopwords_cache = set(stopwords.words("english"))
                except Exception as fallback_err:
                    logger.error("Could not load NLTK stopwords: %s", fallback_err)
                    # Safe fallback English stopwords
                    cls._stopwords_cache = {
                        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any",
                        "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below",
                        "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't",
                        "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from",
                        "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd",
                        "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his",
                        "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
                        "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
                        "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
                        "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll",
                        "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
                        "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
                        "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
                        "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've",
                        "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
                        "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't",
                        "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
                    }
        return cls._stopwords_cache

    def tokenize(self, text: str) -> List[str]:
        """Tokenize string into individual word tokens."""
        try:
            from nltk.tokenize import word_tokenize
            return word_tokenize(text)
        except Exception as e:
            # Fallback regex whitespace/word tokenizer if NLTK fails
            logger.debug("Falling back to regex tokenizer: %s", e)
            import re
            return re.findall(r'\b\w+\b', text)

    def preprocess(self, text: str) -> str:
        """
        Execute full normalization pipeline on raw text.
        Returns a single string of space-joined filtered tokens.
        """
        if not text or not isinstance(text, str):
            return ""

        try:
            # 1. Lowercase
            clean_text = text.lower()

            # 2. Remove punctuation
            clean_text = clean_text.translate(self._punctuation_table)

            # 3. Tokenize
            tokens = self.tokenize(clean_text)

            # 4. Remove stopwords
            stop_words = self._ensure_stopwords()
            filtered_tokens = [word for word in tokens if word not in stop_words and len(word.strip()) > 0]

            # 5. Join back into a single string
            return " ".join(filtered_tokens)

        except Exception as e:
            logger.error("Preprocessing error on text snippet: %s", e)
            raise PreprocessingError(f"Failed to preprocess text: {str(e)}") from e

    def get_metadata(self) -> dict:
        """Returns metadata configuration of this preprocessor version."""
        return {
            "version": self.version,
            "lowercase": True,
            "remove_punctuation": True,
            "tokenizer": "nltk.word_tokenize",
            "stopwords": "nltk.corpus.stopwords.words('english')",
        }


# Default global instance
default_preprocessor = TextPreprocessor()
