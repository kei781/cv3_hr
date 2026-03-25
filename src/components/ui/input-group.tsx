"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function InputGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "flex items-center rounded-lg border border-input bg-background shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function InputGroupAddon({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn("flex items-center px-2 text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { InputGroup, InputGroupAddon }
