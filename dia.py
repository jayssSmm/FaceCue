import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from ddamfn.infer import DDAMFNPredictor

# --- Set up MediaPipe FaceLandmarker (Tasks API, works with mediapipe 1.0.0) ---
base_options = mp_python.BaseOptions(model_asset_path='face_landmarker.task')
options = vision.FaceLandmarkerOptions(base_options=base_options, num_faces=1)
landmarker = vision.FaceLandmarker.create_from_options(options)

LANDMARK_IDX = {'left_eye': 33, 'right_eye': 263, 'nose': 1, 'mouth_left': 61, 'mouth_right': 291}


def get_5pt_landmarks(image_rgb):
    h, w = image_rgb.shape[:2]
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
    result = landmarker.detect(mp_image)
    if not result.face_landmarks:
        return None
    lm = result.face_landmarks[0]
    pts = np.array([[lm[i].x * w, lm[i].y * h] for i in LANDMARK_IDX.values()], dtype=np.float32)
    return pts


predictor = DDAMFNPredictor('ddamfn/weights/rafdb.pth')

img = cv2.imread('./test/face.jpg')
if img is None:
    raise FileNotFoundError("face.jpg not found — put a real image with a face in the repo root")
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

N = 10
all_landmarks = []
all_results = []

for i in range(N):
    landmarks = get_5pt_landmarks(img_rgb)
    if landmarks is None:
        print(f"[run {i}] MediaPipe found no face")
        continue

    aligned = predictor.align_face(img, landmarks)
    result = predictor.predict(aligned)

    all_landmarks.append(landmarks)
    all_results.append(result)

    print(f"[run {i}] label={result['label']:<10} conf={result['confidence']:.4f}  "
          f"landmarks={np.round(landmarks.flatten(), 3).tolist()}")

# --- Summarize spread ---
if len(all_landmarks) > 1:
    stacked = np.stack(all_landmarks)  # (N, 5, 2)
    coord_std = stacked.std(axis=0)     # per-point std dev across runs
    print("\nPer-landmark-point std-dev across runs (x, y), in pixels:")
    for name, std in zip(LANDMARK_IDX.keys(), coord_std):
        print(f"  {name:<12} std=({std[0]:.4f}, {std[1]:.4f})")

    confidences = [r['confidence'] for r in all_results]
    labels = {r['label'] for r in all_results}
    print(f"\nConfidence range across {len(all_results)} runs: "
          f"min={min(confidences):.4f} max={max(confidences):.4f}")
    print(f"Distinct predicted labels across runs: {labels}")

    if len(labels) > 1:
        print("\n-> CONFIRMED: predicted label itself is unstable across identical input.")
    elif coord_std.max() > 0:
        print("\n-> Landmarks are NOT bit-identical across runs (some jitter present).")
        print("   Whether this jitter is enough to explain your confidence swing (49%->99.5%)")
        print("   depends on the magnitude above relative to the 112x112 aligned crop.")
    else:
        print("\n-> Landmarks are perfectly stable. Mediapipe is NOT the source — look elsewhere")
        print("   (e.g. is a DIFFERENT weights file / device being loaded between server restarts?).")