import { cloneElement, isValidElement } from "react";

import { cn } from "@/shared/lib/utils";

function getButtonClassName({ className, variant, size }) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    variant === "default" && "bg-primary px-4 py-2.5 text-primary-foreground shadow-panel hover:opacity-95",
    variant === "secondary" &&
      "bg-secondary px-4 py-2.5 text-secondary-foreground hover:bg-secondary/80",
    variant === "ghost" && "px-3 py-2 text-foreground hover:bg-white/70",
    variant === "outline" && "border border-border bg-white/70 px-4 py-2.5 text-foreground hover:bg-white",
    size === "icon" && "h-10 w-10 rounded-full p-0",
    className
  );
}

export function Button({ asChild = false, className, variant = "default", size = "default", children, ...props }) {
  const buttonClassName = getButtonClassName({ className, variant, size });

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      ...props,
      className: cn(buttonClassName, children.props.className),
    });
  }

  return (
    <button className={buttonClassName} {...props}>
      {children}
    </button>
  );
}
