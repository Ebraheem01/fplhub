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

        const response = await fetch(`${FPL_BASE_URL}/event/${gameweek}/live/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            // Cache for 2 minutes during live gameweeks as data updates frequently
            next: { revalidate: 120 }
        });

        if (!response.ok) {
            throw new Error(`FPL API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
            },
        });
    } catch (error) {
        console.error(`Live Gameweek API Error for GW${params.gameweek}:`, error);
        return NextResponse.json(
            { error: `Failed to fetch live data for GW${params.gameweek}` },
            { status: 500 }
        );
    }
}
