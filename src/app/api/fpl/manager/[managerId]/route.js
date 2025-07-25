import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET(request, { params }) {
    try {
        const { managerId } = params;

        if (!managerId || isNaN(managerId)) {
            return NextResponse.json(
                { error: 'Valid manager ID is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/`, {
            headers: {
                'Content-Type': 'application/json',
            },
            // Cache for 5 minutes as manager data can change
            next: { revalidate: 300 }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json(
                    { error: 'Manager not found' },
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
        console.error(`Manager Profile API Error for manager ${params.managerId}:`, error);
        return NextResponse.json(
            { error: `Failed to fetch manager ${params.managerId} profile` },
            { status: 500 }
        );
    }
}
