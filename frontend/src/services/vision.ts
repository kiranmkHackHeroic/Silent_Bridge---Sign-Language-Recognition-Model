/**
 * MediaPipe Tasks (Hand Landmarker + Face Landmarker) running locally in the
 * browser via WebAssembly. Model files and the WASM runtime are served from
 * /models and /mediapipe-wasm (copied into public/), so no CDN is needed and
 * camera frames never leave this computer.
 */
import { FaceLandmarker, FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export interface VisionModels {
  hands: HandLandmarker;
  face: FaceLandmarker | null;
  delegate: "GPU" | "CPU";
  faceError: string | null;
}

let loading: Promise<VisionModels> | null = null;

async function createHands(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: "GPU" | "CPU") {
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: "/models/hand_landmarker.task", delegate },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

async function createFace(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: "GPU" | "CPU") {
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

export function loadVisionModels(): Promise<VisionModels> {
  if (!loading) {
    loading = (async () => {
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe-wasm");
      let delegate: "GPU" | "CPU" = "GPU";
      let hands: HandLandmarker;
      try {
        hands = await createHands(fileset, "GPU");
      } catch (err) {
        console.warn("GPU delegate unavailable, falling back to CPU", err);
        delegate = "CPU";
        hands = await createHands(fileset, "CPU");
      }
      let face: FaceLandmarker | null = null;
      let faceError: string | null = null;
      try {
        face = await createFace(fileset, delegate);
      } catch (err) {
        try {
          face = await createFace(fileset, "CPU");
        } catch (err2) {
          faceError = String(err2 || err);
          console.warn("Face landmarker unavailable", err2);
        }
      }
      return { hands, face, delegate, faceError };
    })();
    loading.catch(() => {
      loading = null; // allow retry
    });
  }
  return loading;
}

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
