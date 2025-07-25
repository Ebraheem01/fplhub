import { useState, useEffect, useCallback } from 'react';
import fplService from '@/services/fplService';

// Hook for fetching bootstrap static data
export const useFPLData = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const bootstrapData = await fplService.getBootstrapStatic();
                setData(bootstrapData);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};

// Hook for fetching manager data
export const useManagerData = (managerId) => {
    const [profile, setProfile] = useState(null);
    const [history, setHistory] = useState(null);
    const [currentPicks, setCurrentPicks] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchManagerData = useCallback(async () => {
        if (!managerId) return;

        try {
            setLoading(true);
            setError(null);

            const [profileData, historyData] = await Promise.all([
                fplService.getManagerProfile(managerId),
                fplService.getManagerHistory(managerId)
            ]);

            setProfile(profileData);
            setHistory(historyData);

            // Fetch current gameweek picks
            if (historyData.current && historyData.current.length > 0) {
                const currentGW = historyData.current[historyData.current.length - 1].event;
                const picksData = await fplService.getManagerPicks(managerId, currentGW);
                setCurrentPicks(picksData);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [managerId]);

    useEffect(() => {
        fetchManagerData();
    }, [fetchManagerData]);

    return {
        profile,
        history,
        currentPicks,
        loading,
        error,
        refetch: fetchManagerData
    };
};

// Hook for fetching live gameweek data
export const useLiveGameweek = (gameweek, autoRefresh = false) => {
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchLiveData = useCallback(async () => {
        if (!gameweek) return;

        try {
            setLoading(true);
            const data = await fplService.getLiveGameweek(gameweek);
            setLiveData(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [gameweek]);

    useEffect(() => {
        fetchLiveData();
    }, [fetchLiveData]);

    // Auto-refresh functionality
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchLiveData();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, fetchLiveData]);

    return {
        liveData,
        loading,
        error,
        lastUpdated,
        refresh: fetchLiveData
    };
};

// Hook for fetching player details
export const usePlayerDetails = (playerId) => {
    const [playerData, setPlayerData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!playerId) return;

        const fetchPlayerData = async () => {
            try {
                setLoading(true);
                const data = await fplService.getPlayerSummary(playerId);
                setPlayerData(data);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayerData();
    }, [playerId]);

    return { playerData, loading, error };
};

// Hook for fetching fixtures
export const useFixtures = () => {
    const [fixtures, setFixtures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFixtures = async () => {
            try {
                setLoading(true);
                const data = await fplService.getFixtures();
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

// Hook for mini-league data
export const useLeagueData = (leagueId) => {
    const [leagueData, setLeagueData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchLeagueData = useCallback(async () => {
        if (!leagueId) return;

        try {
            setLoading(true);
            const data = await fplService.getLeagueStandings(leagueId);
            setLeagueData(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [leagueId]);

    useEffect(() => {
        fetchLeagueData();
    }, [fetchLeagueData]);

    return { leagueData, loading, error, refetch: fetchLeagueData };
};

// Hook for dream team data
export const useDreamTeam = (gameweek) => {
    const [dreamTeam, setDreamTeam] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!gameweek) return;

        const fetchDreamTeam = async () => {
            try {
                setLoading(true);
                const data = await fplService.getDreamTeam(gameweek);
                setDreamTeam(data);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDreamTeam();
    }, [gameweek]);

    return { dreamTeam, loading, error };
};

// Custom hook for debounced search
export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};
