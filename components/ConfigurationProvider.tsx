// Configuration Provider - Provides configuration context and error handling

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useConfiguration, useConfigurationStatus } from '@/hooks/useConfiguration';
import type { AppConfiguration } from '@/config';

interface ConfigurationContextType {
  config: AppConfiguration | null;
  isLoading: boolean;
  isValid: boolean;
  errors: string[];
  reloadConfiguration: () => void;
}

const ConfigurationContext = createContext<ConfigurationContextType | null>(null);

interface ConfigurationProviderProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ errors: string[] }>;
}

export function ConfigurationProvider({ children, fallback: Fallback }: ConfigurationProviderProps) {
  const configuration = useConfiguration();
  const { isReady, hasErrors } = useConfigurationStatus();

  // Show loading state
  if (configuration.isLoading) {
    return (
      <div className="configuration-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading configuration...</p>
        </div>
        <style jsx>{`
          .configuration-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #000;
            color: #00ff00;
            font-family: 'Courier New', monospace;
          }
          .loading-container {
            text-align: center;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 2px solid #003300;
            border-top: 2px solid #00ff00;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show error state if configuration is invalid
  if (hasErrors && !isReady) {
    if (Fallback) {
      return <Fallback errors={configuration.errors} />;
    }

    return (
      <ConfigurationErrorFallback 
        errors={configuration.errors}
        onRetry={configuration.reloadConfiguration}
      />
    );
  }

  return (
    <ConfigurationContext.Provider value={configuration}>
      {children}
    </ConfigurationContext.Provider>
  );
}

interface ConfigurationErrorFallbackProps {
  errors: string[];
  onRetry: () => void;
}

function ConfigurationErrorFallback({ errors, onRetry }: ConfigurationErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="configuration-error">
      <div className="error-container">
        <h1>⚠️ Configuration Error</h1>
        <p>The voice integration configuration is invalid.</p>
        
        <div className="error-actions">
          <button onClick={onRetry} className="retry-button">
            🔄 Retry
          </button>
          <button 
            onClick={() => setShowDetails(!showDetails)} 
            className="details-button"
          >
            {showDetails ? '📄 Hide Details' : '📋 Show Details'}
          </button>
        </div>

        {showDetails && (
          <div className="error-details">
            <h3>Configuration Errors:</h3>
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
            
            <div className="help-section">
              <h3>How to Fix:</h3>
              <ol>
                <li>Check your <code>.env.local</code> file exists</li>
                <li>Verify all required environment variables are set</li>
                <li>Ensure WebSocket URLs start with <code>ws://</code> or <code>wss://</code></li>
                <li>Validate backend URL is accessible</li>
                <li>Run <code>npm run validate-config</code> for detailed validation</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .configuration-error {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #000;
          color: #00ff00;
          font-family: 'Courier New', monospace;
          padding: 20px;
        }
        .error-container {
          max-width: 600px;
          text-align: center;
          border: 2px solid #ff0000;
          padding: 30px;
          border-radius: 10px;
          background: rgba(255, 0, 0, 0.1);
        }
        h1 {
          color: #ff0000;
          margin-bottom: 20px;
          font-size: 2em;
        }
        h3 {
          color: #ffff00;
          margin: 20px 0 10px;
          text-align: left;
        }
        p {
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .error-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin: 20px 0;
        }
        .retry-button, .details-button {
          background: #003300;
          color: #00ff00;
          border: 1px solid #00ff00;
          padding: 10px 20px;
          cursor: pointer;
          font-family: inherit;
          border-radius: 5px;
          transition: all 0.3s ease;
        }
        .retry-button:hover, .details-button:hover {
          background: #00ff00;
          color: #000;
        }
        .error-details {
          text-align: left;
          margin-top: 20px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 5px;
          border: 1px solid #333;
        }
        ul, ol {
          margin: 10px 0;
          padding-left: 20px;
        }
        li {
          margin: 5px 0;
          line-height: 1.4;
        }
        code {
          background: rgba(0, 255, 0, 0.2);
          padding: 2px 6px;
          border-radius: 3px;
          font-family: inherit;
        }
        .help-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #333;
        }
      `}</style>
    </div>
  );
}

// Hook to use configuration context
export function useConfigurationContext(): ConfigurationContextType {
  const context = useContext(ConfigurationContext);
  if (!context) {
    throw new Error('useConfigurationContext must be used within a ConfigurationProvider');
  }
  return context;
}

// Export context for advanced usage
export { ConfigurationContext };