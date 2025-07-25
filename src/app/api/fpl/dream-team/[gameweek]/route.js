import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET(request, { params }) {
    try {
        const { gameweek } = params;

        if (!gameweek || isNaN(gameweek) || gameweek < 1 || gameweek > 38) {
            return NextResponse.json(
                { error: 'Valid gameweek (1-38) is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${FPL_BASE_URL}/dream-team/${gameweek}/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            // Cache for 30 minutes as dream team is calculated after gameweek ends
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
        console.error(`Dream Team API Error for GW${params.gameweek}:`, error);
        return NextResponse.json(
            { error: `Failed to fetch dream team for GW${params.gameweek}` },
            { status: 500 }
        );
    }
}
