import React, { ReactNode, forwardRef } from "react";
import { Calendar, DollarSign, Zap, Wrench, Home, HelpCircle } from "lucide-react";
import { theme } from "@/theme/theme";
import { cn } from "@/lib/utils";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

// Helper function to get payment type icon and color
const getPaymentTypeInfo = (paymentType: string) => {
  switch (paymentType.toLowerCase()) {
    case "rent payment":
      return { 
        icon: <Home className="h-5 w-5" />, 
        color: "#3b82f6", 
        bgColor: "rgba(59, 130, 246, 0.08)",
        gradientFrom: "rgba(219, 234, 254, 0.4)",
        gradientTo: "rgba(191, 219, 254, 0.1)"
      };
    case "bill payment":
    case "utility":
      return { 
        icon: <Zap className="h-5 w-5" />, 
        color: "#8b5cf6", 
        bgColor: "rgba(139, 92, 246, 0.08)",
        gradientFrom: "rgba(237, 233, 254, 0.4)",
        gradientTo: "rgba(221, 214, 254, 0.1)"
      };
    case "maintenance fee":
    case "maintenance":
      return { 
        icon: <Wrench className="h-5 w-5" />, 
        color: "#f59e0b", 
        bgColor: "rgba(245, 158, 11, 0.08)",
        gradientFrom: "rgba(254, 243, 199, 0.4)",
        gradientTo: "rgba(253, 230, 138, 0.1)"
      };
    default:
      return { 
        icon: <HelpCircle className="h-5 w-5" />, 
        color: "#6b7280", 
        bgColor: "rgba(107, 114, 128, 0.08)",
        gradientFrom: "rgba(243, 244, 246, 0.4)",
        gradientTo: "rgba(229, 231, 235, 0.1)"
      };
  }
};

const Panel = forwardRef<HTMLDivElement, PanelProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-4 [&_[role=tablist]]:shrink-0",
      className
    )}
    {...props}
  />
));
Panel.displayName = "Panel";

const PanelHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-16 items-center px-4", className)}
      {...props}
    />
  )
);
PanelHeader.displayName = "PanelHeader";

export { Panel, PanelHeader };

export function PaymentPanel({
  id,
  unitNumber,
  tenantName,
  paymentType,
  rentalPeriod,
  actualRent,
  collectionMethod,
  isExpanded,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  id: string;
  unitNumber: string;
  tenantName: string;
  paymentType: string;
  rentalPeriod: string;
  actualRent: number;
  collectionMethod?: string;
  isExpanded: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}) {
  const paymentInfo = getPaymentTypeInfo(paymentType);

  return (
    <div 
      key={id}
      className={`
        relative flex-shrink-0 snap-start rounded-xl overflow-hidden
        transition-all duration-300 ease-in-out shadow-sm hover:shadow-md
        ${isExpanded ? 'w-[280px] sm:w-[320px]' : 'w-[100px] sm:w-[110px]'}
        h-[220px] mx-1 sm:mx-2
      `}
      style={{
        backgroundColor: theme.colors.background,
        border: `1px solid ${isExpanded ? 'rgba(255,255,255,0.25)' : theme.colors.border}`,
        backdropFilter: 'blur(10px)',
        background: isExpanded 
          ? `linear-gradient(135deg, ${paymentInfo.gradientFrom} 0%, ${paymentInfo.gradientTo} 100%)`
          : `linear-gradient(to right, ${paymentInfo.gradientFrom} 0%, ${paymentInfo.gradientTo} 100%)`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Top accent color bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: paymentInfo.color }}
      />
      
      {/* Collapsed state - vertical content */}
      <div 
        className={`
          absolute inset-0 flex flex-col items-center justify-between py-4
          transition-opacity duration-300 z-10
          ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        {/* Top icon */}
        <div 
          className="flex items-center justify-center rounded-full p-2"
          style={{ 
            backgroundColor: paymentInfo.bgColor,
            color: paymentInfo.color,
          }}
        >
          {paymentInfo.icon}
        </div>
        
        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
          <span className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
            {unitNumber}
          </span>
          <span className="text-base font-medium" style={{ color: theme.colors.textSecondary }}>
            {rentalPeriod.split(' ')[0]}
          </span>
        </div>
        
        {/* Bottom amount */}
        <div 
          className="flex items-center justify-center rounded-full text-xs font-medium px-2 py-0.5"
          style={{ 
            backgroundColor: paymentInfo.bgColor,
            color: paymentInfo.color,
          }}
        >
          ₹{actualRent.toLocaleString()}
        </div>
      </div>
      
      {/* Expanded state - full content */}
      <div 
        className={`
          absolute inset-0 p-5 flex flex-col
          transition-opacity duration-200 z-10
          ${isExpanded ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        {/* Header with Payment Type */}
        <div className="flex items-center justify-between mb-4">
          <div 
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: paymentInfo.bgColor,
              color: paymentInfo.color,
            }}
          >
            {paymentInfo.icon}
            <span className="text-sm font-semibold">{paymentType}</span>
          </div>
        </div>
        
        {/* Rental Period - Enlarged */}
        <div 
          className="absolute top-4 right-4 flex flex-col items-end text-center"
          style={{ color: paymentInfo.color }}
        >
          <Calendar className="h-8 w-8 mb-2 mx-auto" />
          <div className="flex flex-col">
            <span className="text-xl font-bold">{rentalPeriod.split(' ')[0]}</span>
            <span className="text-sm opacity-75">{rentalPeriod.split(' ')[1]}</span>
          </div>
        </div>
        
        {/* Unit and tenant info */}
        <div className="flex flex-col mb-4 mt-2">
          <h3 className="text-lg font-bold mb-0.5" style={{ color: theme.colors.textPrimary }}>
            Unit {unitNumber}
          </h3>
          <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
            {tenantName}
          </p>
        </div>
        
        {/* Payment details with method */}
        <div className="mt-auto flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-sm" style={{ color: theme.colors.textSecondary }}>Collected</span>
            <span className="text-lg font-semibold" style={{ color: theme.colors.textPrimary }}>
              ₹{actualRent.toLocaleString()}
            </span>
          </div>
          
          {collectionMethod && (
            <div className="flex flex-col items-end">
              <span className="text-sm mb-1" style={{ color: theme.colors.textSecondary }}>
                Paid Via
              </span>
              <div 
                className="flex items-center justify-center text-xs px-3 py-1.5 rounded-full"
                style={{ 
                  backgroundColor: paymentInfo.bgColor,
                  color: paymentInfo.color,
                }}
              >
                <DollarSign className="h-3.5 w-3.5 mr-1.5" /> 
                {collectionMethod}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const PanelContainer = forwardRef<HTMLDivElement, { children: ReactNode, className?: string }>(
  ({ children, className = '' }, ref) => (
    <div 
      ref={ref}
      className={`flex overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar ${className}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {children}
    </div>
  )
);

PanelContainer.displayName = 'PanelContainer'; 