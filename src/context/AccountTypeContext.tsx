"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";

type AccountType = "epc" | "owner";

interface AccountTypeContextType {
  accountType: AccountType;
  isOwner: boolean;
  isEPC: boolean;
  canEdit: boolean;
  currentProjectId: string | null;
  currentProjectName: string | null;
}

const AccountTypeContext = createContext<AccountTypeContextType>({
  accountType: "epc",
  isOwner: false,
  isEPC: true,
  canEdit: true, // Default - should be overridden by provider
  currentProjectId: null,
  currentProjectName: null,
});

console.log("🟡 AccountTypeContext: Default context created with canEdit: true");

export function AccountTypeProvider({ children }: { children: React.ReactNode }) {
  const { user, userProject } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("epc");

  useEffect(() => {
    const determineAccountType = async () => {
      if (!user) {
        console.log("AccountTypeProvider: No user, defaulting to EPC");
        setAccountType("epc");
        return;
      }

      // Debug logging to understand what's happening
      console.log("AccountTypeProvider: user:", user);
      console.log("AccountTypeProvider: user metadata:", user?.user_metadata);
      console.log("AccountTypeProvider: account_type from metadata:", user?.user_metadata?.account_type);
      
      // First try to get account type from user metadata - this is the primary source
      if (user?.user_metadata?.account_type) {
        console.log("AccountTypeProvider: Setting account type from metadata:", user.user_metadata.account_type);
        const newAccountType = user.user_metadata.account_type as AccountType;
        console.log("AccountTypeProvider: About to set accountType to:", newAccountType);
        setAccountType(newAccountType);
        console.log("AccountTypeProvider: setAccountType called with:", newAccountType);
        return;
      }

      // Fallback: Check user_projects table for role ONLY if no metadata
      console.log("AccountTypeProvider: No account_type in metadata, checking database...");
      try {
        const { data: userProjectData, error } = await supabase
          .from('user_projects')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error("AccountTypeProvider: Error fetching user project:", error);
          setAccountType("epc"); // Default to EPC on error
          return;
        }

        console.log("AccountTypeProvider: User project data:", userProjectData);
        
        if (userProjectData?.role === 'owner_rep') {
          console.log("AccountTypeProvider: Setting account type to 'owner' based on database role");
          setAccountType("owner");
        } else {
          console.log("AccountTypeProvider: Setting account type to 'epc' based on database role or default");
          setAccountType("epc");
        }
      } catch (error) {
        console.error("AccountTypeProvider: Error determining account type:", error);
        setAccountType("epc"); // Default to EPC on error
      }
    };

    determineAccountType();
  }, [user]); // Removed userProject dependency to prevent re-running

  // Debug: Track accountType changes
  useEffect(() => {
    console.log("🔄 AccountTypeProvider: accountType changed to:", accountType);
    console.log("🔄 AccountTypeProvider: canEdit will be:", accountType === "epc");
  }, [accountType]);

  const canEdit = accountType === "epc";
  
  console.log("🚨 AccountTypeProvider: FINAL VALUES:");
  console.log("🚨 accountType:", accountType);
  console.log("🚨 canEdit:", canEdit);
  console.log("🚨 user metadata account_type:", user?.user_metadata?.account_type);
  console.log("🚨 accountType === 'epc':", accountType === "epc");
  console.log("🚨 accountType === 'owner':", accountType === "owner");

  const value = {
    accountType,
    isOwner: accountType === "owner",
    isEPC: accountType === "epc",
    canEdit: canEdit,
    currentProjectId: userProject?.id || null,
    currentProjectName: userProject?.project_name || null,
  };
  
  console.log("🚨 Final context value:", value);

  return (
    <AccountTypeContext.Provider value={value}>
      {children}
    </AccountTypeContext.Provider>
  );
}

export const useAccountType = () => {
  const context = useContext(AccountTypeContext);
  console.log("🔵 useAccountType: Retrieved context:", context);
  if (context === undefined) {
    throw new Error("useAccountType must be used within an AccountTypeProvider");
  }
  return context;
}; 