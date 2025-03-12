"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { theme } from "@/theme/theme";
import { Calendar, Info } from "lucide-react";

// List of world oceans
const oceans = [
  "Pacific Ocean",
  "Atlantic Ocean",
  "Indian Ocean",
  "Southern Ocean",
  "Arctic Ocean"
];

// List of names for the scroll area
const names = [
  "Emma Thompson",
  "James Wilson",
  "Olivia Martinez",
  "Noah Johnson",
  "Sophia Lee",
  "Liam Brown",
  "Ava Garcia",
  "William Davis",
  "Isabella Rodriguez",
  "Mason Anderson"
];

export default function TempTest() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    ocean: "",
    poem: "",
    birthday: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, ocean: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, birthday: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // You would typically send this data to an API
    alert("Form data submitted! Check console for details.");
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ backgroundColor: theme.colors.surface }}>
      <Navigation />
      <div className="md:pl-64 w-full transition-all duration-300">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <h1 
              className="text-xl md:text-2xl font-bold mb-6" 
              style={{ color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.sans }}
            >
              Component Test Page
            </h1>

            {/* Form Card */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle style={{ color: theme.colors.textPrimary }}>Test Form</CardTitle>
                <CardDescription style={{ color: theme.colors.textSecondary }}>
                  A simple form to test the shadcn components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Input */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="name" 
                      className="text-sm font-medium"
                      style={{ color: theme.colors.textPrimary }}
                    >
                      Name
                    </label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="phone" 
                      className="text-sm font-medium"
                      style={{ color: theme.colors.textPrimary }}
                    >
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Ocean Select */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="ocean" 
                      className="text-sm font-medium block"
                      style={{ color: theme.colors.textPrimary }}
                    >
                      Select an Ocean
                    </label>
                    <Select onValueChange={handleSelectChange} value={formData.ocean}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an ocean" />
                      </SelectTrigger>
                      <SelectContent>
                        {oceans.map((ocean) => (
                          <SelectItem key={ocean} value={ocean}>
                            {ocean}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Poem Textarea */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="poem" 
                      className="text-sm font-medium"
                      style={{ color: theme.colors.textPrimary }}
                    >
                      Write a Poem
                    </label>
                    <Textarea
                      id="poem"
                      name="poem"
                      placeholder="Express yourself poetically..."
                      value={formData.poem}
                      onChange={handleChange}
                      rows={4}
                    />
                  </div>

                  {/* Birthday Date */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="birthday" 
                      className="text-sm font-medium"
                      style={{ color: theme.colors.textPrimary }}
                    >
                      Birthday
                    </label>
                    <div className="relative">
                      <Input
                        id="birthday"
                        name="birthday"
                        type="date"
                        value={formData.birthday}
                        onChange={handleDateChange}
                        required
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                  </div>

                  {/* Submit Button with Tooltip */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          type="submit" 
                          style={{ 
                            backgroundColor: theme.colors.primary,
                            color: "white",
                          }}
                        >
                          Submit Form
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent style={{ backgroundColor: theme.colors.secondary, color: "white" }}>
                        <p>Upload data</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </form>
              </CardContent>
            </Card>

            {/* Tabs Component */}
            <div className="mt-8">
              <h2 
                className="text-lg font-semibold mb-4"
                style={{ color: theme.colors.textPrimary }}
              >
                Component Testing
              </h2>
              
              <Tabs defaultValue="tab-a" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="tab-a">Card Example</TabsTrigger>
                  <TabsTrigger value="tab-b">Scroll Area Example</TabsTrigger>
                </TabsList>
                
                {/* Tab A Content */}
                <TabsContent value="tab-a">
                  <Card>
                    <CardHeader>
                      <CardTitle style={{ color: theme.colors.primary }}>
                        <div className="flex items-center gap-2">
                          <Info size={24} />
                          <span>Lorem Ipsum Information</span>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        A demonstration of the Card component
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p style={{ color: theme.colors.textSecondary }}>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget
                        aliquam ultricies, nisl nisl aliquam nisl, eget aliquam nisl nisl eget nisl.
                        Nullam euismod, nisl eget aliquam ultricies, nisl nisl aliquam nisl, eget aliquam nisl nisl eget nisl.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" style={{ borderColor: theme.colors.border }}>
                        Learn More
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                {/* Tab B Content */}
                <TabsContent value="tab-b">
                  <Card>
                    <CardHeader>
                      <CardTitle style={{ color: theme.colors.primary }}>Names List</CardTitle>
                      <CardDescription>
                        A demonstration of the Scroll Area component
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md" style={{ borderColor: theme.colors.border }}>
                        <ScrollArea className="h-[200px] rounded-md">
                          <div className="p-4">
                            {names.map((name, index) => (
                              <div 
                                key={index}
                                className="py-3 border-b last:border-0"
                                style={{ borderColor: theme.colors.border }}
                              >
                                <p 
                                  className="font-medium"
                                  style={{ color: theme.colors.textPrimary }}
                                >
                                  {name}
                                </p>
                                <p 
                                  className="text-sm"
                                  style={{ color: theme.colors.textSecondary }}
                                >
                                  Person #{index + 1}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Progress Component */}
            <div className="mt-8">
              <h2 
                className="text-lg font-semibold mb-4"
                style={{ color: theme.colors.textPrimary }}
              >
                Progress Component
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>Task Completion</CardTitle>
                  <CardDescription>Example of the Progress component</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Task 1</span>
                      <span className="text-sm font-medium">75%</span>
                    </div>
                    <Progress value={75} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Task 2</span>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                    <Progress value={25} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Task 3</span>
                      <span className="text-sm font-medium">100%</span>
                    </div>
                    <Progress value={100} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 