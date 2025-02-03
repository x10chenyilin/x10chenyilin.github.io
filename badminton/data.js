// 这个文件将包含所有比赛数据
const matchData = {
    singles: [
        {
            date: "2024-01-01",
            player1: "张三",
            score1: 21,
            score2: 19,
            player2: "李四"
        },
        // ... 更多比赛数据
    ],
    doubles: [
        {
            date: "2024-01-01",
            player1_1: "张三",
            player1_2: "李四",
            score1: 21,
            score2: 19,
            player2_1: "王五",
            player2_2: "赵六"
        },
        // ... 更多比赛数据
    ]
};

class DataLoader {
    static async loadData() {
        try {
            console.log('开始加载数据...');
            
            // 修改数据文件路径
            const singlesResponse = await fetch('./data/badminton-record-singles.csv');
            if (!singlesResponse.ok) {
                throw new Error(`无法加载单打数据: ${singlesResponse.status} ${singlesResponse.statusText}`);
            }
            
            const doublesResponse = await fetch('./data/badminton-record-doubles.csv');
            if (!doublesResponse.ok) {
                throw new Error(`无法加载双打数据: ${doublesResponse.status} ${doublesResponse.statusText}`);
            }
            
            console.log('成功获取响应，开始解析数据...');
            
            const singlesText = await singlesResponse.text();
            const doublesText = await doublesResponse.text();
            
            console.log('数据文本获取成功，开始解析CSV...');
            
            const singles = this.parseCSV(singlesText, ['date', 'player1', 'score1', 'score2', 'player2']);
            const doubles = this.parseCSV(doublesText, ['date', 'player1_1', 'player1_2', 'score1', 'score2', 'player2_1', 'player2_2']);
            
            console.log(`解析完成: ${singles.length}条单打记录, ${doubles.length}条双打记录`);
            
            return { singles, doubles };
        } catch (error) {
            console.error('数据加载错误:', error);
            // 显示更友好的错误信息
            alert(`数据加载失败: ${error.message}\n请确保数据文件存在且格式正确。`);
            return { singles: [], doubles: [] };
        }
    }

    static parseCSV(csvText, expectedColumns) {
        try {
            const lines = csvText.split('\n');
            if (lines.length === 0) {
                throw new Error('CSV文件为空');
            }
            
            const headers = lines[0].trim().split(',');
            console.log('CSV表头:', headers);
            
            const records = lines.slice(1)  // 跳过表头
                .filter(line => line.trim())  // 跳过空行
                .map((line, index) => {
                    const values = line.trim().split(',');
                    const record = {};
                    
                    // 确保数据列数正确
                    if (values.length < expectedColumns.length) {
                        console.warn(`第${index + 2}行数据列数不足:`, line);
                        return null;
                    }
                    
                    expectedColumns.forEach((col, i) => {
                        if (col.includes('score')) {
                            // 将比分转换为数字
                            const score = parseInt(values[i]);
                            if (isNaN(score)) {
                                console.warn(`第${index + 2}行比分无效:`, values[i]);
                                record[col] = 0;
                            } else {
                                record[col] = score;
                            }
                        } else {
                            record[col] = values[i];
                        }
                    });
                    return record;
                })
                .filter(record => record !== null);  // 过滤无效记录
            
            console.log(`成功解析${records.length}条记录`);
            return records;
        } catch (error) {
            console.error('CSV解析错误:', error);
            throw new Error(`CSV解析失败: ${error.message}`);
        }
    }
} 