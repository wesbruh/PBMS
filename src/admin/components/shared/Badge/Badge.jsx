import React from 'react';
import './Badge.css';

/* Badge component for table status*/
const Badge = ({ 
  children, 
  variant = 'neutral',
  size = 'medium',
  dot = false,
  className = ''
}) => {
  const classNames = [
    'badge',
    `badge--${variant}`,
    `badge--${size}`,
    dot && 'badge--dot',
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames}>
      {dot && <span className="badge__dot"></span>}
      {children}
    </span>
  );
};

export default Badge;