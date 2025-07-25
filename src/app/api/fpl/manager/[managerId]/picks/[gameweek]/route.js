import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET(request, { params }) {
    try {
        const { managerId, gameweek } = params;

        if (!managerId || isNaN(managerId)) {
            return NextResponse.json(
                { error: 'Valid manager ID is required' },
                { status: 400 }
            );
        }

        if (!gameweek || isNaN(gameweek) || gameweek < 1 || gameweek > 38) {
            return NextResponse.json(
                { error: 'Valid gameweek (1-38) is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/event/${gameweek}/picks/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            // Cache for 5 minutes as picks can change before deadline
            next: { revalidate: 300 }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json(
                    { error: 'Manager picks not found for this gameweek' },
                    { status: 404 }
                );
            }
            throw new Error(`FPL API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error(`Manager Picks API Error for manager ${params.managerId} GW${params.gameweek}:`, error);
        return NextResponse.json(
            { error: `Failed to fetch manager ${params.managerId} picks for GW${params.gameweek}` },
            { status: 500 }
        );
    }
}
