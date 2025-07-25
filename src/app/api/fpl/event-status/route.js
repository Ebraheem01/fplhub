import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET() {
    try {
        const response = await fetch(`${FPL_BASE_URL}/event-status/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            // Cache for 5 minutes as event status can change during gameweeks
            next: { revalidate: 300 }
        });

        if (!response.ok) {
            throw new Error(`FPL API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('Event Status API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch event status' },
            { status: 500 }
        );
    }
}
