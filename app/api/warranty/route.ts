import { NextResponse } from 'next/server';
import { Manufacturer } from '../../../types/manufacturer';
import { getDellWarrantyInfo } from '../../../lib/manufacturers/dell';
import { getHpWarrantyInfo } from '../../../lib/manufacturers/hp';
import { getLenovoWarrantyInfo } from '../../../lib/manufacturers/lenovo';
import { getCachedWarrantyInfo, storeWarrantyInfo } from '../../../lib/services/warrantySync';

export async function POST(request: Request) {
  try {
    const { serialNumber, manufacturer, credentials } = await request.json();
    
    // First, check if we have cached warranty info
    const cachedWarranty = await getCachedWarrantyInfo(serialNumber);
    
    if (cachedWarranty) {
      console.log(`Returning cached warranty info for ${serialNumber}`);
      return NextResponse.json({
        ...cachedWarranty,
        fromCache: true
      });
    }
    
    console.log(`No cached warranty found for ${serialNumber}, fetching from API...`);
    
    // If no cached data, fetch from external API
    let warrantyInfo;
    
    switch (manufacturer) {
      case Manufacturer.DELL:
        warrantyInfo = await getDellWarrantyInfo(
          serialNumber, 
          credentials?.clientId, 
          credentials?.clientSecret
        );
        break;
      case Manufacturer.HP:
        warrantyInfo = await getHpWarrantyInfo(serialNumber, credentials?.apiKey);
        break;
      case Manufacturer.LENOVO:
        warrantyInfo = await getLenovoWarrantyInfo(serialNumber, credentials?.apiKey);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported manufacturer' },
          { status: 400 }
        );
    }
    
    // Store the fresh warranty info in database
    await storeWarrantyInfo(serialNumber, warrantyInfo);
    
    return NextResponse.json({
      ...warrantyInfo,
      fromCache: false
    });
  } catch (error) {
    console.error('Error in warranty lookup:', error);
    return NextResponse.json(
      { error: 'Failed to lookup warranty information' },
      { status: 500 }
    );
  }
} 