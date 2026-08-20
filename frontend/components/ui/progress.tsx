import React from "react";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, max = 100, className, ...props }, ref) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
      <div
        ref={ref}
        className={`h-2 w-full bg-gray-200 rounded-full overflow-hidden ${className || ""}`}
        {...props}
      >
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";
