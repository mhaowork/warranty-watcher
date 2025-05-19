'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Manufacturer } from '../types/manufacturer';
import { Platform } from '../types/platform';
import { getManufacturerCredentials, getPlatformCredentials, saveManufacturerCredentials, savePlatformCredentials } from '../lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// Manufacturer credentials schema
const manufacturerSchema = z.object({
  [Manufacturer.DELL]: z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client Secret is required'),
  }),
  [Manufacturer.HP]: z.object({
    apiKey: z.string().optional(),
  }),
});

// Platform credentials schema
const platformSchema = z.object({
  [Platform.DATTO_RMM]: z.object({
    url: z.string().optional(),
    apiKey: z.string().optional(),
    secretKey: z.string().optional(),
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
      path: [] // Shows the error at the object level
    }
  ),
  [Platform.NCENTRAL]: z.object({
    serverUrl: z.string().optional(),
    apiToken: z.string().optional(),
  })
  .refine(
    data => {
      // If any field is filled, all fields are required
      const hasAnyValue = data.serverUrl || data.apiToken;
      if (!hasAnyValue) return true; // All fields are empty, that's valid
      return Boolean(data.serverUrl && data.apiToken);
    },
    {
      message: "All N-central fields are required if any of them are filled",
      path: [] // Shows the error at the object level
    }
  ),
  [Platform.CSV]: z.object({}),
});

export default function ConfigForm() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeTab, setActiveTab] = useState<'manufacturer' | 'platform'>('manufacturer');
  
  // Manufacturer form
  const manufacturerForm = useForm<z.infer<typeof manufacturerSchema>>({
    resolver: zodResolver(manufacturerSchema),
    defaultValues: {
      [Manufacturer.DELL]: { clientId: '', clientSecret: '' },
      [Manufacturer.HP]: { apiKey: '' },
    },
  });
  
  // Platform form
  const platformForm = useForm<z.infer<typeof platformSchema>>({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      [Platform.DATTO_RMM]: { url: '', apiKey: '', secretKey: '' },
      [Platform.NCENTRAL]: { serverUrl: '', apiToken: '' },
      [Platform.CSV]: {},
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
        }
      };
      platformForm.reset(mergedPlatformCreds);
    }
  }, [manufacturerForm, platformForm]);
  
  // Handler for manufacturer form submission
  function onManufacturerSubmit(values: z.infer<typeof manufacturerSchema>) {
    console.log('Saving manufacturer credentials:', values);
    saveManufacturerCredentials(values);
    alert('Manufacturer credentials saved successfully!');
  }
  
  // Handler for platform form submission
  function onPlatformSubmit(values: z.infer<typeof platformSchema>) {
    console.log('Saving platform credentials:', values);
    savePlatformCredentials(values);
    alert('Platform credentials saved successfully!');
  }
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
        <CardDescription>
          Configure your manufacturer and platform credentials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manufacturer" onValueChange={(value) => setActiveTab(value as 'manufacturer' | 'platform')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manufacturer">Manufacturers</TabsTrigger>
            <TabsTrigger value="platform">Platforms</TabsTrigger>
          </TabsList>
          
          {/* Manufacturer Tab */}
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
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter Dell client ID" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your Dell client ID
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
                            <FormLabel>Client Secret</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter Dell client secret" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Your Dell client secret
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">HP</h3>
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
                                placeholder="Enter HP API Key" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Your API Key for api.warrantywatcher.com
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
                              Your N-central User-API Token (JWT) generated from the N-central UI
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