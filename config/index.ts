// Configuration Manager - Central configuration access point

import {
  getWebSocketConfig,
  getAudioConfig,
  getNormalVisualParams,
  getVoiceActiveVisualParams,
  getProcessingVisualParams,
  getVoiceButtonConfig,
  getAudioProcessingConfig,
  getDevelopmentConfig,
  getBackendConfig,
  getKeyboardShortcuts,
  validateConfiguration,
  ERROR_MESSAGES
} from './voice';

export interface AppConfiguration {
  webSocket: ReturnType<typeof getWebSocketConfig>;
  audio: ReturnType<typeof getAudioConfig>;
  visualEffects: {
    normal: ReturnType<typeof getNormalVisualParams>;
    voiceActive: ReturnType<typeof getVoiceActiveVisualParams>;
    processing: ReturnType<typeof getProcessingVisualParams>;
  };
  voiceButton: ReturnType<typeof getVoiceButtonConfig>;
  audioProcessing: ReturnType<typeof getAudioProcessingConfig>;
  keyboardShortcuts: ReturnType<typeof getKeyboardShortcuts>;
  development: ReturnType<typeof getDevelopmentConfig>;
  backend: ReturnType<typeof getBackendConfig>;
}

class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: AppConfiguration | null = null;
  private isValidated = false;

  private constructor() {}

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  getConfiguration(): AppConfiguration {
    if (!this.config) {
      this.config = this.loadConfiguration();
    }
    return this.config;
  }

  private loadConfiguration(): AppConfiguration {
    const config: AppConfiguration = {
      webSocket: getWebSocketConfig(),
      audio: getAudioConfig(),
      visualEffects: {
        normal: getNormalVisualParams(),
        voiceActive: getVoiceActiveVisualParams(),
        processing: getProcessingVisualParams()
      },
      voiceButton: getVoiceButtonConfig(),
      audioProcessing: getAudioProcessingConfig(),
      keyboardShortcuts: getKeyboardShortcuts(),
      development: getDevelopmentConfig(),
      backend: getBackendConfig()
    };

    // Log configuration in development
    if (config.development.enableDebugLogging) {
      console.log('Voice Integration Configuration:', {
        webSocket: {
          ...config.webSocket,
          // Don't log full URLs in production for security
          sttUrl: config.development.isDevelopment ? config.webSocket.sttUrl : '[CONFIGURED]',
          ttsUrl: config.development.isDevelopment ? config.webSocket.ttsUrl : '[CONFIGURED]',
          chatUrl: config.development.isDevelopment ? config.webSocket.chatUrl : '[CONFIGURED]'
        },
        audio: config.audio,
        development: config.development
      });
    }

    return config;
  }

  validateAndGetConfiguration(): { config: AppConfiguration; isValid: boolean; errors: string[] } {
    const validation = validateConfiguration();
    const config = this.getConfiguration();
    
    this.isValidated = true;
    
    if (!validation.isValid && config.development.enableErrorReporting) {
      console.error('Configuration validation failed:', validation.errors);
    }
    
    return {
      config,
      isValid: validation.isValid,
      errors: validation.errors
    };
  }

  // Reload configuration (useful for testing or dynamic config changes)
  reloadConfiguration(): AppConfiguration {
    this.config = null;
    this.isValidated = false;
    return this.getConfiguration();
  }

  // Get specific configuration sections
  getWebSocketConfig() {
    return this.getConfiguration().webSocket;
  }

  getAudioConfig() {
    return this.getConfiguration().audio;
  }

  getVisualEffectsConfig() {
    return this.getConfiguration().visualEffects;
  }

  getVoiceButtonConfig() {
    return this.getConfiguration().voiceButton;
  }

  getAudioProcessingConfig() {
    return this.getConfiguration().audioProcessing;
  }

  getKeyboardShortcuts() {
    return this.getConfiguration().keyboardShortcuts;
  }

  getDevelopmentConfig() {
    return this.getConfiguration().development;
  }

  getBackendConfig() {
    return this.getConfiguration().backend;
  }

  // Check if configuration has been validated
  get isConfigurationValidated(): boolean {
    return this.isValidated;
  }

  // Get environment info
  getEnvironmentInfo() {
    const config = this.getConfiguration();
    return {
      nodeEnv: process.env.NODE_ENV,
      isDevelopment: config.development.isDevelopment,
      isProduction: config.development.isProduction,
      debugLogging: config.development.enableDebugLogging,
      performanceMonitoring: config.development.enablePerformanceMonitoring,
      errorReporting: config.development.enableErrorReporting
    };
  }
}

// Export singleton instance
export const configManager = ConfigurationManager.getInstance();

// Export configuration functions for direct use
export {
  getWebSocketConfig,
  getAudioConfig,
  getNormalVisualParams,
  getVoiceActiveVisualParams,
  getProcessingVisualParams,
  getVoiceButtonConfig,
  getAudioProcessingConfig,
  getKeyboardShortcuts,
  getDevelopmentConfig,
  getBackendConfig,
  validateConfiguration,
  ERROR_MESSAGES
};