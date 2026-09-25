/**
 * Third-party weights and libraries shipped with (or downloaded by) QV1.
 * None of these models are QVI originals. The ONNX sha256 stays empty until
 * the published file hash is known.
 */

export type Qv1ModelSource = {
  id: string;
  name: string;
  /** Human label for the upstream repository. */
  sourceName: string;
  sourceUrl: string;
  releaseName: string;
  releaseUrl: string;
  /** Container the app loads. Conversion note is translated in the UI. */
  format: "ONNX";
  /** Placeholder. Empty means the ONNX hash is not published yet. */
  sha256: string;
};

export const qv1ModelSources: readonly Qv1ModelSource[] = [
  {
    id: "bs-roformer-musdb18hq",
    name: "BS-RoFormer MUSDB18HQ",
    sourceName: "ZFTurbo/Music-Source-Separation-Training",
    sourceUrl: "https://github.com/ZFTurbo/Music-Source-Separation-Training",
    releaseName: "v1.0.12",
    releaseUrl: "https://github.com/ZFTurbo/Music-Source-Separation-Training/releases/tag/v1.0.12",
    format: "ONNX",
    sha256: "",
  },
];

export type Qv1Dependency = {
  id: string;
  name: string;
  license: string;
  url: string;
};

export const qv1Dependencies: readonly Qv1Dependency[] = [
  {
    id: "onnxruntime",
    name: "ONNX Runtime",
    license: "MIT",
    url: "https://github.com/microsoft/onnxruntime/blob/main/LICENSE",
  },
  {
    id: "naudio",
    name: "NAudio",
    license: "MIT",
    url: "https://github.com/naudio/NAudio/blob/master/license.txt",
  },
  {
    id: "cuda",
    name: "NVIDIA CUDA redistributables",
    license: "NVIDIA Software License Agreement",
    url: "https://docs.nvidia.com/cuda/eula/index.html",
  },
];

export const qv1AppCopyright = {
  year: 2026,
  holder: "Abanoub Roshdy (QVI)",
} as const;
