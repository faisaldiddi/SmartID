import React from 'react';

export interface CardScaleContainerProps {
  /** The fixed logical unscaled width of the card (e.g. 432 or 1011) */
  logicalWidth: number;
  /** The fixed logical unscaled height of the card (e.g. 272 or 638) */
  logicalHeight: number;
  /** The maximum available width in the current viewport/parent container */
  availableWidth: number;
  /** Optional max scale clamp (defaults to 1.0) */
  maxScale?: number;
  /** The card content to be proportionally scaled */
  children: React.ReactNode;
  /** Optional container class name */
  className?: string;
  /** Optional extra styles */
  style?: React.CSSProperties;
}

/**
 * CardScaleContainer
 *
 * Guarantees proportional card scaling across all mobile and desktop screens.
 * Ensures the outer container matches the scaled dimensions precisely to prevent
 * clipping, unwanted overflow, or layout jumping.
 */
export const CardScaleContainer: React.FC<CardScaleContainerProps> = ({
  logicalWidth,
  logicalHeight,
  availableWidth,
  maxScale = 1.0,
  children,
  className = '',
  style = {},
}) => {
  // Calculate proportional scale factor
  const rawScale = availableWidth > 0 ? availableWidth / logicalWidth : 1.0;
  const scale = Math.max(0.2, Math.min(maxScale, rawScale));

  // Compute exact scaled dimensions
  const scaledWidth = Math.round(logicalWidth * scale);
  const scaledHeight = Math.round(logicalHeight * scale);

  return (
    <div
      className={`card-scale-container relative select-none ${className}`}
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        className="card-scale-inner"
        style={{
          width: `${logicalWidth}px`,
          height: `${logicalHeight}px`,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          position: 'absolute',
          top: 0,
          left: 0,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  );
};
