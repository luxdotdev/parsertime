"use client";

import type {
  GetAppSettingsResponse,
  UpdateAppSettingsRequest,
} from "@/app/api/user/app-settings/route";
import type { $Enums } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, use } from "react";

type AppSettingsContextType = {
  appSettings: GetAppSettingsResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  updateColorblindMode: (mode: $Enums.ColorblindMode) => Promise<void>;
  updateAppSettings: (data: UpdateAppSettingsRequest) => Promise<void>;
  refetch: () => Promise<void>;
};

const AppSettingsContext = createContext<AppSettingsContextType>({
  appSettings: undefined,
  isLoading: true,
  error: null,
  updateColorblindMode: async () => {
    // empty function
  },
  updateAppSettings: async () => {
    // empty function
  },
  refetch: async () => {
    // empty function
  },
});

// Query keys
const appSettingsKeys = {
  all: ["appSettings"] as const,
  settings: () => [...appSettingsKeys.all, "settings"] as const,
};

// API functions
async function fetchAppSettings(): Promise<GetAppSettingsResponse> {
  const response = await fetch("/api/user/app-settings");
  if (!response.ok) {
    throw new Error(`Failed to fetch app settings: ${response.statusText}`);
  }
  return response.json() as Promise<GetAppSettingsResponse>;
}

async function updateAppSettings(
  data: UpdateAppSettingsRequest
): Promise<GetAppSettingsResponse> {
  const response = await fetch("/api/user/app-settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update app settings: ${response.statusText}`);
  }

  return response.json() as Promise<GetAppSettingsResponse>;
}

export function useAppSettings() {
  const context = use(AppSettingsContext);
  if (!context) {
    throw new Error(
      "useAppSettings must be used within an AppSettingsProvider"
    );
  }
  return context;
}

export function AppSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  // Query for fetching app settings
  const {
    data: appSettings,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: appSettingsKeys.settings(),
    queryFn: fetchAppSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Mutation for updating colorblind mode
  const updateMutation = useMutation({
    mutationFn: updateAppSettings,
    onSuccess: (updatedSettings) => {
      // Update the cache with the new data
      queryClient.setQueryData(appSettingsKeys.settings(), updatedSettings);
    },
    onError: () => {
      // Error handling is done by React Query
      // Optionally show a toast notification here
    },
  });

  // Create stable mutation functions that don't depend on the mutation object
  const updateColorblindMode = React.useCallback(
    async (mode: $Enums.ColorblindMode): Promise<void> => {
      await updateMutation.mutateAsync({
        colorblindMode: mode,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateAppSettingsWrapper = React.useCallback(
    async (data: UpdateAppSettingsRequest): Promise<void> => {
      await updateMutation.mutateAsync(data);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const refetch = React.useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  const value = React.useMemo(
    () => ({
      appSettings,
      isLoading,
      error,
      updateColorblindMode,
      updateAppSettings: updateAppSettingsWrapper,
      refetch,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appSettings, isLoading, error, refetch]
  );

  return <AppSettingsContext value={value}>{children}</AppSettingsContext>;
}

// Additional hooks for direct React Query usage (optional)
export function useAppSettingsQuery() {
  return useQuery({
    queryKey: appSettingsKeys.settings(),
    queryFn: fetchAppSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAppSettings,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(appSettingsKeys.settings(), updatedSettings);
    },
  });
}
