'use client';
import * as React from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          tabIndex={-1}
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? (
            <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <EyeIcon className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
        </Button>
        {/* Hide default browser eye button on Edge */}
        <style>{`
          .pr-10::-ms-reveal, .pr-10::-ms-clear {
            display: none;
          }
        `}</style>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
export { PasswordInput };
