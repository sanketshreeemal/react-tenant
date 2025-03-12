import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import Link from "next/link"
import { theme } from "@/theme/theme"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  subtitle?: string
  className?: string
  href?: string
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  subtitle,
  className,
  href
}: StatCardProps) {
  const CardWrapper = href ? Link : 'div';
  
  return (
    <CardWrapper 
      href={href || ''}
      className={cn(
        "block",
        href && `cursor-pointer transition-shadow duration-200 hover:shadow-[${theme.components.statCard.hoverShadow}]`,
        className
      )}
    >
      <Card 
        className="h-full overflow-hidden" 
        style={{ 
          borderColor: theme.colors.border,
          boxShadow: theme.components.statCard.shadow,
          borderRadius: theme.components.statCard.borderRadius
        }}
      >
        <CardContent 
          className="flex items-center" 
          style={{ padding: theme.components.statCard.padding }}
        >
          {/* Icon Section */}
          <div 
            className="flex-shrink-0 mr-3 rounded-full"
            style={{ 
              backgroundColor: theme.colors.primary + '10',
              padding: theme.spacing.sm
            }}
          >
            <Icon 
              size={parseInt(theme.components.statCard.iconSize)}
              style={{ color: theme.colors.primary }}
            />
          </div>

          {/* Content Section */}
          <div className="flex flex-col min-w-0">
            <h3 
              className="font-medium mb-0.5"
              style={{ 
                color: theme.colors.textSecondary,
                fontSize: theme.components.statCard.titleFontSize
              }}
            >
              {title}
            </h3>
            <div className="flex items-baseline gap-2 min-w-0">
              <p 
                className="font-bold leading-none truncate"
                style={{ 
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontFamily.sans,
                  fontSize: theme.components.statCard.valueFontSize,
                  fontWeight: theme.components.statCard.valueFontWeight
                }}
              >
                {value}
              </p>
              {subtitle && (
                <>
                  <span 
                    style={{ 
                      color: theme.colors.textSecondary + '80',
                      fontSize: theme.components.statCard.subtitleFontSize,
                      margin: `0 ${theme.spacing.xs}`
                    }}
                  >
                    |
                  </span>
                  <p 
                    className="truncate"
                    style={{ 
                      color: theme.colors.textSecondary,
                      fontSize: theme.components.statCard.subtitleFontSize
                    }}
                  >
                    {subtitle}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  )
} 