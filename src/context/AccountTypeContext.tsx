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
  canEdit: true,
  currentProjectId: null,
  currentProjectName: null,
});

export function AccountTypeProvider({ children }: { children: React.ReactNode }) {
  const { user, userProject } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("epc");

  useEffect(() => {
    const determineAccountType = async () => {
      if (!user) {
        setAccountType("epc");
        return;
      }

      // First try to get account type from user metadata
      if (user?.user_metadata?.account_type) {
        setAccountType(user.user_metadata.account_type as AccountType);
        return;
      }

      // Fallback: Check user_projects table for role if no metadata
      try {
        const { data: userProjectData, error } = await supabase
          .from('user_projects')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          setAccountType("epc");
          return;
        }

        if (userProjectData?.role === 'owner_rep') {
          setAccountType("owner");
        } else {
          setAccountType("epc");
        }
      } catch (error) {
        setAccountType("epc");
      }
    };

    determineAccountType();
  }, [user]);

  const canEdit = accountType === "epc";

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