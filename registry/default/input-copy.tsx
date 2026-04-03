"use client";

import { forwardRef, useState, useCallback, useRef, type HTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { springs } from "@/lib/springs";
import { Tooltip } from "@/registry/default/tooltip";

type InputCopyVariant = "icon" | "button";
type InputCopyAlign = "right" | "left";

interface InputCopyProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The value to display and copy to clipboard. */
  value: string;
  /** Optional label displayed above the input. */
  label?: string;
  /** Callback fired after the value is copied. */
  onCopy?: () => void;
  /** Whether the component is disabled. */
  disabled?: boolean;
  /** Display variant: icon-only with tooltip, or button with label. */
  variant?: InputCopyVariant;
  /** Position of the copy action relative to the value. */
  align?: InputCopyAlign;
}

const InputCopy = forwardRef<HTMLDivElement, InputCopyProps>(
  ({ value, label, onCopy, disabled, variant = "icon", align = "right", className, ...props }, ref) => {
    const [copied, setCopied] = useState(false);
    const [copyCount, setCopyCount] = useState(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const shape = useShape();

    const handleCopy = useCallback(async () => {
      if (disabled) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setCopyCount((c) => c + 1);
        onCopy?.();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard API not available — silently fail
      }
    }, [value, disabled, onCopy]);

    const iconSwitch = (
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key={`check-${copyCount}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="flex items-center justify-center text-foreground"
          >
            <svg
              width={14}
              height={14}
              viewBox="2 4 20 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M6 12L10 16L18 8"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: 0.08, ease: "easeOut" },
                }}
              />
            </svg>
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
            <Copy size={14} strokeWidth={1.5} className="transition-[stroke-width] duration-80 group-hover:stroke-[2]" />
          </motion.span>
        )}
      </AnimatePresence>
    );

    const actionElement = variant === "button" ? (
      <span
        className={cn(
          "shrink-0 flex items-center gap-1.5 px-1.5 py-2 text-[13px] transition-colors duration-80",
          "text-muted-foreground group-hover:text-foreground",
        )}
        style={{ fontVariationSettings: fontWeights.normal }}
      >
        {iconSwitch}
        <span className="select-none inline-grid text-left">
          <span className="col-start-1 row-start-1 invisible" aria-hidden="true">Copied</span>
          <span className="col-start-1 row-start-1">{copied ? "Copied" : "Copy"}</span>
        </span>
      </span>
    ) : (
      <span
        className={cn(
          "shrink-0 px-1.5 py-2 transition-colors duration-80",
          "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {iconSwitch}
      </span>
    );

    const valueElement = (
      <span
        className="flex-1 min-w-0 text-left text-[13px] pl-3 py-2 select-none truncate"
        style={{ fontVariationSettings: fontWeights.normal }}
      >
        <mark className="bg-transparent text-foreground transition-colors duration-80 group-hover:bg-[#6B97FF]/20 group-hover:text-foreground">
          {value}
        </mark>
      </span>
    );

    const buttonContent = align === "left" ? (
      <>{actionElement}{valueElement}</>
    ) : (
      <>{valueElement}{actionElement}</>
    );

    const button = (
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        aria-label={copied ? "Copied" : "Copy to clipboard"}
        className={cn(
          "group flex items-center w-full cursor-pointer outline-none transition-all duration-80",
          "focus-visible:ring-1 focus-visible:ring-[#6B97FF]",
          shape.input
        )}
      >
        {buttonContent}
      </button>
    );

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
        {variant === "icon" ? (
          <Tooltip content={copied ? "Copied" : "Copy to clipboard"} delayDuration={500} sideOffset={4}>
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </div>
    );
  }
);

InputCopy.displayName = "InputCopy";

export { InputCopy };
export type { InputCopyProps };
export default InputCopy;
