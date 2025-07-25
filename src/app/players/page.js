'use client';

import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useFPLData } from '@/hooks/useFPLData';
import { useFixtures } from '@/hooks/useFixtures';
import { formatPosition, formatPrice, getPlayerStatus, calculatePPM } from '@/utils/fplHelpers';
import {
    Users,
    Search,
    Star,
    TrendingUp,
    Target,
    Award,
    Activity,
    ChevronLeft,
    ChevronRight,
    Filter,
    X,
    ArrowLeft,
    Shield,
    Calendar,
    DollarSign,
    BarChart3
} from 'lucide-react';

export default function Players() {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [sortBy, setSortBy] = useState('total_points');
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const playersPerPage = 20;

    const { data: fplData, loading, error } = useFPLData();
    const { fixtures } = useFixtures();

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

    // Filter and sort players
    const filteredAndSortedPlayers = useMemo(() => {
        if (!fplData) return [];

        let players = [...fplData.elements];

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            players = players.filter(player =>
                player.web_name.toLowerCase().includes(searchLower) ||
                player.first_name.toLowerCase().includes(searchLower) ||
                player.second_name.toLowerCase().includes(searchLower)
            );
        }

        // Apply position filter
        if (selectedPosition) {
            players = players.filter(player => player.element_type === parseInt(selectedPosition));
        }

        // Apply team filter
        if (selectedTeam) {
            players = players.filter(player => player.team === parseInt(selectedTeam));
        }

        // Sort players
        players.sort((a, b) => {
            switch (sortBy) {
                case 'total_points':
                    return b.total_points - a.total_points;
                case 'form':
                    return parseFloat(b.form) - parseFloat(a.form);
                case 'selected_by_percent':
                    return parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent);
                case 'now_cost':
                    return b.now_cost - a.now_cost;
                case 'points_per_game':
                    return parseFloat(b.points_per_game) - parseFloat(a.points_per_game);
                case 'web_name':
                    return a.web_name.localeCompare(b.web_name);
                case 'value':
                    return calculatePPM(b.total_points, b.now_cost) - calculatePPM(a.total_points, a.now_cost);
                default:
                    return b.total_points - a.total_points;
            }
        });

        return players;
    }, [fplData, searchTerm, selectedPosition, selectedTeam, sortBy]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedPlayers.length / playersPerPage);
    const startIndex = (currentPage - 1) * playersPerPage;
    const endIndex = startIndex + playersPerPage;
    const currentPlayers = filteredAndSortedPlayers.slice(startIndex, endIndex);

    // Reset page when filters change
    const handleFilterChange = (newFilter) => {
        setCurrentPage(1);
        return newFilter;
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading player data...</p>
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
                        Error Loading Players
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </Layout>
        );
    }

    // If a player is selected, show player profile
    if (selectedPlayer) {
        return <PlayerProfile player={selectedPlayer} onBack={() => setSelectedPlayer(null)} fplData={fplData} fixtures={fixtures} getNextOpponent={getNextOpponent} />;
    }

    const sortOptions = [
        { value: 'total_points', label: 'Total Points' },
        { value: 'form', label: 'Form' },
        { value: 'selected_by_percent', label: 'Ownership %' },
        { value: 'now_cost', label: 'Price' },
        { value: 'points_per_game', label: 'Points per Game' },
        { value: 'value', label: 'Value (Points/£)' },
        { value: 'web_name', label: 'Name (A-Z)' }
    ];

    const positions = [
        { value: '', label: 'All Positions' },
        { value: '1', label: 'Goalkeepers' },
        { value: '2', label: 'Defenders' },
        { value: '3', label: 'Midfielders' },
        { value: '4', label: 'Forwards' }
    ];

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        Player Database
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Explore comprehensive player statistics, form, and performance metrics.
                    </p>
                </div>

                {/* Quick Stats */}
                {fplData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <Users className="w-8 h-8 mx-auto mb-3 text-blue-500" />
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {filteredAndSortedPlayers.length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {searchTerm || selectedPosition || selectedTeam ? 'Filtered' : 'Total'} Players
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <Target className="w-8 h-8 mx-auto mb-3 text-green-500" />
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {fplData.elements.reduce((sum, p) => sum + p.goals_scored, 0)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Total Goals
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <TrendingUp className="w-8 h-8 mx-auto mb-3 text-purple-500" />
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {fplData.elements.reduce((sum, p) => sum + p.assists, 0)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Total Assists
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <Award className="w-8 h-8 mx-auto mb-3 text-yellow-500" />
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {Math.max(...fplData.elements.map(p => p.total_points))}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Highest Points
                            </div>
                        </div>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search players..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        handleFilterChange();
                                    }}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Filters Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                        </button>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    Sort by {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Expandable Filters */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Position Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Position
                                    </label>
                                    <select
                                        value={selectedPosition}
                                        onChange={(e) => {
                                            setSelectedPosition(e.target.value);
                                            handleFilterChange();
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        {positions.map(position => (
                                            <option key={position.value} value={position.value}>
                                                {position.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Team Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Team
                                    </label>
                                    <select
                                        value={selectedTeam}
                                        onChange={(e) => {
                                            setSelectedTeam(e.target.value);
                                            handleFilterChange();
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">All Teams</option>
                                        {fplData?.teams.map(team => (
                                            <option key={team.id} value={team.id}>
                                                {team.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Clear Filters */}
                            {(searchTerm || selectedPosition || selectedTeam) && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedPosition('');
                                            setSelectedTeam('');
                                            setCurrentPage(1);
                                        }}
                                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Players List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Players ({filteredAndSortedPlayers.length})
                            </h2>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Page {currentPage} of {totalPages}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {currentPlayers.map((player, index) => {
                                const status = getPlayerStatus(player.status, player.chance_of_playing_next_round);
                                const team = fplData.teams.find(t => t.id === player.team);
                                const ppm = calculatePPM(player.total_points, player.now_cost);
                                const nextOpponent = getNextOpponent(player.id);

                                return (
                                    <div
                                        key={player.id}
                                        onClick={() => setSelectedPlayer(player)}
                                        className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer group p-4"
                                    >
                                        {/* Mobile and Desktop Layout */}
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                                            {/* Player Info Section */}
                                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                                                <div className="flex items-center justify-center w-8 h-8 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full text-sm font-medium flex-shrink-0">
                                                    {startIndex + index + 1}
                                                </div>

                                                {/* Player Image */}
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                                    <img
                                                        src={`https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`}
                                                        alt={player.web_name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ display: 'none' }}>
                                                        {player.web_name.substring(0, 2)}
                                                    </div>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                                                        {player.web_name}
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mt-1 flex-wrap">
                                                        <span className="truncate">{team?.short_name}</span>
                                                        <span>•</span>
                                                        <span>{formatPosition(player.element_type)}</span>
                                                        <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${status.available
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                            }`}>
                                                            {status.text}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats Section - Grid on mobile, flex on desktop */}
                                            <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 text-sm flex-shrink-0">
                                                <div className="text-center">
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        {player.total_points}
                                                    </div>
                                                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                                                        Points
                                                    </div>
                                                </div>

                                                <div className="text-center">
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        {player.form}
                                                    </div>
                                                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                                                        Form
                                                    </div>
                                                </div>

                                                <div className="text-center">
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        {player.selected_by_percent}%
                                                    </div>
                                                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                                                        Owned
                                                    </div>
                                                </div>

                                                <div className="text-center">
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        £{formatPrice(player.now_cost)}
                                                    </div>
                                                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                                                        Price
                                                    </div>
                                                </div>

                                                {nextOpponent && (
                                                    <div className="text-center col-span-2 sm:col-span-1">
                                                        <div className={`w-6 h-6 rounded mx-auto flex items-center justify-center text-xs font-bold text-white ${nextOpponent.difficulty <= 2 ? 'bg-green-500' :
                                                            nextOpponent.difficulty <= 3 ? 'bg-yellow-500' :
                                                                nextOpponent.difficulty <= 4 ? 'bg-orange-500' : 'bg-red-500'
                                                            }`}>
                                                            {nextOpponent.difficulty}
                                                        </div>
                                                        <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                                                            {nextOpponent.isHome ? 'vs' : '@'} {nextOpponent.opponent}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                                    Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedPlayers.length)} of {filteredAndSortedPlayers.length} players
                                </div>

                                <div className="flex items-center justify-center space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="hidden xs:inline">Previous</span>
                                    </button>

                                    <div className="flex items-center space-x-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 text-sm rounded ${currentPage === pageNum
                                                        ? 'bg-purple-600 text-white'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        } transition-colors`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <span className="hidden xs:inline">Next</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// Player Profile Component
function PlayerProfile({ player, onBack, fplData, fixtures, getNextOpponent }) {
    const team = fplData.teams.find(t => t.id === player.team);
    const status = getPlayerStatus(player.status, player.chance_of_playing_next_round);
    const nextOpponent = getNextOpponent(player.id);
    const ppm = calculatePPM(player.total_points, player.now_cost);

    // Get recent fixtures for the player's team
    const recentFixtures = fixtures
        .filter(fixture =>
            (fixture.team_h === player.team || fixture.team_a === player.team) &&
            fixture.finished
        )
        .sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))
        .slice(0, 5);

    // Get upcoming fixtures
    const upcomingFixtures = fixtures
        .filter(fixture =>
            (fixture.team_h === player.team || fixture.team_a === player.team) &&
            !fixture.finished
        )
        .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
        .slice(0, 5);

    // Helper function to format rank display
    const formatRank = (rank, rankType) => {
        if (!rank || rank === 0) return 'N/A';
        return rankType ? `${rank} (${rankType})` : rank;
    };

    // Helper function to get difficulty color
    const getDifficultyColor = (value, isGood = true) => {
        if (!value) return 'text-gray-600 dark:text-gray-400';
        const numValue = parseFloat(value);
        if (isGood) {
            if (numValue >= 7) return 'text-green-600 dark:text-green-400';
            if (numValue >= 4) return 'text-yellow-600 dark:text-yellow-400';
            return 'text-red-600 dark:text-red-400';
        } else {
            if (numValue <= 3) return 'text-green-600 dark:text-green-400';
            if (numValue <= 6) return 'text-yellow-600 dark:text-yellow-400';
            return 'text-red-600 dark:text-red-400';
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Players
                </button>

                {/* Player Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Player Image */}
                        <div className="flex-shrink-0">
                            <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                <img
                                    src={`https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`}
                                    alt={player.web_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl" style={{ display: 'none' }}>
                                    {player.web_name.substring(0, 2)}
                                </div>
                            </div>
                        </div>

                        {/* Player Info */}
                        <div className="flex-1">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                        {player.first_name} {player.second_name}
                                    </h1>
                                    <div className="flex items-center gap-4 mt-2 text-lg text-gray-600 dark:text-gray-400">
                                        <span>{team?.name}</span>
                                        <span>•</span>
                                        <span>{formatPosition(player.element_type)}</span>
                                        {player.in_dreamteam && (
                                            <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full text-sm font-medium">
                                                ⭐ Dream Team
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-3">
                                        <span className={`px-3 py-1 rounded-full text-sm ${status.available
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                            }`}>
                                            {status.text}
                                        </span>
                                        {player.chance_of_playing_next_round && (
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {player.chance_of_playing_next_round}% chance next round
                                            </span>
                                        )}
                                    </div>
                                    {player.team_join_date && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                            Joined team: {new Date(player.team_join_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>

                                <div className="text-right">
                                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                        £{formatPrice(player.now_cost)}m
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {player.selected_by_percent}% ownership
                                    </div>
                                    {player.dreamteam_count > 0 && (
                                        <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                                            {player.dreamteam_count} Dream Team appearances
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Performance Indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {player.total_points}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Total Points
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {player.form}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Form
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Rank: {formatRank(player.form_rank)}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {player.points_per_game}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Points/Game
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {ppm}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Value
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                            {player.ict_index || '0'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            ICT Index
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Rank: {formatRank(player.ict_index_rank, player.ict_index_rank_type)}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {player.starts || 0}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Starts
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {player.starts_per_90 || '0'}/90
                        </div>
                    </div>
                </div>

                {/* Advanced Statistics Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ICT Index Breakdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                ICT Index Breakdown
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Influence, Creativity, and Threat combine to form the ICT Index
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className={`text-xl font-bold ${getDifficultyColor(player.influence)}`}>
                                        {player.influence || '0'}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Influence
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                        Rank: {formatRank(player.influence_rank, player.influence_rank_type)}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-xl font-bold ${getDifficultyColor(player.creativity)}`}>
                                        {player.creativity || '0'}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Creativity
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                        Rank: {formatRank(player.creativity_rank, player.creativity_rank_type)}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-xl font-bold ${getDifficultyColor(player.threat)}`}>
                                        {player.threat || '0'}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Threat
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                        Rank: {formatRank(player.threat_rank, player.threat_rank_type)}
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                <strong>Influence:</strong> Measures the degree to which a player has the ability to alter the outcome of a match<br />
                                <strong>Creativity:</strong> Assesses player performance in terms of producing goal scoring opportunities for others<br />
                                <strong>Threat:</strong> Gauges players who are most likely to score goals
                            </div>
                        </div>
                    </div>

                    {/* Expected Stats */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Target className="w-5 h-5" />
                                Expected Performance
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Predicted performance based on shot quality and positions
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Expected Goals:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{player.expected_goals || '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">xG per 90:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{player.expected_goals_per_90 || '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Expected Assists:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{player.expected_assists || '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">xA per 90:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{player.expected_assists_per_90 || '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Expected GI:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{player.expected_goal_involvements || '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">xGI per 90:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{player.expected_goal_involvements_per_90 || '0'}</span>
                                </div>
                                {player.element_type === 1 && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Expected Goals Conceded:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{player.expected_goals_conceded || '0'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">xGC per 90:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{player.expected_goals_conceded_per_90 || '0'}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                Expected stats are calculated based on the quality of chances created and received, providing insight into underlying performance
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Performance Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Detailed Performance Statistics
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-sm">
                            {/* Goals & Assists */}
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Goals & Assists</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Goals:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.goals_scored}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Assists:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.assists}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Bonus Points:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.bonus}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Defensive */}
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Defensive</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Clean Sheets:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.clean_sheets}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Goals Conceded:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.goals_conceded}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">GC per 90:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.goals_conceded_per_90 || '0'}</span>
                                    </div>
                                    {player.defensive_contribution && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Defensive Contribution:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{player.defensive_contribution}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Goalkeeper Stats */}
                            {player.element_type === 1 && (
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Goalkeeper</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Saves:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{player.saves}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Saves per 90:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{player.saves_per_90 || '0'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Penalties Saved:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{player.penalties_saved}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cards & Penalties */}
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Discipline</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Yellow Cards:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.yellow_cards}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Red Cards:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.red_cards}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Penalties Missed:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.penalties_missed}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Own Goals:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.own_goals}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Playing Time */}
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Playing Time</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Minutes:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.minutes}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Starts:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.starts || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Starts per 90:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{player.starts_per_90 || '0'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Set Pieces */}
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Set Pieces</h4>
                                <div className="space-y-2">
                                    {player.corners_and_indirect_freekicks_order && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Corners/IFK Order:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{player.corners_and_indirect_freekicks_order}</span>
                                        </div>
                                    )}
                                    {player.corners_and_indirect_freekicks_text && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400">Set Piece Role:</span>
                                            <div className="text-xs text-gray-900 dark:text-white mt-1">{player.corners_and_indirect_freekicks_text}</div>
                                        </div>
                                    )}
                                    {player.direct_freekicks_order && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Direct FK Order:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{player.direct_freekicks_order}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Transfer Activity */}
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Transfer Activity</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Transfers In:</span>
                                        <span className="font-medium text-green-600">{player.transfers_in}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">This GW:</span>
                                        <span className="font-medium text-green-600">{player.transfers_in_event}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Transfers Out:</span>
                                        <span className="font-medium text-red-600">{player.transfers_out}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">This GW:</span>
                                        <span className="font-medium text-red-600">{player.transfers_out_event}</span>
                                    </div>
                                </div>
                            </div>

                            {/* FPL Points */}
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">FPL Points</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">EP This GW:</span>
                                        <span className="font-medium text-purple-600">{player.ep_this || '0'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">EP Next GW:</span>
                                        <span className="font-medium text-purple-600">{player.ep_next || '0'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Dream Team Count:</span>
                                        <span className="font-medium text-yellow-600">{player.dreamteam_count}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Next Fixture & Availability */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Next Fixture */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Next Fixture
                            </h3>
                        </div>
                        <div className="p-6">
                            {nextOpponent ? (
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        {nextOpponent.isHome ? 'vs' : '@'} {nextOpponent.opponent}
                                    </div>
                                    <div className="flex items-center justify-center gap-3 mb-4">
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {nextOpponent.isHome ? 'Home' : 'Away'}
                                        </span>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${nextOpponent.difficulty <= 2 ? 'bg-green-500' :
                                            nextOpponent.difficulty <= 3 ? 'bg-yellow-500' :
                                                nextOpponent.difficulty <= 4 ? 'bg-orange-500' : 'bg-red-500'
                                            }`}>
                                            {nextOpponent.difficulty}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Difficulty Rating
                                    </div>
                                    {player.ep_next && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                            <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                                                {player.ep_next} Expected Points
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-gray-600 dark:text-gray-400">
                                    No upcoming fixture
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Availability */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Player Availability
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-center">
                                <div className={`text-2xl font-bold mb-2 ${status.available ? 'text-green-600' : 'text-red-600'}`}>
                                    {status.text}
                                </div>
                                {player.chance_of_playing_next_round && (
                                    <div className="text-lg text-gray-900 dark:text-white mb-2">
                                        {player.chance_of_playing_next_round}% chance next round
                                    </div>
                                )}
                                {player.chance_of_playing_this_round && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {player.chance_of_playing_this_round}% chance this round
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                Availability percentages are updated by FPL based on injury reports and team news
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fixtures */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Fixtures */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Recent Results
                            </h3>
                        </div>
                        <div className="p-6 space-y-3">
                            {recentFixtures.length > 0 ? recentFixtures.map((fixture, index) => {
                                const isHome = fixture.team_h === player.team;
                                const opponent = fplData.teams.find(t => t.id === (isHome ? fixture.team_a : fixture.team_h));
                                const homeScore = fixture.team_h_score;
                                const awayScore = fixture.team_a_score;

                                return (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {isHome ? 'vs' : '@'}
                                            </span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {opponent?.short_name}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {homeScore !== null && awayScore !== null ?
                                                `${homeScore} - ${awayScore}` :
                                                'TBD'
                                            }
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center text-gray-600 dark:text-gray-400 py-4">
                                    No recent fixtures
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Fixtures */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Upcoming Fixtures
                            </h3>
                        </div>
                        <div className="p-6 space-y-3">
                            {upcomingFixtures.length > 0 ? upcomingFixtures.map((fixture, index) => {
                                const isHome = fixture.team_h === player.team;
                                const opponent = fplData.teams.find(t => t.id === (isHome ? fixture.team_a : fixture.team_h));
                                const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;

                                return (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {isHome ? 'vs' : '@'}
                                            </span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {opponent?.short_name}
                                            </span>
                                        </div>
                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${difficulty <= 2 ? 'bg-green-500' :
                                            difficulty <= 3 ? 'bg-yellow-500' :
                                                difficulty <= 4 ? 'bg-orange-500' : 'bg-red-500'
                                            }`}>
                                            {difficulty}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center text-gray-600 dark:text-gray-400 py-4">
                                    No upcoming fixtures
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
