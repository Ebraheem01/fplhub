'use client';

import { useState, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useFPLData } from '@/hooks/useFPLData';
import { useFixtures } from '@/hooks/useFixtures';
import {
    formatPosition,
    formatPrice,
    getPlayerStatus,
    getTeamShortName,
    getFixtureDifficulty
} from '@/utils/fplHelpers';
import {
    Crown,
    TrendingUp,
    DollarSign,
    Star,
    Users,
    Target,
    Gem,
    Trophy,
    Zap
} from 'lucide-react';

export default function Gems() {
    const { data: fplData, loading, error } = useFPLData();
    const { fixtures } = useFixtures();

    // Get next opponent and FDR for a player
    const getNextOpponent = useCallback((playerId) => {
        if (!fplData || !fixtures.length) return null;

        const player = fplData.elements.find(p => p.id === playerId);
        if (!player) return null;

        const upcomingFixture = fixtures.find(fixture =>
            (fixture.team_h === player.team || fixture.team_a === player.team) &&
            !fixture.finished
        );

        if (!upcomingFixture) return null;

        const isHome = upcomingFixture.team_h === player.team;
        const opponentId = isHome ? upcomingFixture.team_a : upcomingFixture.team_h;
        const opponent = fplData.teams.find(t => t.id === opponentId);
        const difficulty = isHome ? upcomingFixture.team_h_difficulty : upcomingFixture.team_a_difficulty;

        return {
            opponent: opponent?.short_name || 'TBC',
            isHome,
            difficulty,
            kickoff: upcomingFixture.kickoff_time
        };
    }, [fplData, fixtures]);

    // Get top players for each category
    const gemPicks = useMemo(() => {
        if (!fplData || !fixtures.length) return { captains: [], differentials: [], budget: [] };

        // Calculate captain score
        const calculateCaptainScore = (player) => {
            if (!player.ep_next || player.ep_next === null) return 0;

            const nextOpponent = getNextOpponent(player.id);
            const epNext = parseFloat(player.ep_next) || 0;
            const form = parseFloat(player.form) || 0;
            const fdr = nextOpponent?.difficulty || 3;

            // Lower FDR is better, so we invert it (5 - fdr)
            const fdrScore = 5 - fdr;

            // Weight: EP Next (50%), Form (30%), FDR (20%)
            return (epNext * 0.5) + (form * 0.3) + (fdrScore * 0.2);
        };

        // Calculate differential score
        const calculateDifferentialScore = (player) => {
            if (!player.ep_next || player.ep_next === null) return 0;

            const nextOpponent = getNextOpponent(player.id);
            const epNext = parseFloat(player.ep_next) || 0;
            const form = parseFloat(player.form) || 0;
            const ownership = parseFloat(player.selected_by_percent) || 0;
            const fdr = nextOpponent?.difficulty || 3;

            // Lower ownership is better for differentials
            const ownershipScore = Math.max(0, 15 - ownership); // Cap at 15% ownership
            const fdrScore = 5 - fdr;

            // Weight: EP Next (35%), Ownership (35%), Form (20%), FDR (10%)
            return (epNext * 0.35) + (ownershipScore * 0.35) + (form * 0.2) + (fdrScore * 0.1);
        };

        // Calculate budget score
        const calculateBudgetScore = (player) => {
            if (!player.ep_next || player.ep_next === null || player.now_cost > 50) return 0; // Max 5.0m

            const nextOpponent = getNextOpponent(player.id);
            const epNext = parseFloat(player.ep_next) || 0;
            const form = parseFloat(player.form) || 0;
            const cost = player.now_cost / 10; // Convert to millions
            const fdr = nextOpponent?.difficulty || 3;

            // Value for money calculation
            const valueScore = cost > 0 ? epNext / cost : 0;
            const fdrScore = 5 - fdr;

            // Weight: Value (40%), EP Next (30%), Form (20%), FDR (10%)
            return (valueScore * 0.4) + (epNext * 0.3) + (form * 0.2) + (fdrScore * 0.1);
        };

        const availablePlayers = fplData.elements.filter(player => {
            const status = getPlayerStatus(player.status, player.chance_of_playing_next_round);
            return status.available && player.ep_next && player.ep_next > 0;
        });

        // Top 5 Captain Picks (attacking players prioritized)
        const captains = availablePlayers
            .filter(player => player.element_type >= 3) // Midfielders and Forwards
            .map(player => ({ ...player, score: calculateCaptainScore(player) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        // Top 5 Differential Picks (low ownership)
        const differentials = availablePlayers
            .filter(player => parseFloat(player.selected_by_percent) <= 15) // Max 15% ownership
            .map(player => ({ ...player, score: calculateDifferentialScore(player) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        // Top 5 Budget Picks (max 5.0m)
        const budget = availablePlayers
            .filter(player => player.now_cost <= 50) // Max 5.0m
            .map(player => ({ ...player, score: calculateBudgetScore(player) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        return { captains, differentials, budget };
    }, [fplData, fixtures, getNextOpponent]);

    if (loading || !fplData) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading gems...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <Gem className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                        Error Loading Data
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </Layout>
        );
    }

    const PlayerGemCard = ({ player, category, rank }) => {
        const nextOpponent = getNextOpponent(player.id);
        const playerStatus = getPlayerStatus(player.status, player.chance_of_playing_next_round);
        const playerTeam = fplData.teams.find(t => t.id === player.team);

        const getCategoryIcon = () => {
            switch (category) {
                case 'captain': return <Crown className="w-5 h-5" />;
                case 'differential': return <TrendingUp className="w-5 h-5" />;
                case 'budget': return <DollarSign className="w-5 h-5" />;
                default: return <Star className="w-5 h-5" />;
            }
        };

        const getCategoryColor = () => {
            switch (category) {
                case 'captain': return 'bg-yellow-500';
                case 'differential': return 'bg-green-500';
                case 'budget': return 'bg-blue-500';
                default: return 'bg-purple-500';
            }
        };

        const getRankColor = () => {
            switch (rank) {
                case 1: return 'bg-yellow-500 text-white';
                case 2: return 'bg-gray-400 text-white';
                case 3: return 'bg-yellow-600 text-white';
                default: return 'bg-gray-300 text-gray-700';
            }
        };

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getCategoryColor()}`}>
                            {getCategoryIcon()}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {player.web_name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {playerTeam?.name} • {formatPosition(player.element_type)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankColor()}`}>
                            {rank}
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                £{formatPrice(player.now_cost)}m
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3 text-sm">
                    <div className="text-center">
                        <div className="font-medium text-purple-600 dark:text-purple-400">
                            {player.ep_next}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">EP Next</div>
                    </div>
                    <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">
                            {player.form}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Form</div>
                    </div>
                    <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">
                            {player.selected_by_percent}%
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Owned</div>
                    </div>
                    <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">
                            {player.total_points}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Points</div>
                    </div>
                </div>

                {nextOpponent && (
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Next: </span>
                            <span className="font-medium">
                                {nextOpponent.isHome ? 'vs' : '@'} {nextOpponent.opponent}
                            </span>
                        </div>
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${nextOpponent.difficulty <= 2 ? 'bg-green-500' :
                                nextOpponent.difficulty <= 3 ? 'bg-yellow-500' :
                                    nextOpponent.difficulty <= 4 ? 'bg-orange-500' : 'bg-red-500'
                            }`}>
                            {nextOpponent.difficulty}
                        </div>
                    </div>
                )}

                {/* Category-specific insights */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    {category === 'captain' && (
                        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                            <Trophy className="w-4 h-4" />
                            <span>Strong captaincy option</span>
                        </div>
                    )}
                    {category === 'differential' && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <Zap className="w-4 h-4" />
                            <span>Low ownership differential</span>
                        </div>
                    )}
                    {category === 'budget' && player.now_cost > 0 && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                            <Target className="w-4 h-4" />
                            <span>Value: {(parseFloat(player.ep_next) / (player.now_cost / 10)).toFixed(2)} EP/£</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                            <Gem className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">FPL Gems</h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Discover the best captain picks, differentials, and budget options for the next gameweek
                            </p>
                        </div>
                    </div>
                </div>

                {/* Captain Picks */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                            <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Top Captain Picks</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Best options for your armband based on expected points, form, and fixture difficulty
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {gemPicks.captains.map((player, index) => (
                            <PlayerGemCard
                                key={player.id}
                                player={player}
                                category="captain"
                                rank={index + 1}
                            />
                        ))}
                    </div>
                </div>

                {/* Differential Picks */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Differential Picks</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Low-owned players with high potential to gain you rank
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {gemPicks.differentials.map((player, index) => (
                            <PlayerGemCard
                                key={player.id}
                                player={player}
                                category="differential"
                                rank={index + 1}
                            />
                        ))}
                    </div>
                </div>

                {/* Budget Picks */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Picks</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Best value players under £5.0m with great potential
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {gemPicks.budget.map((player, index) => (
                            <PlayerGemCard
                                key={player.id}
                                player={player}
                                category="budget"
                                rank={index + 1}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer Note */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p>
                        Gems are updated automatically based on the latest FPL data. Recommendations consider expected points,
                        form, fixture difficulty, and ownership percentages. Always do your own research before making transfers!
                    </p>
                </div>
            </div>
        </Layout>
    );
}
