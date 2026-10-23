"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { PageLockOverlay } from "./PageLockOverlay";

export interface ActionLoaderOptions {
  title?: string;
  subtitle?: string;
  steps?: string[];
  currentStepIndex?: number;
}

export type UpdateLoaderFn = (partial: Partial<ActionLoaderOptions>) => void;

interface ActionLoaderContextType {
  isActive: boolean;
  options: ActionLoaderOptions;
  showLoader: (options?: ActionLoaderOptions) => void;
  updateLoader: UpdateLoaderFn;
  hideLoader: () => void;
  withLoader: <T>(
    action: (update: UpdateLoaderFn) => Promise<T>,
    options?: ActionLoaderOptions
  ) => Promise<T>;
}

const ActionLoaderContext = createContext<ActionLoaderContextType | null>(null);

export function ActionLoaderProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [options, setOptions] = useState<ActionLoaderOptions>({
    title: "Processing Action...",
    subtitle: "Please wait while this task is being performed.",
    currentStepIndex: 0,
  });

  const showLoader = useCallback((opts?: ActionLoaderOptions) => {
    setOptions({
      title: opts?.title ?? "Processing Action...",
      subtitle: opts?.subtitle ?? "Please wait while this task is being performed.",
      steps: opts?.steps,
      currentStepIndex: opts?.currentStepIndex ?? 0,
    });
    setIsActive(true);
  }, []);

  const updateLoader = useCallback((partial: Partial<ActionLoaderOptions>) => {
    setOptions((prev) => ({
      ...prev,
      ...partial,
    }));
  }, []);

  const hideLoader = useCallback(() => {
    setIsActive(false);
  }, []);

  const withLoader = useCallback(
    async <T,>(
      action: (update: UpdateLoaderFn) => Promise<T>,
      opts?: ActionLoaderOptions
    ): Promise<T> => {
      showLoader(opts);
      try {
        const result = await action(updateLoader);
        return result;
      } finally {
        hideLoader();
      }
    },
    [showLoader, updateLoader, hideLoader]
  );

  const contextValue = useMemo(
    () => ({
      isActive,
      options,
      showLoader,
      updateLoader,
      hideLoader,
      withLoader,
    }),
    [isActive, options, showLoader, updateLoader, hideLoader, withLoader]
  );

  return (
    <ActionLoaderContext.Provider value={contextValue}>
      {children}
      <PageLockOverlay
        isActive={isActive}
        title={options.title}
        subtitle={options.subtitle}
        steps={options.steps}
        currentStepIndex={options.currentStepIndex}
        onForceDismiss={hideLoader}
      />
    </ActionLoaderContext.Provider>
  );
}

export function useActionLoader() {
  const context = useContext(ActionLoaderContext);
  if (!context) {
    throw new Error("useActionLoader must be used within an ActionLoaderProvider");
  }
  return context;
}
