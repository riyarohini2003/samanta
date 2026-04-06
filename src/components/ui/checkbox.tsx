"use client";
import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, indeterminate, onCheckedChange, disabled, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    return (
      <span className={cn("relative inline-flex h-4 w-4 shrink-0 items-center justify-center", className)}>
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-sm border border-primary bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        {indeterminate ? (
          <Minus className="pointer-events-none h-3 w-3 text-primary-foreground" />
        ) : checked ? (
          <Check className="pointer-events-none h-3 w-3 text-primary-foreground" />
        ) : null}
      </span>
    );
  }
);
Checkbox.displayName = "Checkbox";
