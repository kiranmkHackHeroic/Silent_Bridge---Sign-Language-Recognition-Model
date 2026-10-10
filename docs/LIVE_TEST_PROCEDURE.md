# Live webcam test procedure

This procedure measures how the deployed model performs on **new live recordings**. Dataset
videos, and especially the videos the model was trained on, are not evidence of live accuracy.

## 0. Start
```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1     # terminal 1
powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1    # terminal 2
```
Open **http://127.0.0.1:5173** in Chrome or Edge, not an embedded preview, and allow camera access.

## 1. Pipeline check (2 min): every stage must be green
Go to **Live Recognition → Start camera**, then open **Pipeline diagnostics**.

| Stage | What to check |
|---|---|
| 1 Camera | Resolution (e.g. 640×480), processed FPS ≥ 15, frame interval ≈ 33–66 ms |
| 2 Detection | Raise your right hand: one valid hand labelled *MediaPipe "Left" → signer's right hand*. Then turn the palm to the camera (*palm towards camera*) and away. Face *visible*; cover your face → *not visible* |
| 3 Features | `147 values/frame ✓ matches schema hands-face-v2`; face-relative block *filled* while the face is visible |
| 4 Segmentation | *signing* while you move; returns to *idle* after a pause or when the hands drop |
| 5 Classification | Threshold *calibrated on validation data*; each decision lists its stage; *out of training distribution* shows which feature block differs |
| 6 Translation | Label → Kannada for each recognised word |

If something looks wrong, add a note and press **Save diagnostics snapshot**. The last ~20 s of
landmarks and decisions are saved to `backend/data/diagnostics/` (no video).

Also on **About & Testing → Video-file pipeline test**, run one dataset video: it compares the
browser's landmarks with the Python (training) extraction of the same file.

## 2. Record evaluation-only data (≈ 15 min, in a NEW session)
On **Dataset & Model → Recording settings**, set **Purpose: Evaluation only**, press **New** for a fresh
session, and record:
1. 3–5 samples of each sign you want to test, with **Guided variation** on (speed and hand position change per sample).
2. Set **distance** and **lighting** to match the real conditions: e.g. one session near and bright, one far and dim.
3. **10+ `_none` samples**: lowering or raising the hands, scratching, adjusting hair or glasses, idle movements.
4. **Record a sign sequence** 5–10 times. Pick 3–5 signs (repeats allowed, e.g. HELLO HELLO WATER) and sign them at your natural pace without pressing buttons in between.

These recordings go to `backend/data/eval_recordings` and `backend/data/eval_sequences`. Training never reads them.

## 3. Measure
On **Dataset & Model → Live evaluation → Evaluate active model**, or:
```powershell
cd backend; .\.venv\Scripts\python.exe tools\evaluate_live.py
```
Reported: accuracy, macro precision, recall and F1 (a rejected word counts as "no word"), words
rejected as uncertain, **false detections** (`_none` recordings that produced a word), accuracy by
speed, distance, lighting and position, top confusions, and for sequences the **sign error rate**
with substitutions, deletions (missed signs) and insertions (extra words). The JSON goes to
`backend/reports/live_eval.json`.

## 3b. Test the confidence threshold on webcam input
The model's threshold (currently 0.40, model v20261010-081537) was chosen on dataset videos, not on your camera. Record evaluation sessions on
**at least two** different days, lighting setups or distances. The Live evaluation card then shows a threshold
table with correct words, wrong words, missed signs and false detections. It also gives a
**leave-one-session-out** choice: the threshold is picked on the other sessions and scored on the held-out one.
Apply it with "Use … for live recognition" only if its held-out result is better. Never judge by coverage alone:
a high threshold hides errors by rejecting almost everything.

## 3c. Check the meaning layer
Sign a known phrase, e.g. SHE I/ME MOTHER or TOMORROW I/ME WORK (see `docs/PHRASES.md`). The **Meaning** panel
should show the ISL gloss sequence, the English meaning and the Kannada sentence separately. Correct a wrong sign
with the word menu and the whole sequence is re-translated. Parts outside the phrase table are labelled
"word-by-word", and unknown signs are listed, never guessed.

## 4. Improve and re-measure
Record **training** sessions (Purpose: Training data) for the weak signs and conditions, plus `_none`.
After ≥ 20 new samples, a training job is queued automatically. The new model only replaces the
active one if it passes the held-out test, the fair comparison on the same unseen test samples and
the smoke test. Run step 3 again with the **same** evaluation recordings to compare.

## Manual checklist
- Hold one sign still for 5 s → added once
- The same sign twice with a short pause → added twice (repeated signs)
- Two different signs back to back with a brief hold (no hand drop) → ideally both; this is the weakest case (see README)
- Random movement → *uncertain* or *background*; nothing added
- A recognised word appears as **pending**. Pick an alternative, reject it, or let it auto-confirm.
- Face hidden → expression shows *No face detected*; signs are still recognised (face-relative features empty)
- Pause / Resume, backend restart → reconnects
