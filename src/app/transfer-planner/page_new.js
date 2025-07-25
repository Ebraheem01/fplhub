'use client';

import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useFPLData } from '@/hooks/useFPLData';
import { useFixtures } from '@/hooks/useFixtures';
import {
    formatPosition,
    formatPrice,
    getPlayerStatus,
    calculatePPM,
    getTransferTrend,
    sortPlayers,
    filterPlayers,
    getTeamShortName,
    getFixtureDifficulty
} from '@/utils/fplHelpers';
import {
    Users,
    Search,
    Filter,
    TrendingUp,
    TrendingDown,
    Star,
    DollarSign,
    Activity,
    AlertTriangle,
    Plus,
    Minus,
    RotateCcw,
    Save,
    Target,
    Shield,
    Zap
} from 'lucide-react';

export default function TeamPlanner() {
    // Team state - stores selected player IDs by position
    const [team, setTeam] = useState({
        goalkeepers: [], // max 2
        defenders: [],   // max 5
        midfielders: [], // max 5
        forwards: []     // max 3
    });

    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPosition, setSelectedPosition] = useState(1); // Start with goalkeepers
    const [maxPrice, setMaxPrice] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [sortBy, setSortBy] = useState('ep_next');
    const [showFilters, setShowFilters] = useState(false);
    const [availableOnly, setAvailableOnly] = useState(true);

    const { data: fplData, loading, error } = useFPLData();
    const { fixtures } = useFixtures();

    // Position constraints
    const positionLimits = {
        1: { min: 2, max: 2, name: 'Goalkeepers', key: 'goalkeepers' },
        2: { min: 5, max: 5, name: 'Defenders', key: 'defenders' },
        3: { min: 5, max: 5, name: 'Midfielders', key: 'midfielders' },
        4: { min: 3, max: 3, name: 'Forwards', key: 'forwards' }
    };

    const positions = [
        { value: 1, label: 'Goalkeepers' },
        { value: 2, label: 'Defenders' },
        { value: 3, label: 'Midfielders' },
        { value: 4, label: 'Forwards' }
    ];

    const sortOptions = [
        { value: 'ep_next', label: 'Expected Points (Next)' },
        { value: 'total_points', label: 'Total Points' },
        { value: 'form', label: 'Form' },
        { value: 'value', label: 'Points per Million' },
        { value: 'selected_by_percent', label: 'Ownership %' },
        { value: 'now_cost', label: 'Price' }
    ];

    // Calculate team stats
    const teamStats = useMemo(() => {
        if (!fplData) return { totalCost: 0, totalPlayers: 0, isValid: false };

        const allSelectedPlayers = [
            ...team.goalkeepers,
            ...team.defenders,
            ...team.midfielders,
            ...team.forwards
        ];

        const totalCost = allSelectedPlayers.reduce((sum, playerId) => {
            const player = fplData.elements.find(p => p.id === playerId);
            return sum + (player ? player.now_cost : 0);
        }, 0);

        const totalPlayers = allSelectedPlayers.length;
        const budget = 1000; // 100.0m in tenths

        // Check if team is valid (correct number of players per position)
        const isValid = Object.entries(positionLimits).every(([pos, limits]) => {
            const posKey = limits.key;
            const count = team[posKey].length;
            return count === limits.max;
        });

        return {
            totalCost,
            totalPlayers,
            budget,
            remainingBudget: budget - totalCost,
            isValid,
            isOverBudget: totalCost > budget
        };
    }, [team, fplData, positionLimits]);

    // Get next opponent for a player
    const getNextOpponent = (playerId) => {
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
    };

    // Filter and sort players for current position
    const availablePlayers = useMemo(() => {
        if (!fplData) return [];

        let players = fplData.elements.filter(player => {
            // Filter by position
            if (selectedPosition && player.element_type !== selectedPosition) return false;

            // Filter by search term
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                if (!player.web_name.toLowerCase().includes(searchLower) &&
                    !player.first_name.toLowerCase().includes(searchLower) &&
                    !player.second_name.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }

            // Filter by price range
            if (maxPrice && player.now_cost > parseFloat(maxPrice) * 10) return false;
            if (minPrice && player.now_cost < parseFloat(minPrice) * 10) return false;

            // Filter by availability
            if (availableOnly) {
                const status = getPlayerStatus(player.status, player.chance_of_playing_next_round);
                if (!status.available) return false;
            }

            // Don't show already selected players
            const allSelected = [
                ...team.goalkeepers,
                ...team.defenders,
                ...team.midfielders,
                ...team.forwards
            ];
            if (allSelected.includes(player.id)) return false;

            return true;
        });

        // Sort players
        return sortPlayers(players, sortBy);
    }, [fplData, selectedPosition, searchTerm, maxPrice, minPrice, availableOnly, sortBy, team]);

    // Add player to team
    const addPlayer = (player) => {
        const positionKey = positionLimits[player.element_type].key;
        const currentCount = team[positionKey].length;
        const maxCount = positionLimits[player.element_type].max;

        if (currentCount < maxCount) {
            setTeam(prev => ({
                ...prev,
                [positionKey]: [...prev[positionKey], player.id]
            }));
        }
    };

    // Remove player from team
    const removePlayer = (playerId, elementType) => {
        const positionKey = positionLimits[elementType].key;
        setTeam(prev => ({
            ...prev,
            [positionKey]: prev[positionKey].filter(id => id !== playerId)
        }));
    };

    // Reset team
    const resetTeam = () => {
        setTeam({
            goalkeepers: [],
            defenders: [],
            midfielders: [],
            forwards: []
        });
    };

    if (loading || !fplData) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading team planner...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                        Error Loading Data
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </Layout>
        );
    }

    const PlayerCard = ({ player }) => {
        const nextOpponent = getNextOpponent(player.id);
        const playerStatus = getPlayerStatus(player.status, player.chance_of_playing_next_round);
        const team = fplData.teams.find(t => t.id === player.team);

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {player.web_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {team?.name} • {formatPosition(player.element_type)}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            £{formatPrice(player.now_cost)}m
                        </div>
                        {player.ep_next && (
                            <div className="text-sm text-purple-600 dark:text-purple-400">
                                EP: {player.ep_next}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                    <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">
                            {player.total_points}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Points</div>
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
                </div>

                {nextOpponent && (
                    <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
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

                <div className="flex items-center justify-between">
                    <div className={`text-xs px-2 py-1 rounded ${playerStatus.color}`}>
                        {playerStatus.text}
                    </div>
                    <button
                        onClick={() => addPlayer(player)}
                        className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>
            </div>
        );
    };

    const SelectedPlayerCard = ({ playerId, elementType }) => {
        const player = fplData.elements.find(p => p.id === playerId);
        if (!player) return null;

        const nextOpponent = getNextOpponent(player.id);
        const team = fplData.teams.find(t => t.id === player.team);

        return (
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                            {player.web_name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {team?.short_name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">£{formatPrice(player.now_cost)}m</span>
                        <button
                            onClick={() => removePlayer(playerId, elementType)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                    <div>
                        {player.ep_next && (
                            <span className="text-purple-600 dark:text-purple-400">
                                EP: {player.ep_next}
                            </span>
                        )}
                    </div>
                    {nextOpponent && (
                        <div className="flex items-center gap-1">
                            <span>{nextOpponent.isHome ? 'vs' : '@'} {nextOpponent.opponent}</span>
                            <div className={`w-4 h-4 rounded text-xs flex items-center justify-center text-white ${nextOpponent.difficulty <= 2 ? 'bg-green-500' :
                                    nextOpponent.difficulty <= 3 ? 'bg-yellow-500' :
                                        nextOpponent.difficulty <= 4 ? 'bg-orange-500' : 'bg-red-500'
                                }`}>
                                {nextOpponent.difficulty}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Layout>
            <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        Team Planner
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Build your perfect FPL team with budget and formation constraints.
                    </p>
                </div>

                {/* Team Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                            <DollarSign className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                £{formatPrice(teamStats.totalCost)}m
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Spent</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <Activity className="w-8 h-8 mx-auto mb-2 text-green-600" />
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                £{formatPrice(teamStats.remainingBudget)}m
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Remaining</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {teamStats.totalPlayers}/14
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Players</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                            <Target className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                            <div className={`text-2xl font-bold ${teamStats.isValid ? 'text-green-600' : 'text-red-600'}`}>
                                {teamStats.isValid ? 'Valid' : 'Invalid'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Team</div>
                        </div>
                    </div>

                    {teamStats.isOverBudget && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
                            <div className="flex items-center text-red-600 dark:text-red-400">
                                <AlertTriangle className="w-5 h-5 mr-2" />
                                <span>Team is over budget! Please remove players or select cheaper alternatives.</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={resetTeam}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset Team
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Selected Team */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Team</h2>

                        {Object.entries(positionLimits).map(([elementType, limits]) => {
                            const selectedPlayers = team[limits.key];
                            const count = selectedPlayers.length;

                            return (
                                <div key={elementType} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            {elementType === '1' && <Shield className="w-5 h-5" />}
                                            {elementType === '2' && <Shield className="w-5 h-5" />}
                                            {elementType === '3' && <Zap className="w-5 h-5" />}
                                            {elementType === '4' && <Target className="w-5 h-5" />}
                                            {limits.name}
                                        </h3>
                                        <span className={`px-2 py-1 rounded text-sm ${count === limits.max
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {count}/{limits.max}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {selectedPlayers.map(playerId => (
                                            <SelectedPlayerCard
                                                key={playerId}
                                                playerId={playerId}
                                                elementType={parseInt(elementType)}
                                            />
                                        ))}

                                        {count < limits.max && (
                                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                                                <button
                                                    onClick={() => setSelectedPosition(parseInt(elementType))}
                                                    className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                >
                                                    <Plus className="w-6 h-6 mx-auto mb-1" />
                                                    <div className="text-sm">Add {limits.name.slice(0, -1)}</div>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Player Selection */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Players</h2>
                            <select
                                value={selectedPosition}
                                onChange={(e) => setSelectedPosition(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {positions.map(position => (
                                    <option key={position.value} value={position.value}>
                                        {position.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search and Filters */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search players..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                                    >
                                        <Filter className="w-4 h-4" />
                                        <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
                                    </button>

                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    >
                                        {sortOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {showFilters && (
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Min Price (£)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={minPrice}
                                                onChange={(e) => setMinPrice(e.target.value)}
                                                placeholder="4.0"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Max Price (£)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={maxPrice}
                                                onChange={(e) => setMaxPrice(e.target.value)}
                                                placeholder="15.0"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={availableOnly}
                                                    onChange={(e) => setAvailableOnly(e.target.checked)}
                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    Available players only
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Available Players */}
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {availablePlayers.length > 0 ? (
                                availablePlayers.slice(0, 20).map(player => (
                                    <PlayerCard key={player.id} player={player} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    {selectedPosition ?
                                        `No ${positionLimits[selectedPosition]?.name.toLowerCase()} found matching your criteria` :
                                        'Select a position to view available players'
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
