let currentSessionId = null;
let currentChosenTheme = null;
let currentGuess = null;
let currentInitialExhibitScore = null;

//session id needed for score tracking
function initializeSession() {
    currentSessionId = sessionStorage.getItem('deepfakeDetectiveSessionId');
    if (!currentSessionId) {
        currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem('deepfakeDetectiveSessionId', currentSessionId);
    }
    applyThemeLogic();
}

function applyThemeLogic() {
    const themes = ['/static/style.css', '/static/style_light.css'];
    const isIndexPage = window.location.pathname === '/';
    if (isIndexPage) {
        //if in index, choose randomly
        currentChosenTheme = themes[Math.floor(Math.random() * themes.length)];
        sessionStorage.setItem('chosenTheme', currentChosenTheme);
    } else {
        //use stored theme if available
        currentChosenTheme = sessionStorage.getItem('chosenTheme');
        if (!currentChosenTheme || !themes.includes(currentChosenTheme)) {
            currentChosenTheme = themes[Math.floor(Math.random() * themes.length)];
            sessionStorage.setItem('chosenTheme', currentChosenTheme);
        }
    }
    applyCssLink(currentChosenTheme);
}

//apply css, depending on theme
function applyCssLink(themeUrl) {
    const themeLink = document.getElementById('theme-stylesheet');
     if (themeLink) {
        if (themeLink.getAttribute('href') !== themeUrl) {
            themeLink.setAttribute('href', themeUrl);
        }
    } else {
         const link = document.createElement('link');
         link.rel = 'stylesheet';
         link.href = themeUrl;
         link.id = 'theme-stylesheet';
         document.head.appendChild(link);
    }
    //slider themes
    updateSliderTheme();
}

function updateSliderFill(slider) {
    if (!slider || !slider.nextElementSibling) return;

    const min = slider.min ? parseFloat(slider.min) : 1;
    const max = slider.max ? parseFloat(slider.max) : 10;
    const val = parseFloat(slider.value);
    const percentage = ((val - min) * 100) / (max - min);

    slider.style.setProperty('--value-percent', percentage + '%');
 
    if (!slider.classList.contains('slider-untouched')) {
        slider.nextElementSibling.textContent = slider.value;
    }
}

function updateSliderTheme() {
    const root = document.documentElement;
    if (currentChosenTheme && currentChosenTheme.includes('light')) {
        root.style.setProperty('--fill-color', '#007bff'); //Light theme blue
        root.style.setProperty('--thumb-color', '#007bff');
        root.style.setProperty('--track-color', '#ccc');
    } else {
        root.style.setProperty('--fill-color', '#e8491d'); //Dark theme orange accent
        root.style.setProperty('--thumb-color', '#e8491d');
        root.style.setProperty('--track-color', '#555'); //Darker track for dark theme
    }
    document.querySelectorAll('input[type="range"]').forEach(updateSliderFill);
}


function handleSliderInteraction(slider) {
    if (!slider.disabled && slider.classList.contains('slider-untouched')) {
        slider.classList.remove('slider-untouched');
        if (slider.nextElementSibling) {
            slider.nextElementSibling.style.visibility = 'visible';
            slider.nextElementSibling.textContent = slider.value;
        }
        updateSliderFill(slider);
  
        if (slider.id === 'initial-ethics-slider' && startGameButton) {
             startGameButton.disabled = false;
        } else if (slider.id === 'ethical-slider' && nextButton && nextButton.disabled) {
             nextButton.disabled = false;
        }
    } else if (!slider.disabled) {
        updateSliderFill(slider);
         if (slider.id === 'initial-ethics-slider' && startGameButton) {
             startGameButton.disabled = false;
         } else if (slider.id === 'ethical-slider' && nextButton && nextButton.disabled) {
             nextButton.disabled = false;
         }
    }
}


initializeSession(); //start session and theme loading

document.addEventListener('DOMContentLoaded', () => {
    startGameButton = document.getElementById('start-game-button');
    nextButton = document.getElementById('next-button');

    //index page slider
    const initialSlider = document.getElementById('initial-ethics-slider');
    const initialDisplay = document.getElementById('initial-slider-value-display');

    //don't show initial slide values to avoid bias
    if (initialSlider && initialDisplay && startGameButton) {
        initialSlider.classList.add('slider-untouched');
        initialDisplay.style.visibility = 'hidden';//
        updateSliderFill(initialSlider);

        initialSlider.addEventListener('pointerdown', function() { handleSliderInteraction(this); });
        initialSlider.addEventListener('input', function() { handleSliderInteraction(this); });


        startGameButton.addEventListener('click', async () => {
             const currentSliderValue = parseInt(initialSlider.value);
             if (initialSlider.classList.contains('slider-untouched')) {
                 alert("Please indicate your initial stance using the slider.");
                 return;
             }

             startGameButton.disabled = true;
             startGameButton.textContent = "Saving...";
            //store initial opinion
            const payload = {
                 exhibit_id: -999,
                 user_guess: null,
                 initial_ethical_score: null,
                 ethical_score: currentSliderValue
             };

             const success = await sendScoreData(payload);
             if (success) {
                 sessionStorage.removeItem('initialEthicsOpinion');
                 window.location.href = 'game.html';
             } else {
                  alert("Failed to save your initial opinion. Please try again.");
                  //re-enable button on failure
                  startGameButton.disabled = false;
                  startGameButton.textContent = "Start the test - good luck!";
             }
        });
    }

    if (document.getElementById('game-area')) {
        initGame();
    }
    updateSliderTheme();
});

//game data
const gameExhibits = [
    {
        id: 1, type: 'audio',
        description: "Deepfakes in Politics",placeholder: '/static/media/Biden.mp3',
        context: "Joe Biden urges voters not to vote for the New Hampshire primary election in January 2024.<br>Transcript: 'It is the New Hampshire presidential prime. Republicans have been trying to push nonpartisan and Democratic voters to participate in their primary. What a bunch of malarkey. We know the value of voting Democratic when our votes count. It’s important that you save your vote for the November election. We’ll need your help in electing Democrats up and down the ticket. Voting this Tuesday only enables the Republicans in their quest to elect Donald Trump again. Your vote makes a difference in November, not this Tuesday. If you would like to be removed from future calls, please press 2 now.'", isReal: false,
        feedback_text: `This is a deepfake audio that was used in a robocall campaign to halt Democract voters.
        The deepfake can be recognized by the slightly mechanic voice, unnatural breaks and monotonic voice.<br>
        Source:
        Steck, E. & Kaczynski, A. (2024, January 22). Fake Joe Biden robocall urges New Hampshire voters not to vote in Tuesday’s Democratic primary. CNN.
        <br>https://edition.cnn.com/2024/01/22/politics/fake-joe-biden-robocall/index.html
        `,
        ethical_dilemma: 'Using deepfake audio for voter suppression manipulates citizens and directly attacks democracy.',
        ethical_frameworks: `<strong>Preference Utilitarianism Lens: </strong>Voters, and the general public, tend to prefer true information and to not be deceived.
        The perpetrators responsible for the calls prefer suppressing votes.The robocall campaign goes against the preference of a large amount of people, and only a small amount of people
        is in favor of it.<br><strong>Deontology Lens: </strong>Using a deceptive robocall violates the duty of transparency.The voters are treated as means to end (voter suppression), thus also their political autonomy is not acknowledged.
        Impersonating Joe Biden without consent goes against his dignity. Appyling Kant's imperative, it is clear that if everyone used deceptive deepfakes for vote suppression,
        it would lead to a complete loss of epistemic security and collapse of a fair political system.`
    },
    {
        id: 2, type: 'youtube', description: "Deepfakes in the Entertainment Industry",
        placeholder: 'VH4AnOAVS1c',context: "The trailer of the Swedish movie 'Watch The Skies'. Watching the first 20 seconds is sufficient!", isReal: false,
        feedback_text: `The movie was recorded in Swedish. AI was used for dubbing, not only were deepfake used for the voices,
        but also the facial expressions of the actors have been changed to match the English language.
        It is the first commercial movie to do so, coming out in May in 2025.<br>
        Source: https://youtu.be/VH4AnOAVS1c`,
        ethical_dilemma: "Increased accessibility and opportunities for smaller entertainment industries stand in contrast to artistic visions and the job loss of voice actors.",
        ethical_frameworks: `<strong>Preference Utilitarianism Lens:</strong>
        Large global audiences would benefit from access to more entertainment,
        while voice actors might become significantly less relevant.
        Smaller entertainment industries could increase their impact and bring more perspectives to more publicity.
        <br>
        <strong>Deontology Lens: </strong>The actors need to give full consent to their voice being used.
        The movie needs to be fully transparent about its AI usage, which is only partially the case, as it is not explicitly mentioned in the trailer.
        The artistic integrity has to be given as well, as AI dubbing might remove authenticity in the view of the artist(s).
        As long as these duties are fulfilled, deontological views would be in favor.<br>`
    },
    {
        id: 3, type: 'video', description: "Deepfakes in Education",
        placeholder: '/static/media/beckham.mp4', context: "David Beckham talks about Malaria", isReal: true,
        feedback_text: `While the video itself is NOT a deepfake, this was part of an anti-malaria campaign,
        where David Beckham's voice and facial movements were translated into 9 languages.
        You can see the entire video here: https://youtu.be/QiiSAvKJIHo?feature=shared`,
        ethical_dilemma: "AI-generated/modified educational/awareness content: Does it make education more equal or is it a job-killer?",
        ethical_frameworks: `<strong>Preference Utilitarianism Lens:</strong>
        With this technology, educational/awareness content can become more accessible than
        ever before, as content only has to be created in one language, but would be available
        in practically any.
        This allows for more equal opportunities on a global scale.
        Thus, a large amount of people would prefer this increased accessibility,
        but it could lead to a loss in diversity of opinions, job loss for teachers and educational content creators.
        <br>
        <strong>Deontology Lens:</strong>Depending on the specific implementation, the duty of not harming might be violated,
        sicne local education industries could get replaced by AI-translated content. Additionally, transparency is 
        a significant factors - which was given in this case. <br>`
    },
     {
        id: 4, type: 'tweet', description: "Deepfakes in Politics and Personal Matters",
        placeholder: '<blockquote class="twitter-tweet" data-media-max-width="560"><p lang="en" dir="ltr">WOW! This actually just happened!<br><br>The Monitors were just hacked at the U.S. Department of Housing and Urban Development (HUD) to display an AI video of Trump licking Elon Musk’s toes. <br><br>The caption over it read: “LONG LIVE THE REAL KING.” <a href="https://t.co/11JWuH2XfZ">pic.twitter.com/11JWuH2XfZ</a></p>— Brian Krassenstein (@krassenstein) <a href="https://twitter.com/krassenstein/status/1894047931738558515?ref_src=twsrc%5Etfw">February 24, 2025</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
        context: "The Monitors at the U.S. Department of Housing and Urban Development were hacked to display a video of Trump licking Elon Musk’s toes. ", isReal: false,
        feedback_text: `This is in fact a deepfake which emerged January 2024.<br>
        Source:<br>https://www.ndtv.com/world-news/deep-fake-video-of-donald-trump-kissing-elon-musks-toes-plays-at-us-office-7790243`,
        ethical_dilemma: `Where does freedom of expression end and dignity begin?<br>
        Are deepfakes of provocative acts ever justifiable?`,
        ethical_frameworks:`<strong>Preference Utilitarianism: </strong>Following this framework, the creators and some parts of the audience would
        support this deepfake, however there is harm for the people in the video. In a broader societal perspective, this allows for an erosion of trust, a loss of epistemic security.
        <br><strong>Deontology Lens: </strong>There is a clear deceptive intent. Even when the deception is uncovered, the displayed people are not respected and can
        still create political and personal harm.<br>`
        },
     {
        id: 5, type: 'audio', description: "Deepfakes in Accessibility",
        placeholder: '/static/media/assistant.mp3', context: "A personal assistant makes a phone call to make an appointment", isReal: false,
        feedback_text: `The voice making the appointment is Google Assistant. This demonstration is already from 2019. The entire
        demonstration is available here: <br> https://youtu.be/D5VN56jQMWM?feature=shared`,
        ethical_dilemma: `In this demonstration, it was not made clear whether transparency is given to the hairdresser.
        Is it ethical to use AI to make appointments? Is it ethical to not let the other person know?`,
        ethical_frameworks: `<strong>Preference Utilitarianism Lens: </strong>For the person that the call is made for, time is saved. For the hairdresser it depends on the individual -
        but since any appointment made leads to a higher income for the company, it would be preferred to no appointment scheduled,
        however it might not be preferred over a human making the appointment.<br>
        <strong>Deontology Lens: </strong>The duty to transparency is not fulfilled in the example.<br>
        <strong>Ethics of Care: </strong>Here, ethics of care apply significantly, as these tools can increase accessibility,
        e.g. for people with social anxiety, speaking difficulties/inabilities or language barriers.<br>
        <strong>Justice as fairness: </strong>Would you act differently if you don't know whether the voice you are speaking to is
        human or AI?`
    }
];


let currentExhibitIndex = 0;
let userExhibitScores = {};
let gameFinished = false;
let currentGameState = "AWAITING_GUESS";
//dom elements on game page
let caseTitle, mediaDisplay, exhibitDescription, realButton, fakeButton, uncertainButton,
    feedbackPanel, feedbackVerdict, feedbackExplanation, ethicalAnalysisDiv, ethicalDilemma, ethicalFrameworks,
    nextButton, analysisSection, endGamePanel, contextArea, contextText,
    ethicalSlider, sliderValueDisplay, sliderLabel, sliderSection;

let startGameButton = null;


function initGame() {
    //get references
    caseTitle = document.getElementById('case-title');
    mediaDisplay = document.getElementById('media-display');
    exhibitDescription = document.getElementById('exhibit-description');
    realButton = document.getElementById('real-button');
    fakeButton = document.getElementById('fake-button');
    uncertainButton = document.getElementById('uncertain-button');
    feedbackPanel = document.getElementById('feedback-panel');
    feedbackVerdict = document.getElementById('feedback-verdict');
    feedbackExplanation = document.getElementById('feedback-explanation');
    ethicalAnalysisDiv = document.querySelector('#feedback-panel .ethical-analysis');
    ethicalDilemma = document.getElementById('ethical-dilemma');
    ethicalFrameworks = document.getElementById('ethical-frameworks');
    nextButton = document.getElementById('next-button');
    analysisSection = document.getElementById('analysis-section');
    endGamePanel = document.getElementById('end-game-panel');
    contextArea = document.getElementById('context-area');
    contextText = document.getElementById('context-text');
    sliderSection = document.getElementById('exhibit-slider-section');
    ethicalSlider = document.getElementById('ethical-slider');
    sliderValueDisplay = document.getElementById('slider-value-display');
    sliderLabel = document.getElementById('slider-label');

    //button listeners
    if (realButton) realButton.addEventListener('click', () => handleGuess('real'));
    if (fakeButton) fakeButton.addEventListener('click', () => handleGuess('fake'));
    if (uncertainButton) uncertainButton.addEventListener('click', () => handleGuess('uncertain'));
    if (nextButton) nextButton.addEventListener('click', handleNextStep);

    //ethical sliders
    if (ethicalSlider && sliderValueDisplay && nextButton) {
        ethicalSlider.addEventListener('pointerdown', function() { handleSliderInteraction(this); });
        ethicalSlider.addEventListener('input', function() { handleSliderInteraction(this); });
    }

    currentExhibitIndex = 0;
    gameFinished = false;
    currentGuess = null;
    currentInitialExhibitScore = null;
    userExhibitScores = {};
    displayExhibit(currentExhibitIndex);
}

//show exhibits
function displayExhibit(index) {
    if (index >= gameExhibits.length) {
        transitionToFinalQuestion();
        return;
    }
    const exhibit = gameExhibits[index];
    if (!caseTitle || !mediaDisplay || !exhibitDescription || !contextArea || !contextText) {

        return;
    }

    caseTitle.textContent = `Case File #${exhibit.id}`;
    exhibitDescription.textContent = '';
    mediaDisplay.innerHTML = '';

    //media loading
    if (exhibit.type === 'audio') {
        const audioElement = document.createElement('audio');
        audioElement.setAttribute('controls', '');
        audioElement.onerror = () => { mediaDisplay.innerHTML = `<p class="error-note">Error loading audio: ${exhibit.placeholder}</p>`; };
        audioElement.setAttribute('src', exhibit.placeholder);
        mediaDisplay.appendChild(audioElement);
    } else if (exhibit.type === 'image') {
        const imageElement = document.createElement('img');
        imageElement.onerror = () => { mediaDisplay.innerHTML = `<p class="error-note">Error loading image: ${exhibit.placeholder}</p>`; };
        imageElement.setAttribute('src', exhibit.placeholder);
        imageElement.setAttribute('alt', exhibit.description);
        imageElement.id = 'exhibit-image';
        imageElement.style.maxWidth = '100%';
        imageElement.style.maxHeight = '400px';
        imageElement.style.display = 'block';
        imageElement.style.margin = '0 auto';
        mediaDisplay.appendChild(imageElement);
    } else if (exhibit.type === 'video') {
        const videoElement = document.createElement('video');
        videoElement.onerror = () => { mediaDisplay.innerHTML = `<p class="error-note">Error loading video: ${exhibit.placeholder}</p>`; };
        videoElement.setAttribute('src', exhibit.placeholder);
        videoElement.setAttribute('controls', '');
        videoElement.setAttribute('preload', 'metadata');
        videoElement.setAttribute('playsinline', '');
        videoElement.style.maxWidth = '100%';
        videoElement.style.maxHeight = '400px';
        videoElement.style.display = 'block';
        videoElement.style.margin = '0 auto';
        videoElement.classList.add('exhibit-video');
        mediaDisplay.appendChild(videoElement);
    } else if (exhibit.type === 'youtube') {
         if (!exhibit.placeholder || exhibit.placeholder === 'VIDEO_ID_PLACEHOLDER') {
             mediaDisplay.innerHTML = '<p class="error-note">YouTube Video ID missing.</p>';
         } else {
            const iframeElement = document.createElement('iframe');
            iframeElement.setAttribute('src', `https://www.youtube.com/embed/${exhibit.placeholder}`);
            iframeElement.setAttribute('title', `YouTube video player: ${exhibit.description}`);
            iframeElement.setAttribute('frameborder', '0');
            iframeElement.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframeElement.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            iframeElement.setAttribute('allowfullscreen', '');
            iframeElement.classList.add('youtube-embed');
            mediaDisplay.appendChild(iframeElement);
         }
    } else if (exhibit.type === 'tweet') {
        mediaDisplay.innerHTML = exhibit.placeholder;
        if (typeof twttr !== 'undefined' && twttr.widgets) {
            twttr.widgets.load(mediaDisplay);
        } else {
            console.warn("Twitter widget script (widgets.js) not detected. Embedded tweet might not render correctly.");
        }
    }
    else { mediaDisplay.innerHTML = `<p class="error-note">Unsupported media type: ${exhibit.type}</p>`; }

    if (exhibit.context) { contextText.innerHTML = exhibit.context; contextArea.classList.remove('hidden'); }
    else { contextArea.classList.add('hidden'); }

    //reset UI State for new exhibit
    if (feedbackPanel) feedbackPanel.classList.add('hidden');
    if (feedbackVerdict) feedbackVerdict.classList.add('hidden');
    if (feedbackExplanation) feedbackExplanation.classList.add('hidden');
    if (ethicalAnalysisDiv) ethicalAnalysisDiv.classList.add('hidden');
    if (analysisSection) analysisSection.classList.remove('hidden');
    if (realButton) realButton.disabled = false;
    if (fakeButton) fakeButton.disabled = false;
    if (uncertainButton) uncertainButton.disabled = false;
    if (nextButton) nextButton.disabled = true;
    if (sliderSection) sliderSection.classList.add('hidden');

    if (ethicalSlider && sliderValueDisplay) {
        ethicalSlider.disabled = true;
        ethicalSlider.value = 5;
        ethicalSlider.classList.add('slider-untouched');
        sliderValueDisplay.style.visibility = 'hidden';
        updateSliderFill(ethicalSlider);
    }
    
    const statsDisplay = document.getElementById('stats-display');
    if(statsDisplay) statsDisplay.classList.add('hidden');

    currentGameState = "AWAITING_GUESS";
    currentGuess = null;
    currentInitialExhibitScore = null;
    console.log(`Displayed Exhibit ${exhibit.id}. State: ${currentGameState}`);
}

function handleGuess(userGuess) {
    if (gameFinished || currentGameState !== "AWAITING_GUESS") return;
    console.log(`Guess: ${userGuess}`);
    currentGuess = userGuess;

    const exhibit = gameExhibits[currentExhibitIndex];

    //disable guess buttons
    if (realButton) realButton.disabled = true;
    if (fakeButton) fakeButton.disabled = true;
    if (uncertainButton) uncertainButton.disabled = true;
    if (analysisSection) analysisSection.classList.add('hidden'); 

    //show user stats
    fetchAndDisplayStats(exhibit.id);

    let verdictText = "";
    let verdictClass = "";
    if (userGuess === 'uncertain') { verdictText = "UNCERTAIN"; verdictClass = "uncertain"; } 
    else { const correct = ((userGuess === 'real') === exhibit.isReal); verdictText = correct ? "CORRECT" : "INCORRECT"; verdictClass = correct ? "correct" : "incorrect"; }

    if (feedbackVerdict) {
        feedbackVerdict.textContent = `Verdict: ${verdictText}`;
        feedbackVerdict.className = `feedback-verdict ${verdictClass}`;
        feedbackVerdict.classList.remove('hidden');
    }
    if (feedbackExplanation) {
        feedbackExplanation.innerHTML = exhibit.feedback_text;
        feedbackExplanation.classList.remove('hidden');
    }

    if (ethicalAnalysisDiv) ethicalAnalysisDiv.classList.add('hidden');

    currentGameState = "AWAITING_INITIAL_OPINION";

    if (feedbackPanel) feedbackPanel.classList.remove('hidden');

    if (sliderSection) sliderSection.classList.remove('hidden');
    if (ethicalSlider) ethicalSlider.disabled = false; // Enable slider

    if (sliderLabel) sliderLabel.textContent = "What is your initial ethical stance on this application of deepfakes and comparable cases? (1=Against, 10=For):";

    if (ethicalSlider) ethicalSlider.classList.add('slider-untouched');
    if (sliderValueDisplay) sliderValueDisplay.style.visibility = 'hidden';
    ethicalSlider.value = 5;
    updateSliderFill(ethicalSlider);

    if (nextButton) {
        nextButton.textContent = "Submit Initial Opinion";
        nextButton.disabled = true;
    }
}

//show stats
async function fetchAndDisplayStats(exhibitId) {
    const statsDisplay = document.getElementById('stats-display');
    const statReal = document.getElementById('stat-real');
    const statFake = document.getElementById('stat-fake');
    const statUncertain = document.getElementById('stat-uncertain');
 
    statsDisplay.classList.remove('hidden');

    try {
        const response = await fetch(`/get_stats/${exhibitId}`);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const percentages = await response.json();

        statReal.textContent = `${percentages.real}%`;
        statFake.textContent = `${percentages.fake}%`;
        statUncertain.textContent = `${percentages.uncertain}%`;

    } catch (error) {
        console.error('Failed to fetch or display stats:', error);
        statsDisplay.innerHTML = '<p class="error-note">Could not load guess statistics.</p>'; //show error in area
    }
}


//send scores
async function sendScoreData(payload) {

    const dataToSend = {
         ...payload,
         session_id: currentSessionId,
         design_theme: currentChosenTheme
    };

    if (!dataToSend.hasOwnProperty('initial_ethical_score') || dataToSend.exhibit_id === -999 || dataToSend.exhibit_id === 999) {
        dataToSend.initial_ethical_score = null;
    }
    if (dataToSend.exhibit_id === -999 || dataToSend.exhibit_id === 999) {
         dataToSend.user_guess = null;
    }

    try {
        const response = await fetch('/submit_score', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(dataToSend)
        });
        if (!response.ok) {
            let errorMsg = `HTTP error ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += `: ${errorData.error || 'Unknown server error'}`;
            } catch (e) { /* Ignore if response isn't JSON */ }
            alert(`Failed to save score: ${errorMsg}. Please try again. Else reconnect your internet connection.`);
            return false;
        }
        const result = await response.json();
        return true; //sent
    } catch (error) {
        alert(`Network error while saving score: ${error}. Please check connection.`);
        return false; //fail
    }
}

//state transition
async function handleNextStep() {
    if (gameFinished) { console.log("handleNextStep aborted: game already finished."); return; }

    if (!ethicalSlider || !nextButton || !sliderLabel || !feedbackVerdict || !feedbackExplanation) {
        console.error("handleNextStep ERROR: Required UI elements not found!");
        return;
    }

    if (ethicalSlider.disabled || nextButton.disabled || ethicalSlider.classList.contains('slider-untouched')) {
        console.warn("handleNextStep called but slider/button disabled or slider untouched.");
        if(ethicalSlider.classList.contains('slider-untouched')) {
             alert("Please use the slider to indicate your opinion before proceeding.");
        }
        return;
    }

    nextButton.disabled = true;
    nextButton.textContent = "Processing...";

    if (currentGameState === "AWAITING_INITIAL_OPINION") {
        currentInitialExhibitScore = parseInt(ethicalSlider.value);
        const exhibit = gameExhibits[currentExhibitIndex];

        if (ethicalDilemma) {
            ethicalDilemma.innerHTML = `<strong>Dilemma:</strong> ${exhibit.ethical_dilemma || "N/A"}`;
        }
        if (ethicalFrameworks) {
            ethicalFrameworks.innerHTML = exhibit.ethical_frameworks || "";
        }
        if (ethicalAnalysisDiv) {
            ethicalAnalysisDiv.classList.remove('hidden');
        }

        currentGameState = "AWAITING_FINAL_OPINION";
        console.log(`State changed to: ${currentGameState}`);

        if (sliderLabel) sliderLabel.textContent = "After considering the ethics, what is your ethical stance on this application of deepfakes and comparable cases? (1=Against, 10=For):";

        ethicalSlider.value = 5;
        ethicalSlider.classList.add('slider-untouched');
        if (sliderValueDisplay) sliderValueDisplay.style.visibility = 'hidden';
        updateSliderFill(ethicalSlider);
        ethicalSlider.disabled = false;

        if (currentExhibitIndex >= gameExhibits.length - 1) {
            nextButton.textContent = "Submit Final Opinion & Proceed";
        } else {
            nextButton.textContent = "Submit Final Opinion & Next Case";
        }
        nextButton.disabled = true;

    } else if (currentGameState === "AWAITING_FINAL_OPINION") {
        let finalEthicalScore = parseInt(ethicalSlider.value);
        let exhibitIdForPayload = gameExhibits[currentExhibitIndex].id;

        const payload = {
            exhibit_id: exhibitIdForPayload,
            user_guess: currentGuess,
            initial_ethical_score: currentInitialExhibitScore,
            ethical_score: finalEthicalScore
        };

        nextButton.textContent = "Submitting...";

        const success = await sendScoreData(payload);

        if (!success) {
            alert("Failed to submit score. Please try again.");
            // Re-enable button based on state
            nextButton.disabled = false;
            if (currentExhibitIndex >= gameExhibits.length - 1) {
                nextButton.textContent = "Submit Final Opinion & Proceed";
            } else {
                nextButton.textContent = "Submit Final Opinion & Next Case";
            }
            return; //only one failure allowed
        }

        userExhibitScores[exhibitIdForPayload] = finalEthicalScore;
        console.log("Stored final score locally:", userExhibitScores);

        if (currentExhibitIndex >= gameExhibits.length - 1) {
            transitionToFinalQuestion();
        } else {
            currentExhibitIndex++;
            displayExhibit(currentExhibitIndex);
        }

    } else if (currentGameState === "AWAITING_FINAL_VERDICT") {
        let finalOverallScore = parseInt(ethicalSlider.value);
 
        const payload = {
            exhibit_id: 999,
            user_guess: null,
            initial_ethical_score: null,
            ethical_score: finalOverallScore
        };

        nextButton.textContent = "Submitting...";
        const success = await sendScoreData(payload);

        if (!success) {
            alert("Failed to submit final verdict. Please try again.");
            nextButton.disabled = false;
            nextButton.textContent = "Submit Final Verdict";
            return;
        }

        gameFinished = true;
        if(feedbackPanel) feedbackPanel.classList.add('hidden');
        showEndGameSummary();

    } else {
        nextButton.disabled = false;
        nextButton.textContent = "Error - Please Refresh";
    }
}

//final question
function transitionToFinalQuestion() {
     currentGameState = "AWAITING_FINAL_VERDICT";
     console.log(`State changed to: ${currentGameState}`);

     if(feedbackPanel) feedbackPanel.classList.remove('hidden'); 
     if(feedbackVerdict) feedbackVerdict.textContent = "Final Question";
     if(feedbackVerdict) feedbackVerdict.classList.remove('hidden');
     if(feedbackExplanation) feedbackExplanation.textContent = "Considering all the cases, what is your overall stance on deepfake technology?";
     if(feedbackExplanation) feedbackExplanation.classList.remove('hidden');

     if(ethicalAnalysisDiv) ethicalAnalysisDiv.classList.add('hidden');
     if(document.getElementById('stats-display')) document.getElementById('stats-display').classList.add('hidden');

     if(sliderSection) sliderSection.classList.remove('hidden');
     if(sliderLabel) sliderLabel.textContent = "Overall Stance (1=Prohibit Deepfakes, 10=Allow Unrestricted):";
     if(ethicalSlider) {
         ethicalSlider.disabled = false;
         ethicalSlider.value = 5;
         ethicalSlider.classList.add('slider-untouched');
         if (sliderValueDisplay) {
             sliderValueDisplay.textContent = 5;
             sliderValueDisplay.style.visibility = 'hidden';
         }
         updateSliderFill(ethicalSlider);
     }
     if(nextButton) {
         nextButton.textContent = "Submit Final Verdict";
         nextButton.disabled = true;
     }
}

function showEndGameSummary() {
    const caseFileSection = document.getElementById('case-file');
    if(caseFileSection) caseFileSection.classList.add('hidden');
    if(analysisSection) analysisSection.classList.add('hidden');
    if(feedbackPanel) feedbackPanel.classList.add('hidden');
    const statsDisplay = document.getElementById('stats-display');
    if(statsDisplay) statsDisplay.classList.add('hidden');

    const summaryElement = document.getElementById('end-game-summary');
    if(summaryElement) {
         summaryElement.innerHTML = '';

         const introText = document.createElement('p');
         introText.textContent = "Here's a summary of your final ethical evaluations for each case file:";
         summaryElement.appendChild(introText);

         const scoreList = document.createElement('ul');
         scoreList.style.listStyle = 'none';
         scoreList.style.paddingLeft = '0';

         gameExhibits.forEach(exhibit => {
            const score = userExhibitScores[exhibit.id];
            if (score !== undefined) { 
                 const listItem = document.createElement('li');
                 listItem.textContent = `${exhibit.description || `Case File #${exhibit.id}`} - Your Final Score: ${score}/10`;
                 listItem.style.marginBottom = '5px';
                 scoreList.appendChild(listItem);
            } else {
                 console.log(`No final score found for exhibit ${exhibit.id}`);
            }
         });

         summaryElement.appendChild(scoreList);

         const closingText = document.createElement('p');
         closingText.textContent = "Thank you for participating.";
         closingText.style.marginTop = '15px';
         summaryElement.appendChild(closingText);

    } else {
         console.error("Could not find end-game-summary element");
    }

    if(endGamePanel) endGamePanel.classList.remove('hidden');
}