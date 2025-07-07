/**
 * Application Configuration
 * Handles environment variables and deployment mode detection
 */

export type DeploymentMode = 'self-hosted' | 'saas';

export interface AppConfig {
  deploymentMode: DeploymentMode;
  database: {
    type: 'sqlite' | 'postgresql';
    sqlitePath?: string;
    postgresUrl?: string;
  };
  supabase?: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  auth: {
    enabled: boolean;
  };
}

function getDeploymentMode(): DeploymentMode {
  // Use NEXT_PUBLIC_ prefix for client-side availability
  const mode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || 'self-hosted';
  console.log('Getting deployment mode', mode);
  if (mode !== 'self-hosted' && mode !== 'saas') {
    console.warn(`Invalid DEPLOYMENT_MODE: ${mode}. Defaulting to 'self-hosted'`);
    return 'self-hosted';
  }
  return mode as DeploymentMode;
}

function getConfig(): AppConfig {
  const deploymentMode = getDeploymentMode();
  const isSaaS = deploymentMode === 'saas';

  const config: AppConfig = {
    deploymentMode,
    database: {
      type: isSaaS ? 'postgresql' : 'sqlite',
      sqlitePath: process.env.DB_PATH || './data/warranty.db',
      postgresUrl: process.env.DATABASE_URL,
    },
    auth: {
      enabled: isSaaS,
    },
  };

  // Add Supabase configuration for SaaS mode
  if (isSaaS) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration required for SaaS mode. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    config.supabase = {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  return config;
}

// Export singleton config instance
export const appConfig = getConfig();

// Helper functions
export const isSaaSMode = () => appConfig.deploymentMode === 'saas';
export const isSelfHostedMode = () => appConfig.deploymentMode === 'self-hosted';
export const isAuthEnabled = () => appConfig.auth.enabled; 