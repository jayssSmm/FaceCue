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

# 5-point landmark indices: left eye, right eye, nose, mouth-left, mouth-right
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

# --- Run the actual DDAMFN++ pipeline ---
predictor = DDAMFNPredictor('ddamfn/weights/rafdb.pth')

img = cv2.imread('./test/face.jpg')
if img is None:
    raise FileNotFoundError("face.jpg not found — put a real image with a face in the repo root")

img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
landmarks = get_5pt_landmarks(img_rgb)
if landmarks is None:
    raise RuntimeError("MediaPipe didn't detect a face in this image")

aligned = predictor.align_face(img, landmarks)
result = predictor.predict(aligned)
print(result)