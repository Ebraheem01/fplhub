import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET(request, { params }) {
    try {
        const { leagueId } = params;
        const { searchParams } = new URL(request.url);
        const page = searchParams.get('page') || '1';

        if (!leagueId || isNaN(leagueId)) {
            return NextResponse.json(
                { error: 'Valid league ID is required' },
                { status: 400 }
            );
        }

        if (isNaN(page) || page < 1) {
            return NextResponse.json(
                { error: 'Valid page number is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${FPL_BASE_URL}/leagues-classic/${leagueId}/standings/?page_standings=${page}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            // Cache for 10 minutes as league standings update after each gameweek
            next: { revalidate: 600 }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json(
                    { error: 'League not found' },
                    { status: 404 }
                );
            }
            throw new Error(`FPL API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
            },
        });
    } catch (error) {
        console.error(`League Standings API Error for league ${params.leagueId}:`, error);
        return NextResponse.json(
            { error: `Failed to fetch league ${params.leagueId} standings` },
            { status: 500 }
        );
    }
}
