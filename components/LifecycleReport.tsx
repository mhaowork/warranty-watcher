'use client';

import { WarrantyInfo } from '@/types/warranty';
import { inferWarrantyStatus } from '@/lib/utils/warrantyUtils';
import { formatWarrantyDate } from '@/lib/utils/dateUtils';
import { CheckCircle, XCircle, AlertTriangle, Calendar, Shield, Building } from 'lucide-react';
import { Button } from './ui/button';

interface LifecycleReportProps {
  data: WarrantyInfo[];
  clientName?: string;
  reportDate: string;
  reportTimestamp: string;
}

function getStatusBadge(endDate?: string) {
  const status = inferWarrantyStatus(endDate);
  
  if (status === 'active') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 print:bg-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>
    );
  } else if (status === 'expired') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 print:bg-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        Expired
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 print:bg-gray-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Unknown
      </span>
    );
  }
}

function getWarrantyStats(data: WarrantyInfo[]) {
  const active = data.filter(item => inferWarrantyStatus(item.endDate) === 'active').length;
  const expired = data.filter(item => inferWarrantyStatus(item.endDate) === 'expired').length;
  const unknown = data.filter(item => inferWarrantyStatus(item.endDate) === 'unknown').length;
  
  return { active, expired, unknown, total: data.length };
}

function getExpiringInNext90Days(data: WarrantyInfo[]) {
  const today = new Date();
  const in90Days = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000));
  
  return data.filter(item => {
    if (!item.endDate) return false;
    const endDate = new Date(item.endDate);
    return endDate > today && endDate <= in90Days;
  });
}

function WarrantyPieChart({ stats }: { stats: { active: number; expired: number; unknown: number; total: number } }) {
  const data = [
    { name: 'Active', value: stats.active, color: '#10b981' },
    { name: 'Expired', value: stats.expired, color: '#ef4444' },
    { name: 'Unknown', value: stats.unknown, color: '#6b7280' }
  ].filter(item => item.value > 0);

  const total = stats.total;
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  if (total === 0) return null;

  // Special case: if only one category, show a full circle
  if (data.length === 1) {
    const singleItem = data[0];
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="200" height="200" className="print:w-64 print:h-64">
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill={singleItem.color}
              stroke="white"
              strokeWidth="2"
            />
          </svg>
          
          {/* Legend */}
          <div className="absolute left-full ml-4 top-1/2 transform -translate-y-1/2 space-y-2 print:ml-6 print:space-y-3">
            <div className="flex items-center text-sm print:text-base">
              <div 
                className="w-3 h-3 print:w-4 print:h-4 rounded-full mr-2" 
                style={{ backgroundColor: singleItem.color }}
              />
              <span className="text-gray-700 print:text-gray-900 print:font-medium">
                {singleItem.name}: {singleItem.value} (100%)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let cumulativePercentage = 0;

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <svg width="200" height="200" className="transform -rotate-90 print:w-64 print:h-64">
          {data.map((item, index) => {
            const percentage = item.value / total;
            const startAngle = cumulativePercentage * 360;
            const endAngle = (cumulativePercentage + percentage) * 360;
            
            const startAngleRad = (startAngle * Math.PI) / 180;
            
            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            
            // Use large arc flag when the arc is greater than 180 degrees
            const largeArcFlag = percentage > 0.5 ? 1 : 0;
            
            // Handle edge case where percentage is very close to 1 (but not exactly 1)
            const adjustedEndAngle = percentage >= 0.999 ? startAngle + 359.9 : endAngle;
            const adjustedEndAngleRad = (adjustedEndAngle * Math.PI) / 180;
            const adjustedX2 = centerX + radius * Math.cos(adjustedEndAngleRad);
            const adjustedY2 = centerY + radius * Math.sin(adjustedEndAngleRad);
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${adjustedX2} ${adjustedY2}`,
              'Z'
            ].join(' ');
            
            cumulativePercentage += percentage;
            
            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="absolute left-full ml-4 top-1/2 transform -translate-y-1/2 space-y-2 print:ml-6 print:space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center text-sm print:text-base">
              <div 
                className="w-3 h-3 print:w-4 print:h-4 rounded-full mr-2" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700 print:text-gray-900 print:font-medium">
                {item.name}: {item.value} ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getWarrantyHealthScore(data: WarrantyInfo[]) {
  if (data.length === 0) return { score: 0, grade: 'N/A', color: 'gray' };
  
  const stats = getWarrantyStats(data);
  const expiringDevices = getExpiringInNext90Days(data);
  const activeButNotExpiring = stats.active - expiringDevices.length;
  
  // Calculate weighted score (0-100)
  // Active (not expiring soon): 100 points, Expiring: 60 points, Unknown: 30 points, Expired: 0 points
  const score = Math.round(
    (activeButNotExpiring * 100 + expiringDevices.length * 60 + stats.unknown * 30 + stats.expired * 0) / stats.total
  );
  
  // Determine grade and color
  let grade, color;
  if (score >= 85) {
    grade = 'Excellent';
    color = 'green';
  } else if (score >= 70) {
    grade = 'Good';
    color = 'blue';
  } else if (score >= 55) {
    grade = 'Fair';
    color = 'yellow';
  } else if (score >= 40) {
    grade = 'Poor';
    color = 'orange';
  } else {
    grade = 'Critical';
    color = 'red';
  }
  
  return { score, grade, color };
}

function getWarrantyInsights(data: WarrantyInfo[], stats: { active: number; expired: number; unknown: number; total: number }) {
  const insights = [];
  
  // High expired rate
  if (stats.expired > 0 && (stats.expired / stats.total) > 0.3) {
    insights.push({
      type: 'warning',
      message: `${Math.round((stats.expired / stats.total) * 100)}% of devices have expired warranties - consider renewal prioritization.`
    });
  }
  
  // Good coverage
  if (stats.active > 0 && (stats.active / stats.total) > 0.7) {
    insights.push({
      type: 'success',
      message: `Strong warranty coverage with ${Math.round((stats.active / stats.total) * 100)}% of devices under active warranty.`
    });
  }
  
  // Unknown devices
  if (stats.unknown > 0) {
    insights.push({
      type: 'info',
      message: `${stats.unknown} device(s) need warranty status verification.`
    });
  }
  
  // Aging equipment analysis
  const expiredDevices = data.filter(item => inferWarrantyStatus(item.endDate) === 'expired');
  if (expiredDevices.length > 0) {
    const oldestExpired = expiredDevices
      .filter(item => item.endDate)
      .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())[0];
    
    if (oldestExpired && oldestExpired.endDate) {
      const expiredDate = new Date(oldestExpired.endDate);
      const monthsExpired = Math.floor((Date.now() - expiredDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      if (monthsExpired > 12) {
        insights.push({
          type: 'warning',
          message: `Some devices have been out of warranty for ${monthsExpired}+ months - replacement may be more cost-effective than repair.`
        });
      }
    }
  }
  
  return insights;
}

function PrintButton() {
  const handlePrint = () => {
    window.print();
  };
  
  return (
    <Button
      onClick={handlePrint}
      className="print:hidden"
    >
      <Calendar className="w-4 h-4 mr-2" />
      Print Report
    </Button>
  );
}

export default function LifecycleReport({ data, clientName, reportDate, reportTimestamp }: LifecycleReportProps) {
  const stats = getWarrantyStats(data);
  const expiringDevices = getExpiringInNext90Days(data);
  const insights = getWarrantyInsights(data, stats);
  const healthScore = getWarrantyHealthScore(data);

  return (
    <>
      <style jsx global>{`
        @media print {
          /* Hide website header/navigation */
          header {
            display: none !important;
          }
          
          body { 
            font-size: 11px !important; 
            line-height: 1.3 !important;
          }
          
          .print-layout {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .print\\:bg-green-200 {
            background-color: #dcfce7 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print\\:bg-red-200 {
            background-color: #fecaca !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print\\:bg-gray-200 {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:break-before-page {
            break-before: page !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:text-xs {
            font-size: 10px !important;
          }
          
          .print\\:text-base {
            font-size: 12px !important;
          }
          
          .print\\:font-medium {
            font-weight: 500 !important;
          }
          
          .print\\:text-gray-900 {
            color: #111827 !important;
          }
          
          .print\\:compact {
            margin-bottom: 1rem !important;
          }
          
          .print\\:table-fixed {
            table-layout: fixed !important;
            width: 100% !important;
          }
          
          .print\\:w-auto {
            width: auto !important;
          }
          
          .print\\:w-64 {
            width: 16rem !important;
          }
          
          .print\\:h-64 {
            height: 16rem !important;
          }
          
          .print\\:w-4 {
            width: 1rem !important;
          }
          
          .print\\:h-4 {
            height: 1rem !important;
          }
          
          .print\\:ml-6 {
            margin-left: 1.5rem !important;
          }
          
          .print\\:space-y-3 > * + * {
            margin-top: 0.75rem !important;
          }
          
          /* Optimize table for print */
          .print-table {
            font-size: 9px !important;
            line-height: 1.2 !important;
          }
          
          .print-table th,
          .print-table td {
            padding: 4px 2px !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          /* Updated column widths without source column */
          .col-serial { width: 18% !important; }
          .col-manufacturer { width: 15% !important; }
          .col-product { width: 25% !important; }
          .col-status { width: 14% !important; }
          .col-start { width: 14% !important; }
          .col-end { width: 14% !important; }
          
          @page {
            margin: 0.5in;
            size: letter;
          }
        }
      `}</style>
      
      <div className="max-w-full mx-auto bg-white print:shadow-none">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 print:compact">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl print:text-xl font-bold text-gray-900 mb-2">
                IT Asset Lifecycle Report
              </h1>
              {clientName && (
                <div className="flex items-center text-xl print:text-sm text-gray-700 mb-2">
                  <Building className="w-5 h-5 print:w-3 print:h-3 mr-2" />
                  {clientName}
                </div>
              )}
              <p className="text-gray-600 print:text-xs">
                Generated on {reportDate}
              </p>
            </div>
            <div className="text-right print:hidden">
              <PrintButton />
            </div>
          </div>
        </div>

        {/* Executive Summary with Pie Chart */}
        <div className="mb-6 print:compact">
          <h2 className="text-2xl print:text-lg font-bold text-gray-900 mb-3 flex items-center">
            <Shield className="w-6 h-6 print:w-4 print:h-4 mr-2 text-slate-900" />
            Warranty Overview
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:gap-4 mb-4">
            {/* Stats Cards */}
            <div className="space-y-4">
              {/* Health Score */}
              <div className={`p-4 print:p-3 rounded-lg border-2 ${
                healthScore.color === 'green' ? 'bg-green-50 border-green-200' :
                healthScore.color === 'blue' ? 'bg-slate-50 border-slate-200' :
                healthScore.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                healthScore.color === 'orange' ? 'bg-orange-50 border-orange-200' :
                healthScore.color === 'red' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-center">
                  <div className={`text-4xl print:text-2xl font-bold mb-1 ${
                    healthScore.color === 'green' ? 'text-green-600' :
                    healthScore.color === 'blue' ? 'text-slate-900' :
                    healthScore.color === 'yellow' ? 'text-yellow-600' :
                    healthScore.color === 'orange' ? 'text-orange-600' :
                    healthScore.color === 'red' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {healthScore.score}
                  </div>
                  <div className="text-lg print:text-sm font-semibold text-gray-700">
                    Warranty Health Score
                  </div>
                  <div className={`text-sm print:text-xs font-medium ${
                    healthScore.color === 'green' ? 'text-green-700' :
                    healthScore.color === 'blue' ? 'text-slate-700' :
                    healthScore.color === 'yellow' ? 'text-yellow-700' :
                    healthScore.color === 'orange' ? 'text-orange-700' :
                    healthScore.color === 'red' ? 'text-red-700' :
                    'text-gray-700'
                  }`}>
                    {healthScore.grade}
                  </div>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 print:gap-2">
                <div className="bg-slate-50 p-3 print:p-2 rounded-lg border">
                  <div className="text-2xl print:text-lg font-bold text-slate-900">{stats.total}</div>
                  <div className="text-sm print:text-xs text-gray-600">Total Devices</div>
                </div>
                <div className="bg-green-50 p-3 print:p-2 rounded-lg border">
                  <div className="text-2xl print:text-lg font-bold text-green-600">{stats.active}</div>
                  <div className="text-sm print:text-xs text-gray-600">Active Warranties</div>
                </div>
                <div className="bg-red-50 p-3 print:p-2 rounded-lg border">
                  <div className="text-2xl print:text-lg font-bold text-red-600">{stats.expired}</div>
                  <div className="text-sm print:text-xs text-gray-600">Expired Warranties</div>
                </div>
                <div className="bg-orange-50 p-3 print:p-2 rounded-lg border">
                  <div className="text-2xl print:text-lg font-bold text-orange-600">{expiringDevices.length}</div>
                  <div className="text-sm print:text-xs text-gray-600">Expiring in 90 Days</div>
                </div>
              </div>
            </div>
            
            {/* Pie Chart */}
            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 print:p-2">
              {stats.total > 0 ? (
                <WarrantyPieChart stats={stats} />
              ) : (
                <div className="text-gray-500 text-center">
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <div className="mb-6 print:compact">
            <h3 className="text-xl print:text-base font-bold text-gray-900 mb-3">Key Insights</h3>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className={`p-3 print:p-2 rounded-lg border-l-4 ${
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                  insight.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
                  'bg-slate-50 border-slate-400 text-slate-800'
                }`}>
                  <p className="text-sm print:text-xs font-medium">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiring Soon Alert */}
        {expiringDevices.length > 0 && (
          <div className="mb-6 print:compact p-3 print:p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <h3 className="text-lg print:text-sm font-semibold text-orange-800 mb-2 flex items-center">
              <AlertTriangle className="w-5 h-5 print:w-3 print:h-3 mr-2" />
              Immediate Attention Required
            </h3>
            <p className="text-orange-700 print:text-xs mb-2">
              The following {expiringDevices.length} device(s) have warranties expiring within the next 90 days:
            </p>
            <div className="space-y-1">
              {expiringDevices.map((device, index) => (
                <div key={index} className="flex justify-between items-center bg-white p-2 print:p-1 rounded border">
                  <div className="print:text-xs">
                    <span className="font-medium">{device.serialNumber}</span>
                    <span className="text-gray-600 ml-2">({device.manufacturer})</span>
                  </div>
                  <div className="text-orange-600 font-medium print:text-xs">
                    {formatWarrantyDate(device.endDate)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Device Table */}
        <div className="print:break-before-page">
          <h2 className="text-2xl print:text-lg font-bold text-gray-900 mb-3">Device Details</h2>
          
          {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No warranty information available.
            </div>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="min-w-full bg-white border border-gray-300 print:table-fixed print-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 print:px-1 print:py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b col-serial">
                      Serial #
                    </th>
                    <th className="px-3 py-2 print:px-1 print:py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b col-manufacturer">
                      Manufacturer
                    </th>
                    <th className="px-3 py-2 print:px-1 print:py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b col-product">
                      Product
                    </th>
                    <th className="px-3 py-2 print:px-1 print:py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b col-status">
                      Status
                    </th>
                    <th className="px-3 py-2 print:px-1 print:py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b col-start">
                      Start Date
                    </th>
                    <th className="px-3 py-2 print:px-1 print:py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b col-end">
                      End Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 print:px-1 print:py-1 text-xs font-medium text-gray-900 border-b break-all">
                        {item.serialNumber}
                      </td>
                      <td className="px-3 py-2 print:px-1 print:py-1 text-xs text-gray-700 border-b">
                        {item.manufacturer}
                      </td>
                      <td className="px-3 py-2 print:px-1 print:py-1 text-xs text-gray-700 border-b break-words">
                        {item.productDescription || 'Unknown'}
                      </td>
                      <td className="px-3 py-2 print:px-1 print:py-1 text-xs border-b">
                        {getStatusBadge(item.endDate)}
                      </td>
                      <td className="px-3 py-2 print:px-1 print:py-1 text-xs text-gray-700 border-b">
                        {formatWarrantyDate(item.startDate)}
                      </td>
                      <td className="px-3 py-2 print:px-1 print:py-1 text-xs text-gray-700 border-b">
                        {formatWarrantyDate(item.endDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 print:mt-4 pt-4 print:pt-2 border-t border-gray-200 text-center text-sm print:text-xs text-gray-500">
          <p>
            This report was generated automatically by the Warranty Management System.
            For questions or concerns, please contact your IT service provider.
          </p>
          <p className="mt-1">
            Report generated on {reportTimestamp}
          </p>
        </div>
      </div>
    </>
  );
} 