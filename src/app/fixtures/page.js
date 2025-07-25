'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useFPLData } from '@/hooks/useFPLData';
import { useFixtures } from '@/hooks/useFixtures';
import { getFixtureDifficulty, formatDeadline, getTeamShortName, getCurrentGameweek, getNextGameweek, getFixtureStatus } from '@/utils/fplHelpers';
import {
    Calendar,
    Clock,
    MapPin,
    Filter,
    ChevronLeft,
    ChevronRight,
    Star,
    AlertCircle,
    Grid3X3,
    BarChart3
} from 'lucide-react';

export default function Fixtures() {
    const [selectedGameweek, setSelectedGameweek] = useState(null);
    const [filterCompleted, setFilterCompleted] = useState(false);
    const [viewMode, setViewMode] = useState('fixtures'); // 'fixtures' or 'fdr'
    const { data: fplData } = useFPLData();
    const { fixtures, loading, error } = useFixtures();

    useEffect(() => {
        if (fplData && !selectedGameweek) {
            const currentGW = getCurrentGameweek(fplData.events);
            setSelectedGameweek(currentGW?.id || 1);
        }
    }, [fplData, selectedGameweek]);

    if (loading || !fplData) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading fixtures...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                        Error Loading Fixtures
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </Layout>
        );
    }

    const teams = fplData.teams;
    const events = fplData.events;
    const currentGameweek = getCurrentGameweek(events);
    const nextGameweek = getNextGameweek(events);

    // Filter fixtures by gameweek and completion status
    const filteredFixtures = fixtures.filter(fixture => {
        if (selectedGameweek && fixture.event !== selectedGameweek) return false;
        if (filterCompleted && !fixture.finished) return false;
        return true;
    });

    // Group fixtures by gameweek if no specific gameweek is selected
    const groupedFixtures = selectedGameweek
        ? { [selectedGameweek]: filteredFixtures }
        : filteredFixtures.reduce((acc, fixture) => {
            if (!acc[fixture.event]) acc[fixture.event] = [];
            acc[fixture.event].push(fixture);
            return acc;
        }, {});

    const getTeamById = (teamId) => teams.find(team => team.id === teamId);

    // Get next 5 fixtures for each team with FDR analysis
    const getTeamFDRData = () => {
        if (!teams || !fixtures.length || !events) return [];

        const currentGW = getCurrentGameweek(events);
        const currentGWIndex = currentGW ? currentGW.id : 1;

        return teams.map(team => {
            const upcomingFixtures = fixtures
                .filter(fixture =>
                    (fixture.team_h === team.id || fixture.team_a === team.id) &&
                    fixture.event >= currentGWIndex &&
                    fixture.event <= currentGWIndex + 4 &&
                    !fixture.finished
                )
                .sort((a, b) => a.event - b.event)
                .slice(0, 5);

            const fdrData = upcomingFixtures.map(fixture => {
                const isHome = fixture.team_h === team.id;
                const opponent = isHome ? getTeamById(fixture.team_a) : getTeamById(fixture.team_h);
                const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;

                return {
                    gameweek: fixture.event,
                    opponent: opponent?.short_name || 'TBC',
                    opponentName: opponent?.name || 'To Be Confirmed',
                    isHome,
                    difficulty,
                    kickoff: fixture.kickoff_time
                };
            });

            // Calculate average FDR
            const avgFDR = fdrData.length > 0
                ? (fdrData.reduce((sum, f) => sum + f.difficulty, 0) / fdrData.length).toFixed(1)
                : 0;

            return {
                team,
                fixtures: fdrData,
                averageFDR: parseFloat(avgFDR),
                totalFixtures: fdrData.length
            };
        }).sort((a, b) => a.averageFDR - b.averageFDR); // Sort by easiest fixtures first
    };

    const teamFDRData = getTeamFDRData();

    const formatKickoffTime = (kickoffTime) => {
        if (!kickoffTime) return 'TBC';
        try {
            const date = new Date(kickoffTime);
            return date.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'TBC';
        }
    };

    const getDifficultyColor = (difficulty) => {
        if (difficulty <= 2) return 'bg-green-500';
        if (difficulty <= 3) return 'bg-yellow-500';
        if (difficulty <= 4) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const handleGameweekChange = (direction) => {
        const currentIndex = events.findIndex(event => event.id === selectedGameweek);
        let newIndex = currentIndex + direction;

        if (newIndex < 0) newIndex = 0;
        if (newIndex >= events.length) newIndex = events.length - 1;

        setSelectedGameweek(events[newIndex].id);
    };

    const FDRTeamCard = ({ teamData }) => {
        const { team, fixtures, averageFDR, totalFixtures } = teamData;

        const getAverageFDRColor = (avgFDR) => {
            if (avgFDR <= 2.5) return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30';
            if (avgFDR <= 3.5) return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30';
            if (avgFDR <= 4) return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30';
            return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
        };

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                {/* Team Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{team.short_name}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getAverageFDRColor(averageFDR)}`}>
                        Avg: {averageFDR}
                    </div>
                </div>

                {/* Fixtures Grid */}
                <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }, (_, index) => {
                        const fixture = fixtures[index];
                        const currentGW = getCurrentGameweek(events);
                        const gameweek = currentGW ? currentGW.id + index : index + 1;

                        if (!fixture) {
                            return (
                                <div key={index} className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <div className="text-xs text-gray-400 mb-1">GW{gameweek}</div>
                                    <div className="text-xs text-gray-400">-</div>
                                </div>
                            );
                        }

                        return (
                            <div key={fixture.gameweek} className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    GW{fixture.gameweek}
                                </div>
                                <div className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                                    {fixture.isHome ? 'vs' : '@'} {fixture.opponent}
                                </div>
                                <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-bold text-white ${getDifficultyColor(fixture.difficulty)}`}>
                                    {fixture.difficulty}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Team Stats */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>Next {totalFixtures} fixtures</span>
                        <span>
                            {fixtures.filter(f => f.isHome).length}H / {fixtures.filter(f => !f.isHome).length}A
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const FixtureCard = ({ fixture }) => {
        const homeTeam = getTeamById(fixture.team_h);
        const awayTeam = getTeamById(fixture.team_a);

        if (!homeTeam || !awayTeam) return null;

        const homeDifficulty = getFixtureDifficulty(fixture.team_h_difficulty);
        const awayDifficulty = getFixtureDifficulty(fixture.team_a_difficulty);
        const fixtureStatus = getFixtureStatus(fixture);

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {formatKickoffTime(fixture.kickoff_time)}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded text-white ${fixtureStatus.color}`}>
                        {fixtureStatus.status}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div className="flex items-center gap-3 flex-1">
                        <div className="text-right">
                            <div className="font-medium text-gray-900 dark:text-white">
                                {homeTeam.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {homeTeam.short_name}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <div
                                className={`w-3 h-3 rounded ${getDifficultyColor(fixture.team_h_difficulty)}`}
                                title={`Home difficulty: ${homeDifficulty.rating}`}
                            ></div>
                            <span className="text-xs text-gray-500">{fixture.team_h_difficulty}</span>
                        </div>
                    </div>

                    {/* Score or VS */}
                    <div className="px-4 py-2 mx-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center min-w-[80px]">
                        {fixture.finished ? (
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {fixture.team_h_score} - {fixture.team_a_score}
                            </div>
                        ) : (
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                VS
                            </div>
                        )}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">{fixture.team_a_difficulty}</span>
                            <div
                                className={`w-3 h-3 rounded ${getDifficultyColor(fixture.team_a_difficulty)}`}
                                title={`Away difficulty: ${awayDifficulty.rating}`}
                            ></div>
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white">
                                {awayTeam.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {awayTeam.short_name}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional fixture info */}
                {(fixture.stats?.length > 0 || fixture.pulse_id) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            {fixture.stats?.length > 0 && (
                                <span>Stats Available</span>
                            )}
                            {fixture.pulse_id && (
                                <span>Live Updates</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Premier League {viewMode === 'fixtures' ? 'Fixtures' : 'FDR Analysis'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {viewMode === 'fixtures'
                            ? 'View fixtures with FDR (Fixture Difficulty Rating) for better planning'
                            : 'Analyze next 5 gameweeks for all teams sorted by fixture difficulty'
                        }
                    </p>
                </div>

                {/* View Mode Toggle */}
                <div className="mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 inline-flex">
                        <button
                            onClick={() => setViewMode('fixtures')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'fixtures'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                : 'text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400'
                                }`}
                        >
                            <Grid3X3 className="w-4 h-4" />
                            Fixtures
                        </button>
                        <button
                            onClick={() => setViewMode('fdr')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'fdr'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                : 'text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400'
                                }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            FDR Analysis
                        </button>
                    </div>
                </div>

                {/* Controls - only show for fixtures view */}
                {viewMode === 'fixtures' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            {/* Gameweek Navigation */}
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Gameweek:
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleGameweekChange(-1)}
                                        disabled={selectedGameweek === 1}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <select
                                        value={selectedGameweek || ''}
                                        onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
                                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">All Gameweeks</option>
                                        {events.map(event => (
                                            <option key={event.id} value={event.id}>
                                                GW{event.id} {event.id === currentGameweek?.id && '(Current)'}
                                                {event.id === nextGameweek?.id && '(Next)'}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleGameweekChange(1)}
                                        disabled={selectedGameweek === events.length}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={filterCompleted}
                                        onChange={(e) => setFilterCompleted(e.target.checked)}
                                        className="rounded border-gray-300 dark:border-gray-600"
                                    />
                                    Show only completed
                                </label>
                            </div>
                        </div>

                        {/* FDR Legend */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-6">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    FDR Legend:
                                </span>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded bg-green-500"></div>
                                        <span>1-2 Easy</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded bg-yellow-500"></div>
                                        <span>3 Medium</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded bg-orange-500"></div>
                                        <span>4 Hard</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded bg-red-500"></div>
                                        <span>5 Very Hard</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FDR Analysis Header */}
                {viewMode === 'fdr' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    Next 5 Gameweeks FDR Analysis
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Teams sorted by average fixture difficulty (easier fixtures first)
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Current GW: {currentGameweek?.id || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-400">
                                    Analyzing GW{currentGameweek?.id || 1} - GW{(currentGameweek?.id || 1) + 4}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                {viewMode === 'fdr' ? (
                    // FDR Analysis View
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {teamFDRData.map(teamData => (
                            <FDRTeamCard key={teamData.team.id} teamData={teamData} />
                        ))}
                    </div>
                ) : (
                    // Fixtures View
                    <div className="space-y-6">
                        {Object.entries(groupedFixtures).map(([gameweek, gameweekFixtures]) => (
                            <div key={gameweek}>
                                {!selectedGameweek && (
                                    <div className="flex items-center gap-3 mb-4">
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            Gameweek {gameweek}
                                        </h2>
                                        {parseInt(gameweek) === currentGameweek?.id && (
                                            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                                                Current
                                            </span>
                                        )}
                                        {parseInt(gameweek) === nextGameweek?.id && (
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                                Next
                                            </span>
                                        )}
                                    </div>
                                )}

                                {gameweekFixtures.length === 0 ? (
                                    <div className="text-center py-8">
                                        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">
                                            No fixtures available for this gameweek
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                        {gameweekFixtures
                                            .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
                                            .map(fixture => (
                                                <FixtureCard key={fixture.id} fixture={fixture} />
                                            ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {((viewMode === 'fixtures' && filteredFixtures.length === 0) ||
                    (viewMode === 'fdr' && teamFDRData.length === 0)) && (
                        <div className="text-center py-12">
                            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                                No Data Found
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {viewMode === 'fixtures'
                                    ? 'Try adjusting your filters to see more fixtures'
                                    : 'Unable to load FDR data at this time'
                                }
                            </p>
                        </div>
                    )}
            </div>
        </Layout>
    );
}
