import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET(request, { params }) {
    try {
        const { playerId } = params;

        if (!playerId || isNaN(playerId)) {
            return NextResponse.json(
                { error: 'Valid player ID is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${FPL_BASE_URL}/element-summary/${playerId}/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            // Cache for 10 minutes as player data changes frequently
            next: { revalidate: 600 }
        });

        if (!response.ok) {
            throw new Error(`FPL API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
            },
        });
    } catch (error) {
        console.error(`Player Summary API Error for player ${params.playerId}:`, error);
        return NextResponse.json(
            { error: `Failed to fetch player ${params.playerId} summary` },
            { status: 500 }
        );
    }
}
