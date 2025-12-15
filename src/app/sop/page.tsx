"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAccountType } from "@/context/AccountTypeContext";
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
  const { canEdit } = useAccountType();

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
                {canEdit ? (
                  <>
                    <p className="mb-2">
                      This guide will walk you through the complete workflow of managing your pile tracking project.
                      Follow these steps in order for the best experience.
                    </p>
                    <p className="font-medium">
                      Recommended workflow: Upload Pile Plot Plan → Upload Pile Data → Monitor & Analyze
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-3">
                      This guide will help you navigate and understand the pile tracking data for your project.
                      As an Owner's Representative, you have full viewing access to all <strong>published</strong> pile data and reports.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-900 dark:text-blue-100 font-medium mb-1">ℹ️ About Published Data</p>
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        Your EPC contractor reviews and validates pile installation data before publishing it to you. This ensures
                        data accuracy and quality. You'll only see data that has been verified and marked as "published" by your EPC team.
                      </p>
                    </div>
                    <p className="font-medium">
                      Key capabilities: View Published Data → Understand Pile Status → Generate Reports → Track Progress
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Table of Contents */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {canEdit && (
                    <>
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
                    </>
                  )}
                  <a href="#step3" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{canEdit ? '3' : '1'}</span>
                    </div>
                    <span className="text-sm font-medium">Understanding Pages</span>
                  </a>
                  <a href="#step4" className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{canEdit ? '4' : '2'}</span>
                    </div>
                    <span className="text-sm font-medium">{canEdit ? 'Advanced Features' : 'Viewing & Reporting'}</span>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Step 1: Upload Pile Plot Plan - Only for EPC users */}
            {canEdit && (
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
                          Your pile plot plan (also called pile lookup) is a reference document that shows all the piles planned for installation,
                          organized by pile type with design specifications. This establishes the baseline for tracking expected vs. actual
                          installations and enables automatic lookup of pile types and design embedments during data entry.
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-900 dark:text-white">Purpose:</strong> When you upload actual pile installation data later,
                          the system will automatically match pile IDs to retrieve their type and design embedment from this reference file.
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
                          <li>Navigate to <span className="font-medium text-slate-900 dark:text-white">Settings</span> page</li>
                          <li>Scroll to the <span className="font-medium text-slate-900 dark:text-white">Pile Plot Plan Upload</span> section</li>
                          <li>Click the <span className="font-medium text-slate-900 dark:text-white">Upload Pile Lookup</span> button</li>
                          <li>Drag and drop your file or click "Browse files" to select it (supports .CSV and .XLSX formats)</li>
                          <li>Click <span className="font-medium text-slate-900 dark:text-white">Next: Map Columns</span> to proceed</li>
                          <li>Review and adjust the automatic column mappings</li>
                          <li>Click <span className="font-medium text-slate-900 dark:text-white">Upload Data</span> to import</li>
                        </ol>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Table2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Intelligent Column Mapping</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          The system uses intelligent auto-detection to match your column headers to database fields. It recognizes
                          various naming conventions and will pre-select the most likely matches.
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mt-3 space-y-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="h-2 w-2 rounded-full bg-red-500"></div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">Required Field</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex gap-2 text-xs">
                                <div className="font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">Pile TAG/ID:</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  The unique pile identifier (e.g., "A1.005.03"). Recognized headers: "TAG", "Name", "Pile Name", "Pile ID", "Pile_ID"
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">Recommended Fields</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex gap-2 text-xs">
                                <div className="font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">Pile Type:</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Pile classification (e.g., "2A2B.INTARRAY"). Headers: "Type", "Pile Type", "Zone Type", "Zone", "Pile_Type"
                                </div>
                              </div>
                              <div className="flex gap-2 text-xs">
                                <div className="font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">Design Embedment:</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Target depth in feet. Headers: "Embedment", "Design Embedment", "Design_Embedment"
                                </div>
                              </div>
                              <div className="flex gap-2 text-xs">
                                <div className="font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">Block:</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Physical area/block designation. Headers: "Block", "Area"
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">Optional Fields</span>
                            </div>
                            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                              <div>• <strong>Northing/Easting:</strong> GPS coordinates for pile location</div>
                              <div>• <strong>Pile Size:</strong> Physical dimensions or size classification</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs text-blue-900 dark:text-blue-100 font-medium mb-1">💡 Pro Tip</p>
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            You can always manually adjust the mappings by clicking the dropdown menus. Select "-- None --" for any
                            field you don't want to import. The system will remember your choices for the current upload session.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Important Notes</h5>
                          <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                            <li>Upload your pile plot plan BEFORE uploading actual pile data for best results</li>
                            <li>Each upload replaces the previous lookup data - the system doesn't append or merge</li>
                            <li>Missing pile types in the lookup won't prevent data upload, but you'll need to enter them manually</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            )}

            {/* Step 2: Upload Pile Data - Only for EPC users */}
            {canEdit && (
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
                          <li>Click the <span className="font-medium text-slate-900 dark:text-white">CSV Upload</span> button in the top toolbar</li>
                          <li>Drag and drop your file or click "Browse files" (supports .CSV and .XLSX formats)</li>
                          <li>Click <span className="font-medium text-slate-900 dark:text-white">Next: Map Columns</span> to analyze the file</li>
                          <li>Review and adjust the intelligent column mappings (see details below)</li>
                          <li>Click <span className="font-medium text-slate-900 dark:text-white">Upload Data</span> to process</li>
                        </ol>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Settings className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Intelligent Column Mapping System</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          The system automatically analyzes your file headers and suggests the best column mappings. It recognizes
                          dozens of common naming patterns used in pile tracking systems.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mt-3 space-y-4">
                          {/* Required Fields Section */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full bg-red-500"></div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">Required Fields (Must Map)</span>
                            </div>
                            <div className="space-y-2.5 text-xs">
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Pile Number/ID</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Recognized headers: "Pile Number", "Pile_Number", "PileNumber", "Pile No", "Pile #", "Number", "TAG", "Name", "Pile ID", "Pile_ID"
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Machine</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Equipment identifier. Headers: "Machine", "Equipment", "Rig", "Machine ID", "Machine_ID"
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Start Date</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Installation date. Headers: "Start Date", "Start_Date", "StartDate", "Date", "Install Date"
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Start Time & Stop Time</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Installation period. Headers: "Start Time"/"Stop Time", "Start_Time"/"End_Time", "Begin Time"/"Finish Time"
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Duration</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Total drive time. Headers: "Duration", "Drive Time", "DriveTime", "Time"
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Start Z & End Z</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  Elevation measurements in feet. Headers: "Start Z"/"End Z", "Start_Z"/"End_Z", "Start Elevation"/"End Elevation", "Start Z(Feet)"/"End Z(Feet)"
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Auto-Calculated Fields Section */}
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">Auto-Calculated & Lookup Fields</span>
                            </div>
                            <div className="space-y-2.5 text-xs">
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Embedment (Can be provided OR calculated)</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  • <strong>Option 1:</strong> Map to a column in your file (e.g., "Embedment", "Actual Embedment", "Final Embedment")<br/>
                                  • <strong>Option 2:</strong> Leave unmapped - system calculates as: Start Z - End Z
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Design Embedment (Can be provided OR looked up)</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  • <strong>Option 1:</strong> Map to a column (e.g., "Design Embedment", "Target Embedment")<br/>
                                  • <strong>Option 2:</strong> Leave unmapped - system looks up from pile plot plan using Pile ID
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Pile Type (Can be provided OR looked up)</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  • <strong>Option 1:</strong> Map to a column (e.g., "Pile Type", "Type", "Zone Type")<br/>
                                  • <strong>Option 2:</strong> Leave unmapped - system looks up from pile plot plan using Pile ID<br/>
                                  • <em>Note: Lookup only works if you've uploaded pile plot plan first</em>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Gain Per 30 Seconds (Can be provided OR calculated)</div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  • <strong>Option 1:</strong> Map to a column (e.g., "Gain Per 30", "Gain/30")<br/>
                                  • <strong>Option 2:</strong> Leave unmapped - system calculates from embedment and duration
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Optional Fields Section */}
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">Optional Fields (Recommended)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white">Block</div>
                                <div className="text-slate-600 dark:text-slate-400 text-xs">Physical area/zone identifier</div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white">Pile Location</div>
                                <div className="text-slate-600 dark:text-slate-400 text-xs">Description of pile location</div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white">Pile Size</div>
                                <div className="text-slate-600 dark:text-slate-400 text-xs">Dimensions or classification</div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white">Pile Color</div>
                                <div className="text-slate-600 dark:text-slate-400 text-xs">Color coding for tracking</div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white">End Date</div>
                                <div className="text-slate-600 dark:text-slate-400 text-xs">Completion date if different</div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded p-2">
                                <div className="font-medium text-slate-900 dark:text-white">Notes</div>
                                <div className="text-slate-600 dark:text-slate-400 text-xs">Comments or observations</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs text-blue-900 dark:text-blue-100 font-medium mb-1">💡 Mapping Tips</p>
                          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                            <li>If auto-detection is wrong, click any dropdown to manually select the correct column</li>
                            <li>Select "-- None --" for fields you don't want to import</li>
                            <li>The system remembers your mappings for the current upload session</li>
                            <li>You can leave smart fields like Embedment and Pile Type unmapped - the system will handle them</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Settings className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Advanced: Pattern Extraction</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          When your data has pile IDs or blocks embedded within longer strings, use pattern extraction to automatically
                          extract just the portion you need. This powerful feature works with both character position and regex patterns.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mt-3 space-y-4">
                          {/* Character Position Extraction */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">Method 1: Character Position Extraction</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded p-3 space-y-2 text-xs">
                              <div className="font-medium text-slate-900 dark:text-white mb-2">How it works:</div>
                              <div className="text-slate-600 dark:text-slate-400">
                                Extract a substring by specifying start and end character positions (0-indexed).
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 rounded p-2 mt-2">
                                <div className="font-medium text-slate-900 dark:text-white mb-1">Example:</div>
                                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-[80px]">Full value:</span>
                                    <span className="font-mono bg-white dark:bg-slate-900 px-2 rounded">Project_A_A1.005.03_Section1</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-[80px]">Extract from:</span>
                                    <span>Position 10 to 20</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="font-semibold min-w-[80px]">Result:</span>
                                    <span className="font-mono bg-green-50 dark:bg-green-900/20 px-2 rounded text-green-700 dark:text-green-300">A1.005.03</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-slate-600 dark:text-slate-400 mt-2">
                                <strong>Use when:</strong> Your pile IDs or blocks are always in the same position within the string
                              </div>
                            </div>
                          </div>

                          {/* Regex Pattern Extraction */}
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">Method 2: Regex Pattern Matching</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded p-3 space-y-2 text-xs">
                              <div className="font-medium text-slate-900 dark:text-white mb-2">How it works:</div>
                              <div className="text-slate-600 dark:text-slate-400">
                                Use a regular expression to match and extract complex patterns. The first capturing group (text in parentheses) is used.
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 rounded p-2 mt-2 space-y-2">
                                <div>
                                  <div className="font-medium text-slate-900 dark:text-white mb-1">Example 1: Extract pile ID</div>
                                  <div className="space-y-1 text-slate-700 dark:text-slate-300">
                                    <div className="flex gap-2">
                                      <span className="font-semibold min-w-[80px]">Full value:</span>
                                      <span className="font-mono bg-white dark:bg-slate-900 px-2 rounded">Pile_A1.005.03_Data</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-semibold min-w-[80px]">Regex:</span>
                                      <span className="font-mono bg-white dark:bg-slate-900 px-2 rounded">^Pile_([A-Z]+\d+\.\d+\.\d+)</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-semibold min-w-[80px]">Result:</span>
                                      <span className="font-mono bg-green-50 dark:bg-green-900/20 px-2 rounded text-green-700 dark:text-green-300">A1.005.03</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="pt-2 border-t border-slate-300 dark:border-slate-600">
                                  <div className="font-medium text-slate-900 dark:text-white mb-1">Example 2: Extract block letter</div>
                                  <div className="space-y-1 text-slate-700 dark:text-slate-300">
                                    <div className="flex gap-2">
                                      <span className="font-semibold min-w-[80px]">Full value:</span>
                                      <span className="font-mono bg-white dark:bg-slate-900 px-2 rounded">Block_A_Section_1</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-semibold min-w-[80px]">Regex:</span>
                                      <span className="font-mono bg-white dark:bg-slate-900 px-2 rounded">^Block_([A-Z]+)</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-semibold min-w-[80px]">Result:</span>
                                      <span className="font-mono bg-green-50 dark:bg-green-900/20 px-2 rounded text-green-700 dark:text-green-300">A</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-slate-600 dark:text-slate-400 mt-2">
                                <strong>Use when:</strong> Your data has variable-length strings or complex patterns that need intelligent matching
                              </div>
                            </div>
                          </div>

                          {/* How to Access */}
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3">
                              <div className="font-medium text-amber-900 dark:text-amber-100 text-xs mb-1">🔧 How to Use Pattern Extraction</div>
                              <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                                <div>1. After mapping your Pile Number or Block column, an "Extract pattern from text" option appears below</div>
                                <div>2. Check the checkbox to enable pattern extraction</div>
                                <div>3. You'll see a sample value from your data</div>
                                <div>4. Choose either character position method OR regex method</div>
                                <div>5. The system shows you a live preview of the extracted result</div>
                                <div>6. Pattern extraction applies to ALL rows during import</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                          <p className="text-xs text-purple-900 dark:text-purple-100 font-medium mb-1">💡 Pattern Extraction Tips</p>
                          <ul className="text-xs text-purple-800 dark:text-purple-200 space-y-1 list-disc list-inside">
                            <li>Start with character position method - it's simpler and works for most cases</li>
                            <li>Use regex when your pile IDs vary in length or have complex formatting</li>
                            <li>Remember: Character positions are 0-indexed (first character = 0)</li>
                            <li>Test your pattern on the sample value before uploading to ensure correct extraction</li>
                            <li>Pattern extraction is available for both Pile ID and Block fields</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-green-900 dark:text-green-100 mb-1">Row-by-Row Validation & Error Handling</h5>
                          <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                            The system validates each row individually during upload. This means:
                          </p>
                          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 list-disc list-inside ml-2">
                            <li><strong>Valid rows are imported</strong> - Even if some rows have errors, good data still gets through</li>
                            <li><strong>Invalid rows are skipped</strong> - Rows with missing required fields or bad data are automatically skipped</li>
                            <li><strong>Detailed report provided</strong> - You'll see exactly how many rows succeeded vs. skipped</li>
                            <li><strong>No partial imports</strong> - Each row is either fully imported or fully skipped (no partial data)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-800/20 border border-slate-300 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-slate-900 dark:text-slate-200 mb-1">Important Upload Behaviors</h5>
                          <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                            <li><strong>Duplicate piles are allowed</strong> - You can upload the same pile ID multiple times (useful for re-drives or updates)</li>
                            <li><strong>All operations are logged</strong> - Every change is tracked in the pile activity history</li>
                            <li><strong>Data is appended, not replaced</strong> - New uploads add to existing data (they don't delete old records)</li>
                            <li><strong>Unpublished by default</strong> - New pile data starts as unpublished. Use the "Publish Data" button to make it visible to Owner's Rep accounts</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            )}

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
                        <p><strong className="text-slate-900 dark:text-white">Purpose:</strong> Get a high-level overview of your entire project at a glance{!canEdit ? ' (shows all published pile data)' : ''}.</p>
                        <p><strong className="text-slate-900 dark:text-white">What you'll see:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Total piles count broken down by status (Accepted, Refusal, Tolerance, N/A)</li>
                          <li>Project completion percentage based on expected vs. installed piles</li>
                          <li>Pie chart showing pile status distribution for quick visual reference</li>
                          <li>Installation timeline with weekly/monthly views to track progress over time</li>
                          <li>Block performance bar chart comparing acceptance rates across blocks</li>
                          <li>Quick action buttons to navigate to detailed sections</li>
                        </ul>
                        {!canEdit && (
                          <div className="mt-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-900 dark:text-white mb-1">📊 Understanding Dashboard Metrics</p>
                            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                              <div className="flex gap-2">
                                <span className="font-semibold min-w-[110px]">Completion %:</span>
                                <span>Shows installed piles divided by total expected piles (from pile plot plan)</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-semibold min-w-[110px]">Status Counts:</span>
                                <span>Breakdown of how many piles are Accepted, in Tolerance, Refusal, or N/A (pending)</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-semibold min-w-[110px]">Timeline Chart:</span>
                                <span>Shows when piles were installed over time - useful for tracking project pace</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-semibold min-w-[110px]">Block Chart:</span>
                                <span>Compares blocks side-by-side to identify which areas need attention</span>
                              </div>
                            </div>
                          </div>
                        )}
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
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {canEdit ? 'Complete list and management of all piles' : 'View all pile records and data'}
                          </p>
                        </div>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p><strong className="text-slate-900 dark:text-white">Purpose:</strong> {canEdit ? 'View, search, filter, and manage all pile records.' : 'View, search, and filter all published pile records.'}</p>
                        <p><strong className="text-slate-900 dark:text-white">Key features:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Searchable table with all {canEdit ? '' : 'published '}pile data</li>
                          <li>Filter by status (Accepted, Refusal, Tolerance, N/A)</li>
                          {canEdit && (
                            <>
                              <li>Add individual piles manually</li>
                              <li>Bulk import via CSV upload</li>
                              <li>Upload pile plot plan (pile lookup)</li>
                              <li>Edit or delete individual piles</li>
                            </>
                          )}
                          <li>Export data to Excel or PDF</li>
                          <li>Color-coded status indicators (Green = Accepted, Purple = Refusal, Amber = N/A)</li>
                          {!canEdit && (
                            <li>Search by pile number, location, block, or pile type</li>
                          )}
                        </ul>
                        {!canEdit && (
                          <div className="mt-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-900 dark:text-white mb-1">💡 Searching & Filtering Tips</p>
                            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                              <li>• Use the search bar to find specific piles by ID or name</li>
                              <li>• Click status filter buttons to show only Accepted, Refusal, Tolerance, or N/A piles</li>
                              <li>• Combine search and filters to narrow down results</li>
                              <li>• Sort columns by clicking the column headers</li>
                            </ul>
                          </div>
                        )}
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

            {/* Step 4: Advanced Features / Viewing & Reporting */}
            <div id="step4" className="mb-6 scroll-mt-4">
              <Card>
                <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">{canEdit ? '4' : '2'}</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{canEdit ? 'Advanced Features & Tips' : 'Viewing & Reporting'}</CardTitle>
                      <CardDescription className="mt-1">
                        {canEdit ? 'Power user features to maximize your productivity' : 'Understanding pile status and generating reports'}
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
                      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                        <p>Generate reports and export data in multiple formats{!canEdit ? ' for all published pile data' : ''}:</p>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-green-600" />
                                <strong className="text-slate-900 dark:text-white text-sm">Excel Export (.XLSX)</strong>
                              </div>
                              <ul className="text-xs text-slate-700 dark:text-slate-300 ml-6 space-y-0.5">
                                <li>• Includes all columns and data fields</li>
                                <li>• Perfect for detailed analysis in Excel or Google Sheets</li>
                                <li>• Preserves all numeric values for calculations</li>
                                <li>• Available from My Piles, Blocks, and Pile Types pages</li>
                              </ul>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-red-600" />
                                <strong className="text-slate-900 dark:text-white text-sm">PDF Export (.PDF)</strong>
                              </div>
                              <ul className="text-xs text-slate-700 dark:text-slate-300 ml-6 space-y-0.5">
                                <li>• Professional formatted reports ready to share</li>
                                <li>• Includes project header and summary statistics</li>
                                <li>• Optimized for printing and email distribution</li>
                                <li>• Great for stakeholder presentations and documentation</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs text-blue-900 dark:text-blue-100 font-medium mb-1">💡 Export Tips</p>
                          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• Exports respect your current filters - apply filters first, then export to get specific data</li>
                            <li>• Use search to find piles, then export to create targeted reports</li>
                            <li>• Export from Blocks/Pile Types pages for pre-grouped data</li>
                            {!canEdit && <li>• All exports only include published data visible to you</li>}
                          </ul>
                        </div>

                        {!canEdit && (
                          <div className="bg-slate-100 dark:bg-slate-800/20 border border-slate-300 dark:border-slate-700 rounded-lg p-3">
                            <p className="text-xs font-medium text-slate-900 dark:text-white mb-2">Common Reporting Workflows:</p>
                            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                              <div className="flex gap-2">
                                <span className="font-semibold min-w-[100px]">Weekly Status:</span>
                                <span>Dashboard → Export PDF with current project status and completion %</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-semibold min-w-[100px]">Refusal Report:</span>
                                <span>My Piles → Filter "Refusal" → Export Excel for detailed analysis</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-semibold min-w-[100px]">Block Progress:</span>
                                <span>Blocks → Export Excel for block-by-block breakdown</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-semibold min-w-[100px]">Type Analysis:</span>
                                <span>Pile Types → Export to compare expected vs. installed by type</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Field Entry - Only for EPC users */}
                    {canEdit && (
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
                    )}

                    {/* Settings - Only for EPC users */}
                    {canEdit && (
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
                    )}

                    {/* Data Management - Only for EPC users */}
                    {canEdit && (
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
                    )}
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
                  {canEdit ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">1</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Understand pile status classifications</strong> - Learn what Accepted, Refusal, Tolerance, and N/A mean for project progress
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">2</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Use filters effectively</strong> to focus on specific pile statuses or categories that need attention
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">3</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Export reports regularly</strong> in Excel or PDF format for your records and analysis
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">4</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Review the Dashboard</strong> for a comprehensive overview of project progress and key metrics
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">5</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Check Blocks and Pile Types</strong> pages to identify which areas may need attention
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">6</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Use the search function</strong> to quickly find specific piles by name or location
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
