// src/modules/shared/components/Card/index.tsx
import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  title: string;
  description: string;
  image?: string;
}

export const Card = ({ title, description, image }: CardProps) => {
  return (
    <article className={styles.card}>
      {image && <img src={image} alt={title} className={styles.image} />}
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        <button className={styles.button}>Acessar</button>
      </div>
    </article>
  );
};
