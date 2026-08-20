import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
  onComplete?: () => void;
}

export const TypingAnimation = ({
  text,
  duration = 30,
  className,
  onComplete,
}: TypingAnimationProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [i, setI] = useState(0);

  useEffect(() => {
    if (i >= text.length) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => {
      setDisplayedText(text.substring(0, i + 1));
      setI(i + 1);
    }, duration);
    return () => clearTimeout(timer);
  }, [i, text, duration, onComplete]);

  return (
    <span className={cn('', className)}>
      {displayedText}
      {i < text.length && (
        <span className="animate-pulse text-cyan-400 ml-px">▎</span>
      )}
    </span>
  );
};
