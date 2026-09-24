"""
VERIFAI — Dataset File & Integrity Validator
Verifies format, column schema, label validity, duplicate ratios, and empty rows
before accepting uploaded datasets into the training catalog.
"""

import os
import pandas as pd
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

MAX_DATASET_FILE_SIZE = 150 * 1024 * 1024  # 150 MB
ALLOWED_EXTENSIONS = ('.csv', '.xlsx', '.xls')


def validate_dataset_file(file_obj) -> Dict[str, Any]:
    """
    Validates an uploaded file object or path against formatting and schema criteria.
    Returns validation report dict.
    """
    errors: List[str] = []

    # 1. File Name and Extension Check
    filename = getattr(file_obj, 'name', str(file_obj))
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return {
            "is_valid": False,
            "errors": [f"Unsupported file format '{ext}'. Only CSV and Excel (.xlsx, .xls) files are supported."]
        }

    # 2. File Size Check
    size = getattr(file_obj, 'size', None)
    if size and size > MAX_DATASET_FILE_SIZE:
        return {
            "is_valid": False,
            "errors": [f"File size exceeds the limit of {MAX_DATASET_FILE_SIZE // (1024*1024)}MB."]
        }

    # 3. Read DataFrame
    try:
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)

        if ext == '.csv':
            # Read first 10,000 rows initially or entire file safely
            df = pd.read_csv(file_obj, encoding='utf-8', on_bad_lines='skip')
        else:
            df = pd.read_excel(file_obj)
    except Exception as e:
        logger.error("Failed to parse dataset file %s: %s", filename, e)
        return {
            "is_valid": False,
            "errors": [f"Unable to parse dataset file. Please ensure it is a valid {ext.upper()} file: {str(e)}"]
        }

    # 4. Check for empty dataframe
    if df.empty or len(df) < 5:
        return {
            "is_valid": False,
            "errors": ["The dataset is empty or contains fewer than 5 records."]
        }

    # 5. Check Required Columns
    # Normalize column names to lowercase for comparison
    col_mapping = {str(c).lower().strip(): c for c in df.columns}

    # Text column
    text_col = None
    for candidate in ['text', 'content', 'body', 'article']:
        if candidate in col_mapping:
            text_col = col_mapping[candidate]
            break

    # Label column
    label_col = None
    for candidate in ['label', 'target', 'class', 'category']:
        if candidate in col_mapping:
            label_col = col_mapping[candidate]
            break

    if not text_col:
        errors.append("Missing required article text column. Expected a column named 'text' or 'content'.")

    if not label_col:
        errors.append("Missing required classification label column. Expected a column named 'label' or 'class'.")

    if errors:
        return {
            "is_valid": False,
            "errors": errors,
            "detected_columns": list(df.columns)
        }

    # 6. Validate Labels Distribution
    raw_labels = df[label_col].dropna().astype(str).str.lower().str.strip()
    normalized_labels = []

    valid_fake = {'fake', '0', 'false', '0.0'}
    valid_real = {'true', 'real', '1', '1.0'}

    label_distribution = {"Real": 0, "Fake": 0}
    invalid_labels = set()

    for val in raw_labels:
        if val in valid_fake:
            label_distribution["Fake"] += 1
        elif val in valid_real:
            label_distribution["Real"] += 1
        else:
            invalid_labels.add(val)

    if invalid_labels and len(invalid_labels) > 3:
        errors.append(f"Unrecognized class labels found: {list(invalid_labels)[:5]}. Expected 'Real'/'True' or 'Fake'.")

    # 7. Quality Checks: Missing and Duplicate Rows
    empty_text_count = int(df[text_col].isna().sum())
    duplicate_count = int(df.duplicated(subset=[text_col]).sum())

    total_rows = len(df)
    valid_rows = total_rows - empty_text_count

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "row_count": total_rows,
        "valid_rows": valid_rows,
        "empty_rows": empty_text_count,
        "duplicate_rows": duplicate_count,
        "label_distribution": label_distribution,
        "text_column": text_col,
        "label_column": label_col,
        "has_title_column": 'title' in col_mapping
    }
