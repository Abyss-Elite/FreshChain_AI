import React from "react";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...props }, ref) => (
    <div className="flex items-center">
      <input
        type="checkbox"
        ref={ref}
        className={`h-4 w-4 rounded border-gray-300 text-blue-600 ${className || ""}`}
        {...props}
      />
      {label && <label className="ml-2 text-sm text-gray-700">{label}</label>}
    </div>
  )
);

Checkbox.displayName = "Checkbox";
