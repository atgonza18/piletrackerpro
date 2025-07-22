"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

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
  canEdit: true,
  currentProjectId: null,
  currentProjectName: null,
});

export function AccountTypeProvider({ children }: { children: React.ReactNode }) {
  const { user, userProject } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("epc");

  useEffect(() => {
    // Debug logging to understand what's happening
    console.log("AccountTypeProvider: user:", user);
    console.log("AccountTypeProvider: user metadata:", user?.user_metadata);
    console.log("AccountTypeProvider: account_type from metadata:", user?.user_metadata?.account_type);
    
    if (user?.user_metadata?.account_type) {
      console.log("AccountTypeProvider: Setting account type to:", user.user_metadata.account_type);
      setAccountType(user.user_metadata.account_type as AccountType);
    } else {
      console.log("AccountTypeProvider: No account_type in metadata, defaulting to 'epc'");
      // If no account type in metadata, check if we can determine from userProject
      if (userProject) {
        console.log("AccountTypeProvider: userProject data:", userProject);
        // For now, if user has project but no account type, assume EPC
        setAccountType("epc");
      }
    }
  }, [user, userProject]);

  const canEdit = accountType === "epc";
  
  console.log("AccountTypeProvider: Final state - accountType:", accountType, "canEdit:", canEdit);

  const value = {
    accountType,
    isOwner: accountType === "owner",
    isEPC: accountType === "epc",
    canEdit: canEdit,
    currentProjectId: userProject?.id || null,
    currentProjectName: userProject?.project_name || null,
  };

  return (
    <AccountTypeContext.Provider value={value}>
      {children}
    </AccountTypeContext.Provider>
  );
}

export const useAccountType = () => {
  const context = useContext(AccountTypeContext);
  if (context === undefined) {
    throw new Error("useAccountType must be used within an AccountTypeProvider");
  }
  return context;
}; 