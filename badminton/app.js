// 注册必要的组件
Chart.register(Chart.TimeScale, Chart.LinearScale, Chart.PointElement, Chart.LineElement, Chart.Title, Chart.Tooltip, Chart.Legend);

new Vue({
    el: '#app',
    data: {
        currentView: 'singles',
        matchData: {
            singles: [],
            doubles: []
        },
        // 存储所有积分历史
        ratingHistory: {
            singles: {}, // 存储单打选手的积分历史
            doubles: {}, // 存储双打组合的积分历史
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
            // 如果模态框打开，先关闭它
            if (this.detailsModal) {
                this.detailsModal.hide();
            }
            // 重置选中的详情
            this.selectedDetails = {
                total_matches: 0,
                total_wins: 0,
                win_rate: 0,
                rating: 1000,
                opponents: {},
                matches: []
            };
            // 切换视图
            this.currentView = view;
        },
        calculateStats() {
            if (this.currentView === 'singles') {
                // 计算单打统计
                const stats = {};
                
                // 遍历所有有比赛记录的选手
                Object.entries(this.ratingHistory.singles).forEach(([name, matches]) => {
                    // 检查选手名是否有效
                    if (!name || name.trim() === '') return;
                    
                    const lastMatch = matches[matches.length - 1];
                    const finalRating = lastMatch ? lastMatch.rating + lastMatch.ratingChange : 1000;
                    let total_wins = matches.filter(m => m.result === "胜").length;
                    
                    stats[name] = {
                        name: name,
                        matches: matches.length,          // 添加比赛场次
                        wins: total_wins,                 // 添加胜场
                        total_matches: matches.length,    // 保持兼容性
                        total_wins: total_wins,          // 保持兼容性
                        win_rate: (total_wins / matches.length) * 100,
                        rating: finalRating
                    };
                });
                
                return stats;
                
            } else if (this.currentView === 'doubles_player') {
                // 计算双打选手统计
                const stats = {};
                
                // 遍历所有双打比赛，统计每个选手的数据
                this.matchData.doubles.forEach(match => {
                    const players = [match.player1_1, match.player1_2, match.player2_1, match.player2_2];
                    players.forEach(player => {
                        if (!stats[player]) {
                            stats[player] = {
                                name: player,
                                matches: 0,              // 添加比赛场次
                                wins: 0,                 // 添加胜场
                                total_matches: 0,        // 保持兼容性
                                total_wins: 0,          // 保持兼容性
                                win_rate: 0
                            };
                        }
                        stats[player].matches++;
                        stats[player].total_matches++;
                        
                        const isTeam1 = (player === match.player1_1 || player === match.player1_2);
                        const won = isTeam1 ? match.score1 > match.score2 : match.score2 > match.score1;
                        if (won) {
                            stats[player].wins++;
                            stats[player].total_wins++;
                        }
                    });
                });
                
                // 计算胜率
                Object.values(stats).forEach(player => {
                    player.win_rate = (player.wins / player.matches) * 100;
                });
                
                return stats;
                
            } else {
                // 计算双打组合统计
                const stats = {};
                
                // 遍历所有有比赛记录的组合
                Object.entries(this.ratingHistory.doubles).forEach(([teamKey, matches]) => {
                    const lastMatch = matches[matches.length - 1];
                    const finalRating = lastMatch ? lastMatch.rating + lastMatch.ratingChange : 1000;
                    let total_wins = matches.filter(m => m.result === "胜").length;
                    
                    stats[teamKey] = {
                        name: teamKey.split('/'),
                        matches: matches.length,          // 添加比赛场次
                        wins: total_wins,                 // 添加胜场
                        total_matches: matches.length,    // 保持兼容性
                        total_wins: total_wins,          // 保持兼容性
                        win_rate: (total_wins / matches.length) * 100,
                        rating: finalRating
                    };
                });
                
                return stats;
            }
        },
        sortStats(stats) {
            // 将对象转换为数组
            const statsArray = Object.values(stats);
            
            if (this.currentView === 'doubles_player') {
                return statsArray.sort((a, b) => 
                    b.win_rate - a.win_rate || 
                    b.total_matches - a.total_matches
                );
            } else {
                return statsArray.sort((a, b) => 
                    b.rating - a.rating || 
                    b.win_rate - a.win_rate
                );
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
                
                // 在模态框显示后绘制图表
                this.$nextTick(() => {
                    if (this.currentView !== 'doubles_player') {
                        const ctx = document.getElementById('ratingChart');
                        if (!ctx) return;

                        const history = this.calculateRatingHistory(
                            item.name,
                            this.currentView === 'doubles_pair'
                        );
                        
                        // 销毁现有图表（如果存在）
                        if (this.ratingChart) {
                            this.ratingChart.destroy();
                        }
                        
                        // 处理日期格式
                        const chartData = history.map(h => ({
                            x: moment(h.date, 'YYYY/MM/DD').toDate(),
                            y: h.rating
                        }));
                        
                        // 创建新图表
                        this.ratingChart = new Chart(ctx, {
                            type: 'line',
                            data: {
                                datasets: [{
                                    label: '积分',
                                    data: chartData,
                                    borderColor: '#0d6efd',
                                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                                    fill: true,
                                    tension: 0.4
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: '积分变化趋势'
                                    }
                                },
                                scales: {
                                    x: {
                                        type: 'time',
                                        time: {
                                            parser: 'YYYY/MM/DD',
                                            unit: 'day',
                                            displayFormats: {
                                                day: 'MM-DD'
                                            }
                                        },
                                        title: {
                                            display: true,
                                            text: '日期'
                                        }
                                    },
                                    y: {
                                        title: {
                                            display: true,
                                            text: '积分'
                                        },
                                        suggestedMin: 900,
                                        suggestedMax: 1100
                                    }
                                }
                            }
                        });
                    }
                });
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
        calculateSinglesDetails(name) {
            const matches = this.ratingHistory.singles[name] || [];
            const opponents = {};
            let total_matches = matches.length;
            let total_wins = 0;

            matches.forEach(match => {
                if (!opponents[match.opponent]) {
                    opponents[match.opponent] = { matches: 0, wins: 0 };
                }
                opponents[match.opponent].matches++;
                if (match.result === "胜") {
                    opponents[match.opponent].wins++;
                    total_wins++;
                }
            });

            const lastMatch = matches[matches.length - 1];
            const finalRating = lastMatch ? lastMatch.rating + lastMatch.ratingChange : 1000;

            return {
                name: name,
                total_matches,
                total_wins,
                win_rate: (total_wins / total_matches) * 100,
                rating: finalRating,
                opponents,
                matches
            };
        },
        calculateDoublesPlayerDetails(playerName) {
            const matches = [];
            const partners = {};
            let total_matches = 0;
            let total_wins = 0;
            const initialRating = 1000;
            const K = 32;
            const tempRatings = {};

            // 初始化所有组合的积分
            this.matchData.doubles.forEach(match => {
                const team1 = [match.player1_1, match.player1_2].sort().join('/');
                const team2 = [match.player2_1, match.player2_2].sort().join('/');
                if (!tempRatings[team1]) tempRatings[team1] = initialRating;
                if (!tempRatings[team2]) tempRatings[team2] = initialRating;
            });

            // 处理每场比赛
            this.matchData.doubles.forEach(match => {
                // 如果是目标选手的比赛
                if ([match.player1_1, match.player1_2, match.player2_1, match.player2_2].includes(playerName)) {
                    const isTeam1 = match.player1_1 === playerName || match.player1_2 === playerName;
                    const partner = isTeam1 
                        ? (match.player1_1 === playerName ? match.player1_2 : match.player1_1)
                        : (match.player2_1 === playerName ? match.player2_2 : match.player2_1);
                    const opponents = isTeam1 
                        ? `${match.player2_1}/${match.player2_2}`
                        : `${match.player1_1}/${match.player1_2}`;
                    
                    // 获取组合的key
                    const teamKey = isTeam1 
                        ? [match.player1_1, match.player1_2].sort().join('/')
                        : [match.player2_1, match.player2_2].sort().join('/');
                    const opponentTeamKey = isTeam1
                        ? [match.player2_1, match.player2_2].sort().join('/')
                        : [match.player1_1, match.player1_2].sort().join('/');
                    
                    // 计算积分变化
                    const rating1 = tempRatings[teamKey];
                    const rating2 = tempRatings[opponentTeamKey];
                    const expected = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
                    const actual = isTeam1 ? (match.score1 > match.score2 ? 1 : 0) : (match.score2 > match.score1 ? 1 : 0);
                    const ratingChange = K * (actual - expected);

                    // 记录比赛
                    matches.push({
                        date: match.date,
                        partner: partner,
                        opponents: isTeam1 
                            ? `${match.player2_1}/${match.player2_2}`
                            : `${match.player1_1}/${match.player1_2}`,
                        score: isTeam1 ? `${match.score1}-${match.score2}` : `${match.score2}-${match.score1}`,
                        result: actual === 1 ? "胜" : "负",
                        rating: rating1,  // 添加当前积分
                        ratingChange: ratingChange
                    });

                    // 更新积分
                    tempRatings[teamKey] += ratingChange;
                    tempRatings[opponentTeamKey] -= ratingChange;

                    // 更新搭档统计
                    if (!partners[partner]) {
                        partners[partner] = { matches: 0, wins: 0 };
                    }
                    partners[partner].matches++;
                    if (actual === 1) {
                        partners[partner].wins++;
                        total_wins++;
                    }
                    total_matches++;
                }
            });

            return {
                name: playerName,
                total_matches,
                total_wins,
                win_rate: (total_wins / total_matches) * 100,
                rating: tempRatings[playerName],
                partners,
                matches
            };
        },
        calculateDoublesPairDetails(pairName) {
            const pairKey = pairName.sort().join('/');
            const matches = this.ratingHistory.doubles[pairKey] || [];
            const opponents = {};
            let total_matches = matches.length;
            let total_wins = 0;

            matches.forEach(match => {
                if (!opponents[match.opponent]) {
                    opponents[match.opponent] = { matches: 0, wins: 0 };
                }
                opponents[match.opponent].matches++;
                if (match.result === "胜") {
                    opponents[match.opponent].wins++;
                    total_wins++;
                }
            });

            const lastMatch = matches[matches.length - 1];
            const finalRating = lastMatch ? lastMatch.rating + lastMatch.ratingChange : 1000;

            return {
                name: pairName,
                total_matches,
                total_wins,
                win_rate: (total_wins / total_matches) * 100,
                rating: finalRating,
                opponents,
                matches
            };
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
        },
        calculateRatingHistory(name, isDoublesTeam = false) {
            const matches = isDoublesTeam ? 
                this.ratingHistory.doubles[name.sort().join('/')] :
                this.ratingHistory.singles[name];

            if (!matches || matches.length === 0) return [];

            const history = [];
            let currentDate = null;
            let currentRating = null;

            matches.forEach(match => {
                if (currentDate !== match.date) {
                    if (currentDate !== null) {
                        history.push({
                            date: currentDate,
                            rating: currentRating
                        });
                    }
                    currentDate = match.date;
                }
                currentRating = match.rating + match.ratingChange;
            });

            if (currentDate !== null) {
                history.push({
                    date: currentDate,
                    rating: currentRating
                });
            }

            return history;
        },
        calculateAllRatings() {
            const initialRating = 1000;
            const K = 32;

            // 计算单打积分历史
            const singlesRatings = {};
            const singlesHistory = {};

            // 初始化所有选手的积分
            this.matchData.singles.forEach(match => {
                if (!singlesRatings[match.player1]) {
                    singlesRatings[match.player1] = initialRating;
                    singlesHistory[match.player1] = [];
                }
                if (!singlesRatings[match.player2]) {
                    singlesRatings[match.player2] = initialRating;
                    singlesHistory[match.player2] = [];
                }
            });

            // 计算每场比赛后的积分变化
            this.matchData.singles.forEach(match => {
                const rating1 = singlesRatings[match.player1];
                const rating2 = singlesRatings[match.player2];
                const expected1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
                const actual1 = match.score1 > match.score2 ? 1 : 0;
                const ratingChange = K * (actual1 - expected1);

                // 记录比赛前的积分和变化
                singlesHistory[match.player1].push({
                    date: match.date,
                    opponent: match.player2,
                    score: `${match.score1}-${match.score2}`,
                    result: actual1 === 1 ? "胜" : "负",
                    rating: rating1,
                    ratingChange: ratingChange
                });

                singlesHistory[match.player2].push({
                    date: match.date,
                    opponent: match.player1,
                    score: `${match.score2}-${match.score1}`,
                    result: actual1 === 0 ? "胜" : "负",
                    rating: rating2,
                    ratingChange: -ratingChange
                });

                // 更新积分
                singlesRatings[match.player1] += ratingChange;
                singlesRatings[match.player2] -= ratingChange;
            });

            // 计算双打积分历史
            const doublesRatings = {};
            const doublesHistory = {};

            // 初始化所有组合的积分
            this.matchData.doubles.forEach(match => {
                const team1 = [match.player1_1, match.player1_2].sort().join('/');
                const team2 = [match.player2_1, match.player2_2].sort().join('/');
                if (!doublesRatings[team1]) {
                    doublesRatings[team1] = initialRating;
                    doublesHistory[team1] = [];
                }
                if (!doublesRatings[team2]) {
                    doublesRatings[team2] = initialRating;
                    doublesHistory[team2] = [];
                }
            });

            // 计算每场比赛后的积分变化
            this.matchData.doubles.forEach(match => {
                const team1 = [match.player1_1, match.player1_2].sort().join('/');
                const team2 = [match.player2_1, match.player2_2].sort().join('/');
                const rating1 = doublesRatings[team1];
                const rating2 = doublesRatings[team2];
                const expected1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
                const actual1 = match.score1 > match.score2 ? 1 : 0;
                const ratingChange = K * (actual1 - expected1);

                // 记录比赛前的积分和变化
                doublesHistory[team1].push({
                    date: match.date,
                    opponent: team2,
                    score: `${match.score1}-${match.score2}`,
                    result: actual1 === 1 ? "胜" : "负",
                    rating: rating1,
                    ratingChange: ratingChange
                });

                doublesHistory[team2].push({
                    date: match.date,
                    opponent: team1,
                    score: `${match.score2}-${match.score1}`,
                    result: actual1 === 0 ? "胜" : "负",
                    rating: rating2,
                    ratingChange: -ratingChange
                });

                // 更新积分
                doublesRatings[team1] += ratingChange;
                doublesRatings[team2] -= ratingChange;
            });

            // 保存积分历史
            this.ratingHistory = {
                singles: singlesHistory,
                doubles: doublesHistory
            };
        }
    },
    async mounted() {
        this.isLoading = true;
        try {
            this.matchData = await DataLoader.loadData();
            this.calculateAllRatings(); // 计算所有积分历史
            
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