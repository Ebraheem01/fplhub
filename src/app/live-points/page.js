'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useFPLData, useLiveGameweek, useManagerData } from '@/hooks/useFPLData';
import { formatPrice, getCurrentGameweek, isGameweekLive, formatDeadline } from '@/utils/fplHelpers';
import {
    Activity,
    RefreshCw,
    Clock,
    TrendingUp,
    Users,
    Target,
    Play,
    Pause,
    Search
} from 'lucide-react';

export default function LivePoints() {
    const [managerId, setManagerId] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [searchTriggered, setSearchTriggered] = useState(false);

    const { data: fplData, loading: fplLoading } = useFPLData();
    const currentGameweek = fplData ? getCurrentGameweek(fplData.events) : null;

    const { liveData, loading: liveLoading, lastUpdated, refresh } = useLiveGameweek(
        currentGameweek?.id,
        autoRefresh
    );

    const { profile, currentPicks, loading: managerLoading } = useManagerData(
        searchTriggered ? managerId : null
    );

    const handleSearch = (e) => {
        e.preventDefault();
        if (managerId.trim()) {
            setSearchTriggered(true);
        }
    };

    const isLive = currentGameweek ? isGameweekLive(currentGameweek.deadline_time) : false;

    // Calculate live points for manager's team
    const calculateLivePoints = () => {
        if (!currentPicks || !liveData || !fplData) return null;

        let totalPoints = 0;
        const playerStats = [];

        currentPicks.picks.forEach((pick) => {
            const player = fplData.elements.find(p => p.id === pick.element);
            const liveStats = liveData.elements.find(e => e.id === pick.element)?.stats;

            if (player && liveStats) {
                let points = 0;

                // Minutes played
                if (liveStats.minutes > 0) {
                    points += player.element_type <= 2 ? 1 : 2; // GK/DEF get 1, MID/FWD get 2
                }

                // Goals
                points += liveStats.goals_scored * (player.element_type === 4 ? 4 : player.element_type === 3 ? 5 : 6);

                // Assists
                points += liveStats.assists * 3;

                // Clean sheets
                if (liveStats.clean_sheets > 0) {
                    points += player.element_type <= 2 ? 4 : player.element_type === 3 ? 1 : 0;
                }

                // Bonus points
                points += liveStats.bonus || 0;

                // Penalties and other stats
                points += liveStats.penalties_saved * 5;
                points += liveStats.penalties_missed * -2;
                points += liveStats.own_goals * -2;
                points += liveStats.yellow_cards * -1;
                points += liveStats.red_cards * -3;

                // Apply multiplier (captain gets 2x, vice-captain gets 1x unless captain doesn't play)
                const multiplier = pick.is_captain ? 2 : pick.multiplier;
                const playerPoints = points * multiplier;

                if (pick.multiplier > 0) { // Only count if in starting XI
                    totalPoints += playerPoints;
                }

                playerStats.push({
                    ...player,
                    liveStats,
                    points,
                    multiplier,
                    totalPoints: playerPoints,
                    isPlaying: pick.multiplier > 0
                });
            }
        });

        return { totalPoints, playerStats };
    };

    const liveTeamData = calculateLivePoints();

    return (
        <Layout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                            Live Points
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Track your team&apos;s performance in real-time during gameweeks
                        </p>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${autoRefresh
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
                        </button>

                        <button
                            onClick={refresh}
                            disabled={liveLoading}
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${liveLoading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Gameweek Status */}
                {currentGameweek && (
                    <div className={`p-6 rounded-xl border ${isLive
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-full ${isLive ? 'bg-green-500' : 'bg-blue-500'
                                    }`}>
                                    {isLive ? (
                                        <Activity className="w-6 h-6 text-white" />
                                    ) : (
                                        <Clock className="w-6 h-6 text-white" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {currentGameweek.name}
                                    </h3>
                                    <p className={`text-sm ${isLive
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-blue-600 dark:text-blue-400'
                                        }`}>
                                        {isLive ? 'Gameweek is LIVE' : `Deadline: ${formatDeadline(currentGameweek.deadline_time)}`}
                                    </p>
                                </div>
                            </div>

                            {lastUpdated && (
                                <div className="text-right">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Last updated
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {lastUpdated.toLocaleTimeString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Manager Search */}
                {!profile && (
                    <div className="max-w-md mx-auto">
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={managerId}
                                    onChange={(e) => setManagerId(e.target.value)}
                                    placeholder="Enter Manager ID to track live points"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!managerId.trim() || managerLoading}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50"
                            >
                                {managerLoading ? 'Loading...' : 'Track Live Points'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Live Team Performance */}
                {liveTeamData && profile && (
                    <div className="space-y-6">
                        {/* Live Score Summary */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {profile.name} - Live Score
                                </h3>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-purple-600">
                                        {liveTeamData.totalPoints}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Live Points
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                        {liveTeamData.playerStats.filter(p => p.liveStats.minutes > 0 && p.isPlaying).length}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Playing
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <Target className="w-6 h-6 mx-auto mb-2 text-green-500" />
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                        {liveTeamData.playerStats.reduce((sum, p) => sum + (p.liveStats.goals_scored || 0), 0)}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Goals
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                        {liveTeamData.playerStats.reduce((sum, p) => sum + (p.liveStats.assists || 0), 0)}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Assists
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Player Performance */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                                Player Performance
                            </h3>

                            <div className="space-y-3">
                                {liveTeamData.playerStats
                                    .filter(p => p.isPlaying)
                                    .sort((a, b) => b.totalPoints - a.totalPoints)
                                    .map((player) => (
                                        <div
                                            key={player.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="relative">
                                                    {player.multiplier === 2 && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                                                            <span className="text-xs text-white font-bold">C</span>
                                                        </div>
                                                    )}
                                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white font-bold">
                                                            {player.web_name.substring(0, 2)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {player.web_name}
                                                    </div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        {fplData?.teams.find(t => t.id === player.team)?.short_name} • £{formatPrice(player.now_cost)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {player.liveStats.minutes}&apos; |
                                                        G: {player.liveStats.goals_scored || 0} |
                                                        A: {player.liveStats.assists || 0} |
                                                        Bonus: {player.liveStats.bonus || 0}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xl font-bold text-purple-600">
                                                    {player.totalPoints}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    {player.points} × {player.multiplier}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* No Data State */}
                {!currentGameweek && !fplLoading && (
                    <div className="text-center py-12">
                        <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                            No Active Gameweek
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            There&apos;s no active gameweek at the moment. Check back during the season!
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
