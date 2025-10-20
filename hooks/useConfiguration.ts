// Configuration Hook - React hook for accessing and validating configuration

import { useEffect, useState, useCallback } from 'react';
import { configManager, type AppConfiguration } from '@/config';

interface ConfigurationState {
  config: AppConfiguration | null;
  isLoading: boolean;
  isValid: boolean;
  errors: string[];
  isInitialized: boolean;
}

interface UseConfigurationReturn extends ConfigurationState {
  reloadConfiguration: () => void;
  validateConfiguration: () => { isValid: boolean; errors: string[] };
}

export function useConfiguration(): UseConfigurationReturn {
  const [state, setState] = useState<ConfigurationState>({
    config: null,
    isLoading: true,
    isValid: false,
    errors: [],
    isInitialized: false
  });

  const loadConfiguration = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { config, isValid, errors } = configManager.validateAndGetConfiguration();
      
      setState({
        config,
        isLoading: false,
        isValid,
        errors,
        isInitialized: true
      });

      // Log configuration status in development
      if (config.development.enableDebugLogging) {
        console.log('Configuration loaded:', {
          isValid,
          errors: errors.length > 0 ? errors : 'None',
          environment: config.development.isDevelopment ? 'development' : 'production'
        });
      }

      // Report errors in development
      if (!isValid && config.development.enableErrorReporting) {
        console.error('Configuration validation failed:', errors);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
      
      setState({
        config: null,
        isLoading: false,
        isValid: false,
        errors: [errorMessage],
        isInitialized: false
      });

      console.error('Failed to load configuration:', error);
    }
  }, []);

  const reloadConfiguration = useCallback(() => {
    configManager.reloadConfiguration();
    loadConfiguration();
  }, [loadConfiguration]);

  const validateConfiguration = useCallback(() => {
    if (!state.config) {
      return { isValid: false, errors: ['Configuration not loaded'] };
    }
    
    return { isValid: state.isValid, errors: state.errors };
  }, [state.config, state.isValid, state.errors]);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  return {
    ...state,
    reloadConfiguration,
    validateConfiguration
  };
}

// Hook for specific configuration sections
export function useWebSocketConfig() {
  const { config } = useConfiguration();
  return config?.webSocket || null;
}

export function useAudioConfig() {
  const { config } = useConfiguration();
  return config?.audio || null;
}

export function useVisualEffectsConfig() {
  const { config } = useConfiguration();
  return config?.visualEffects || null;
}

export function useVoiceButtonConfig() {
  const { config } = useConfiguration();
  return config?.voiceButton || null;
}

export function useDevelopmentConfig() {
  const { config } = useConfiguration();
  return config?.development || null;
}

export function useBackendConfig() {
  const { config } = useConfiguration();
  return config?.backend || null;
}

export function useKeyboardShortcuts() {
  const { config } = useConfiguration();
  return config?.keyboardShortcuts || null;
}

// Hook for configuration validation status
export function useConfigurationStatus() {
  const { isValid, errors, isInitialized, isLoading } = useConfiguration();
  
  return {
    isValid,
    errors,
    isInitialized,
    isLoading,
    hasErrors: errors.length > 0,
    isReady: isInitialized && isValid
  };
}