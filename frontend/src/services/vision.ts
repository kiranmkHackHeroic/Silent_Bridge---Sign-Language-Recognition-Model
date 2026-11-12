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

const HAND_MODEL_CDN = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FACE_MODEL_CDN = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const MEDIAPIPE_WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";

async function createHands(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: "GPU" | "CPU") {
  try {
    return await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL_CDN, delegate },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  } catch (err) {
    console.warn("Falling back to local hand model", err);
    return await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/models/hand_landmarker.task", delegate },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }
}

async function createFace(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: "GPU" | "CPU") {
  try {
    return await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL_CDN, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  } catch (err) {
    return await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }
}

export function loadVisionModels(): Promise<VisionModels> {
  if (!loading) {
    loading = (async () => {
      let fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
      try {
        fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);
      } catch (err) {
        console.warn("CDN wasm unavailable, falling back to local /mediapipe-wasm", err);
        fileset = await FilesetResolver.forVisionTasks("/mediapipe-wasm");
      }
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
