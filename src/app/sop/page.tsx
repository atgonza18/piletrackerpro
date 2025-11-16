"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Upload,
  Table2,
  FileSpreadsheet,
  Settings,
  List,
  BarChart3,
  MapPin,
  Box,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight,
  FileText,
  Download
} from "lucide-react";

export default function SOPPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden w-full">
      <CollapsibleSidebar projectName="PileTrackerPro" currentPage="sop" />

      <div
        className="h-full w-full transition-all duration-300 ease-in-out max-lg:!pl-0"
        style={{ paddingLeft: 'var(--sidebar-width, 0px)' }}
      >
        <main className="p-3 h-full max-h-screen overflow-y-auto w-full">
          <div className="max-w-5xl mx-auto w-full pb-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Standard Operating Procedure
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Complete guide to using PileTrackerPro effectively
                  </p>
                </div>
              </div>
            </div>

            {/* Introduction */}
            <Card className="mb-6 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-200">
                  <Info className="h-5 w-5" />
                  Welcome to PileTrackerPro
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 dark:text-slate-300">
                <p className="mb-2">
                  This guide will walk you through the complete workflow of managing your pile tracking project.
                  Follow these steps in order for the best experience.
                </p>
                <p className="font-medium">
                  Recommended workflow: Upload Pile Plot Plan → Upload Pile Data → Monitor & Analyze
                </p>
              </CardContent>
            </Card>

            {/* Table of Contents */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <a href="#step1" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">1</span>
                    </div>
                    <span className="text-sm font-medium">Upload Pile Plot Plan</span>
                  </a>
                  <a href="#step2" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">2</span>
                    </div>
                    <span className="text-sm font-medium">Upload Pile Data</span>
                  </a>
                  <a href="#step3" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">3</span>
                    </div>
                    <span className="text-sm font-medium">Understanding Pages</span>
                  </a>
                  <a href="#step4" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">4</span>
                    </div>
                    <span className="text-sm font-medium">Advanced Features</span>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Step 1: Upload Pile Plot Plan */}
            <div id="step1" className="mb-6 scroll-mt-4">
              <Card>
                <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800/50 dark:to-slate-700/50">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">1</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">Upload Pile Plot Plan (Pile Lookup)</CardTitle>
                      <CardDescription className="mt-1">
                        Start by uploading your pile plot plan to establish the expected pile types and quantities
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">What is Pile Plot Plan?</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          Your pile plot plan (also called pile lookup) is a document that shows all the piles planned for installation,
                          organized by pile type. This helps you track expected vs. actual installations.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ArrowRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">How to Upload</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 ml-2">
                          <li>Navigate to <span className="font-medium text-slate-900 dark:text-white">My Piles</span> page</li>
                          <li>Click the <span className="font-medium text-slate-900 dark:text-white">Upload Pile Lookup</span> button</li>
                          <li>Select your CSV file containing pile plot plan data</li>
                          <li>The file should have a column for <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">pile_type</span> (or similar name)</li>
                        </ol>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Table2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Column Mapping</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          The system will automatically detect your column names and suggest mappings. You can:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400 ml-2">
                          <li>Review the automatic suggestions</li>
                          <li>Manually map columns if the auto-detection isn't accurate</li>
                          <li>The most important column is <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">pile_type</span></li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Important Note</h5>
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            Upload your pile plot plan BEFORE uploading actual pile data. This establishes a baseline
                            for tracking progress and comparing expected vs. installed piles by type.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Step 2: Upload Pile Data */}
            <div id="step2" className="mb-6 scroll-mt-4">
              <Card>
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">2</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">Upload Pile Installation Data</CardTitle>
                      <CardDescription className="mt-1">
                        Import your actual pile installation records with embedment, refusal, and other critical data
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Starting the Upload</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 ml-2">
                          <li>Navigate to <span className="font-medium text-slate-900 dark:text-white">My Piles</span> page</li>
                          <li>Click the <span className="font-medium text-slate-900 dark:text-white">CSV Upload</span> button</li>
                          <li>Select your CSV file containing pile installation data</li>
                          <li>The intelligent column mapper will analyze your file</li>
                        </ol>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Settings className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Column Mapping Process</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          The system uses intelligent auto-detection to map your CSV columns to the database fields:
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="font-medium text-slate-700 dark:text-slate-300">Your Column</div>
                            <div className="font-medium text-slate-700 dark:text-slate-300">Maps To</div>
                            <div className="text-slate-600 dark:text-slate-400">Pile Name, Pile ID, Name</div>
                            <div className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">→ pile_name</div>
                            <div className="text-slate-600 dark:text-slate-400">Embedment, Final Emb.</div>
                            <div className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">→ embedment</div>
                            <div className="text-slate-600 dark:text-slate-400">Design Embedment, Design</div>
                            <div className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">→ design_embedment</div>
                            <div className="text-slate-600 dark:text-slate-400">Block, Zone, Area</div>
                            <div className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">→ block</div>
                            <div className="text-slate-600 dark:text-slate-400">Type, Pile Type</div>
                            <div className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">→ pile_type</div>
                            <div className="text-slate-600 dark:text-slate-400">Location, Pile Location</div>
                            <div className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">→ pile_location</div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                          You can manually adjust any mapping if the auto-detection needs correction. Simply click on a dropdown
                          to change the mapping for any column.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Key Fields to Include</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                            <div className="font-medium text-sm text-slate-900 dark:text-white mb-1">Essential Fields</div>
                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                              <li>• Pile Name (required)</li>
                              <li>• Embedment</li>
                              <li>• Design Embedment</li>
                              <li>• Block</li>
                              <li>• Pile Type</li>
                            </ul>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                            <div className="font-medium text-sm text-slate-900 dark:text-white mb-1">Optional Fields</div>
                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                              <li>• Start Date/Time</li>
                              <li>• End Date/Time</li>
                              <li>• Slow Drive Time</li>
                              <li>• Inspector Name</li>
                              <li>• Notes</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-green-900 dark:text-green-100 mb-1">Smart Error Handling</h5>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            The system validates each row individually. If some rows have errors, they'll be skipped
                            while valid rows are imported. You'll receive a detailed report showing exactly which rows
                            succeeded and which need attention.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-800/20 border border-slate-300 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-slate-900 dark:text-slate-200 mb-1">Duplicate Piles Allowed</h5>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            The system allows duplicate pile names by design. This is useful for tracking piles that may be
                            re-driven or have multiple entries. All pile operations are tracked in the activity history.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Step 3: Understanding the App */}
            <div id="step3" className="mb-6 scroll-mt-4">
              <Card>
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">3</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">Understanding Each Page</CardTitle>
                      <CardDescription className="mt-1">
                        Learn what each section of the app does and how to use it effectively
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Dashboard */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <BarChart3 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">Dashboard</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Your project overview and analytics hub</p>
                        </div>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p><strong className="text-slate-900 dark:text-white">Purpose:</strong> Get a high-level overview of your entire project at a glance.</p>
                        <p><strong className="text-slate-900 dark:text-white">What you'll see:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Total piles (Accepted, Refusal, N/A)</li>
                          <li>Project completion percentage</li>
                          <li>Pie chart showing pile status distribution</li>
                          <li>Installation timeline (weekly/monthly views)</li>
                          <li>Block performance bar chart</li>
                          <li>Quick action buttons to navigate to other sections</li>
                        </ul>
                      </div>
                    </div>

                    {/* My Piles */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                          <List className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">My Piles</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Complete list and management of all piles</p>
                        </div>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p><strong className="text-slate-900 dark:text-white">Purpose:</strong> View, search, filter, and manage all pile records.</p>
                        <p><strong className="text-slate-900 dark:text-white">Key features:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Searchable table with all pile data</li>
                          <li>Filter by status (Accepted, Refusal, Tolerance, N/A)</li>
                          <li>Add individual piles manually</li>
                          <li>Bulk import via CSV upload</li>
                          <li>Upload pile plot plan (pile lookup)</li>
                          <li>Edit or delete individual piles</li>
                          <li>Export data to Excel or PDF</li>
                          <li>Color-coded status indicators (Green = Accepted, Purple = Refusal, Amber = N/A)</li>
                        </ul>
                      </div>
                    </div>

                    {/* Pile Types */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">Pile Types</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Analysis grouped by pile type</p>
                        </div>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p><strong className="text-slate-900 dark:text-white">Purpose:</strong> Track progress and performance by pile type category.</p>
                        <p><strong className="text-slate-900 dark:text-white">What you'll see:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Circular progress indicators for each pile type</li>
                          <li>Expected vs. installed pile counts (from pile plot plan)</li>
                          <li>Status breakdown per type (Accepted, Refusal, Tolerance, N/A)</li>
                          <li>Slow drive time statistics</li>
                          <li>Click any type to see detailed pile list</li>
                          <li>Export capabilities</li>
                        </ul>
                      </div>
                    </div>

                    {/* Blocks */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-pink-100 dark:bg-pink-900 flex items-center justify-center flex-shrink-0">
                          <Box className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">Blocks</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Analysis grouped by block/area</p>
                        </div>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p><strong className="text-slate-900 dark:text-white">Purpose:</strong> Monitor performance by physical blocks or areas.</p>
                        <p><strong className="text-slate-900 dark:text-white">What you'll see:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Circular progress indicators for each block</li>
                          <li>Total pile count per block</li>
                          <li>Status breakdown (Accepted, Refusal, Tolerance, N/A)</li>
                          <li>Refusal and slow drive percentages</li>
                          <li>Click any block to see detailed pile list</li>
                          <li>Alphabetically sorted for easy navigation</li>
                        </ul>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">Notes</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Project documentation and notes</p>
                        </div>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p><strong className="text-slate-900 dark:text-white">Purpose:</strong> Document important information, observations, and project details.</p>
                        <p><strong className="text-slate-900 dark:text-white">Use cases:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Log daily observations</li>
                          <li>Record site conditions</li>
                          <li>Document issues or changes</li>
                          <li>Track communication with stakeholders</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Step 4: Advanced Features */}
            <div id="step4" className="mb-6 scroll-mt-4">
              <Card>
                <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">4</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">Advanced Features & Tips</CardTitle>
                      <CardDescription className="mt-1">
                        Power user features to maximize your productivity
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Status Classification */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Understanding Pile Status
                      </h4>
                      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                        <p>The system automatically classifies piles based on embedment tolerance (configurable in Settings):</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <div className="font-semibold text-green-900 dark:text-green-100 mb-1">✓ Accepted</div>
                            <div className="text-xs text-green-800 dark:text-green-200">
                              Embedment ≥ Design Embedment
                            </div>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-800/20 border border-slate-300 dark:border-slate-700 rounded-lg p-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-200 mb-1">≈ Tolerance</div>
                            <div className="text-xs text-slate-700 dark:text-slate-300">
                              (Design - Tolerance) ≤ Embedment &lt; Design
                            </div>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                            <div className="font-semibold text-purple-900 dark:text-purple-100 mb-1">✗ Refusal</div>
                            <div className="text-xs text-purple-800 dark:text-purple-200">
                              Embedment &lt; (Design - Tolerance)
                            </div>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">○ N/A (Pending)</div>
                            <div className="text-xs text-amber-800 dark:text-amber-200">
                              Missing embedment or design data
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Export Options */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Download className="h-5 w-5 text-slate-600" />
                        Export & Reporting
                      </h4>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p>Generate reports and export data in multiple formats:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li><strong className="text-slate-900 dark:text-white">Excel Export:</strong> Full data export with all fields for analysis</li>
                          <li><strong className="text-slate-900 dark:text-white">PDF Export:</strong> Professional formatted reports for sharing</li>
                          <li><strong className="text-slate-900 dark:text-white">Filtered Exports:</strong> Export only what you see (respects current filters)</li>
                        </ul>
                      </div>
                    </div>

                    {/* Field Entry */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                        Mobile Field Entry
                      </h4>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p>For field inspectors to enter data directly from mobile devices:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Generate QR code from Settings page for easy mobile access</li>
                          <li>Mobile-optimized form for quick data entry</li>
                          <li>All essential fields available</li>
                          <li>Auto-populates with sensible defaults</li>
                          <li>Real-time form validation</li>
                        </ul>
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-slate-600" />
                        Project Settings
                      </h4>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p>Configure project-specific settings (Admin/Owner only):</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li><strong className="text-slate-900 dark:text-white">Embedment Tolerance:</strong> Set the tolerance value (default: 1 ft)</li>
                          <li><strong className="text-slate-900 dark:text-white">Team Management:</strong> Invite users with specific roles</li>
                          <li><strong className="text-slate-900 dark:text-white">Project Details:</strong> Update project information</li>
                          <li><strong className="text-slate-900 dark:text-white">QR Code:</strong> Generate field entry QR code</li>
                        </ul>
                      </div>
                    </div>

                    {/* Data Management */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Table2 className="h-5 w-5 text-purple-600" />
                        Data Management Tips
                      </h4>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <ul className="list-disc list-inside space-y-1">
                          <li><strong className="text-slate-900 dark:text-white">Bulk Operations:</strong> Use CSV upload for large datasets</li>
                          <li><strong className="text-slate-900 dark:text-white">Manual Entry:</strong> Add individual piles when needed</li>
                          <li><strong className="text-slate-900 dark:text-white">Data Cleanup:</strong> Delete duplicate piles from My Piles page</li>
                          <li><strong className="text-slate-900 dark:text-white">Activity History:</strong> All changes are tracked automatically</li>
                          <li><strong className="text-slate-900 dark:text-white">Real-time Sync:</strong> Data updates across all team members instantly</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Best Practices */}
            <Card className="border-2 border-slate-300 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800/50 dark:to-slate-700/50">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-200">
                  <CheckCircle className="h-6 w-6" />
                  Best Practices for Success
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">1</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Upload pile plot plan first</strong> to establish baseline expectations before importing actual pile data
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">2</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Review column mappings carefully</strong> during CSV upload to ensure data accuracy
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">3</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Set embedment tolerance</strong> in Settings to match your project requirements
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">4</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Use consistent naming</strong> for blocks and pile types across your dataset
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">5</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Regular exports</strong> create backups of your data for peace of mind
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">6</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Check Dashboard regularly</strong> to monitor project progress and identify issues early
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
