// HTML要素の取得
const background = document.getElementById("background");
const character = document.getElementById("character");
const textBox = document.getElementById("text-box");
const characterName = document.getElementById("character-name");
const dialogue = document.getElementById("dialogue");
const choiceContainer = document.getElementById("choice-container");

// シナリオの初期設定
let currentIndex = 0;
let isSelecting = false;
let isTyping = false;
let currentText = "";
let charIndex = 0;
let typingSpeed = 120;
let skipIndex = -1;
let mouthAnimationInterval = null;
let mouthOpen = false;
let currentCharacterImage = "";

// テキストを1文字ずつ表示する関数
function typeText(text) {
    isTyping = true;
    currentText = text;
    charIndex = 0;
    dialogue.textContent = "";
    startMouthAnimation();
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
        stopMouthAnimation();
    }
}

// 強制的に全文表示する関数
function forceCompleteText() {
    dialogue.textContent = currentText;
    isTyping = false;
    stopMouthAnimation();
}

// 口パクアニメーションの開始
function startMouthAnimation() {
    if (mouthAnimationInterval) return;

    if (currentCharacterImage.includes("_closed")) {
        mouthAnimationInterval = setInterval(() => {
            if (mouthOpen) {
                character.style.backgroundImage = `url(assets/${currentCharacterImage})`;
                mouthOpen = false;
            } else {
                const openImage = currentCharacterImage.replace("_closed", "_open");
                character.style.backgroundImage = `url(assets/${openImage})`;
                mouthOpen = true;
            }
        }, 150);
    }
}

// 口パクアニメーションの停止
function stopMouthAnimation() {
    clearInterval(mouthAnimationInterval);
    mouthAnimationInterval = null;

    if (currentCharacterImage.includes("_closed")) {
        character.style.backgroundImage = `url(assets/${currentCharacterImage})`;
    }
}

// シナリオの進行
function loadNextLine() {
    if (isTyping || isSelecting) return;

    if (currentIndex >= scenarioData.length) {
        console.log("シナリオ終了");
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
        const charFile = line.split(" ")[1];
        currentCharacterImage = charFile;
        character.style.backgroundImage = `url(assets/${charFile})`;
        character.style.display = "block";

        if (isTyping) {
            startMouthAnimation();
        }

        currentIndex++;
        loadNextLine();
        return;
    }

    // 選択肢の設定
    if (line === "set select") {
        isSelecting = true;
        choiceContainer.innerHTML = "";
        choiceContainer.style.display = "flex";

        let nextIndex = currentIndex + 1;
        const choices = [];
        let endOfChoices = -1;
        const skipIndexes = [];

        while (nextIndex < scenarioData.length) {
            const optionLine = scenarioData[nextIndex].trim();

            if (optionLine.startsWith("1:") || optionLine.startsWith("2:")) {
                const optionText = optionLine.substring(3).trim();
                const optionNumber = optionLine[0];
                choices.push({ number: optionNumber, text: optionText });
                nextIndex++;
            } else {
                endOfChoices = nextIndex;
                break;
            }
        }

        choices.forEach(choice => {
            const button = document.createElement("button");
            button.textContent = choice.text;
            button.classList.add("choice-button");

            button.onclick = () => {
                choiceContainer.style.display = "none";
                isSelecting = false;

                const targetIndex = scenarioData.findIndex(line => line.startsWith(`select${choice.number} `));
                if (targetIndex !== -1) {
                    const selectLine = scenarioData[targetIndex];
                    const [, fullText] = selectLine.split(" ");
                    
                    if (fullText.includes("「")) {
                        const [selectName, selectText] = fullText.split("「");
                        characterName.textContent = selectName.trim();
                        currentText = selectText.replace("」", "").trim();
                        typeText(currentText);
                    } else {
                        characterName.textContent = "";
                        currentText = fullText.trim();
                        typeText(currentText);
                    }

                    // 選択肢ブロック全体をスキップ
                    skipIndexes.push(...scenarioData
                        .map((line, index) => ({ line, index }))
                        .filter(item => item.line.startsWith("select"))
                        .map(item => item.index)
                    );

                    // スキップ範囲を設定
                    skipIndex = Math.max(...skipIndexes);
                    currentIndex = endOfChoices;
                }
            };

            choiceContainer.appendChild(button);
        });

        currentIndex = endOfChoices;
        return;
    }

    // 選択肢セリフはスキップ
    if (line.startsWith("select")) {
        currentIndex++;
        loadNextLine();
        return;
    }

    // 通常のセリフの表示
    if (currentIndex > skipIndex) {
        const [name, text] = line.split("「");
        if (text) {
            characterName.textContent = name.trim();
            currentText = text.replace("」", "").trim();
            typeText(currentText);
        } else {
            characterName.textContent = "";
            currentText = line.trim();
            typeText(currentText);
        }
    }

    currentIndex++;
}

// 初期ロード
loadNextLine();

// クリックで次のセリフへ
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
