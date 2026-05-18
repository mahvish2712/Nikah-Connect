import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export default function Skeleton({ className = "", width, height, circle }: SkeletonProps) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-brand-primary/5 rounded-2xl ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '1rem',
        borderRadius: circle ? '50%' : undefined
      }}
    />
  );
}

export function ProfileSkeleton() {
  return (
    <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-brand-primary/5 flex flex-col">
      <Skeleton className="w-full h-[55%] rounded-none" />
      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <Skeleton width="40%" height="2rem" />
          <Skeleton width="25%" height="0.75rem" />
        </div>
        <div className="flex gap-2">
          <Skeleton width="60px" height="24px" className="rounded-full" />
          <Skeleton width="80px" height="24px" className="rounded-full" />
          <Skeleton width="70px" height="24px" className="rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton width="100%" height="0.75rem" />
          <Skeleton width="90%" height="0.75rem" />
          <Skeleton width="40%" height="0.75rem" />
        </div>
      </div>
    </div>
  );
}
