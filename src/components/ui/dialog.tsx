"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-md",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 flex w-[calc(100%-1.5rem)] max-w-lg",
        "max-h-[min(92vh,880px)] translate-x-[-50%] translate-y-[-50%] flex-col",
        "overflow-hidden bg-card p-0 text-card-foreground",
        "rounded-[1.35rem] border-0 ring-1 ring-black/5 dark:ring-white/10",
        "shadow-[0_32px_80px_-20px_rgb(15_23_42_/_0.45),0_12px_28px_-12px_rgb(15_23_42_/_0.25)]",
        "duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%]",
        className
      )}
      {...props}
    >
      {/* Scroll nằm BÊN TRONG — clip bởi overflow-hidden + bo góc, không thọt ra ngoài */}
      <div className="dialog-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      <DialogPrimitive.Close
        className={cn(
          "absolute right-5 top-5 z-20",
          "inline-flex h-9 w-9 items-center justify-center rounded-xl",
          "text-muted-foreground hover:bg-background/80 hover:text-foreground",
          "ring-1 ring-transparent hover:ring-border/80",
          "transition-all",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:pointer-events-none"
        )}
      >
        <X size={15} />
        <span className="sr-only">Đóng</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "relative flex flex-col gap-1.5 text-left px-7 pt-7 pb-4 pr-16 sm:px-8",
      "bg-[linear-gradient(180deg,hsl(var(--muted)/0.55)_0%,transparent_100%)]",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/** Body form chuẩn — padding đồng bộ mọi modal */
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-5 px-7 py-5 sm:px-8", className)}
    {...props}
  />
);
DialogBody.displayName = "DialogBody";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky bottom-0 z-10 flex flex-col-reverse gap-2 px-7 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8",
      "border-t border-border/60 bg-card/95 backdrop-blur-sm",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "font-[family-name:var(--font-display)] text-xl font-semibold leading-tight tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
