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
 * 日本語の単語から母音列を取得する（簡易的な実装）
 * @param {string} word - 単語
 * @returns {string} 母音の並び (例: "アドバンス" -> "あおあす")
 */
function getVowelPhonetic(word) {
    // 濁音・半濁音（がぎぐげご、ぱぴぷぺぽなど）を清音化するのは複雑なのでスキップし、
    // まずカタカナ・ひらがなに変換した上で母音を抽出する、という簡易的な処理を行う。

    // 1. カタカナ・ひらがな以外の文字（漢字、記号など）を除去し、すべてひらがなに変換（非常に簡易的）
    // 実際にはもっと複雑な処理が必要だが、今回はユーザーがラップのリリックを入力することを想定
    const hiragana = word.replace(/[ァ-ン]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60));

    // 2. 母音を抽出 (a, i, u, e, o)
    let vowels = '';
    for (const char of hiragana) {
        if ('あかがさざただなはばぱまやゃらわ'.includes(char)) vowels += 'あ';
        else if ('いぎしじちぢにひびぴみり'.includes(char)) vowels += 'い';
        else if ('うぐすずつぬふぶぷむゆる'.includes(char)) vowels += 'う';
        else if ('えげせぜてでにへべぺめれ'.includes(char)) vowels += 'え';
        else if ('おごそぞとどのほぼぽもよょろを'.includes(char)) vowels += 'お';
        // 「ん」は母音ではないが、韻を踏む上では重要なので、今回は母音の並びに含めずスキップする
        // 小文字の「っ」や「ゃゅょ」もスキップ
    }
    return vowels;
}

/**
 * テキストを単語の配列に変換する
 * @param {string} text - 入力テキスト
 * @returns {string[]} 単語の配列
 */
function tokenize(text) {
    // 改行、句読点、スペースなどで区切り、空要素を削除
    // このトークナイズは、後のHTML再構築と整合性が取れるようにシンプルに保つ
    return text.split(/[\s\n\r、。「」？！()（）\t]+/g)
               .filter(word => word.length > 0);
}

/**
 * 韻を踏んでいる単語のペアを見つける（母音判定）
 * @param {string[]} words - 単語の配列
 * @param {number} minLength - 最短の母音一致の長さ
 * @param {number} maxDistance - 単語間の最大距離
 * @returns {Array<{index1: number, index2: number, rhymeLength: number, rhymeVowels: string}>} 韻のペア
 */
function findRhymes(words, minLength, maxDistance) {
    const rhymes = [];

    for (let i = 0; i < words.length; i++) {
        const vowel1 = getVowelPhonetic(words[i]);

        // 単語自体が短すぎる場合はスキップ
        if (vowel1.length < minLength) continue;

        for (let j = i + 1; j < words.length; j++) {
            // 単語間の距離が最大距離を超えていたらスキップ
            if (j - i > maxDistance) {
                break;
            }

            const vowel2 = getVowelPhonetic(words[j]);
            
            // 単語自体が短すぎる場合はスキップ
            if (vowel2.length < minLength) continue;

            let matchLength = 0;
            let rhymeVowels = '';
            
            // 語尾から母音が一致する長さを探す
            for (let k = 1; k <= Math.min(vowel1.length, vowel2.length); k++) {
                const char1 = vowel1[vowel1.length - k];
                const char2 = vowel2[vowel2.length - k];

                if (char1 === char2) {
                    // 母音の並びを逆順に構築
                    rhymeVowels = char1 + rhymeVowels; 
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
                    rhymeLength: matchLength,
                    rhymeVowels: rhymeVowels
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
        outputElement.innerHTML = '';
        return;
    }

    // 1. テキストを単語に分割
    const words = tokenize(inputText);
    
    // 2. 韻のペアを見つける
    const rhymes = findRhymes(words, minLength, maxDistance);

    // 3. 結果のHTMLを生成する
    
    // 韻のハイライトに使う色を管理するためのマップ
    const wordColorMap = {};
    const usedWordIndices = new Set();
    colorIndex = 0;

    // 検出された韻のペアを処理
    rhymes.forEach(rhyme => {
        const { index1, index2, rhymeLength, rhymeVowels } = rhyme;

        // 既に他のより長い韻でハイライトされていないかチェック
        if (usedWordIndices.has(index1) || usedWordIndices.has(index2)) {
            return;
        }

        // 新しい色を割り当てる
        const color = COLORS[colorIndex % COLORS.length];
        colorIndex++;

        // 選択された単語のインデックスをマップに登録（色と母音情報をセットで）
        wordColorMap[index1] = { color: color, vowels: rhymeVowels };
        wordColorMap[index2] = { color: color, vowels: rhymeVowels };

        // 使用済みとしてマーク
        usedWordIndices.add(index1);
        usedWordIndices.add(index2);
    });
    
    // 4. 単語と区切り文字を再構築しながら、ハイライトを適用する
    let finalHtml = '';
    let currentWordIndex = 0;
    
    // 改行、句読点、スペース、単語本体をすべて取得するための正規表現
    const separators = inputText.match(/([\s\n\r、。「」？！()（）\t]+|\S+)/g);
    
    if (separators) {
        separators.forEach(segment => {
            const tokenWords = tokenize(segment);
            
            // 単語である場合
            if (tokenWords.length > 0) {
                const word = segment;
                const rhymeInfo = wordColorMap[currentWordIndex];
                
                if (rhymeInfo) {
                    const { color, vowels } = rhymeInfo;
                    
                    // 韻を踏んでいる部分（母音の数だけ語尾から取得）をハイライト
                    const vowelLen = vowels.length;
                    
                    // 語尾から母音の数だけ文字を取得する（簡易的な処理。実際は音節を数えるべき）
                    const rhymePart = word.substring(word.length - vowelLen); 
                    const prefix = word.substring(0, word.length - vowelLen);
                    
                    finalHtml += `
                        <span class="word-container">${prefix}<span class="rhyme-highlight" style="background-color: ${color};" title="韻: ${vowels}">${rhymePart}</span></span>
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

// リアルタイム反映の初期化と設定
window.onload = function() {
    const inputElement = document.getElementById('lyricInput');
    
    // 初期リリックを設定
    inputElement.value = 
`掴むチャンス 常にアドバンス
塗り替えるキャンバス 目指すアドバンス
過去にバイバイ 揺るがないスタンス
未来を彩る人生のキャンバス

【アンツ】
【パンツ】`;
    
    // 入力時に即時分析を実行するように設定
    inputElement.addEventListener('input', analyzeRhymes);

    // 初期表示の分析を実行
    analyzeRhymes();
};
