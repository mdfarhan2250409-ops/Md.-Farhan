import React from 'react';

export const TikTokIcon: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-4 h-4',
  color
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color || 'currentColor'}
      className={className}
      aria-hidden="true"
    >
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.901 2.868 2.897 2.897 0 0 1-2.902-2.868 2.897 2.897 0 0 1 2.902-2.868c.28 0 .548.043.801.119V9.431a6.34 6.34 0 0 0-.801-.051 6.337 6.337 0 0 0-6.338 6.333A6.337 6.337 0 0 0 9.472 22a6.337 6.337 0 0 0 6.338-6.333V9.18a8.188 8.188 0 0 0 4.779 1.524V7.27a4.829 4.829 0 0 1-1.000-.584z" />
    </svg>
  );
};
