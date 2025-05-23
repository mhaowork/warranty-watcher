import { NextResponse } from 'next/server';
import { Manufacturer } from '../../../types/manufacturer';
import { getDellWarrantyInfo } from '../../../lib/manufacturers/dell';
import { getHpWarrantyInfo } from '../../../lib/manufacturers/hp';
import { getLenovoWarrantyInfo } from '../../../lib/manufacturers/lenovo';

export async function POST(request: Request) {
  try {
    const { serialNumber, manufacturer, credentials } = await request.json();
    
    // Direct static calls based on manufacturer type
    switch (manufacturer) {
      case Manufacturer.DELL:
        return NextResponse.json(
          await getDellWarrantyInfo(
            serialNumber, 
            credentials?.clientId, 
            credentials?.clientSecret
          )
        );
      case Manufacturer.HP:
        return NextResponse.json(
          await getHpWarrantyInfo(serialNumber, credentials?.apiKey)
        );
      case Manufacturer.LENOVO:
        return NextResponse.json(
          await getLenovoWarrantyInfo(serialNumber, credentials?.apiKey)
        );
      default:
        return NextResponse.json(
          { error: 'Unsupported manufacturer' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in warranty lookup:', error);
    return NextResponse.json(
      { error: 'Failed to lookup warranty information' },
      { status: 500 }
    );
  }
} 