"use client";

import { useEffect, useRef, useState, type CSSProperties, type ImgHTMLAttributes } from "react";

type ArtworkImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "onError"> & {
  src: string;
  alt: string;
};

/**
 * An artwork image that degrades to a labelled placeholder instead of the browser's
 * broken-image icon when the file can't be loaded — e.g. the handful of AIC images AIC
 * itself 403s/404s (ticket 31), which can't be cached and so never load in production.
 * Keeps the same width so card grids and plates don't reflow around a missing image.
 */
export default function ArtworkImage({ src, alt, width, className, ...rest }: ArtworkImageProps) {
  // Keyed by src, so a new src (e.g. a client-side navigation) gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  const imgRef = useRef<HTMLImageElement>(null);

  // A server-rendered <img> can fail before React hydrates and attaches onError, so the
  // event is missed — check once after mount whether it already finished without pixels.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailedSrc(src);
  }, [src]);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={`${alt} (image unavailable)`}
        className={["image-placeholder", className].filter(Boolean).join(" ")}
        style={width ? ({ "--placeholder-width": `${Number(width)}px` } as CSSProperties) : undefined}
      >
        <span aria-hidden="true">Image unavailable</span>
      </span>
    );
  }

  return <img ref={imgRef} src={src} alt={alt} width={width} className={className} {...rest} onError={() => setFailedSrc(src)} />;
}
