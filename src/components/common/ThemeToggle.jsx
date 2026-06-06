import React from 'react';
import { motion } from 'framer-motion';

export default function ThemeToggle({
  isDark,
  onToggle,
  className = '',
  trackClassName = '',
  thumbClassName = '',
  size = 'md',
  ariaLabel = 'Toggle theme',
}) {
  const dims = size === 'sm'
    ? { track: 'w-11 h-[22px]', thumb: 'w-[16px] h-[16px]', icon: 'text-[7px]' }
    : { track: 'w-12 h-[24px]', thumb: 'w-[18px] h-[18px]', icon: 'text-[8px]' };

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      className={`flex ${dims.track} items-center rounded-full p-0.5 cursor-pointer transition-all duration-500 border ${trackClassName || 'rb-toggle-track border-white/10 bg-black/20'} ${className}`}
      role="switch"
      aria-checked={isDark}
      aria-label={ariaLabel}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`bg-white ${dims.thumb} rounded-full shadow-md flex items-center justify-center ${isDark ? 'ml-auto' : 'ml-0'} ${thumbClassName}`}
      >
        {isDark
          ? <i className={`fa-solid fa-moon text-indigo-600 ${dims.icon}`} />
          : <i className={`fa-solid fa-sun text-amber-500 ${dims.icon}`} />}
      </motion.span>
    </motion.button>
  );
}
