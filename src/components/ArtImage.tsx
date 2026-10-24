"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// Met source images are often multi-megabyte originals (an 8 MB JPEG for a single card
// thumbnail), so they go through next/image's optimizer, which resizes to the rendered
// width. Anything else — chiefly our own AIC proxy (/api/image-proxy, which redirects to
// Vercel Blob) and passport snapshots that already hold a proxied URL — is served as-is:
// the proxy is already the right size and its query string isn't an optimizable local path.
const OPTIMIZABLE_HOSTNAME = "images.metmuseum.org";

function isOptimizable(src: string): boolean {
  try {
    return new URL(src).hostname === OPTIMIZABLE_HOSTNAME;
  } catch {
    return false;
  }
}

// The Met publishes a ~600px "web-large" rendition beside every original at the same path.
// It is 20-50x smaller than the original, so thumbnails start from it; only large plates
// (`hiRes`) pay for resizing the full original.
function metWebLarge(src: string): string {
  return src.replace("/original/", "/web-large/");
}

/**
 * An artwork image that fills its positioned parent, which owns the aspect ratio.
 * `fit="contain"` shows the whole work, uncropped — the default anywhere the image is the
 * artwork itself (§12) rather than a browsing thumbnail.
 */
export default function ArtImage({
  src,
  alt,
  sizes,
  fit = "contain",
  preload = false,
  hiRes = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  fit?: "cover" | "contain";
  preload?: boolean;
  hiRes?: boolean;
}) {
  const optimizable = isOptimizable(src);
  // Keyed by src, so a new src (e.g. a client-side navigation) gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // A server-rendered <img> can fail before React hydrates and attaches onError, so the
  // event is missed; check once after mount whether it already finished without pixels.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailedSrc(src);
  }, [src]);

  // Some sources refuse a handful of their own images (AIC 403s/404s a few, ticket 31),
  // so a failed load shows a labelled frame instead of the broken-image icon.
  if (failedSrc === src) {
    return (
      <span role="img" aria-label={`${alt} (image unavailable)`} className="frame__empty">
        <span aria-hidden="true">Image unavailable</span>
      </span>
    );
  }

  return (
    <Image
      ref={imgRef}
      onError={() => setFailedSrc(src)}
      src={optimizable && !hiRes ? metWebLarge(src) : src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      unoptimized={!optimizable}
      style={{ objectFit: fit }}
    />
  );
}

/** Card sizes for `.card-grid`: up to five columns on wide screens, two on phones. */
export const CARD_SIZES = "(min-width: 1280px) 260px, (min-width: 768px) 30vw, 50vw";

/**
 * The wall a work hangs on: a fixed-ratio neutral frame that holds an ArtImage, or a
 * labelled placeholder when there's no cleared image, so grids keep their rhythm.
 */
export function ArtFrame({
  src,
  alt,
  sizes = CARD_SIZES,
  preload,
  hiRes,
}: {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  preload?: boolean;
  hiRes?: boolean;
}) {
  return (
    <span className="frame">
      {src ? (
        <ArtImage src={src} alt={alt} sizes={sizes} preload={preload} hiRes={hiRes} />
      ) : (
        <span className="frame__empty">No open-access image</span>
      )}
    </span>
  );
}
