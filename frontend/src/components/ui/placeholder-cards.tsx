import React from 'react';

interface PlaceholderCardsProps {
  count?: number;
  className?: string;
}

/**
 * Renders one or more animated placeholder cards for loading states.
 * - count: number of cards to show (default 1)
 * - className: custom classes for sizing/dimensions (default fills parent)
 */
export const PlaceholderCards: React.FC<PlaceholderCardsProps> = ({
  count = 1,
  className = '',
}) => {
  return (
    <div className={`relative mx-auto flex w-full flex-col gap-10 py-8 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-96 w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
        />
      ))}
    </div>
  );
};
