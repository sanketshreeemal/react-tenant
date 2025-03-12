import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { theme } from "@/theme/theme"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  subtitle?: string | string[]
  highlightValue?: boolean
  className?: string
  actionButton?: {
    label: string
    href: string
    variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  }
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  subtitle, 
  highlightValue = false,
  className,
  actionButton
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        "h-full overflow-hidden transition-all hover:shadow-md", 
        "rounded-xl border border-gray-100 hover:border-gray-200",
        className
      )}
      style={{ 
        boxShadow: theme.shadows.sm,
        borderRadius: theme.borderRadius.lg
      }}
    >
      <CardContent className="flex flex-col h-full p-4">
        {/* Icon and Title Section */}
        <div className="flex items-center gap-2 mb-3">
          <div 
            className={cn(
              "p-2 rounded-lg",
              highlightValue ? "bg-green-100" : "bg-gray-100"
            )}
            style={{ 
              backgroundColor: highlightValue 
                ? theme.colors.statCard.highlightBgColor 
                : theme.colors.statCard.iconBgColor 
            }}
          >
            <Icon 
              size={24}
              className={cn(
                "text-gray-700",
                highlightValue && "text-green-700"
              )}
              style={{ 
                color: highlightValue 
                  ? theme.colors.statCard.highlightIconColor 
                  : theme.colors.statCard.iconColor 
              }}
            />
          </div>
          <h3 
            className="text-sm font-medium" 
            style={{ color: theme.colors.textSecondary }}
          >
            {title}
          </h3>
        </div>

        {/* Value and Subtitle Section */}
        <div className="flex-grow">
          <div className="flex items-baseline gap-1">
            <p 
              className={cn(
                "text-2xl md:text-3xl font-bold tracking-tight",
                highlightValue && "text-green-600"
              )}
              style={{ 
                color: highlightValue 
                  ? theme.colors.statCard.highlightValueColor 
                  : theme.colors.statCard.valueColor,
                fontFamily: theme.typography.fontFamily.sans
              }}
            >
              {value}
            </p>
          </div>
          
          {subtitle && (
            <div className="mt-1">
              {Array.isArray(subtitle) ? (
                <div className="space-y-0.5">
                  {subtitle.map((line, index) => (
                    <p 
                      key={index}
                      className="text-sm leading-tight"
                      style={{ color: theme.colors.statCard.subtitleColor }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p 
                  className="text-sm"
                  style={{ color: theme.colors.statCard.subtitleColor }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        {actionButton && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.colors.statCard.borderColor }}>
            <Button
              variant={actionButton.variant || 'outline'}
              className="w-full text-sm h-8 rounded-lg"
              asChild
            >
              <a href={actionButton.href}>{actionButton.label}</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 