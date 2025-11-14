import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "error" | "outline"
}

export function Badge({
  className = "",
  variant = "default",
  ...props
}: BadgeProps) {
  const variantClasses = {
    default: "bg-blue-100 text-blue-800 border-transparent",
    secondary: "bg-gray-100 text-gray-800 border-transparent",
    success: "bg-green-100 text-green-800 border-transparent",
    warning: "bg-orange-100 text-orange-800 border-transparent",
    error: "bg-red-100 text-red-800 border-transparent",
    outline: "bg-transparent text-gray-700 border-gray-300",
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
