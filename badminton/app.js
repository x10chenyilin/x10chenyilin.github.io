new Vue({
    el: '#app',
    data: {
        currentView: 'singles',
        matchData: {
            singles: [],
            doubles: []
        },
        selectedDetails: {
            total_matches: 0,
            total_wins: 0,
            win_rate: 0,
            rating: 1000,
            opponents: {},
            matches: []
        },
        detailsModal: null,
        ratings: {
            singles: {},
            doubles: {}
        },
        isLoading: true,
        infoModal: null,
    },
    computed: {
        sortedStats() {
            // 根据当前视图返回排序后的统计数据
            const stats = this.calculateStats();
            return this.sortStats(stats);
        },
        detailsTitle() {
            if (!this.selectedDetails) return '';
            const name = this.formatName(this.selectedDetails.name);
            const type = {
                'singles': '单打',
                'doubles_player': '双打',
                'doubles_pair': '双打组合'
            }[this.currentView];
            return `${type}统计 - ${name}`;
        },
        showRating() {
            return this.currentView !== 'doubles_player';
        },
        lastMatchDate() {
            // 获取最后一场比赛的日期
            const lastSingles = this.matchData.singles
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const lastDoubles = this.matchData.doubles
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            
            const lastSinglesDate = lastSingles ? new Date(lastSingles.date) : new Date(0);
            const lastDoublesDate = lastDoubles ? new Date(lastDoubles.date) : new Date(0);
            
            const lastDate = new Date(Math.max(lastSinglesDate, lastDoublesDate));
            
            // 格式化日期为 YYYY年MM月DD日
            return lastDate.getFullYear() + '年' + 
                   (lastDate.getMonth() + 1) + '月' + 
                   lastDate.getDate() + '日';
        }
    },
    methods: {
        switchView(view) {
            this.currentView = view;
        },
        calculateStats() {
            const stats = {};
            
            if (this.currentView === 'singles') {
                // 计算单打统计
                this.matchData.singles.forEach(match => {
                    // 确保选手名字不为空
                    if (match.player1 && match.player2) {
                        [match.player1, match.player2].forEach(player => {
                            if (!stats[player]) {
                                stats[player] = {
                                    name: player,
                                    matches: 0,
                                    wins: 0,
                                    rating: this.ratings.singles[player] || 1000
                                };
                            }
                            stats[player].matches++;
                            if ((player === match.player1 && match.score1 > match.score2) ||
                                (player === match.player2 && match.score2 > match.score1)) {
                                stats[player].wins++;
                            }
                        });
                    }
                });
            } else if (this.currentView === 'doubles_player') {
                // 计算双打个人统计
                this.matchData.doubles.forEach(match => {
                    // 确保所有选手名字不为空
                    const players = [match.player1_1, match.player1_2, match.player2_1, match.player2_2];
                    if (players.every(player => player)) {  // 确保所有选手名字都存在
                        players.forEach(player => {
                            if (!stats[player]) {
                                stats[player] = {
                                    name: player,
                                    matches: 0,
                                    wins: 0
                                };
                            }
                            stats[player].matches++;
                            if (((player === match.player1_1 || player === match.player1_2) && match.score1 > match.score2) ||
                                ((player === match.player2_1 || player === match.player2_2) && match.score2 > match.score1)) {
                                stats[player].wins++;
                            }
                        });
                    }
                });
            } else {
                // 计算双打组合统计
                this.matchData.doubles.forEach(match => {
                    // 确保所有选手名字不为空
                    if (match.player1_1 && match.player1_2 && match.player2_1 && match.player2_2) {
                        const team1 = [match.player1_1, match.player1_2].sort();
                        const team2 = [match.player2_1, match.player2_2].sort();
                        [team1, team2].forEach(team => {
                            const teamKey = team.join('/');
                            if (!stats[teamKey]) {
                                stats[teamKey] = {
                                    name: team,
                                    matches: 0,
                                    wins: 0,
                                    rating: this.ratings.doubles[teamKey] || 1000
                                };
                            }
                            stats[teamKey].matches++;
                            if ((team === team1 && match.score1 > match.score2) ||
                                (team === team2 && match.score2 > match.score1)) {
                                stats[teamKey].wins++;
                            }
                        });
                    }
                });
            }

            // 计算胜率
            Object.values(stats).forEach(stat => {
                stat.win_rate = (stat.wins / stat.matches) * 100;
            });

            return Object.values(stats);
        },
        sortStats(stats) {
            if (this.currentView === 'doubles_player') {
                return stats.sort((a, b) => b.win_rate - a.win_rate || b.matches - a.matches);
            } else {
                return stats.sort((a, b) => b.rating - a.rating || b.win_rate - a.win_rate);
            }
        },
        showDetails(item) {
            this.selectedDetails = this.calculateDetails(item);
            const modalElement = document.getElementById('detailsModal');
            if (modalElement && !this.detailsModal) {
                this.detailsModal = new bootstrap.Modal(modalElement);
            }
            if (this.detailsModal) {
                this.detailsModal.show();
            }
        },
        calculateDetails(item) {
            if (this.currentView === 'singles') {
                return this.calculateSinglesDetails(item.name);
            } else if (this.currentView === 'doubles_player') {
                return this.calculateDoublesPlayerDetails(item.name);
            } else {
                return this.calculateDoublesPairDetails(item.name);
            }
        },
        calculateSinglesDetails(playerName) {
            const details = {
                name: playerName,
                total_matches: 0,
                total_wins: 0,
                win_rate: 0,
                rating: this.ratings.singles[playerName] || 1000,
                opponents: {},
                matches: []
            };

            this.matchData.singles
                .filter(match => match.player1 === playerName || match.player2 === playerName)
                .forEach(match => {
                    const isPlayer1 = match.player1 === playerName;
                    const opponent = isPlayer1 ? match.player2 : match.player1;
                    const won = isPlayer1 ? match.score1 > match.score2 : match.score2 > match.score1;

                    details.total_matches++;
                    if (won) details.total_wins++;

                    if (!details.opponents[opponent]) {
                        details.opponents[opponent] = { matches: 0, wins: 0 };
                    }
                    details.opponents[opponent].matches++;
                    if (won) details.opponents[opponent].wins++;

                    details.matches.push({
                        date: match.date,
                        opponent: opponent,
                        score: isPlayer1 ? `${match.score1}-${match.score2}` : `${match.score2}-${match.score1}`,
                        result: won ? "胜" : "负"
                    });
                });

            details.win_rate = (details.total_wins / details.total_matches) * 100;
            return details;
        },
        calculateDoublesPlayerDetails(playerName) {
            const details = {
                name: playerName,
                total_matches: 0,
                total_wins: 0,
                win_rate: 0,
                partners: {},
                matches: []
            };

            this.matchData.doubles
                .filter(match => [match.player1_1, match.player1_2, match.player2_1, match.player2_2]
                    .includes(playerName))
                .forEach(match => {
                    const isTeam1 = match.player1_1 === playerName || match.player1_2 === playerName;
                    const partner = isTeam1 
                        ? (match.player1_1 === playerName ? match.player1_2 : match.player1_1)
                        : (match.player2_1 === playerName ? match.player2_2 : match.player2_1);
                    const opponents = isTeam1 
                        ? `${match.player2_1}/${match.player2_2}`
                        : `${match.player1_1}/${match.player1_2}`;
                    const won = isTeam1 ? match.score1 > match.score2 : match.score2 > match.score1;

                    details.total_matches++;
                    if (won) details.total_wins++;

                    if (!details.partners[partner]) {
                        details.partners[partner] = { matches: 0, wins: 0 };
                    }
                    details.partners[partner].matches++;
                    if (won) details.partners[partner].wins++;

                    details.matches.push({
                        date: match.date,
                        partner: partner,
                        opponents: opponents,
                        score: isTeam1 ? `${match.score1}-${match.score2}` : `${match.score2}-${match.score1}`,
                        result: won ? "胜" : "负"
                    });
                });

            details.win_rate = (details.total_wins / details.total_matches) * 100;
            return details;
        },
        calculateDoublesPairDetails(pairName) {
            const details = {
                name: pairName,
                total_matches: 0,
                total_wins: 0,
                win_rate: 0,
                rating: this.ratings.doubles[pairName.join('/')] || 1000,
                opponents: {},
                matches: []
            };

            const [player1, player2] = pairName;
            this.matchData.doubles
                .filter(match => 
                    (match.player1_1 === player1 && match.player1_2 === player2) ||
                    (match.player1_1 === player2 && match.player1_2 === player1) ||
                    (match.player2_1 === player1 && match.player2_2 === player2) ||
                    (match.player2_1 === player2 && match.player2_2 === player1)
                )
                .forEach(match => {
                    const isTeam1 = match.player1_1 === player1 || match.player1_2 === player1;
                    const opponents = isTeam1 
                        ? [match.player2_1, match.player2_2].sort()
                        : [match.player1_1, match.player1_2].sort();
                    const won = isTeam1 ? match.score1 > match.score2 : match.score2 > match.score1;

                    details.total_matches++;
                    if (won) details.total_wins++;

                    const opponentKey = opponents.join('/');
                    if (!details.opponents[opponentKey]) {
                        details.opponents[opponentKey] = { matches: 0, wins: 0 };
                    }
                    details.opponents[opponentKey].matches++;
                    if (won) details.opponents[opponentKey].wins++;

                    details.matches.push({
                        date: match.date,
                        opponents: opponentKey,
                        score: isTeam1 ? `${match.score1}-${match.score2}` : `${match.score2}-${match.score1}`,
                        result: won ? "胜" : "负"
                    });
                });

            details.win_rate = (details.total_wins / details.total_matches) * 100;
            return details;
        },
        formatName(name) {
            if (Array.isArray(name)) return name.join('/');
            return name;
        },
        formatPercentage(value) {
            return value.toFixed(1) + '%';
        },
        formatNumber(value) {
            return value.toFixed(1);
        },
        calculateEloRating() {
            // 初始化积分
            const initialRating = 1000;
            const K = 32;

            // 重置积分
            this.ratings = {
                singles: {},
                doubles: {}
            };

            // 计算单打积分
            this.matchData.singles.sort((a, b) => new Date(a.date) - new Date(b.date))
                .forEach(match => {
                    const player1 = match.player1;
                    const player2 = match.player2;
                    
                    // 初始化积分
                    if (!this.ratings.singles[player1]) this.ratings.singles[player1] = initialRating;
                    if (!this.ratings.singles[player2]) this.ratings.singles[player2] = initialRating;
                    
                    const rating1 = this.ratings.singles[player1];
                    const rating2 = this.ratings.singles[player2];
                    
                    // 计算预期分数
                    const expected1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
                    
                    // 实际分数
                    const score1 = match.score1 > match.score2 ? 1 : 0;
                    
                    // 更新积分
                    const ratingChange = K * (score1 - expected1);
                    this.ratings.singles[player1] += ratingChange;
                    this.ratings.singles[player2] -= ratingChange;
                });

            // 计算双打积分
            this.matchData.doubles.sort((a, b) => new Date(a.date) - new Date(b.date))
                .forEach(match => {
                    const team1 = [match.player1_1, match.player1_2].sort().join('/');
                    const team2 = [match.player2_1, match.player2_2].sort().join('/');
                    
                    // 初始化积分
                    if (!this.ratings.doubles[team1]) this.ratings.doubles[team1] = initialRating;
                    if (!this.ratings.doubles[team2]) this.ratings.doubles[team2] = initialRating;
                    
                    const rating1 = this.ratings.doubles[team1];
                    const rating2 = this.ratings.doubles[team2];
                    
                    // 计算预期分数
                    const expected1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
                    
                    // 实际分数
                    const score1 = match.score1 > match.score2 ? 1 : 0;
                    
                    // 更新积分
                    const ratingChange = K * (score1 - expected1);
                    this.ratings.doubles[team1] += ratingChange;
                    this.ratings.doubles[team2] -= ratingChange;
                });
        },
        showInfo() {
            if (!this.infoModal) {
                this.infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
            }
            this.infoModal.show();
        }
    },
    async mounted() {
        this.isLoading = true;
        try {
            this.matchData = await DataLoader.loadData();
            this.calculateEloRating();
            
            this.$nextTick(() => {
                const modalElement = document.getElementById('detailsModal');
                const infoModalElement = document.getElementById('infoModal');
                if (modalElement) {
                    this.detailsModal = new bootstrap.Modal(modalElement);
                }
                if (infoModalElement) {
                    this.infoModal = new bootstrap.Modal(infoModalElement);
                }
            });
        } catch (error) {
            console.error('Error initializing app:', error);
        } finally {
            this.isLoading = false;
        }
    }
}); 