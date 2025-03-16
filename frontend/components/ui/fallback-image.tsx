"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";

interface FallbackImageProps extends Omit<ImageProps, "onError"> {
  fallbackText?: string;
  fallbackStyles?: React.CSSProperties;
}

export function FallbackImage({
  src,
  alt,
  fallbackText,
  fallbackStyles,
  className,
  ...props
}: FallbackImageProps) {
  const [error, setError] = useState(false);

  const defaultFallbackStyles: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    border: "1px dashed #ccc",
    color: "#666",
    ...fallbackStyles,
  };

  if (error) {
    return (
      <div
        style={{
          width: props.width ? `${props.width}px` : "100%",
          height: props.height ? `${props.height}px` : "100%",
          ...defaultFallbackStyles,
        }}
        className={className}
      >
        {fallbackText || alt}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        console.error(`Image failed to load: ${src}`);
        setError(true);
      }}
      {...props}
    />
  );
}
