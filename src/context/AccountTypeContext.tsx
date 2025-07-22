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
    if (user?.user_metadata?.account_type) {
      setAccountType(user.user_metadata.account_type as AccountType);
    }
  }, [user]);

  const value = {
    accountType,
    isOwner: accountType === "owner",
    isEPC: accountType === "epc",
    canEdit: accountType === "epc",
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