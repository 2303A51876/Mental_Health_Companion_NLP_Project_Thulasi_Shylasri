# Dataset audit: Mental_Health_Dataset.xlsx

Prepared by `ml/scripts/prepare_dataset.py`. Machine-readable summary: `ml/datasets/dataset_audit.json`.

## Shape
1,500 rows x 25 columns, one sheet, no missing values, no duplicate candidate IDs.
Label vocabularies match the spec exactly: sentiment (3), emotion (7: anxiety, sadness, anger, fear, joy, stress, neutral), stress level (3).

## Findings that change how it can be used

| # | Finding | Consequence |
|---|---|---|
| 1 | **Only 11 distinct sentences** across 1,500 rows (each repeated 75-248 times; 10-12 words). | A text model memorises them. Random-split scores are meaningless. |
| 2 | Sentiment is fully determined by the sentence (text-only ceiling 100%). Emotion ceiling is 49.6%, stress level 77.9%. | The rest of emotion/stress comes from other columns (issue, sleep, scores), not the text. |
| 3 | Same sentence gets different emotions and stress levels (e.g. one sentence is labelled anxiety, stress, sadness, fear and anger). | Label noise from a text-only view; expect low honest ceilings. |
| 4 | **Crisis flag (108 rows) does not correlate with crisis language.** No text contains self-harm or hopelessness wording; the flag fires on ordinary distress sentences and tracks stress/PHQ-8/GAD-7/sleep only loosely. | Cannot train the crisis detector (4.6) from this data. Keep it rule-based + separately curated examples. |
| 5 | Stress score bands overlap: low 5-44, moderate 5-65, high 65-97 (spec: 0-33 / 34-66 / 67-100). | Do not derive the score from level or vice versa without a rule; a Moderate row can score 5. |
| 6 | Contains names, IDs, state, district, institution, exact age, gender. | Dropped in the training CSV (data minimisation). |
| 7 | Looks generated rather than real-world: name/gender mismatches (e.g. "Manasa Yadav", Male), 187 rows of 1st-year students aged 40+, ages 17-58 uniform across every candidate type. | Label it as **synthetic / unverified provenance**. Do not present it as an anonymised healthcare dataset. |
| 8 | Clinical columns are PHQ-**8** and GAD-7 (the app's questionnaire is PHQ-9). | Different instrument; not interchangeable with in-app PHQ-9 scores. |

## Demonstration of finding 1 (TF-IDF + Logistic Regression, class-balanced)

| Task | Random split | Split by sentence (unseen sentences) |
|---|---|---|
| Sentiment | 1.000 | 0.134 |
| Emotion | 0.396 | 0.074 |
| Stress level | 0.769 | 0.129 |

The grouped test set has only 3 held-out sentences, so the low numbers are illustrative, not a benchmark. The point is that
the random-split figures are leakage and the model has learned 11 sentences, not language.

## Ethics field
`datasets.ethics_approval_ref` should read **"Not provided - provenance unverified"** for this file, unless you have a real approval reference.

## Recommended use
- Keep as a **registered dataset** in the admin module and as a stress/context reference.
- Always split with `text_group` (grouped/stratified) so identical sentences never sit in both train and test.
- Add text diversity before judging any model (Phase 3 plan below).
