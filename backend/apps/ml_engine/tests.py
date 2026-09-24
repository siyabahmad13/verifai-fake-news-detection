from django.test import TestCase
from .preprocessing import TextPreprocessor
from .validators import validate_prediction_text, validate_safe_url
from .exceptions import InputValidationError
from .model_loader import ModelLoader
from .predictor import TFIDFLogisticPredictor, PredictionResult


class MLEngineUnitTests(TestCase):
    """
    Automated test suite for the ML Engine services:
    preprocessing, validators, model loading, and prediction inference.
    """

    def setUp(self):
        self.preprocessor = TextPreprocessor()
        self.loader = ModelLoader()
        self.predictor = TFIDFLogisticPredictor(loader=self.loader, preprocessor=self.preprocessor)

    def test_preprocessor_pipeline(self):
        raw_text = "Donald Trump is speaking about his country! Breaking NEWS???"
        clean = self.preprocessor.preprocess(raw_text)

        # Should be lowercased
        self.assertEqual(clean, clean.lower())
        # Should not contain punctuation marks
        self.assertNotIn('!', clean)
        self.assertNotIn('?', clean)
        # Should remove common stopwords like 'is', 'about', 'his'
        tokens = clean.split()
        self.assertNotIn('is', tokens)
        self.assertNotIn('about', tokens)
        self.assertNotIn('his', tokens)
        # Should retain informative terms
        self.assertIn('donald', tokens)
        self.assertIn('trump', tokens)
        self.assertIn('speaking', tokens)
        self.assertIn('country', tokens)

    def test_input_text_validation(self):
        # Empty text fails
        with self.assertRaises(InputValidationError):
            validate_prediction_text("")

        # Too short (< 15 chars) fails
        with self.assertRaises(InputValidationError):
            validate_prediction_text("Hi there")

        # Too few words (< 4 words) fails
        with self.assertRaises(InputValidationError):
            validate_prediction_text("Supercalifragilisticexpialidocious text")

        # Valid text succeeds
        valid_text = "European Space Agency launched observation satellite into orbit today."
        validated = validate_prediction_text(valid_text)
        self.assertEqual(validated, valid_text)

    def test_ssrf_url_validation(self):
        # Block localhost
        with self.assertRaises(InputValidationError):
            validate_safe_url("http://localhost:8000/news")

        with self.assertRaises(InputValidationError):
            validate_safe_url("http://127.0.0.1:8000/news")

        # Block invalid scheme
        with self.assertRaises(InputValidationError):
            validate_safe_url("ftp://example.com/file")

        with self.assertRaises(InputValidationError):
            validate_safe_url("file:///etc/passwd")

    def test_model_loading_and_inference(self):
        # Load artifacts
        model, vectorizer, version = self.loader.load_artifacts()
        self.assertIsNotNone(model)
        self.assertIsNotNone(vectorizer)
        self.assertTrue(self.loader.is_loaded())

        # Test prediction on obvious clickbait text
        fake_sample = (
            "SHOCKING: Secret underground bunker leaks miraculous fuel pill that eliminates gasoline! "
            "Big Oil executives panicked and conspired to suppress the patent immediately."
        )
        result_fake = self.predictor.predict(text=fake_sample, headline="Secret Miracle Fuel Pill")
        self.assertIsInstance(result_fake, PredictionResult)
        self.assertIn(result_fake.label, ["Fake", "Real"])
        self.assertGreaterEqual(result_fake.confidence, 50.0)
        self.assertLessEqual(result_fake.confidence, 100.0)
        self.assertIn("Fake", result_fake.probabilities)
        self.assertIn("Real", result_fake.probabilities)

        # Test prediction on Reuters-style news text
        real_sample = (
            "PARIS (Reuters) - European officials met in Brussels on Thursday to discuss trade relations "
            "and carbon tax regulations, diplomatic representatives confirmed in a press statement."
        )
        result_real = self.predictor.predict(text=real_sample, headline="European Trade Summit")
        self.assertIsInstance(result_real, PredictionResult)
        self.assertEqual(result_real.label, "Real")
        self.assertGreaterEqual(result_real.confidence, 50.0)

    def test_predictor_metadata(self):
        info = self.predictor.get_info()
        self.assertEqual(info['predictor_type'], "TFIDFLogisticPredictor")
        self.assertEqual(info['model_class'], "LogisticRegression")
        self.assertEqual(info['vectorizer_class'], "TfidfVectorizer")
