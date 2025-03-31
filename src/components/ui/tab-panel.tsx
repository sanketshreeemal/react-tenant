import React from "react";
import { Panel, PanelContainer } from "./panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Progress } from "./progress";
import { Card, CardContent } from "./card";
import { theme } from "@/theme/theme";
import { Home, Building, Users, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the structure for unit data (adjust based on actual data)
interface UnitInfo {
  id: string;
  unitNumber: string;
  rent?: number; // Present for occupied
  daysVacant?: number; // Present for vacant
  isActive: boolean; // Determine if occupied or vacant
}

interface PropertyGroupInfo {
  groupName: string;
  units: UnitInfo[];
  totalUnits: number;
}

interface TenantOccupancyPanelProps {
  propertyGroup: PropertyGroupInfo;
  isExpanded: boolean;
  onClick?: () => void;
}

// Helper to calculate days vacant (adjust based on actual date field)
const calculateDaysVacant = (lastActiveDate: Date | string | undefined): number | undefined => {
  if (!lastActiveDate) return undefined;
  const today = new Date();
  const lastDate = new Date(lastActiveDate);
  const diffTime = Math.abs(today.getTime() - lastDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const TenantOccupancyPanel: React.FC<TenantOccupancyPanelProps> = ({
  propertyGroup,
  isExpanded,
  onClick,
}) => {
  const { groupName, units, totalUnits } = propertyGroup;
  const occupiedUnits = units.filter((unit) => unit.isActive);
  const vacantUnits = units.filter((unit) => !unit.isActive);
  const occupiedCount = occupiedUnits.length;
  const vacantCount = vacantUnits.length;
  // Ensure totalUnits is at least the sum of occupied and vacant, might be larger if data is incomplete
  const effectiveTotalUnits = Math.max(totalUnits, occupiedCount + vacantCount); 
  const occupancyRate = effectiveTotalUnits > 0 ? (occupiedCount / effectiveTotalUnits) * 100 : 0;
  const vacancyRate = effectiveTotalUnits > 0 ? (vacantCount / effectiveTotalUnits) * 100 : 0;

  const groupIcon = groupName === "Default" || groupName.toLowerCase().includes("residential")
    ? <Home className="h-5 w-5" />
    : <Building className="h-5 w-5" />;
    
  const groupIconBg = groupName === "Default" || groupName.toLowerCase().includes("residential")
    ? theme.colors.propertyType.residential.bg
    : theme.colors.propertyType.commercial.bg;

  const groupIconColor = groupName === "Default" || groupName.toLowerCase().includes("residential")
    ? theme.colors.propertyType.residential.text
    : theme.colors.propertyType.commercial.text;

  return (
    <div
      className={cn(
        "flex-shrink-0 snap-start rounded-xl overflow-hidden transition-all duration-300 ease-in-out",
        "shadow-sm hover:shadow-md relative cursor-pointer",
        isExpanded ? "w-[320px] md:w-[380px]" : "w-[240px]", // Adjust width as needed
        "h-[300px]" // Adjust height as needed
      )}
      style={{
        backgroundColor: theme.colors.background,
        border: `1px solid ${theme.colors.border}`,
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex justify-between items-center"
        style={{ borderColor: theme.colors.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: groupIconBg, color: groupIconColor }}
          >
            {groupIcon}
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: theme.colors.textPrimary }}>
              {groupName}
            </h3>
            <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
              {occupiedCount} Occupied / {vacantCount} Vacant
            </p>
          </div>
        </div>
        {/* Maybe add an icon or indicator for expanded state */}
      </div>

      {/* Content Area with Tabs */}
      <div className="p-3 overflow-hidden" style={{ height: "calc(100% - 73px)" }}>
        <Tabs defaultValue="occupied" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 h-10 mb-2">
            <TabsTrigger value="occupied">Occupied ({occupiedCount})</TabsTrigger>
            <TabsTrigger value="vacant">Vacant ({vacantCount})</TabsTrigger>
          </TabsList>

          {/* Occupied Tab */}
          <TabsContent value="occupied" className="flex-1 overflow-y-auto hide-scrollbar mt-0">
            <Card className="mb-3 border-none shadow-none bg-transparent">
              <CardContent className="p-2">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-green-700">Occupancy</span>
                    <span className="text-xs font-bold text-green-700">{occupancyRate.toFixed(0)}%</span>
                 </div>
                 <Progress value={occupancyRate} className="h-2 [&>div]:bg-green-600" />
              </CardContent>
            </Card>
            {occupiedUnits.length > 0 ? (
              <div className="space-y-1.5">
                {occupiedUnits.map((unit) => (
                  <div key={unit.id} className="p-2.5 rounded-lg bg-white border" style={{ borderColor: theme.colors.border }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <Users className="h-4 w-4 text-green-600" />
                         <span className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>Unit {unit.unitNumber}</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                        ₹{unit.rent?.toLocaleString() ?? 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="h-2/3 flex flex-col items-center justify-center text-center text-gray-500">
                 <Users className="h-8 w-8 mb-2 text-gray-300" />
                 <p className="text-sm">No occupied units</p>
               </div>
            )}
          </TabsContent>

          {/* Vacant Tab */}
          <TabsContent value="vacant" className="flex-1 overflow-y-auto hide-scrollbar mt-0">
             <Card className="mb-3 border-none shadow-none bg-transparent">
              <CardContent className="p-2">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-amber-700">Vacancy</span>
                    <span className="text-xs font-bold text-amber-700">{vacancyRate.toFixed(0)}%</span>
                 </div>
                 <Progress value={vacancyRate} className="h-2 [&>div]:bg-amber-500" />
              </CardContent>
            </Card>
            {vacantUnits.length > 0 ? (
              <div className="space-y-1.5">
                {vacantUnits.map((unit) => (
                  <div key={unit.id} className="p-2.5 rounded-lg bg-white border" style={{ borderColor: theme.colors.border }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>Unit {unit.unitNumber}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-700">
                         <Clock className="h-3 w-3"/>
                         <span>{unit.daysVacant ?? 'N/A'} days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-2/3 flex flex-col items-center justify-center text-center text-gray-500">
                 <AlertCircle className="h-8 w-8 mb-2 text-gray-300" />
                 <p className="text-sm">No vacant units</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}; 