"use client";

import { forwardRef, useState, useCallback, useRef, type HTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { springs } from "@/lib/springs";

interface InputCopyProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The value to display and copy to clipboard. */
  value: string;
  /** Optional label displayed above the input. */
  label?: string;
  /** Callback fired after the value is copied. */
  onCopy?: () => void;
  /** Whether the component is disabled. */
  disabled?: boolean;
}

const InputCopy = forwardRef<HTMLDivElement, InputCopyProps>(
  ({ value, label, onCopy, disabled, className, ...props }, ref) => {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const shape = useShape();

    const handleCopy = useCallback(async () => {
      if (disabled) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        onCopy?.();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard API not available — silently fail
      }
    }, [value, disabled, onCopy]);

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-1",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        {...props}
      >
        {label && (
          <span
            className="text-[13px] text-muted-foreground pl-3"
            style={{ fontVariationSettings: fontWeights.normal }}
          >
            {label}
          </span>
        )}
        <div
          className={cn(
            "flex items-center ring-1 ring-border bg-muted/50 transition-all duration-80",
            "has-[:focus-visible]:ring-[#6B97FF]",
            shape.input
          )}
        >
          <input
            type="text"
            value={value}
            readOnly
            tabIndex={disabled ? -1 : 0}
            className={cn(
              "flex-1 min-w-0 bg-transparent text-[13px] text-foreground pl-3 py-2 outline-none font-[inherit] select-all cursor-default",
            )}
            style={{ fontVariationSettings: fontWeights.normal }}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={disabled}
            aria-label={copied ? "Copied" : "Copy to clipboard"}
            className={cn(
              "relative shrink-0 h-full px-2.5 py-2 cursor-pointer outline-none",
              "text-muted-foreground transition-colors duration-80",
              "hover:text-foreground",
              "focus-visible:ring-1 focus-visible:ring-[#6B97FF]",
              shape.button
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={springs.fast}
                  className="flex items-center justify-center text-foreground"
                >
                  <Check size={14} strokeWidth={2} />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={springs.fast}
                  className="flex items-center justify-center"
                >
                  <Copy size={14} strokeWidth={1.5} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    );
  }
);

InputCopy.displayName = "InputCopy";

export { InputCopy };
export type { InputCopyProps };
export default InputCopy;
