import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET() {
    try {
        const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            // Add cache with revalidation every 15 minutes
            next: { revalidate: 900 }
        });

        if (!response.ok) {
            throw new Error(`FPL API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
            },
        });
    } catch (error) {
        console.error('Bootstrap Static API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch bootstrap data' },
            { status: 500 }
        );
    }
}
