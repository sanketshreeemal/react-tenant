"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { cn } from "@/lib/utils";

interface NestedTabsProps {
  mainTab: string;
  mainTabValue: string;
  nestedValue: string;
  onNestedValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const NestedTabs = React.forwardRef<
  HTMLDivElement,
  NestedTabsProps
>(({ mainTab, mainTabValue, nestedValue, onNestedValueChange, children, className }, ref) => {
  const isVisible = mainTab === mainTabValue;

  // Separate children into TabsList and TabsContent
  const childrenArray = React.Children.toArray(children);
  const tabsList = childrenArray.find(child => React.isValidElement(child) && child.type === TabsList);
  const tabsContent = childrenArray.filter(child => React.isValidElement(child) && child.type === TabsContent);

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={{ 
              height: 0,
              opacity: 0,
              y: -30,
              scale: 0.5,
              transformOrigin: "top"
            }}
            animate={{ 
              height: "auto",
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 20,
                mass: 1.4,
                duration: 0.6
              }
            }}
            exit={{ 
              height: 0,
              opacity: 0,
              y: -30,
              scale: 0.95,
              transition: {
                type: "tween",
                duration: 0.6,
                ease: "easeInOut"
              }
            }}
            className="overflow-hidden"
          >
            <Tabs value={nestedValue} onValueChange={onNestedValueChange} className="w-full">
              {tabsList}
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Render content outside of animation */}
      <Tabs value={nestedValue} onValueChange={onNestedValueChange} className="w-full">
        {tabsContent}
      </Tabs>
    </div>
  );
});

NestedTabs.displayName = "NestedTabs";