import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center border border-transparent font-medium [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        info: "bg-info/15 text-info",
        outline: "bg-transparent border-border text-muted",
        destructive: "bg-destructive/15 text-destructive-foreground",
      },
      size: {
        lg: "rounded-md px-2 h-7 min-w-7 gap-1.5 text-xs",
        md: "rounded-md px-1.5 h-6 min-w-6 gap-1 text-xs",
        sm: "rounded-sm px-1.5 h-5 min-w-5 gap-1 text-[11px] leading-none",
        xs: "rounded-sm px-1 h-4 min-w-4 gap-0.5 text-[10px] leading-none",
      },
      shape: {
        default: "",
        circle: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "sm",
      shape: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, shape, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, shape }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
