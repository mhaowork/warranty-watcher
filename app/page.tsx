import Link from 'next/link';
import { Button } from '../components/ui/button';

export default function Home() {
  return (
    <div className="py-12 px-4 md:px-8">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Warranty Information Management System</h2>
          <p className="text-xl mb-8">
            Easily track warranty information for all your devices across multiple platforms.
          </p>
          
          <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Configuration</h3>
              <p className="mb-4">Set up your platform and manufacturer API credentials.</p>
              <Link href="/config">
                <Button className="w-full">Configure Now</Button>
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Sync Devices</h3>
              <p className="mb-4">Fetch devices and update warranty information.</p>
              <Link href="/sync">
                <Button className="w-full">Start Sync</Button>
              </Link>
            </div>
          </div>
          
          <div className="mt-12">
            <h3 className="text-2xl font-semibold mb-4">Supported Platforms</h3>
            <div className="flex justify-center gap-6 mb-8">
              <div className="px-4 py-2 bg-gray-100 rounded-md">Datto RMM</div>
              <div className="px-4 py-2 bg-gray-100 rounded-md">N-Central RMM</div>
              <div className="px-4 py-2 bg-gray-100 rounded-md">CSV Import</div>
            </div>
            
            <h3 className="text-2xl font-semibold mb-4">Supported Manufacturers</h3>
            <div className="flex justify-center gap-6">
              <div className="px-4 py-2 bg-gray-100 rounded-md">Dell</div>
              <div className="px-4 py-2 bg-gray-100 rounded-md">HP</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 