'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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

// Formation configurations
const formations = {
    '3-4-3': { defenders: 3, midfielders: 4, forwards: 3 },
    '3-5-2': { defenders: 3, midfielders: 5, forwards: 2 },
    '4-3-3': { defenders: 4, midfielders: 3, forwards: 3 },
    '4-4-2': { defenders: 4, midfielders: 4, forwards: 2 },
    '4-5-1': { defenders: 4, midfielders: 5, forwards: 1 },
    '5-3-2': { defenders: 5, midfielders: 3, forwards: 2 },
    '5-4-1': { defenders: 5, midfielders: 4, forwards: 1 }
};

export default function TeamPlanner() {
    // Team state - stores selected player IDs by position
    const [team, setTeam] = useState({
        goalkeeper: null,     // Starting GK
        defenders: [null, null, null],     // Formation-based defenders
        midfielders: [null, null, null, null],   // Formation-based midfielders  
        forwards: [null, null, null],                  // Formation-based forwards
        bench: {
            goalkeeper: null,  // Bench GK
            outfield: [null, null, null] // 3 outfield subs
        }
    });

    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPosition, setSelectedPosition] = useState(1); // Start with goalkeepers
    const [maxPrice, setMaxPrice] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [sortBy, setSortBy] = useState('ep_next');
    const [showFilters, setShowFilters] = useState(false);
    const [availableOnly, setAvailableOnly] = useState(true);
    const [selectedFormation, setSelectedFormation] = useState('3-4-3');
    const [captain, setCaptain] = useState(null);
    const [viceCaptain, setViceCaptain] = useState(null);
    const [activeChip, setActiveChip] = useState(null);
    const [showAnalysis, setShowAnalysis] = useState(false);

    const { data: fplData, loading, error } = useFPLData();
    const { fixtures } = useFixtures();

    // Chips configuration
    const chips = {
        'triple-captain': {
            name: 'Triple Captain',
            description: 'Your captain scores triple points instead of double',
            icon: '⚡',
            rules: 'Captain gets 3x points instead of 2x for this gameweek only'
        },
        'bench-boost': {
            name: 'Bench Boost',
            description: 'Points from bench players are added to your total',
            icon: '🚀',
            rules: 'All 4 substitute players contribute their points to your total'
        },
        'free-hit': {
            name: 'Free Hit',
            description: 'Make unlimited transfers for one gameweek',
            icon: '🎯',
            rules: 'Your team reverts to how it was at the start of the gameweek'
        },
        'wildcard': {
            name: 'Wildcard',
            description: 'Make unlimited free transfers',
            icon: '🃏',
            rules: 'Reset your team with unlimited transfers - no points deduction'
        }
    };

    // Position constraints
    const positionLimits = {
        1: { min: 2, max: 2, name: 'Goalkeepers', key: 'goalkeepers' },
        2: { min: 3, max: 5, name: 'Defenders', key: 'defenders' },
        3: { min: 3, max: 5, name: 'Midfielders', key: 'midfielders' },
        4: { min: 1, max: 3, name: 'Forwards', key: 'forwards' }
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
        if (!fplData) return { totalCost: 0, totalPlayers: 0, isValid: false, expectedPoints: 0 };

        // Get all selected player IDs
        const allSelectedPlayers = [
            team.goalkeeper,
            ...team.defenders.filter(Boolean),
            ...team.midfielders.filter(Boolean),
            ...team.forwards.filter(Boolean),
            team.bench.goalkeeper,
            ...team.bench.outfield.filter(Boolean)
        ].filter(Boolean);

        const totalCost = allSelectedPlayers.reduce((sum, playerId) => {
            const player = fplData.elements.find(p => p.id === playerId);
            return sum + (player ? player.now_cost : 0);
        }, 0);

        // Calculate expected points for starting XI with captain and chips
        const startingPlayers = [
            team.goalkeeper,
            ...team.defenders.filter(Boolean),
            ...team.midfielders.filter(Boolean),
            ...team.forwards.filter(Boolean)
        ].filter(Boolean);

        let expectedPoints = startingPlayers.reduce((sum, playerId) => {
            const player = fplData.elements.find(p => p.id === playerId);
            let playerPoints = player?.ep_next ? parseFloat(player.ep_next) : 0;

            // Apply captain multiplier
            if (playerId === captain) {
                if (activeChip === 'triple-captain') {
                    playerPoints *= 3; // Triple captain
                } else {
                    playerPoints *= 2; // Regular captain
                }
            }

            return sum + playerPoints;
        }, 0);

        // Add bench points if Bench Boost is active
        if (activeChip === 'bench-boost') {
            const benchPlayers = [
                team.bench.goalkeeper,
                ...team.bench.outfield.filter(Boolean)
            ].filter(Boolean);

            expectedPoints += benchPlayers.reduce((sum, playerId) => {
                const player = fplData.elements.find(p => p.id === playerId);
                return sum + (player?.ep_next ? parseFloat(player.ep_next) : 0);
            }, 0);
        }

        const totalPlayers = allSelectedPlayers.length;
        const budget = 1000; // 100.0m in tenths

        // Check if team is valid (11 starters + bench)
        const startingEleven = [
            team.goalkeeper,
            ...team.defenders.filter(Boolean),
            ...team.midfielders.filter(Boolean),
            ...team.forwards.filter(Boolean)
        ].filter(Boolean);

        const benchPlayers = [
            team.bench.goalkeeper,
            ...team.bench.outfield.filter(Boolean)
        ].filter(Boolean);

        // Count players by position for formation validation
        const defCount = team.defenders.filter(Boolean).length;
        const midCount = team.midfielders.filter(Boolean).length;
        const fwdCount = team.forwards.filter(Boolean).length;
        const formation = formations[selectedFormation];

        const isValid = startingEleven.length === 11 && benchPlayers.length === 4 &&
            team.goalkeeper && team.bench.goalkeeper &&
            defCount === formation.defenders &&
            midCount === formation.midfielders &&
            fwdCount === formation.forwards;

        return {
            totalCost,
            totalPlayers,
            budget,
            remainingBudget: budget - totalCost,
            isValid,
            isOverBudget: totalCost > budget,
            startingEleven: startingEleven.length,
            benchPlayers: benchPlayers.length,
            expectedPoints: expectedPoints.toFixed(1)
        };
    }, [team, fplData, selectedFormation, captain, activeChip]);

    // Get next opponent for a player
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

    // Smart Team Analysis Algorithm
    const teamAnalysis = useMemo(() => {
        if (!fplData || !fixtures.length) return null;

        const allSelectedPlayers = [
            team.goalkeeper,
            ...team.defenders.filter(Boolean),
            ...team.midfielders.filter(Boolean),
            ...team.forwards.filter(Boolean),
            team.bench.goalkeeper,
            ...team.bench.outfield.filter(Boolean)
        ].filter(Boolean);

        if (allSelectedPlayers.length === 0) return null;

        const currentPlayers = allSelectedPlayers.map(id =>
            fplData.elements.find(p => p.id === id)
        ).filter(Boolean);

        // Calculate current budget for transfer suggestions
        const totalCost = allSelectedPlayers.reduce((sum, playerId) => {
            const player = fplData.elements.find(p => p.id === playerId);
            return sum + (player ? player.now_cost : 0);
        }, 0);
        const currentBudget = 1000 - totalCost; // Budget available for transfers        // Calculate various metrics for team analysis
        const calculatePlayerScore = (player, isStarter = true) => {
            const nextOpponent = getNextOpponent(player.id);
            const epNext = parseFloat(player.ep_next) || 0;
            const form = parseFloat(player.form) || 0;
            const ppg = parseFloat(player.points_per_game) || 0;
            const ppm = calculatePPM(player.total_points, player.now_cost);
            const ownership = parseFloat(player.selected_by_percent) || 0;
            const fdr = nextOpponent?.difficulty || 3;

            // Availability check
            const status = getPlayerStatus(player.status, player.chance_of_playing_next_round);
            const availabilityScore = status.available ? 1 : 0.3;

            // Form momentum (last 5 games vs season average)
            const formVsPpg = form > ppg ? 1.2 : form < ppg * 0.8 ? 0.8 : 1;

            // Fixture difficulty (inverted - lower FDR is better)
            const fixtureScore = (6 - fdr) / 5;

            // Value score (points per million)
            const valueScore = Math.min(parseFloat(ppm) / 10, 1); // Cap at 1

            // Ownership consideration (differential bonus for low ownership good players)
            const ownershipScore = ownership < 5 && epNext > 5 ? 1.2 :
                ownership > 50 ? 0.9 : 1;

            // Base score calculation
            let score = (epNext * 0.3 + form * 0.2 + ppg * 0.2 + valueScore * 0.15) *
                fixtureScore * formVsPpg * ownershipScore * availabilityScore;

            // Bonus for starters
            if (isStarter) score *= 1.1;

            return {
                player: player,
                score: score,
                epNext,
                form,
                ppg,
                ppm: parseFloat(ppm),
                ownership,
                fdr,
                available: status.available,
                nextOpponent
            };
        };

        // Analyze starting XI
        const startingPlayers = [
            team.goalkeeper,
            ...team.defenders.filter(Boolean),
            ...team.midfielders.filter(Boolean),
            ...team.forwards.filter(Boolean)
        ].filter(Boolean).map(id =>
            fplData.elements.find(p => p.id === id)
        ).filter(Boolean);

        const benchPlayers = [
            team.bench.goalkeeper,
            ...team.bench.outfield.filter(Boolean)
        ].filter(Boolean).map(id =>
            fplData.elements.find(p => p.id === id)
        ).filter(Boolean);

        const startingScores = startingPlayers.map(p => calculatePlayerScore(p, true));
        const benchScores = benchPlayers.map(p => calculatePlayerScore(p, false));

        // Calculate team rating (0-100)
        const avgStartingScore = startingScores.reduce((sum, s) => sum + s.score, 0) / startingScores.length;
        const avgBenchScore = benchScores.reduce((sum, s) => sum + s.score, 0) / benchScores.length;

        // Weight starting XI more heavily (80%) vs bench (20%)
        const overallScore = (avgStartingScore * 0.8) + (avgBenchScore * 0.2);
        const teamRating = Math.min(Math.round(overallScore * 10), 100); // Scale to 0-100

        // Identify transfer targets
        const getTransferSuggestions = () => {
            const suggestions = [];

            // Find worst performers in starting XI
            const weakestStarters = startingScores
                .filter(s => s.score < avgStartingScore * 0.8) // 20% below average
                .sort((a, b) => a.score - b.score)
                .slice(0, 3);

            // For each weak starter, find better alternatives
            weakestStarters.forEach(weak => {
                const position = weak.player.element_type;
                // Max price = current budget + player's selling price
                const maxPrice = weak.player.now_cost + currentBudget;

                const alternatives = fplData.elements
                    .filter(p =>
                        p.element_type === position &&
                        p.now_cost <= maxPrice &&
                        !allSelectedPlayers.includes(p.id) &&
                        getPlayerStatus(p.status, p.chance_of_playing_next_round).available
                    )
                    .map(p => calculatePlayerScore(p, true))
                    .filter(alt => alt.score > weak.score * 1.2) // At least 20% better
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3);

                if (alternatives.length > 0) {
                    const transferCost = alternatives[0].player.now_cost - weak.player.now_cost;
                    const isAffordable = transferCost <= currentBudget;

                    suggestions.push({
                        type: 'transfer',
                        priority: isAffordable ? 'high' : 'budget-limited',
                        playerOut: weak.player,
                        playerIn: alternatives[0].player,
                        reason: `Low performance score (${weak.score.toFixed(1)}) - ${isAffordable ? 'upgrade available' : 'upgrade needs budget'}`,
                        improvement: ((alternatives[0].score - weak.score) / weak.score * 100).toFixed(1),
                        transferCost: transferCost,
                        isAffordable: isAffordable,
                        budgetNeeded: isAffordable ? 0 : transferCost - currentBudget,
                        alternatives: alternatives.slice(1, 3).map(a => a.player)
                    });
                }
            });

            // Check for injured/unavailable players
            startingScores.forEach(playerScore => {
                if (!playerScore.available) {
                    const position = playerScore.player.element_type;
                    const maxPrice = playerScore.player.now_cost + currentBudget;

                    const alternatives = fplData.elements
                        .filter(p =>
                            p.element_type === position &&
                            p.now_cost <= maxPrice &&
                            !allSelectedPlayers.includes(p.id) &&
                            getPlayerStatus(p.status, p.chance_of_playing_next_round).available
                        )
                        .map(p => calculatePlayerScore(p, true))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 3);

                    if (alternatives.length > 0) {
                        const transferCost = alternatives[0].player.now_cost - playerScore.player.now_cost;
                        const isAffordable = transferCost <= currentBudget;

                        suggestions.push({
                            type: 'injury',
                            priority: 'urgent',
                            playerOut: playerScore.player,
                            playerIn: alternatives[0].player,
                            reason: isAffordable ? 'Player unavailable/injured' : 'Player unavailable - budget upgrade needed',
                            transferCost: transferCost,
                            isAffordable: isAffordable,
                            budgetNeeded: isAffordable ? 0 : transferCost - currentBudget,
                            alternatives: alternatives.slice(1, 3).map(a => a.player)
                        });
                    }
                }
            });

            // If budget allows, look for value upgrades (good players significantly underpriced)
            if (currentBudget >= 5) { // At least £0.5m available
                const valueUpgrades = startingScores
                    .filter(s => s.score < avgStartingScore && s.score > avgStartingScore * 0.6) // Middle performers
                    .map(playerScore => {
                        const position = playerScore.player.element_type;
                        const maxPrice = playerScore.player.now_cost + currentBudget;

                        const alternatives = fplData.elements
                            .filter(p =>
                                p.element_type === position &&
                                p.now_cost <= maxPrice &&
                                p.now_cost > playerScore.player.now_cost && // Must be an upgrade
                                !allSelectedPlayers.includes(p.id) &&
                                getPlayerStatus(p.status, p.chance_of_playing_next_round).available
                            )
                            .map(p => calculatePlayerScore(p, true))
                            .filter(alt => alt.score > playerScore.score * 1.3) // Significant improvement
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 2);

                        if (alternatives.length > 0) {
                            const transferCost = alternatives[0].player.now_cost - playerScore.player.now_cost;
                            return {
                                type: 'value',
                                priority: 'medium',
                                playerOut: playerScore.player,
                                playerIn: alternatives[0].player,
                                reason: `Value upgrade available with ${currentBudget >= 10 ? 'good' : 'limited'} budget`,
                                improvement: ((alternatives[0].score - playerScore.score) / playerScore.score * 100).toFixed(1),
                                transferCost: transferCost,
                                isAffordable: true,
                                budgetNeeded: 0,
                                alternatives: alternatives.slice(1, 2).map(a => a.player)
                            };
                        }
                        return null;
                    })
                    .filter(Boolean)
                    .slice(0, 2); // Max 2 value upgrades

                suggestions.push(...valueUpgrades);
            }

            return suggestions.slice(0, 5); // Top 5 suggestions
        };        // Captain suggestions
        const getCaptainSuggestions = () => {
            return startingScores
                .filter(s => s.player.element_type !== 1) // Exclude goalkeepers
                .sort((a, b) => {
                    // Weight EP more heavily for captaincy
                    const scoreA = (a.epNext * 1.5) + (a.form * 0.5) + ((6 - a.fdr) / 5 * 2);
                    const scoreB = (b.epNext * 1.5) + (b.form * 0.5) + ((6 - b.fdr) / 5 * 2);
                    return scoreB - scoreA;
                })
                .slice(0, 3)
                .map(s => ({
                    player: s.player,
                    reason: `${s.epNext} EP, ${s.form} form, FDR ${s.fdr} vs ${s.nextOpponent?.opponent}`,
                    confidence: s.epNext > 6 ? 'High' : s.epNext > 4 ? 'Medium' : 'Low'
                }));
        };

        // Bench optimization suggestions
        const getBenchSuggestions = () => {
            const suggestions = [];

            // Check if any bench players are better than starters
            benchScores.forEach(benchPlayer => {
                const position = benchPlayer.player.element_type;
                const positionStarters = startingScores.filter(s => s.player.element_type === position);
                const weakestStarter = positionStarters.sort((a, b) => a.score - b.score)[0];

                if (weakestStarter && benchPlayer.score > weakestStarter.score * 1.1) {
                    suggestions.push({
                        type: 'lineup',
                        action: 'Consider starting',
                        player: benchPlayer.player,
                        instead: weakestStarter.player,
                        reason: `Bench player outperforming starter (${benchPlayer.score.toFixed(1)} vs ${weakestStarter.score.toFixed(1)})`
                    });
                }
            });

            return suggestions;
        };

        return {
            teamRating,
            overallScore,
            startingScores,
            benchScores,
            transferSuggestions: getTransferSuggestions(),
            captainSuggestions: getCaptainSuggestions(),
            benchSuggestions: getBenchSuggestions(),
            currentBudget: currentBudget,
            metrics: {
                avgEP: startingScores.reduce((sum, s) => sum + s.epNext, 0) / startingScores.length,
                avgForm: startingScores.reduce((sum, s) => sum + s.form, 0) / startingScores.length,
                avgFDR: startingScores.reduce((sum, s) => sum + s.fdr, 0) / startingScores.length,
                totalValue: startingScores.reduce((sum, s) => sum + s.ppm, 0),
                unavailablePlayers: startingScores.filter(s => !s.available).length
            }
        };
    }, [team, fplData, fixtures, getNextOpponent]);

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
                team.goalkeeper,
                ...team.defenders.filter(Boolean),
                ...team.midfielders.filter(Boolean),
                ...team.forwards.filter(Boolean),
                team.bench.goalkeeper,
                ...team.bench.outfield.filter(Boolean)
            ].filter(Boolean);

            if (allSelected.includes(player.id)) return false;

            return true;
        });

        // Sort players
        return sortPlayers(players, sortBy);
    }, [fplData, selectedPosition, searchTerm, maxPrice, minPrice, availableOnly, sortBy, team]);

    // Load team from localStorage on component mount
    useEffect(() => {
        const savedTeam = localStorage.getItem('fpl-team');
        const savedCaptain = localStorage.getItem('fpl-captain');
        const savedViceCaptain = localStorage.getItem('fpl-vice-captain');
        const savedFormation = localStorage.getItem('fpl-formation');
        const savedChip = localStorage.getItem('fpl-active-chip');

        if (savedTeam) {
            try {
                setTeam(JSON.parse(savedTeam));
            } catch (e) {
                console.error('Error loading saved team:', e);
            }
        }
        if (savedCaptain) setCaptain(parseInt(savedCaptain));
        if (savedViceCaptain) setViceCaptain(parseInt(savedViceCaptain));
        if (savedFormation) setSelectedFormation(savedFormation);
        if (savedChip) setActiveChip(savedChip);
    }, []);

    // Save team to localStorage
    const saveTeamToStorage = () => {
        localStorage.setItem('fpl-team', JSON.stringify(team));
        localStorage.setItem('fpl-captain', captain?.toString() || '');
        localStorage.setItem('fpl-vice-captain', viceCaptain?.toString() || '');
        localStorage.setItem('fpl-formation', selectedFormation);
        localStorage.setItem('fpl-active-chip', activeChip || '');
    };

    // Set captain
    const setCaptainPlayer = (playerId) => {
        if (viceCaptain === playerId) {
            setViceCaptain(captain); // Swap roles if vice-captain is selected as captain
        }
        setCaptain(playerId);
    };

    // Set vice-captain
    const setViceCaptainPlayer = (playerId) => {
        if (captain === playerId) {
            setCaptain(viceCaptain); // Swap roles if captain is selected as vice-captain
        }
        setViceCaptain(playerId);
    };

    // Activate chip
    const activateChip = (chipType) => {
        if (activeChip === chipType) {
            setActiveChip(null); // Deactivate if already active
        } else {
            setActiveChip(chipType);
        }
    };

    // Add player to a specific position
    const addPlayerToPosition = (player, positionType, index = null) => {
        setTeam(prev => {
            const newTeam = { ...prev };
            const formation = formations[selectedFormation];

            if (positionType === 'goalkeeper') {
                newTeam.goalkeeper = player.id;
            } else if (positionType === 'bench-goalkeeper') {
                newTeam.bench.goalkeeper = player.id;
            } else if (positionType === 'bench-outfield') {
                const emptySlot = newTeam.bench.outfield.findIndex(slot => slot === null);
                if (emptySlot !== -1) {
                    newTeam.bench.outfield[emptySlot] = player.id;
                }
            } else if (index !== null) {
                // For defenders, midfielders, forwards with specific index
                if (positionType === 'defenders' && index < formation.defenders) {
                    newTeam.defenders[index] = player.id;
                } else if (positionType === 'midfielders' && index < formation.midfielders) {
                    newTeam.midfielders[index] = player.id;
                } else if (positionType === 'forwards' && index < formation.forwards) {
                    newTeam.forwards[index] = player.id;
                }
            } else {
                // Find first empty slot
                if (positionType === 'defenders') {
                    const emptySlot = newTeam.defenders.findIndex(slot => slot === null);
                    if (emptySlot !== -1) newTeam.defenders[emptySlot] = player.id;
                } else if (positionType === 'midfielders') {
                    const emptySlot = newTeam.midfielders.findIndex(slot => slot === null);
                    if (emptySlot !== -1) newTeam.midfielders[emptySlot] = player.id;
                } else if (positionType === 'forwards') {
                    const emptySlot = newTeam.forwards.findIndex(slot => slot === null);
                    if (emptySlot !== -1) newTeam.forwards[emptySlot] = player.id;
                }
            }

            return newTeam;
        });
    };

    // Remove player from team
    const removePlayerFromPosition = (positionType, index = null) => {
        setTeam(prev => {
            const newTeam = { ...prev };

            if (positionType === 'goalkeeper') {
                newTeam.goalkeeper = null;
            } else if (positionType === 'bench-goalkeeper') {
                newTeam.bench.goalkeeper = null;
            } else if (positionType === 'bench-outfield' && index !== null) {
                newTeam.bench.outfield[index] = null;
            } else if (index !== null) {
                if (positionType === 'defenders') {
                    newTeam.defenders[index] = null;
                } else if (positionType === 'midfielders') {
                    newTeam.midfielders[index] = null;
                } else if (positionType === 'forwards') {
                    newTeam.forwards[index] = null;
                }
            }

            return newTeam;
        });
    };

    // Swap player between starting XI and bench
    const swapPlayer = (playerId, fromPosition, toPosition, fromIndex = null, toIndex = null) => {
        if (!fplData) return;

        const player = fplData.elements.find(p => p.id === playerId);
        if (!player) return;

        setTeam(prev => {
            const newTeam = { ...prev };

            // Remove from current position
            if (fromPosition === 'goalkeeper') {
                newTeam.goalkeeper = null;
            } else if (fromPosition === 'bench-goalkeeper') {
                newTeam.bench.goalkeeper = null;
            } else if (fromPosition === 'bench-outfield' && fromIndex !== null) {
                newTeam.bench.outfield[fromIndex] = null;
            } else if (fromIndex !== null) {
                newTeam[fromPosition][fromIndex] = null;
            }

            // Add to new position
            if (toPosition === 'goalkeeper') {
                newTeam.goalkeeper = playerId;
            } else if (toPosition === 'bench-goalkeeper') {
                newTeam.bench.goalkeeper = playerId;
            } else if (toPosition === 'bench-outfield') {
                const emptySlot = newTeam.bench.outfield.findIndex(slot => slot === null);
                if (emptySlot !== -1) {
                    newTeam.bench.outfield[emptySlot] = playerId;
                }
            } else if (toIndex !== null) {
                newTeam[toPosition][toIndex] = playerId;
            } else {
                const emptySlot = newTeam[toPosition].findIndex(slot => slot === null);
                if (emptySlot !== -1) {
                    newTeam[toPosition][emptySlot] = playerId;
                }
            }

            return newTeam;
        });
    };

    // Reset team
    const resetTeam = () => {
        const formation = formations[selectedFormation];
        setTeam({
            goalkeeper: null,
            defenders: new Array(formation.defenders).fill(null),
            midfielders: new Array(formation.midfielders).fill(null),
            forwards: new Array(formation.forwards).fill(null),
            bench: {
                goalkeeper: null,
                outfield: [null, null, null]
            }
        });
    };

    // Update formation
    const changeFormation = (newFormation) => {
        const formation = formations[newFormation];
        setSelectedFormation(newFormation);

        // Preserve existing players but adjust array sizes
        setTeam(prev => {
            const newTeam = {
                goalkeeper: prev.goalkeeper,
                defenders: new Array(formation.defenders).fill(null),
                midfielders: new Array(formation.midfielders).fill(null),
                forwards: new Array(formation.forwards).fill(null),
                bench: prev.bench
            };

            // Copy existing players to new formation
            prev.defenders.filter(Boolean).forEach((playerId, index) => {
                if (index < formation.defenders) {
                    newTeam.defenders[index] = playerId;
                } else {
                    // Move excess players to bench
                    const emptyBenchSlot = newTeam.bench.outfield.findIndex(slot => slot === null);
                    if (emptyBenchSlot !== -1) {
                        newTeam.bench.outfield[emptyBenchSlot] = playerId;
                    }
                }
            });

            prev.midfielders.filter(Boolean).forEach((playerId, index) => {
                if (index < formation.midfielders) {
                    newTeam.midfielders[index] = playerId;
                } else {
                    const emptyBenchSlot = newTeam.bench.outfield.findIndex(slot => slot === null);
                    if (emptyBenchSlot !== -1) {
                        newTeam.bench.outfield[emptyBenchSlot] = playerId;
                    }
                }
            });

            prev.forwards.filter(Boolean).forEach((playerId, index) => {
                if (index < formation.forwards) {
                    newTeam.forwards[index] = playerId;
                } else {
                    const emptyBenchSlot = newTeam.bench.outfield.findIndex(slot => slot === null);
                    if (emptyBenchSlot !== -1) {
                        newTeam.bench.outfield[emptyBenchSlot] = playerId;
                    }
                }
            });

            return newTeam;
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
        const playerTeam = fplData.teams.find(t => t.id === player.team);

        const handleAddPlayer = () => {
            // Count current starting players
            const currentStarters = [
                team.goalkeeper,
                ...team.defenders.filter(Boolean),
                ...team.midfielders.filter(Boolean),
                ...team.forwards.filter(Boolean)
            ].filter(Boolean).length;

            if (player.element_type === 1) {
                // Goalkeeper - add to first available GK slot
                if (!team.goalkeeper) {
                    addPlayerToPosition(player, 'goalkeeper');
                } else if (!team.bench.goalkeeper) {
                    addPlayerToPosition(player, 'bench-goalkeeper');
                }
            } else {
                // Outfield player - check formation constraints and starting XI limit
                const positionMap = {
                    2: 'defenders',
                    3: 'midfielders',
                    4: 'forwards'
                };

                const positionType = positionMap[player.element_type];
                const formation = formations[selectedFormation];

                if (positionType) {
                    const currentInPosition = team[positionType].filter(Boolean).length;
                    const maxInPosition = formation[positionType];

                    // Try to add to starting XI first if under formation limits
                    if (currentStarters < 11 && currentInPosition < maxInPosition) {
                        addPlayerToPosition(player, positionType);
                    } else {
                        // Add to bench if starting XI is full or position is full
                        addPlayerToPosition(player, 'bench-outfield');
                    }
                }
            }
        };

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {player.web_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {playerTeam?.name} • {formatPosition(player.element_type)}
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
                        onClick={handleAddPlayer}
                        className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>
            </div>
        );
    };

    const FieldPosition = ({ playerId, positionType, index, className = "", isGoalkeeper = false }) => {
        const player = playerId ? fplData.elements.find(p => p.id === playerId) : null;
        const nextOpponent = player ? getNextOpponent(player.id) : null;
        const playerTeam = player ? fplData.teams.find(t => t.id === player.team) : null;

        const handleRemove = () => {
            removePlayerFromPosition(positionType, index);
        };

        const handleSwapToBench = () => {
            if (player) {
                if (player.element_type === 1) {
                    // Swap goalkeeper with bench GK
                    swapPlayer(player.id, positionType, 'bench-goalkeeper', index);
                } else {
                    // Swap outfield player to bench
                    swapPlayer(player.id, positionType, 'bench-outfield', index);
                }
            }
        };

        if (!player) {
            return (
                <div className={`relative group cursor-pointer ${className}`}>
                    <div className="w-16 h-20 bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-400 dark:border-gray-500 rounded-lg flex flex-col items-center justify-center hover:border-purple-500 transition-colors">
                        <Plus className="w-6 h-6 text-gray-400 group-hover:text-purple-500" />
                        <span className="text-xs text-gray-400 group-hover:text-purple-500 mt-1">
                            {isGoalkeeper ? 'GK' : 'Add'}
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className={`relative group ${className}`}>
                <div className="w-16 h-20 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    {/* Jersey */}
                    <div className={`w-full h-12 rounded-t-lg flex items-center justify-center text-white text-xs font-bold ${isGoalkeeper ? 'bg-yellow-500' :
                        playerTeam?.id ? `bg-gradient-to-br from-blue-500 to-purple-500` : 'bg-gray-500'
                        }`}>
                        <span className="text-center leading-tight">
                            {player.web_name.length > 8 ?
                                player.web_name.substring(0, 8) + '...' :
                                player.web_name
                            }
                        </span>
                    </div>

                    {/* Player info */}
                    <div className="p-1 h-8 flex flex-col justify-center">
                        <div className="text-xs text-center text-gray-900 dark:text-white font-medium">
                            {playerTeam?.short_name}
                        </div>
                        <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                            £{formatPrice(player.now_cost)}m
                        </div>
                    </div>

                    {/* Next opponent indicator */}
                    {nextOpponent && (
                        <div className="absolute -top-1 -right-1">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white ${nextOpponent.difficulty <= 2 ? 'bg-green-500' :
                                nextOpponent.difficulty <= 3 ? 'bg-yellow-500' :
                                    nextOpponent.difficulty <= 4 ? 'bg-orange-500' : 'bg-red-500'
                                }`}>
                                {nextOpponent.difficulty}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                        {player.id === captain && (
                            <div className="w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                C
                            </div>
                        )}
                        {player.id === viceCaptain && (
                            <div className="w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                V
                            </div>
                        )}
                        <button
                            onClick={() => setCaptainPlayer(player.id)}
                            className="w-5 h-5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            title="Set as captain"
                        >
                            C
                        </button>
                        <button
                            onClick={() => setViceCaptainPlayer(player.id)}
                            className="w-5 h-5 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            title="Set as vice-captain"
                        >
                            V
                        </button>
                        <button
                            onClick={handleSwapToBench}
                            className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center"
                            title="Move to bench"
                        >
                            <Users className="w-2.5 h-2.5" />
                        </button>
                        <button
                            onClick={handleRemove}
                            className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                            title="Remove player"
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* EP indicator */}
                {player.ep_next && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                        <div className="px-1 py-0.5 bg-purple-600 text-white text-xs rounded">
                            {player.ep_next}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const BenchPosition = ({ playerId, positionType, index, isGoalkeeper = false }) => {
        const player = playerId ? fplData.elements.find(p => p.id === playerId) : null;
        const playerTeam = player ? fplData.teams.find(t => t.id === player.team) : null;

        const handleRemove = () => {
            if (isGoalkeeper) {
                removePlayerFromPosition('bench-goalkeeper');
            } else {
                removePlayerFromPosition('bench-outfield', index);
            }
        };

        const handleSwapToStarting = () => {
            if (player) {
                if (player.element_type === 1) {
                    // Swap goalkeeper with starting GK
                    swapPlayer(player.id, isGoalkeeper ? 'bench-goalkeeper' : 'bench-outfield', 'goalkeeper', index);
                } else {
                    // Swap outfield player to starting XI
                    const positionMap = {
                        2: 'defenders',
                        3: 'midfielders',
                        4: 'forwards'
                    };
                    const targetPosition = positionMap[player.element_type];
                    if (targetPosition) {
                        swapPlayer(player.id, 'bench-outfield', targetPosition, index);
                    }
                }
            }
        };

        if (!player) {
            return (
                <div className="w-14 h-16 bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 rounded flex flex-col items-center justify-center">
                    <Plus className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">
                        {isGoalkeeper ? 'GK' : 'SUB'}
                    </span>
                </div>
            );
        }

        return (
            <div className="relative group w-14 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                {/* Jersey */}
                <div className={`w-full h-10 rounded-t flex items-center justify-center text-white text-xs font-bold ${isGoalkeeper ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}>
                    <span className="text-center leading-tight">
                        {player.web_name.length > 6 ?
                            player.web_name.substring(0, 6) + '...' :
                            player.web_name
                        }
                    </span>
                </div>

                {/* Player info */}
                <div className="p-0.5 h-6 flex flex-col justify-center">
                    <div className="text-xs text-center text-gray-900 dark:text-white">
                        £{formatPrice(player.now_cost)}
                    </div>
                </div>

                {/* Captain/Vice-Captain indicators */}
                {captain === player.id && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        C
                    </div>
                )}
                {viceCaptain === player.id && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        V
                    </div>
                )}

                {/* Action buttons */}
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    {!isGoalkeeper && (
                        <>
                            <button
                                onClick={() => setCaptainPlayer(player.id)}
                                className={`w-4 h-4 ${captain === player.id ? 'bg-yellow-500' : 'bg-yellow-400 hover:bg-yellow-500'} text-white rounded-full flex items-center justify-center text-xs font-bold`}
                                title="Set as Captain"
                            >
                                C
                            </button>
                            <button
                                onClick={() => setViceCaptainPlayer(player.id)}
                                className={`w-4 h-4 ${viceCaptain === player.id ? 'bg-gray-500' : 'bg-gray-400 hover:bg-gray-500'} text-white rounded-full flex items-center justify-center text-xs font-bold`}
                                title="Set as Vice-Captain"
                            >
                                V
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleSwapToStarting}
                        className="w-4 h-4 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center"
                        title="Move to starting XI"
                    >
                        <Users className="w-2 h-2" />
                    </button>
                    <button
                        onClick={handleRemove}
                        className="w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                        title="Remove player"
                    >
                        <Minus className="w-2 h-2" />
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
                        Build your perfect FPL team with flexible formations. Field 11 players (1 GK + 10 outfield) with 4 subs.
                    </p>

                    {/* Formation Selector */}
                    <div className="flex justify-center">
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Formation
                            </label>
                            <select
                                value={selectedFormation}
                                onChange={(e) => changeFormation(e.target.value)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                            >
                                {Object.keys(formations).map(formation => (
                                    <option key={formation} value={formation}>
                                        {formation}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Team Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
                                {teamStats.startingEleven}/11
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Starting XI</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                            <Star className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {teamStats.benchPlayers}/4
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Bench</div>
                        </div>
                        <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                            <Zap className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {teamStats.expectedPoints}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Expected Points</div>
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

                    {/* Chips Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Power-Ups</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(chips).map(([chipKey, chip]) => (
                                <button
                                    key={chipKey}
                                    onClick={() => activateChip(chipKey)}
                                    className={`p-3 rounded-lg border-2 transition-all text-left ${activeChip === chipKey
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{chip.icon}</span>
                                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                                            {chip.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {chip.rules}
                                    </p>
                                </button>
                            ))}
                        </div>
                        {activeChip && (
                            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{chips[activeChip].icon}</span>
                                    <span className="font-medium text-purple-900 dark:text-purple-100">
                                        {chips[activeChip].name} Active
                                    </span>
                                </div>
                                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                    {chips[activeChip].description}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <button
                            onClick={saveTeamToStorage}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Save Team
                        </button>
                        <button
                            onClick={resetTeam}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset Team
                        </button>
                    </div>
                </div>

                {/* Smart Analysis Section */}
                {teamAnalysis && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                🧠 Smart Team Analysis
                            </h3>
                            <button
                                onClick={() => setShowAnalysis(!showAnalysis)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                <Activity className="w-4 h-4" />
                                {showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
                            </button>
                        </div>

                        {/* Team Rating */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-lg font-medium text-gray-900 dark:text-white">Team Rating</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-3xl font-bold ${teamAnalysis.teamRating >= 80 ? 'text-green-600' :
                                        teamAnalysis.teamRating >= 60 ? 'text-yellow-600' :
                                            teamAnalysis.teamRating >= 40 ? 'text-orange-600' : 'text-red-600'
                                        }`}>
                                        {teamAnalysis.teamRating}%
                                    </span>
                                    <div className={`w-3 h-3 rounded-full ${teamAnalysis.teamRating >= 80 ? 'bg-green-500' :
                                        teamAnalysis.teamRating >= 60 ? 'bg-yellow-500' :
                                            teamAnalysis.teamRating >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                        }`}></div>
                                </div>
                            </div>

                            {/* Rating Bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-500 ${teamAnalysis.teamRating >= 80 ? 'bg-green-500' :
                                        teamAnalysis.teamRating >= 60 ? 'bg-yellow-500' :
                                            teamAnalysis.teamRating >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${teamAnalysis.teamRating}%` }}
                                ></div>
                            </div>

                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {teamAnalysis.teamRating >= 80 ? 'Excellent team composition!' :
                                    teamAnalysis.teamRating >= 60 ? 'Good team with room for improvement' :
                                        teamAnalysis.teamRating >= 40 ? 'Average team - consider upgrades' :
                                            'Team needs significant improvements'}
                            </div>
                        </div>

                        {/* Quick Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">
                                    {teamAnalysis.metrics.avgEP.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Avg EP Next</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                <div className="text-lg font-bold text-green-600">
                                    {teamAnalysis.metrics.avgForm.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Avg Form</div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                                <div className="text-lg font-bold text-yellow-600">
                                    {teamAnalysis.metrics.avgFDR.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Avg FDR</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                                <div className="text-lg font-bold text-purple-600">
                                    {teamAnalysis.metrics.totalValue.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Total PPM</div>
                            </div>
                        </div>

                        {showAnalysis && (
                            <div className="space-y-6">
                                {/* Transfer Suggestions */}
                                {teamAnalysis.transferSuggestions.length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-blue-500" />
                                            Transfer Suggestions
                                        </h4>
                                        <div className="space-y-3">
                                            {teamAnalysis.transferSuggestions.map((suggestion, index) => (
                                                <div key={index} className={`p-4 rounded-lg border ${suggestion.priority === 'urgent' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' :
                                                        suggestion.priority === 'budget-limited' ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/20' :
                                                            suggestion.priority === 'high' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' :
                                                                'border-blue-200 bg-blue-50 dark:bg-blue-900/20'
                                                    }`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${suggestion.priority === 'urgent' ? 'bg-red-500 text-white' :
                                                                    suggestion.priority === 'budget-limited' ? 'bg-orange-500 text-white' :
                                                                        suggestion.priority === 'high' ? 'bg-yellow-500 text-white' :
                                                                            'bg-blue-500 text-white'
                                                                }`}>
                                                                {suggestion.priority === 'budget-limited' ? 'BUDGET LIMITED' : suggestion.priority.toUpperCase()}
                                                            </span>
                                                            <span className="font-medium text-gray-900 dark:text-white">
                                                                {suggestion.playerOut.web_name} → {suggestion.playerIn.web_name}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            {suggestion.improvement && (
                                                                <span className="text-green-600 font-medium text-sm block">
                                                                    +{suggestion.improvement}% improvement
                                                                </span>
                                                            )}
                                                            {!suggestion.isAffordable && (
                                                                <span className="text-red-600 font-medium text-xs">
                                                                    Need £{formatPrice(suggestion.budgetNeeded)}m more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                        {suggestion.reason}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-xs flex-wrap">
                                                        <span className="text-gray-500">Out: £{formatPrice(suggestion.playerOut.now_cost)}m</span>
                                                        <span className="text-gray-500">In: £{formatPrice(suggestion.playerIn.now_cost)}m</span>
                                                        <span className={`font-medium px-2 py-1 rounded ${suggestion.transferCost > 0 ? 'text-red-700 bg-red-100 dark:bg-red-900/30' :
                                                                suggestion.transferCost < 0 ? 'text-green-700 bg-green-100 dark:bg-green-900/30' :
                                                                    'text-gray-700 bg-gray-100 dark:bg-gray-700'
                                                            }`}>
                                                            {suggestion.transferCost > 0 ? '+' : ''}£{formatPrice(suggestion.transferCost)}m cost
                                                        </span>
                                                        {suggestion.isAffordable ? (
                                                            <span className="text-green-600 font-medium bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                                                                ✓ Affordable
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-600 font-medium bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                                                                ⚠ Over Budget
                                                            </span>
                                                        )}
                                                        <span className="text-purple-600 font-medium">
                                                            Budget: £{formatPrice(teamAnalysis.currentBudget)}m
                                                        </span>
                                                    </div>
                                                    {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                            <span className="text-xs text-gray-500">Alternatives: </span>
                                                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                                                {suggestion.alternatives.map(alt => alt.web_name).join(', ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Captain Suggestions */}
                                {teamAnalysis.captainSuggestions.length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Star className="w-5 h-5 text-yellow-500" />
                                            Captain Recommendations
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {teamAnalysis.captainSuggestions.map((suggestion, index) => (
                                                <div key={index} className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-2xl">👑</span>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {suggestion.player.web_name}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${suggestion.confidence === 'High' ? 'bg-green-500 text-white' :
                                                            suggestion.confidence === 'Medium' ? 'bg-yellow-500 text-white' :
                                                                'bg-gray-500 text-white'
                                                            }`}>
                                                            {suggestion.confidence}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {suggestion.reason}
                                                    </p>
                                                    {captain !== suggestion.player.id && (
                                                        <button
                                                            onClick={() => setCaptainPlayer(suggestion.player.id)}
                                                            className="mt-2 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs transition-colors"
                                                        >
                                                            Set as Captain
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Bench Optimization */}
                                {teamAnalysis.benchSuggestions.length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-purple-500" />
                                            Lineup Optimization
                                        </h4>
                                        <div className="space-y-3">
                                            {teamAnalysis.benchSuggestions.map((suggestion, index) => (
                                                <div key={index} className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-medium text-purple-900 dark:text-purple-100">
                                                            {suggestion.action}: {suggestion.player.web_name}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-purple-700 dark:text-purple-300">
                                                        {suggestion.reason}
                                                    </p>
                                                    {suggestion.instead && (
                                                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                                            Consider benching: {suggestion.instead.web_name}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Team Health Check */}
                                {teamAnalysis.metrics.unavailablePlayers > 0 && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="w-5 h-5 text-red-500" />
                                            <span className="font-medium text-red-900 dark:text-red-100">
                                                Team Health Alert
                                            </span>
                                        </div>
                                        <p className="text-sm text-red-700 dark:text-red-300">
                                            You have {teamAnalysis.metrics.unavailablePlayers} unavailable player(s) in your starting XI.
                                            Consider immediate transfers to avoid getting 0 points.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Football Field */}
                    <div className="xl:col-span-2">
                        <div className="bg-gradient-to-b from-green-400 to-green-500 rounded-xl p-8 relative overflow-hidden">
                            {/* Field markings */}
                            <div className="absolute inset-0 opacity-20">
                                <div className="w-full h-full border-2 border-white rounded-xl"></div>
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white transform -translate-y-1/2"></div>
                                <div className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                            </div>

                            <div className="relative z-10 space-y-8">
                                {/* Forwards */}
                                <div className="flex justify-center space-x-8">
                                    {team.forwards.map((playerId, index) => (
                                        <FieldPosition
                                            key={`forward-${index}`}
                                            playerId={playerId}
                                            positionType="forwards"
                                            index={index}
                                        />
                                    ))}
                                </div>

                                {/* Midfielders */}
                                <div className="flex justify-center space-x-4">
                                    {team.midfielders.map((playerId, index) => (
                                        <FieldPosition
                                            key={`midfielder-${index}`}
                                            playerId={playerId}
                                            positionType="midfielders"
                                            index={index}
                                        />
                                    ))}
                                </div>

                                {/* Defenders */}
                                <div className="flex justify-center space-x-4">
                                    {team.defenders.map((playerId, index) => (
                                        <FieldPosition
                                            key={`defender-${index}`}
                                            playerId={playerId}
                                            positionType="defenders"
                                            index={index}
                                        />
                                    ))}
                                </div>

                                {/* Goalkeeper */}
                                <div className="flex justify-center">
                                    <FieldPosition
                                        playerId={team.goalkeeper}
                                        positionType="goalkeeper"
                                        isGoalkeeper={true}
                                    />
                                </div>
                            </div>

                            {/* Bench */}
                            <div className="mt-8 pt-4 border-t-2 border-white border-opacity-30">
                                <h3 className="text-white font-bold text-center mb-4">Substitutes</h3>
                                <div className="flex justify-center space-x-4">
                                    <BenchPosition
                                        playerId={team.bench.goalkeeper}
                                        positionType="bench-goalkeeper"
                                        isGoalkeeper={true}
                                    />
                                    {team.bench.outfield.map((playerId, index) => (
                                        <BenchPosition
                                            key={`bench-${index}`}
                                            playerId={playerId}
                                            positionType="bench-outfield"
                                            index={index}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Player Selection Panel */}
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
                                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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

                                        <div>
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
                                availablePlayers.slice(0, 10).map(player => (
                                    <PlayerCard key={player.id} player={player} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    {selectedPosition ?
                                        `No ${positions.find(p => p.value === selectedPosition)?.label.toLowerCase()} found matching your criteria` :
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
