// Base URL for our API routes
const API_BASE_URL = '/api/fpl';

export const fplService = {
    // Bootstrap static data - Core game data
    async getBootstrapStatic() {
        try {
            const response = await fetch(`${API_BASE_URL}/bootstrap-static`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error('Failed to fetch bootstrap data');
        }
    },

    // Get individual player's detailed stats
    async getPlayerSummary(playerId) {
        try {
            const response = await fetch(`${API_BASE_URL}/player/${playerId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch player ${playerId} summary`);
        }
    },

    // Get manager profile data
    async getManagerProfile(managerId) {
        try {
            const response = await fetch(`${API_BASE_URL}/manager/${managerId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch manager ${managerId} profile`);
        }
    },

    // Get manager's picks for a specific gameweek
    async getManagerPicks(managerId, gameweek) {
        try {
            const response = await fetch(`${API_BASE_URL}/manager/${managerId}/picks/${gameweek}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch manager ${managerId} picks for GW${gameweek}`);
        }
    },

    // Get manager's season history
    async getManagerHistory(managerId) {
        try {
            const response = await fetch(`${API_BASE_URL}/manager/${managerId}/history`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch manager ${managerId} history`);
        }
    },

    // Get fixtures data
    async getFixtures() {
        try {
            const response = await fetch(`${API_BASE_URL}/fixtures`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error('Failed to fetch fixtures');
        }
    },

    // Get live gameweek data
    async getLiveGameweek(gameweek) {
        try {
            const response = await fetch(`${API_BASE_URL}/live/${gameweek}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch live data for GW${gameweek}`);
        }
    },

    // Get dream team for a gameweek
    async getDreamTeam(gameweek) {
        try {
            const response = await fetch(`${API_BASE_URL}/dream-team/${gameweek}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch dream team for GW${gameweek}`);
        }
    },

    // Get mini-league standings
    async getLeagueStandings(leagueId, page = 1) {
        try {
            const response = await fetch(`${API_BASE_URL}/league/${leagueId}?page=${page}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch league ${leagueId} standings`);
        }
    },

    // Get game status
    async getEventStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/event-status`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error('Failed to fetch event status');
        }
    },

    // Get manager transfers for current gameweek
    async getManagerTransfers(managerId) {
        try {
            const response = await fetch(`${API_BASE_URL}/manager/${managerId}/transfers`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch manager ${managerId} transfers`);
        }
    },
};

export default fplService;
