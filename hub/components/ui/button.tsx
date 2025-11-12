import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles - accessibility and touch-friendly
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] min-h-[44px] px-4',
  {
    variants: {
      variant: {
        primary:
          'bg-[#003B5C] text-white hover:bg-[#0066A1] focus-visible:ring-[#00A5E0] shadow-sm',
        secondary:
          'bg-[#00A5E0] text-white hover:bg-[#0066A1] focus-visible:ring-[#003B5C] shadow-sm',
        outline:
          'border-2 border-[#003B5C] text-[#003B5C] hover:bg-[#003B5C] hover:text-white focus-visible:ring-[#00A5E0]',
        ghost:
          'text-[#003B5C] hover:bg-gray-100 focus-visible:ring-[#00A5E0]',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
        success:
          'bg-[#06D6A0] text-white hover:bg-[#05c091] focus-visible:ring-[#06D6A0] shadow-sm',
        warm:
          'bg-[#FF6B35] text-white hover:bg-[#ff5722] focus-visible:ring-[#FF6B35] shadow-sm',
      },
      size: {
        sm: 'text-sm px-3 min-h-[36px]',
        md: 'text-base px-4 min-h-[44px]',
        lg: 'text-lg px-6 min-h-[52px]',
        icon: 'h-10 w-10 p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
