'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { useFPLData, useManagerData } from '@/hooks/useFPLData';
import { formatPrice, getCurrentGameweek, getPlayerStatus } from '@/utils/fplHelpers';
import {
    Search,
    User,
    Trophy,
    TrendingUp,
    Users,
    Clock,
    Target,
    Star,
    Activity
} from 'lucide-react';

export default function Dashboard() {
    const [managerId, setManagerId] = useState('');
    const [searchTriggered, setSearchTriggered] = useState(false);

    const { data: fplData, loading: fplLoading } = useFPLData();
    const { profile, history, currentPicks, loading: managerLoading, error } = useManagerData(
        searchTriggered ? managerId : null
    );

    const handleSearch = (e) => {
        e.preventDefault();
        if (managerId.trim()) {
            setSearchTriggered(true);
        }
    };

    const currentGameweek = fplData ? getCurrentGameweek(fplData.events) : null;

    return (
        <Layout>
            <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        FPL Dashboard
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Track your Fantasy Premier League performance and get insights to improve your game.
                    </p>
                </div>

                {/* Manager Search */}
                <div className="max-w-md mx-auto">
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={managerId}
                                onChange={(e) => setManagerId(e.target.value)}
                                placeholder="Enter your FPL Manager ID"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!managerId.trim() || managerLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {managerLoading ? 'Loading...' : 'Search Manager'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {/* Manager Profile */}
                {profile && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                    <User className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {profile.player_first_name} {profile.player_last_name}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {profile.name}
                                    </p>
                                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span>Team: {profile.player_region_name}</span>
                                        <span>Started: GW{profile.started_event}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Manager Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {profile.summary_overall_rank?.toLocaleString() || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Overall Rank
                                </div>
                            </div>

                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <Target className="w-6 h-6 mx-auto mb-2 text-green-500" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {profile.summary_overall_points || 0}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Total Points
                                </div>
                            </div>

                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <Activity className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {currentGameweek ? currentGameweek.name : 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Current GW
                                </div>
                            </div>

                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    £{(profile.last_deadline_value / 10).toFixed(1)}m
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Team Value
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Current Team */}
                {currentPicks && fplData && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                            Current Team - {currentGameweek?.name}
                        </h3>

                        <div className="space-y-4">
                            {/* Starting XI */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                    Starting XI
                                </h4>
                                <div className="grid gap-3">
                                    {currentPicks.picks
                                        .filter(pick => pick.multiplier > 0)
                                        .map((pick) => {
                                            const player = fplData.elements.find(p => p.id === pick.element);
                                            if (!player) return null;

                                            const status = getPlayerStatus(player.status, player.chance_of_playing_next_round);

                                            return (
                                                <div
                                                    key={pick.element}
                                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="relative">
                                                            {pick.is_captain && (
                                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                                                                    <span className="text-xs text-white font-bold">C</span>
                                                                </div>
                                                            )}
                                                            {pick.is_vice_captain && (
                                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                                                                    <span className="text-xs text-white font-bold">V</span>
                                                                </div>
                                                            )}
                                                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                                                <span className="text-white font-bold text-sm">
                                                                    {player.web_name.substring(0, 2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                {player.web_name}
                                                            </div>
                                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                                {fplData.teams.find(t => t.id === player.team)?.short_name} • £{formatPrice(player.now_cost)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="font-bold text-gray-900 dark:text-white">
                                                            {player.total_points} pts
                                                        </div>
                                                        <div className={`text-xs ${status.available ? 'text-green-600' : 'text-red-600'}`}>
                                                            {status.text}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Bench */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                    Bench
                                </h4>
                                <div className="grid gap-3">
                                    {currentPicks.picks
                                        .filter(pick => pick.multiplier === 0)
                                        .map((pick) => {
                                            const player = fplData.elements.find(p => p.id === pick.element);
                                            if (!player) return null;

                                            return (
                                                <div
                                                    key={pick.element}
                                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg opacity-75"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                                                            <span className="text-white font-bold text-xs">
                                                                {player.web_name.substring(0, 2)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                {player.web_name}
                                                            </div>
                                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                                {fplData.teams.find(t => t.id === player.team)?.short_name} • £{formatPrice(player.now_cost)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="font-bold text-gray-900 dark:text-white">
                                                            {player.total_points} pts
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Performance */}
                {history && history.current && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                            Recent Performance
                        </h3>

                        <div className="space-y-3">
                            {history.current.slice(-5).reverse().map((gw) => (
                                <div
                                    key={gw.event}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                            GW{gw.event}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Rank: {gw.overall_rank?.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                            {gw.points} pts
                                        </div>
                                        {gw.event_transfers > 0 && (
                                            <div className="text-sm text-orange-600">
                                                -{gw.event_transfers_cost} pts (transfers)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Stats */}
                {!profile && !managerLoading && (
                    <div className="text-center py-12">
                        <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                            Search for a Manager
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Enter a manager ID above to view their FPL dashboard and team details.
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
