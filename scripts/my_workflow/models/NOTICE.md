# Models

- `selfie_segmenter.tflite`: MediaPipe Selfie Segmenter, Google, Apache License 2.0
  (https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter).
  Copied from https://github.com/Vibha-Ramprakash/claude-video-effects (MIT), which ships the same file.

The matte refinement in `../person_matte.py` (guided filter, contrast curve, temporal smoothing) follows the
approach used in claude-video-effects (c) 2026 Vibha Ramprakash, MIT License, re-implemented here.
