// HTML要素の取得
const background = document.getElementById("background");
const characterContainer = document.getElementById("character-container");
const textBox = document.getElementById("text-box");
const characterName = document.getElementById("character-name");
const dialogue = document.getElementById("dialogue");
const choiceContainer = document.getElementById("choice-container");
const CHARACTER_ALIAS_MAP = {
    "にゃんまちゃん": "nyanma",
    "にゃんるなちゃん": "nyanluna",
    "にゃんみちゃん": "nyanmi",
    "にゃん乃ちゃん": "nyanno"
};

// シナリオの初期設定
let currentIndex = 0;
let isSelecting = false;
let isTyping = false;
let currentText = "";
let charIndex = 0;
let typingSpeed = 60;
let mouthAnimationInterval = null;
let mouthOpen = false;
let currentCharacters = {};

// 画像プリロード関数
function preloadImages(images) {
    return Promise.all(
        images.map(src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(src);
                img.onerror = reject;
            });
        })
    );
}

// 使用する画像リストを収集
function collectAllImagePaths() {
    const imagePaths = new Set();

    scenarioData.forEach(line => {
        if (line.startsWith("set bg")) {
            const bgFile = line.split(" ")[1].trim();
            imagePaths.add(`assets/${bgFile}`);
        }

        if (line.startsWith("set char")) {
            const parts = line.trim().split(" ");
            if (parts.length >= 4) {
                const charFile = parts[3].trim(); // ←ここを3に修正
                if (charFile.endsWith(".webp")) {
                    imagePaths.add(`assets/${charFile}`);
                    if (charFile.includes("_closed")) {
                        const openFile = charFile.replace("_closed", "_open");
                        imagePaths.add(`assets/${openFile}`);
                    }
                }
            }
        }
    });

    console.log("プリロード対象画像:", Array.from(imagePaths));
    return Array.from(imagePaths);
}


// ゲーム開始前にプリロード
window.addEventListener("load", async () => {
    const imagePaths = collectAllImagePaths();

    try {
        await preloadImages(imagePaths);
        console.log("全画像のプリロードが完了しました。");
    } catch (error) {
        console.error("画像のプリロードに失敗しました:", error);
    }
});

// グローバルで直近の表示キャラを管理
let currentlyVisibleCharacters = [];

function updateCharacter(name, image) {
    let characterElement = currentCharacters[name];

    if (!characterElement) {
        characterElement = document.getElementById(name);
        if (!characterElement) {
            characterElement = createCharacterElement(name);
            characterContainer.appendChild(characterElement);
        }
        currentCharacters[name] = characterElement;
    }

    // 画像を切り替え
    const closedUrl = `url("assets/${image}")`;
    characterElement.style.backgroundImage = closedUrl;
    characterElement.closedUrl = closedUrl;
    characterElement.openUrl = closedUrl.replace("_closed", "_open");

    // このキャラを表示リストに加える
    if (!currentlyVisibleCharacters.includes(name)) {
        currentlyVisibleCharacters.push(name);
        // 常に最大2人まで
        if (currentlyVisibleCharacters.length > 2) {
            currentlyVisibleCharacters.shift();
        }
    }

    // 可視キャラだけ表示、他は非表示
    Object.keys(currentCharacters).forEach(charName => {
        const el = currentCharacters[charName];
        if (currentlyVisibleCharacters.includes(charName)) {
            el.style.display = "block";
        } else {
            el.style.display = "none";
        }
    });
}

// キャラクター要素を作成
function createCharacterElement(id) {
    const character = document.createElement("div");
    character.id = id;
    character.classList.add("character");
    // 左右位置割り当て（キャラ数増やすなら個別にclass付与）
    if (id === "nyanma") character.classList.add("left");
    if (id === "nyanluna") character.classList.add("right");
    if (id === "nyanmi") character.classList.add("left"); // 例:必要に応じて
    if (id === "nyanno") character.classList.add("right");
    return character;
}

// 発言中キャラクターを強調
function setSpeakingCharacter(displayName) {
    const charKey = CHARACTER_ALIAS_MAP[displayName];
    Object.keys(currentCharacters).forEach(charName => {
        const element = currentCharacters[charName];
        if (charName === charKey) {
            element.classList.add("speaking");
            startMouthAnimation(element);
        } else {
            element.classList.remove("speaking");
            stopMouthAnimation(element);
        }
    });
}

function startMouthAnimation(characterElement) {
    if (characterElement.mouthAnimationInterval) return;
    // 追加ログ
    console.log(
      "口パク開始: ",
      characterElement.id,
      "closedUrl:", characterElement.closedUrl,
      "openUrl:", characterElement.openUrl
    );

    if (characterElement.closedUrl && characterElement.openUrl) {
        characterElement.mouthOpen = false;
        characterElement.style.backgroundImage = characterElement.closedUrl;

        characterElement.mouthAnimationInterval = setInterval(() => {
            if (characterElement.mouthOpen) {
                characterElement.style.backgroundImage = characterElement.closedUrl;
            } else {
                characterElement.style.backgroundImage = characterElement.openUrl;
            }
            characterElement.mouthOpen = !characterElement.mouthOpen;
        }, 150);
    }
}

function stopMouthAnimation(characterElement) {
    if (characterElement.mouthAnimationInterval) {
        clearInterval(characterElement.mouthAnimationInterval);
        characterElement.mouthAnimationInterval = null;
    }
    // 必ず閉じ口に戻す
    if (characterElement.closedUrl) {
        characterElement.style.backgroundImage = characterElement.closedUrl;
    }
    characterElement.mouthOpen = false;
}

function stopAllMouthAnimations() {
    Object.values(currentCharacters).forEach(stopMouthAnimation);
}

// テキストを1文字ずつ表示する関数
function typeText(text) {
    isTyping = true;
    currentText = text;
    charIndex = 0;
    dialogue.textContent = "";
    typeNextCharacter();
}

// 次の文字を表示する関数
function typeNextCharacter() {
    if (!isTyping) return;

    if (charIndex < currentText.length) {
        dialogue.textContent += currentText[charIndex];
        charIndex++;
        setTimeout(typeNextCharacter, typingSpeed);
    } else {
        isTyping = false;
        // セリフ全文表示後、いったん全員の口パクを止める
        stopAllMouthAnimations();
    }
}

// 強制的に全文表示する関数
function forceCompleteText() {
    dialogue.textContent = currentText;
    isTyping = false;
    stopAllMouthAnimations();  // ←追加！
}

// ゲーム開始
function startGame() {
    const titleScreen = document.getElementById("title-screen");
    const gameContainer = document.getElementById("game-container");
    const endScreen = document.getElementById("end-screen");
    titleScreen.style.display = "none";
    gameContainer.style.display = "block";
    endScreen.style.display = "none";

    // BGMの再生
    const bgm = document.getElementById("bgm");
    try {
        bgm.play();
        document.getElementById("bgm-button").textContent = "🔊";
    } catch (e) {
        console.log("自動再生がブロックされました");
    }

    // シナリオの初期化
    currentIndex = 0;
    isTyping = false;
    isSelecting = false;
    currentCharacters = {};  // キャラ要素の初期化

    // 最初のシナリオを強制的にロード
    loadNextLine();
}

// ゲーム終了
function endGame() {
    stopAllMouthAnimations();
    const gameContainer = document.getElementById("game-container");
    const endScreen = document.getElementById("end-screen");
    gameContainer.style.display = "none";
    endScreen.style.display = "flex";

    // BGMを停止
    const bgm = document.getElementById("bgm");
    bgm.pause();
    bgm.currentTime = 0;
}

// タイトルに戻る
function restartGame() {
    const titleScreen = document.getElementById("title-screen");
    const endScreen = document.getElementById("end-screen");
    titleScreen.style.display = "flex";
    endScreen.style.display = "none";

    // 追加：キャラ状態・DOMを完全初期化
    currentlyVisibleCharacters = [];
    currentCharacters = {};
    const container = document.getElementById("character-container");
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

// シナリオの進行
function loadNextLine() {
    if (isTyping || isSelecting) return;

    if (currentIndex >= scenarioData.length) {
        endGame();
        return;
    }

    const line = scenarioData[currentIndex].trim();

    // 背景画像の設定
    if (line.startsWith("set bg")) {
        const bgFile = line.split(" ")[1];
        background.style.backgroundImage = `url(assets/${bgFile})`;
        currentIndex++;
        loadNextLine();
        return;
    }

// キャラクター画像の設定
if (line.startsWith("set char")) {
    const parts = line.split(" ");
    // parts[2]がキャラ名、parts[3]がファイル名
    if (parts.length >= 4) {
        const charName = parts[2];
        const charFile = parts[3];
        updateCharacter(charName, charFile);
    }
    currentIndex++;
    loadNextLine();
    return;
}

    // 通常のセリフの表示
    if (!line.startsWith("select")) {
        const [name, text] = line.split("「");
        if (text) {
            characterName.textContent = name.trim();
            setSpeakingCharacter(name.trim());
            typeText(text.replace("」", "").trim());
        }
    }

    currentIndex++;
}

// **初期ロード**
loadNextLine();

// **クリックで次のセリフへ**
textBox.addEventListener("click", () => {
    if (isTyping) {
        forceCompleteText();
    } else if (!isSelecting) {
        loadNextLine();
    }
});


// BGMの制御
function toggleBGM() {
    const bgm = document.getElementById("bgm");
    const bgmButton = document.getElementById("bgm-button");

    if (bgm.paused) {
        bgm.play();
        bgmButton.textContent = "🔊";  // 再生中
    } else {
        bgm.pause();
        bgmButton.textContent = "🔈";  // ミュート
    }
}

// 音量調整
function adjustVolume(value) {
    const bgm = document.getElementById("bgm");
    const volume = value / 100;
    bgm.volume = volume;
}

// ページ読み込み時にBGMを自動再生
window.addEventListener("load", () => {
    const bgm = document.getElementById("bgm");
    const bgmButton = document.getElementById("bgm-button");
    const volumeSlider = document.getElementById("volume-slider");

    // 初期音量
    bgm.volume = 0.5;
    volumeSlider.value = 50;

    // 自動再生（ユーザー操作が必要な場合あり）
    try {
        bgm.play();
        bgmButton.textContent = "🔊";
    } catch (e) {
        bgmButton.textContent = "🔈"; // 自動再生がブロックされた場合
    }
});