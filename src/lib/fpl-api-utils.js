import { NextResponse } from 'next/server';

export const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export const createFetchOptions = (revalidateSeconds = 600) => ({
    headers: {
        'Content-Type': 'application/json',
    },
    next: { revalidate: revalidateSeconds }
});

export const createCacheHeaders = (maxAge = 600) => ({
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
});

export const handleApiError = (error, context = '') => {
    console.error(`${context} API Error:`, error);

    if (error.message.includes('404')) {
        return NextResponse.json(
            { error: 'Resource not found' },
            { status: 404 }
        );
    }

    return NextResponse.json(
        { error: `Failed to fetch ${context.toLowerCase()}` },
        { status: 500 }
    );
};

export const validateId = (id, fieldName = 'ID') => {
    if (!id || isNaN(id)) {
        return NextResponse.json(
            { error: `Valid ${fieldName.toLowerCase()} is required` },
            { status: 400 }
        );
    }
    return null;
};

export const validateGameweek = (gameweek) => {
    if (!gameweek || isNaN(gameweek) || gameweek < 1 || gameweek > 38) {
        return NextResponse.json(
            { error: 'Valid gameweek (1-38) is required' },
            { status: 400 }
        );
    }
    return null;
};
