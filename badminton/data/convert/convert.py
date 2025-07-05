Dictionary = {
    "cyl": "陈毅麟",
    "jjr": "姜佳楉",
    "jj": "姜佳楉",
    "lzz": "林知之",
    "czr": "陈泽睿",
    "lyj": "李宇杰",
    "xzg": "徐子淦",
    "lzk": "刘泽恺",
    "mkx": "茅恺翔",
    "lzj": "李子骏",
    "yz": "袁智",
    "tcx": "汤晨曦",
    "tm": "汤晨曦",
    "mpy": "马培原",
    "zx": "张迅",
    "dtz": "丁铁铮",
    "chd":"陈灏丹",
    "mtq":"茅天骐",
    "lzz2":"林知之（左手）",
    "czr2":"陈泽睿（半场）",
    "zjy":"赵泾源",
    "zhj":"张颢继",
    "sjc":"石谨诚"
}

date = "2025/7/5"

def convert(line):

    line = line.replace('：', ':')
    parts = line.split()
    if len(parts) == 4:
        player1 = parts[1]
        score1, score2 = parts[2].split(':')
        player2 = parts[3]
        formatted = f"{date},{Dictionary[player1]},{score1},{score2},{Dictionary[player2]}"
        return (True, formatted)
    player1 = parts[1]
    player2 = parts[2]
    score1, score2 = parts[3].split(':')
    player3 = parts[4]
    player4 = parts[5]

    formatted = f"{date},{Dictionary[player1]},{Dictionary[player2]},{score1},{score2},{Dictionary[player3]},{Dictionary[player4]}"
    return (False, formatted)

if __name__ == "__main__":
    with open("input.txt", "r", encoding='utf-8') as f:
        lines = f.readlines()
        doubles = []
        for line in lines:
            if convert(line)[0]:
                print(convert(line)[1])
            else:
                doubles.append(convert(line)[1])
        print()
        for double in doubles:
            print(double)