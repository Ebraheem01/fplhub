import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET() {
    try {
        const response = await fetch(`${FPL_BASE_URL}/fixtures/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            // Cache for 30 minutes as fixtures don't change frequently
            next: { revalidate: 1800 }
        });

        if (!response.ok) {
            throw new Error(`FPL API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
            },
        });
    } catch (error) {
        console.error('Fixtures API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch fixtures' },
            { status: 500 }
        );
    }
}
