// 韻のペアを色分けするためのカラーパレット
const COLORS = [
    'rgba(255, 99, 132, 0.6)', // 赤系
    'rgba(54, 162, 235, 0.6)', // 青系
    'rgba(255, 206, 86, 0.6)', // 黄色系
    'rgba(75, 192, 192, 0.6)', // 緑系
    'rgba(153, 102, 255, 0.6)',// 紫系
    'rgba(255, 159, 64, 0.6)', // オレンジ系
    'rgba(199, 199, 199, 0.6)',// グレー系
    'rgba(83, 207, 189, 0.6)'  // シアン系
];

let colorIndex = 0;

/**
 * テキストを単語の配列に変換する
 * @param {string} text - 入力テキスト
 * @returns {string[]} 単語の配列
 */
function tokenize(text) {
    // 改行、句読点、スペースなどで区切り、空要素を削除
    return text.split(/[\s\n\r、。「」？！()（）\t]+/g)
               .filter(word => word.length > 0);
}

/**
 * 日本語の音節（ひらがな）を取得する（簡易的な実装）
 * @param {string} word - 単語
 * @returns {string} 単語の音節（ひらがな）
 */
function getPhonetic(word) {
    // 実際には形態素解析が必要だが、ここでは簡易的にひらがなに変換したものを音節とする
    // 複雑な変換は難しいので、ユーザーが入力したテキスト（例えば、すべてひらがな/カタカナ）の後半部分を見るのが現実的
    return word; // 今回は簡易のため、単語自体をそのまま使う
}

/**
 * 韻を踏んでいる単語のペアを見つける
 * @param {string[]} words - 単語の配列
 * @param {number} minLength - 最短の韻の長さ
 * @param {number} maxDistance - 単語間の最大距離
 * @returns {Array<{index1: number, index2: number, rhymeLength: number}>} 韻のペア
 */
function findRhymes(words, minLength, maxDistance) {
    const rhymes = [];

    for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j < words.length; j++) {
            // 単語間の距離が最大距離を超えていたらスキップ
            if (j - i > maxDistance) {
                break;
            }

            const word1 = getPhonetic(words[i]);
            const word2 = getPhonetic(words[j]);

            // どちらかの単語が短すぎる場合はスキップ
            if (word1.length < minLength || word2.length < minLength) {
                continue;
            }

            let matchLength = 0;
            // 語尾から一致する長さを探す
            for (let k = 1; k <= Math.min(word1.length, word2.length); k++) {
                const char1 = word1[word1.length - k];
                const char2 = word2[word2.length - k];

                if (char1 === char2) {
                    matchLength++;
                } else {
                    break;
                }
            }

            // 最短の韻の長さを満たしているかチェック
            if (matchLength >= minLength) {
                rhymes.push({
                    index1: i,
                    index2: j,
                    rhymeLength: matchLength
                });
            }
        }
    }

    // 検出された韻のペアを、より長い韻から処理するためにソート
    rhymes.sort((a, b) => b.rhymeLength - a.rhymeLength);
    return rhymes;
}

/**
 * 全体の分析処理を実行し、結果を出力する
 */
function analyzeRhymes() {
    const inputElement = document.getElementById('lyricInput');
    const outputElement = document.getElementById('rhymeOutput');
    const minLength = parseInt(document.getElementById('minLength').value, 10);
    const maxDistance = parseInt(document.getElementById('minWords').value, 10);
    
    const inputText = inputElement.value;
    if (!inputText.trim()) {
        outputElement.innerHTML = '<p style="color: red;">リリックを入力してください。</p>';
        return;
    }

    // 1. テキストを単語に分割
    const words = tokenize(inputText);
    
    // 2. 韻のペアを見つける
    const rhymes = findRhymes(words, minLength, maxDistance);

    // 3. 結果のHTMLを生成する
    let coloredHtml = inputText; // 元のテキストを保持

    // 韻のハイライトに使う色を管理するためのマップ
    // Key: 韻を踏んでいる単語のインデックス
    // Value: 割り当てられたカラーのCSS値
    const wordColorMap = {};
    const usedWordIndices = new Set();
    colorIndex = 0;

    // 検出された韻のペアを処理
    rhymes.forEach(rhyme => {
        const { index1, index2, rhymeLength } = rhyme;

        // 既に他のより長い韻でハイライトされていないかチェック
        // 最も長い韻を優先的に色付けするためのロジック
        if (usedWordIndices.has(index1) || usedWordIndices.has(index2)) {
            return;
        }

        // 新しい色を割り当てる
        const color = COLORS[colorIndex % COLORS.length];
        colorIndex++;

        // 選択された単語のインデックスをマップに登録
        wordColorMap[index1] = color;
        wordColorMap[index2] = color;

        // 使用済みとしてマーク
        usedWordIndices.add(index1);
        usedWordIndices.add(index2);
    });
    
    // 単語と区切り文字を再構築しながら、ハイライトを適用する
    let finalHtml = '';
    let currentWordIndex = 0;
    
    // 改行、句読点、スペースを保持するための正規表現（区切り文字も取得する）
    const separators = inputText.match(/([\s\n\r、。「」？！()（）\t]+|\S+)/g);
    
    if (separators) {
        separators.forEach(segment => {
            // 単語である場合 (区切り文字ではない場合)
            if (tokenize(segment).length > 0) {
                const word = segment;
                const color = wordColorMap[currentWordIndex];
                
                if (color) {
                    // 韻として色付け
                    const rhymePart = word.substring(word.length - minLength); // 語尾のminLength文字を韻とする
                    const prefix = word.substring(0, word.length - minLength);
                    
                    finalHtml += `
                        <span class="word-container">${prefix}<span class="rhyme-highlight" style="background-color: ${color};">${rhymePart}</span></span>
                    `;
                } else {
                    // 色付けなしの単語
                    finalHtml += `<span>${word}</span>`;
                }
                currentWordIndex++;
            } else {
                // 区切り文字（スペース、改行など）
                finalHtml += segment.replace(/\n/g, '<br>'); // 改行をHTMLタグに変換
            }
        });
    }

    outputElement.innerHTML = finalHtml;
}

// 初期値をセット (オプション)
window.onload = function() {
    document.getElementById('lyricInput').value = 
`掴むチャンス 常にアドバンス
塗り替えるキャンバス 目指すアドバンス
過去にバイバイ 揺るがないスタンス
未来を彩る人生のキャンバス`;
    analyzeRhymes(); // 初期分析
};
