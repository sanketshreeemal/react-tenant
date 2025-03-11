import { AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

export type AlertMessageVariant = 'success' | 'error' | 'info' | 'warning';

interface AlertMessageProps {
  variant: AlertMessageVariant;
  message: string;
  className?: string;
}

const variants = {
  success: {
    bg: "bg-green-50",
    border: "border-green-400",
    icon: CheckCircle,
    iconColor: "text-green-400",
    textColor: "text-green-700"
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-400",
    icon: AlertTriangle,
    iconColor: "text-red-400",
    textColor: "text-red-700"
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-400",
    icon: Info,
    iconColor: "text-blue-400",
    textColor: "text-blue-700"
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    icon: AlertCircle,
    iconColor: "text-yellow-400",
    textColor: "text-yellow-700"
  }
};

export function AlertMessage({ variant, message, className }: AlertMessageProps) {
  const styles = variants[variant];
  const Icon = styles.icon;

  // Scroll into view when message appears
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [message]);

  return (
    <div className={cn(
      styles.bg,
      "border-l-4",
      styles.border,
      "p-4 mb-4 rounded-md",
      className
    )}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn("h-5 w-5", styles.iconColor)} />
        </div>
        <div className="ml-3">
          <p className={cn("text-sm", styles.textColor)}>{message}</p>
        </div>
      </div>
    </div>
  );
} 