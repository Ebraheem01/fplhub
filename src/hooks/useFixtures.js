import { useState, useEffect, useMemo } from 'react';
import { getUpcomingFixtures, getAverageFDR } from '@/utils/fplHelpers';

export const useFixtures = () => {
    const [fixtures, setFixtures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFixtures = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/fpl/fixtures');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setFixtures(data);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFixtures();
    }, []);

    return { fixtures, loading, error };
};

export const useTeamFixtures = (teamId, numFixtures = 5) => {
    const { fixtures, loading, error } = useFixtures();

    const teamFixtures = useMemo(() => {
        if (!fixtures.length || !teamId) return [];
        return getUpcomingFixtures(fixtures, teamId, numFixtures);
    }, [fixtures, teamId, numFixtures]);

    const averageFDR = useMemo(() => {
        if (!fixtures.length || !teamId) return 0;
        return getAverageFDR(fixtures, teamId, numFixtures);
    }, [fixtures, teamId, numFixtures]);

    return {
        fixtures: teamFixtures,
        averageFDR,
        loading,
        error
    };
};

export const useGameweekFixtures = (gameweek) => {
    const { fixtures, loading, error } = useFixtures();

    const gameweekFixtures = useMemo(() => {
        if (!fixtures.length || !gameweek) return [];
        return fixtures
            .filter(fixture => fixture.event === gameweek)
            .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
    }, [fixtures, gameweek]);

    return {
        fixtures: gameweekFixtures,
        loading,
        error
    };
};
