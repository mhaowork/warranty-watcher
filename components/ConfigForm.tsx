'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Manufacturer } from '../types/manufacturer';
import { Platform } from '../types/platform';
import { getManufacturerCredentials, getPlatformCredentials, saveManufacturerCredentials, savePlatformCredentials } from '../lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { logger } from '@/lib/logger';
import { isSaaSMode } from '@/lib/config';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle } from 'lucide-react';

// Manufacturer credentials schema
const manufacturerSchema = z.object({
  [Manufacturer.DELL]: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
  }).refine(
    data => {
      // If any field is filled, both fields are required
      const hasClientId = data.clientId.trim() !== '';
      const hasClientSecret = data.clientSecret.trim() !== '';
      // Allow both empty or both filled
      return (!hasClientId && !hasClientSecret) || (hasClientId && hasClientSecret);
    },
    {
      message: "Both Client ID and Client Secret are required if either is provided",
      path: ['clientId'] // Attach error to clientId field to aid display
    }
  ),
  [Manufacturer.HP]: z.object({
    apiKey: z.string(),
  }),
  [Manufacturer.LENOVO]: z.object({
    apiKey: z.string(),
  }),
});

// Platform credentials schema
const platformSchema = z.object({
  [Platform.DATTO_RMM]: z.object({
    url: z.string(),
    apiKey: z.string(),
    secretKey: z.string(),
  })
  .refine(
    data => {
      // If any field is filled, all fields are required
      const hasAnyValue = data.url || data.apiKey || data.secretKey;
      if (!hasAnyValue) return true; // All fields are empty, that's valid
      return Boolean(data.url && data.apiKey && data.secretKey);
    },
    {
      message: "All Datto RMM fields are required if any of them are filled",
      path: ['url'] // Attach error to url field to aid display
    }
  ),
  [Platform.NCENTRAL]: z.object({
    serverUrl: z.string(),
    apiToken: z.string(),
  })
  .refine(
    data => {
      // If any field is filled, all fields are required
      const hasAnyValue = data.serverUrl || data.apiToken;
      if (!hasAnyValue) return true; // All fields are empty, that's valid
      logger.debug('N-Central credential validation result', 'config-form', {
        hasServerUrl: Boolean(data.serverUrl),
        hasApiToken: Boolean(data.apiToken),
        result: Boolean(data.serverUrl && data.apiToken)
      });
      return Boolean(data.serverUrl && data.apiToken);
    },
    {
      message: "All N-central fields are required if any of them are filled",
      path: ['serverUrl'] // Attach error to serverUrl field to aid display
    }
  ),
  [Platform.HALOPSA]: z.object({
    url: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
  })
  .refine(
    data => {
      // If any field is filled, all fields are required
      const hasAnyValue = data.url || data.clientId || data.clientSecret;
      if (!hasAnyValue) return true; // All fields are empty, that's valid
      return Boolean(data.url && data.clientId && data.clientSecret);
    },
    {
      message: "All HaloPSA fields are required if any of them are filled",
      path: ['url'] // Attach error to url field to aid display
    }
  ),
});

export default function ConfigForm() {
  // Manufacturer form
  const manufacturerForm = useForm<z.infer<typeof manufacturerSchema>>({
    resolver: zodResolver(manufacturerSchema),
    defaultValues: {
      [Manufacturer.DELL]: { clientId: '', clientSecret: '' },
      [Manufacturer.HP]: { apiKey: '' },
      [Manufacturer.LENOVO]: { apiKey: '' },
    },
  });
  
  // Platform form
  const platformForm = useForm<z.infer<typeof platformSchema>>({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      [Platform.DATTO_RMM]: { url: '', apiKey: '', secretKey: '' },
      [Platform.NCENTRAL]: { serverUrl: '', apiToken: '' },
      [Platform.HALOPSA]: { url: '', clientId: '', clientSecret: '' },
    },
  });
  
  // Load saved credentials on mount
  useEffect(() => {
    const manufacturerCreds = getManufacturerCredentials();
    if (Object.keys(manufacturerCreds).length > 0) {
      // Ensure all manufacturer fields are defined with the new structure
      const mergedManufacturerCreds = {
        ...manufacturerForm.getValues(),
        ...manufacturerCreds,
        [Manufacturer.DELL]: {
          clientId: manufacturerCreds[Manufacturer.DELL]?.clientId || '',
          clientSecret: manufacturerCreds[Manufacturer.DELL]?.clientSecret || '',
        },
        [Manufacturer.HP]: {
          apiKey: manufacturerCreds[Manufacturer.HP]?.apiKey || '',
        },
        [Manufacturer.LENOVO]: {
          apiKey: manufacturerCreds[Manufacturer.LENOVO]?.apiKey || manufacturerCreds[Manufacturer.HP]?.apiKey || '',
        }
      };
      manufacturerForm.reset(mergedManufacturerCreds);
    }
    
    const platformCreds = getPlatformCredentials();
    if (Object.keys(platformCreds).length > 0) {
      // Ensure all platform fields are defined
      const mergedPlatformCreds = {
        ...platformForm.getValues(),
        ...platformCreds,
        [Platform.DATTO_RMM]: {
          url: '',
          apiKey: '',
          secretKey: '',
          ...platformCreds[Platform.DATTO_RMM]
        },
        [Platform.NCENTRAL]: {
          serverUrl: '',
          apiToken: '',
          ...platformCreds[Platform.NCENTRAL]
        },
        [Platform.HALOPSA]: {
          url: '',
          clientId: '',
          clientSecret: '',
          ...platformCreds[Platform.HALOPSA]
        }
      };
      platformForm.reset(mergedPlatformCreds);
    }
  }, [manufacturerForm, platformForm]);
  
  // Handler for manufacturer form submission
  function onManufacturerSubmit(values: z.infer<typeof manufacturerSchema>) {
    // Ensure HP and Lenovo have the same API key
    const apiKey = values[Manufacturer.HP].apiKey || values[Manufacturer.LENOVO].apiKey || '';
    values[Manufacturer.HP].apiKey = apiKey;
    values[Manufacturer.LENOVO].apiKey = apiKey;
    
    logger.info('Saving manufacturer credentials', 'config-form', {
      credentialsCount: Object.keys(values).length
    });
    saveManufacturerCredentials(values);
    alert('Manufacturer credentials saved successfully!');
  }
  
  // Handler for platform form submission
  function onPlatformSubmit(values: z.infer<typeof platformSchema>) {
    logger.info('Saving platform credentials', 'config-form', {
      credentialsCount: Object.keys(values).length
    });
    savePlatformCredentials(values);
    alert('Platform credentials saved successfully!');
  }
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
        <CardDescription>
          {isSaaSMode() ? 
            'Configure your platform credentials' : 
            'Configure your manufacturer and platform credentials'
          }
        </CardDescription>
        <div className="flex p-3 mt-2 border rounded-md bg-amber-50 border-amber-200">
          <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
          <p className="text-sm font-medium text-amber-700">
            Note: These credentials are stored in your local browser only. If you change browsers or devices, you&apos;ll need to reconfigure.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={isSaaSMode() ? "platform" : "manufacturer"}>
          <TabsList className={`grid w-full ${isSaaSMode() ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {!isSaaSMode() && <TabsTrigger value="manufacturer">Manufacturers</TabsTrigger>}
            <TabsTrigger value="platform">Platforms</TabsTrigger>
          </TabsList>
          
          {/* Manufacturer Tab - Only show in non-SaaS mode */}
          {!isSaaSMode() && (
            <TabsContent value="manufacturer">
              <Form {...manufacturerForm}>
                <form onSubmit={manufacturerForm.handleSubmit(onManufacturerSubmit)} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Dell</h3>
                      <div className="space-y-4">
                        <FormField
                          control={manufacturerForm.control}
                          name={`${Manufacturer.DELL}.clientId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client ID (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter Dell client ID" {...field} />
                              </FormControl>
                              <FormDescription>
                                Your Dell client ID (optional)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={manufacturerForm.control}
                          name={`${Manufacturer.DELL}.clientSecret`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client Secret (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter Dell client secret" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Your Dell client secret (optional)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">HP & Lenovo</h3>
                      <div className="space-y-4">
                        <FormField
                          control={manufacturerForm.control}
                          name={`${Manufacturer.HP}.apiKey`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Key</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter HP/Lenovo API Key" 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Sync with Lenovo field
                                    const newValue = e.target.value;
                                    const lenovoField = manufacturerForm.getValues();
                                    lenovoField[Manufacturer.LENOVO].apiKey = newValue;
                                    manufacturerForm.reset(lenovoField);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Your API Key for api.warrantywatcher.com (used for both HP and Lenovo)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button type="submit">Save Manufacturer Settings</Button>
                </form>
              </Form>
            </TabsContent>
          )}
          
          {/* Platform Tab */}
          <TabsContent value="platform">
            <Form {...platformForm}>
              <form onSubmit={platformForm.handleSubmit(onPlatformSubmit)} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datto RMM</h3>
                    <div className="space-y-4">
                      <FormField
                        control={platformForm.control}
                        name={`${Platform.DATTO_RMM}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter Datto RMM URL" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your Datto RMM instance URL
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={platformForm.control}
                        name={`${Platform.DATTO_RMM}.apiKey`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter Datto RMM API Key" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your Datto RMM API Key
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={platformForm.control}
                        name={`${Platform.DATTO_RMM}.secretKey`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secret Key</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter Datto RMM Secret Key" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Your Datto RMM Secret Key
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">N-able N-central</h3>
                    <div className="space-y-4">
                      <FormField
                        control={platformForm.control}
                        name={`${Platform.NCENTRAL}.serverUrl`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server URL</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter N-central Server URL" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your N-central instance URL (e.g., https://yourserver.n-able.com)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={platformForm.control}
                        name={`${Platform.NCENTRAL}.apiToken`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Token (JWT)</FormLabel>
                            <FormControl>
                              <Input 
                                type="password"
                                placeholder="Enter N-central API Token" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Your N-central User-API Token (JWT) generated from the N-central UI. Click <a href="https://developer.n-able.com/n-central/docs/create-an-api-only-user" target="_blank" rel="noopener noreferrer">here</a> for more information.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">HaloPSA</h3>
                    <div className="space-y-4">
                      <FormField
                        control={platformForm.control}
                        name={`${Platform.HALOPSA}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter HaloPSA URL (e.g., acme-tech.halopsa.com)" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your HaloPSA instance URL (without https://)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={platformForm.control}
                        name={`${Platform.HALOPSA}.clientId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter HaloPSA Client ID" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your HaloPSA OAuth2 Client ID
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={platformForm.control}
                        name={`${Platform.HALOPSA}.clientSecret`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret</FormLabel>
                            <FormControl>
                              <Input 
                                type="password"
                                placeholder="Enter HaloPSA Client Secret" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Your HaloPSA OAuth2 Client Secret
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                <Button type="submit">Save Platform Settings</Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 