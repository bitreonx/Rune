import { describe, expect, it } from "vite-plus/test";

import {
  classifyPickedAttachment,
  deriveFolderPathFromPickedFiles,
  resolvePickedFileAbsolutePath,
} from "./attachmentPick";

const UPLOADABLE_MODEL = { image: true, audio: false, video: false };

function classify(overrides?: {
  mimeType?: string;
  sizeBytes?: number;
  absolutePath?: string | null;
  modelSupport?: typeof UPLOADABLE_MODEL;
  supportsUploads?: boolean;
}) {
  return classifyPickedAttachment({
    mimeType: "image/png",
    sizeBytes: 1024,
    absolutePath: null,
    modelSupport: UPLOADABLE_MODEL,
    supportsUploads: true,
    ...overrides,
  });
}

describe("classifyPickedAttachment", () => {
  it("routes a supported in-limit image through the upload pipeline", () => {
    expect(classify()).toEqual({ kind: "upload-image" });
  });

  it("blocks an oversized image when no path can be resolved", () => {
    const route = classify({
      sizeBytes: 11 * 1024 * 1024,
      absolutePath: null,
    });
    expect(route).toMatchObject({ kind: "blocked", why: "image-too-large" });
  });

  it("prefers a path reference over blocking an oversized image on desktop", () => {
    const route = classify({
      sizeBytes: 11 * 1024 * 1024,
      absolutePath: "C:/Users/me/pictures/big.png",
    });
    expect(route).toMatchObject({
      kind: "path-reference",
      why: "image-too-large",
    });
  });

  it("uploads non-image media when the environment supports generic uploads", () => {
    expect(
      classify({ mimeType: "audio/mpeg", absolutePath: "C:/Users/me/clip.mp3" }),
    ).toEqual({ kind: "upload-file" });
    expect(
      classify({ mimeType: "video/mp4", absolutePath: "C:/Users/me/clip.mp4" }),
    ).toEqual({ kind: "upload-file" });
  });

  it("uploads non-image media on web without exposing a local path", () => {
    const route = classify({ mimeType: "audio/mpeg", absolutePath: null });
    expect(route).toEqual({ kind: "upload-file" });
  });

  it("path-references an image the model cannot ingest natively", () => {
    const route = classify({
      modelSupport: { image: false, audio: false, video: false },
      absolutePath: "C:/shots/shot.png",
    });
    expect(route).toMatchObject({ kind: "path-reference", why: "model-lacks-image-input" });
  });

  it("path-references any file when attachment uploads are unavailable", () => {
    const route = classify({
      supportsUploads: false,
      absolutePath: "/home/me/notes.txt",
      mimeType: "text/plain",
    });
    expect(route).toMatchObject({ kind: "path-reference", why: "uploads-unavailable" });
  });

  it("uploads unknown files through the generic file transport", () => {
    expect(classify({ mimeType: "", absolutePath: null })).toEqual({ kind: "upload-file" });
    expect(classify({ mimeType: "", absolutePath: "C:/bin/blob" })).toMatchObject({
      kind: "upload-file",
    });
  });
});

describe("deriveFolderPathFromPickedFiles", () => {
  it("strips the file segment off the first picked path", () => {
    expect(deriveFolderPathFromPickedFiles(["C:/Users/me/assets/logo.png"])).toBe(
      "C:/Users/me/assets",
    );
    expect(deriveFolderPathFromPickedFiles(["/home/me/assets/notes.txt"])).toBe(
      "/home/me/assets",
    );
  });

  it("returns null when no picked file carries a usable directory", () => {
    expect(deriveFolderPathFromPickedFiles([])).toBeNull();
    expect(deriveFolderPathFromPickedFiles(["logo.png"])).toBeNull();
  });
});

describe("resolvePickedFileAbsolutePath", () => {
  // Stubbed through globalThis (not `window`) so the suite runs in Node too;
  // `| undefined` keeps the restore assignments valid under
  // exactOptionalPropertyTypes.
  const globalWithBridge = globalThis as {
    desktopBridge?: { getPathForFile?: (file: File) => string | null } | undefined;
  };

  it("asks the desktop bridge for the file's path", () => {
    const previous = globalWithBridge.desktopBridge;
    globalWithBridge.desktopBridge = {
      getPathForFile: (file: File) =>
        file.name === "clip.mp3" ? "C:/Users/me/clip.mp3" : null,
    };
    try {
      expect(resolvePickedFileAbsolutePath({ name: "clip.mp3" } as File)).toBe(
        "C:/Users/me/clip.mp3",
      );
      expect(resolvePickedFileAbsolutePath({ name: "other.mp3" } as File)).toBeNull();
    } finally {
      globalWithBridge.desktopBridge = previous;
    }
  });

  it("returns null when no desktop bridge is present (web)", () => {
    const previous = globalWithBridge.desktopBridge;
    delete globalWithBridge.desktopBridge;
    try {
      expect(resolvePickedFileAbsolutePath({ name: "clip.mp3" } as File)).toBeNull();
    } finally {
      globalWithBridge.desktopBridge = previous;
    }
  });
});
