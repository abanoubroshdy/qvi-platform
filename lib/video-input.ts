/** Common video containers the file picker should offer. Decoding still depends on the wasm build. */
export const VIDEO_INPUT_EXTENSIONS = [
  "mp4",
  "m4v",
  "m4p",
  "mov",
  "mkv",
  "webm",
  "avi",
  "flv",
  "wmv",
  "3gp",
  "3g2",
  "mpeg",
  "mpg",
  "mpe",
  "ts",
  "m2ts",
  "mts",
  "ogv",
  "ogg",
  "vob",
  "asf",
  "f4v",
  "divx",
  "dv",
] as const;

const videoExtension = new RegExp(`\\.(${VIDEO_INPUT_EXTENSIONS.join("|")})$`, "i");

export const videoInputAccept = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  "video/avi",
  "video/ogg",
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/x-flv",
  "video/x-ms-wmv",
  ...VIDEO_INPUT_EXTENSIONS.map((ext) => `.${ext}`),
].join(",");

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || videoExtension.test(file.name);
}
