// src/modules/shared/components/Grid/index.tsx
import React from 'react';
import styles from './Grid.module.css';

interface GridProps {
  children: React.ReactNode;
}

export const Grid = ({ children }: GridProps) => {
  return <div className={styles.container}>{children}</div>;
};
