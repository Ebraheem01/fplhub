import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

// Format player position
export const formatPosition = (elementType) => {
    const positions = {
        1: 'GKP',
        2: 'DEF',
        3: 'MID',
        4: 'FWD'
    };
    return positions[elementType] || 'UNK';
};

// Format price (from tenths to actual price)
export const formatPrice = (price) => {
    return (price / 10).toFixed(1);
};

// Calculate player form rating
export const calculateForm = (form) => {
    const formValue = parseFloat(form) || 0;
    if (formValue >= 6) return 'excellent';
    if (formValue >= 4) return 'good';
    if (formValue >= 2) return 'average';
    return 'poor';
};

// Get player status color and text
export const getPlayerStatus = (status, chanceOfPlayingNextRound) => {
    if (status === 'i') return { text: 'Injured', color: 'status-injured', available: false };
    if (status === 's') return { text: 'Suspended', color: 'status-suspended', available: false };
    if (status === 'u') return { text: 'Unavailable', color: 'status-injured', available: false };

    if (chanceOfPlayingNextRound !== null) {
        if (chanceOfPlayingNextRound <= 25) {
            return { text: '25% chance', color: 'status-injured', available: false };
        }
        if (chanceOfPlayingNextRound <= 50) {
            return { text: '50% chance', color: 'status-doubt', available: true };
        }
        if (chanceOfPlayingNextRound <= 75) {
            return { text: '75% chance', color: 'status-doubt', available: true };
        }
    }

    return { text: 'Available', color: 'status-available', available: true };
};

// Calculate fixture difficulty rating
export const getFixtureDifficulty = (difficulty) => {
    if (difficulty <= 2) return { rating: 'Easy', color: 'bg-green-500' };
    if (difficulty <= 3) return { rating: 'Medium', color: 'bg-yellow-500' };
    if (difficulty <= 4) return { rating: 'Hard', color: 'bg-orange-500' };
    return { rating: 'Very Hard', color: 'bg-red-500' };
};

// Format gameweek deadline
export const formatDeadline = (deadline) => {
    try {
        const deadlineDate = parseISO(deadline);
        return format(deadlineDate, 'EEE dd MMM, HH:mm');
    } catch {
        return 'Invalid date';
    }
};

// Check if gameweek is live
export const isGameweekLive = (deadline) => {
    try {
        const deadlineDate = parseISO(deadline);
        const now = new Date();
        return isAfter(now, deadlineDate);
    } catch {
        return false;
    }
};

// Calculate points per million (value metric)
export const calculatePPM = (totalPoints, price) => {
    if (!price || price === 0) return 0;
    return (totalPoints / formatPrice(price)).toFixed(2);
};

// Get team short name
export const getTeamShortName = (teams, teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.short_name : 'UNK';
};

// Calculate ICT Index rating
export const getICTRating = (ictIndex) => {
    const index = parseFloat(ictIndex) || 0;
    if (index >= 200) return 'Excellent';
    if (index >= 100) return 'Good';
    if (index >= 50) return 'Average';
    return 'Poor';
};

// Format large numbers (e.g., selected by)
export const formatSelectedBy = (selectedBy) => {
    const percentage = parseFloat(selectedBy);
    if (percentage >= 50) return `${percentage.toFixed(1)}% (Very High)`;
    if (percentage >= 20) return `${percentage.toFixed(1)}% (High)`;
    if (percentage >= 5) return `${percentage.toFixed(1)}% (Medium)`;
    return `${percentage.toFixed(1)}% (Low)`;
};

// Calculate transfers in/out net
export const getTransferTrend = (transfersIn, transfersOut) => {
    const net = transfersIn - transfersOut;
    if (net > 50000) return { trend: 'Hot', color: 'text-green-500' };
    if (net > 10000) return { trend: 'Rising', color: 'text-blue-500' };
    if (net < -50000) return { trend: 'Falling Fast', color: 'text-red-500' };
    if (net < -10000) return { trend: 'Falling', color: 'text-orange-500' };
    return { trend: 'Stable', color: 'text-gray-500' };
};

// Sort players by various criteria
export const sortPlayers = (players, sortBy) => {
    return [...players].sort((a, b) => {
        switch (sortBy) {
            case 'points':
                return b.total_points - a.total_points;
            case 'price':
                return b.now_cost - a.now_cost;
            case 'form':
                return parseFloat(b.form) - parseFloat(a.form);
            case 'selected':
                return parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent);
            case 'value':
                return calculatePPM(b.total_points, b.now_cost) - calculatePPM(a.total_points, a.now_cost);
            case 'transfers_in':
                return b.transfers_in_event - a.transfers_in_event;
            default:
                return 0;
        }
    });
};

// Filter players by position and other criteria
export const filterPlayers = (players, filters) => {
    return players.filter(player => {
        if (filters.position && player.element_type !== filters.position) return false;
        if (filters.team && player.team !== filters.team) return false;
        if (filters.maxPrice && player.now_cost > filters.maxPrice * 10) return false;
        if (filters.minPrice && player.now_cost < filters.minPrice * 10) return false;
        if (filters.availableOnly && !getPlayerStatus(player.status, player.chance_of_playing_next_round).available) return false;
        return true;
    });
};

// Get current gameweek
export const getCurrentGameweek = (events) => {
    return events.find(event => event.is_current) || events[0];
};

// Get next gameweek
export const getNextGameweek = (events) => {
    return events.find(event => event.is_next) || events[0];
};

// Format bonus points explanation
export const formatBonusPoints = (bonusPoints) => {
    if (bonusPoints === 3) return 'Highest BPS';
    if (bonusPoints === 2) return '2nd Highest BPS';
    if (bonusPoints === 1) return '3rd Highest BPS';
    return 'No Bonus';
};

// Calculate team strength
export const getTeamStrength = (team) => {
    const homeAttack = team.strength_attack_home || 0;
    const homeDefence = team.strength_defence_home || 0;
    const awayAttack = team.strength_attack_away || 0;
    const awayDefence = team.strength_defence_away || 0;

    return {
        overall: Math.round((homeAttack + homeDefence + awayAttack + awayDefence) / 4),
        home: Math.round((homeAttack + homeDefence) / 2),
        away: Math.round((awayAttack + awayDefence) / 2),
        attack: Math.round((homeAttack + awayAttack) / 2),
        defence: Math.round((homeDefence + awayDefence) / 2)
    };
};

// Get upcoming fixtures for a team
export const getUpcomingFixtures = (fixtures, teamId, numFixtures = 5) => {
    const now = new Date();
    return fixtures
        .filter(fixture =>
            (fixture.team_h === teamId || fixture.team_a === teamId) &&
            !fixture.finished &&
            new Date(fixture.kickoff_time) > now
        )
        .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
        .slice(0, numFixtures);
};

// Calculate average FDR for upcoming fixtures
export const getAverageFDR = (fixtures, teamId, numFixtures = 5) => {
    const upcomingFixtures = getUpcomingFixtures(fixtures, teamId, numFixtures);
    if (upcomingFixtures.length === 0) return 0;

    const totalDifficulty = upcomingFixtures.reduce((sum, fixture) => {
        return sum + (fixture.team_h === teamId ? fixture.team_h_difficulty : fixture.team_a_difficulty);
    }, 0);

    return (totalDifficulty / upcomingFixtures.length).toFixed(1);
};

// Get fixture difficulty color class
export const getFDRColorClass = (difficulty) => {
    if (difficulty <= 2) return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30';
    if (difficulty <= 3) return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30';
    if (difficulty <= 4) return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30';
    return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
};

// Format fixture status
export const getFixtureStatus = (fixture) => {
    if (fixture.finished) return { status: 'Finished', color: 'bg-gray-500' };

    const kickoffTime = new Date(fixture.kickoff_time);
    const now = new Date();

    if (kickoffTime > now) {
        const hoursUntilKickoff = (kickoffTime - now) / (1000 * 60 * 60);
        if (hoursUntilKickoff < 2) return { status: 'Starting Soon', color: 'bg-orange-500' };
        return { status: 'Scheduled', color: 'bg-blue-500' };
    }

    return { status: 'Live', color: 'bg-green-500' };
};
