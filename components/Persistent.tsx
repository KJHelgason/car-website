'use client';

import { ReactNode } from 'react';

interface PersistentProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

export function Persistent({ show, children, className }: PersistentProps) {
  return (
    <div
      className={className}
      style={{
        display: show ? "block" : "none"
      }}
    >
      {children}
    </div>
  );
}
