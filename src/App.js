import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import "./App.css";
import * as tf from "@tensorflow/tfjs";
import { getSignIndex } from "./utilities";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// set NODE_OPTIONS=--openssl-legacy-provider
function App() {

  const music = {
    1: { track: require('./game_music.mp3') },
  };

  const BlendModes = [
    "normal", "multiply", "screen", "overlay", "darken",
    "lighten", "color-dodge", "color-burn", "hard-light",
    "soft-light", "difference", "exclusion", "hue", "saturation",
    "color", "luminosity", "plus-darker", "plus-lighter"
  ];

  const images = {
    1: { name: 'HELLO 🖐️', speech: 'hello', image: require('./signs/hello.gif') },
    2: { name: 'THANK YOU 🫱', speech: 'thank you', image: require('./signs/thankyou.gif') },
    3: { name: 'I LOVE YOU 🤟', speech: 'love you', image: require('./signs/iloveu.gif') },
    4: { name: 'YES 👊', speech: 'yes', image: require('./signs/yes.gif') },
    5: { name: 'NO 🫵', speech: 'no', image: require('./signs/no.gif') },
  };

  const levels = {
    1: { image: require('./levels/1.gif') },
    2: { image: require('./levels/2.gif') },
    3: { image: require('./levels/3.gif') },
    4: { image: require('./levels/4.gif') },
    5: { image: require('./levels/5.gif') },
    6: { image: require('./levels/thanks4playing.gif') },
    7: { image: require('./levels/win.gif') },
  };

  // Function getRandomNumber generates a random number between 1 and max, excluding numbers provided in excludedNumbers array.
  const getRandomNumber = (max, excludedNumbers) => {
    let randomNum;
    do {
      randomNum = Math.floor(Math.random() * max) + 1;
    } while (excludedNumbers.includes(randomNum));
    return randomNum;
  };

  // React state variables for game data and user interactions.
  const [selectedSign, setSelectedSign] = useState(getRandomNumber(5, [])); // Selected sign by the player.
  const [showedSign, setShowedSign] = useState(null); // Sign shown by the camera.
  const [isImageVisible, setImageVisible] = useState(false); // Indicates if camera image is visible.
  const [correctAnswers, setCorrectAnswers] = useState(0); // Number of correct answers in the game.
  const [isGameWon, setIsGameWon] = useState(false); // Indicates if the game is won.
  const [gameStarted, setGameStarted] = useState(false); // Indicates if the game is started.
  const [selectedSigns, setSelectedSigns] = useState([]); // Array holding previously selected signs by the player.
  const [gameResults, setGameResults] = useState([]); // Array holding results of individual game rounds.
  const [gameRound, setGameRound] = useState(1); // Current game round number.
  const [roundTime, setRoundTime] = useState(0); // Duration of the current game round in seconds.
  const [isPlaying, setIsPlaying] = useState(true); // Indicates if the sound is playing.
  const [isWordRecognized, setIsWordRecognized] = useState(false); 
  const [finalTranscript, setFinalTranscript] = useState(''); // Stan dla finalnego tekstu wypowiedzi
  const [blendMode, setBlendMode] = useState("normal"); // Blend mode for displaying images.
  const webcamRef = useRef(null); // Reference to the webcam object.
  const canvasRef = useRef(null); // Reference to the canvas object.
  const audioRef = useRef(null); // Reference to the audio object.
  const [showComponent, setShowComponent] = useState(false); // Indicates if the component is visible.

  const { transcript } = useSpeechRecognition();

 
  // useEffect function runs when gameStarted state changes to true, to display the component.
  useEffect(() => {
    if (gameStarted) {
      setShowComponent(true);
    }
  }, [gameStarted]);

  // useEffect function resets the game state when the component is mounted.
  useEffect(() => {
    setGameResults([]);
    setGameStarted(false);
    setIsGameWon(false);
  }, []);

  // useEffect function updates blendMode when the number of correct answers is increased.
  useEffect(() => {
    const randomBlendMode = BlendModes[Math.floor(Math.random() * BlendModes.length)];
    setBlendMode(randomBlendMode);
  }, [correctAnswers]);

  // useEffect function plays the audio when the component is mounted.
  useEffect(() => {
    const audioElement = audioRef.current;
    audioElement.play();
    setIsPlaying(true);
    return () => {
      audioElement.pause();
    };
  }, []);

  // Function playAgain resets the game state to initial values.
  const playAgain = () => {
    setCorrectAnswers(0);
    setIsGameWon(false);
    setRoundTime(0);
    setGameStarted(false);
    setSelectedSign(getRandomNumber(5, []));
  };

  // Function playGame starts the game by setting gameStarted to true.
  const playGame = () => {
    setCorrectAnswers(0);
    setIsGameWon(false);
    setRoundTime(0);
    setGameStarted(true);
  };

  // useEffect function saves the round results after winning the game.
  useEffect(() => {
    if (isGameWon) {
      setGameStarted(false);
      const roundResult = `Round ${gameRound}: ${roundTime} seconds`;
      setGameResults(prevResults => [...prevResults, roundResult]);
      setGameRound(gameRound => gameRound + 1);
      setRoundTime(0);
    }
  }, [isGameWon]);

  // useEffect function updates round time every second when the game is in progress.
  useEffect(() => {
    let timer;
    if (gameStarted) {
      timer = setInterval(() => {
        setRoundTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStarted]);

  // Function togglePlay toggles audio playback.
  const togglePlay = () => {
    const audioElement = audioRef.current;
    if (!isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Function runCoco loads the TensorFlow.js model for hand detection.
  const runCoco = async () => {
    const net = await tf.loadGraphModel('https://tensorflowjsrealtimemodel.s3.au-syd.cloud-object-storage.appdomain.cloud/model.json')
    setInterval(() => {
      detectHands(net);
    }, 16.7);
  };


  // Function detectHands performs hand detection using TensorFlow.js model.
  const detectHands = async (net) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const img = tf.browser.fromPixels(video);
      const resized = tf.image.resizeBilinear(img, [640,480]);
      const casted = resized.cast('int32');
      const expanded = casted.expandDims(0);
      const obj = await net.executeAsync(expanded);

      const boxes = await obj[1].array();
      const classes = await obj[2].array();
      const scores = await obj[4].array();

      requestAnimationFrame(() => {
        const showedIndex = getSignIndex(boxes[0], classes[0], scores[0], 0.7);
        if (showedIndex !== -1) {
          setImageVisible(true);
          setShowedSign(showedIndex + 1); // Set showed sign 
        }
      });

      tf.dispose(img);
      tf.dispose(resized);
      tf.dispose(casted);
      tf.dispose(expanded);
      tf.dispose(obj);
    }
  };

  // Function startNextRound starts the next game round.
  const startNextRound = (newSelectedSign) => {
    setImageVisible(true);
    setSelectedSign(newSelectedSign);
    setSelectedSigns(prevSelectedSigns => [...prevSelectedSigns, newSelectedSign]);
  };
  // useEffect function compares the selected sign by the player with the shown sign and updates the game state.
  useEffect(() => {

    if (selectedSign !== null && showedSign !== null) {
        compareSigns(showedSign);
    }
  }, [selectedSign, showedSign]);


  // Function compareSigns compares the selected sign by the player with the shown sign and updates the game state.
  const compareSigns = (showedIndex) => {

    SpeechRecognition.startListening();
    // handleSpeechRecognition(finalTranscript, showedIndex, images);
    handleSpeechRecognition(transcript, showedSign, images);

    if (selectedSign === showedIndex && gameStarted && isWordRecognized) {
        if (correctAnswers === 5 ) { // Check if correct answers reached 4
            setIsGameWon(true);
            return;
        }
        const excludedNumbers = [...selectedSigns, showedIndex];
        setCorrectAnswers(prevCorrectAnswers => prevCorrectAnswers + 1); // Update correctAnswers
        const newSelectedSign = getRandomNumber(5, excludedNumbers);
        setIsWordRecognized(false);
        SpeechRecognition.stopListening();
        startNextRound(newSelectedSign);
    } else {
        setShowedSign(null); // Reset showedSign if not equal to selectedSign
    }
    
  }
    
    const handleSpeechRecognition = (finalTranscript, showedSign, images) => {
      if (finalTranscript && showedSign != null) {
        const spokenWords = finalTranscript.toLowerCase().trim();
        if (images[showedSign].speech && spokenWords.includes(images[showedSign].speech)) {
          setIsWordRecognized(true);
        }
      }
    };
  
  // useEffect function displays a message after winning the game.
  useEffect(() => {
    if (isGameWon && gameStarted) {
      alert('Congratulations! You won the game!');
    }
  }, [isGameWon]);

  // useEffect function runs hand detection when the component is mounted.
  useEffect(() => {runCoco()},[]);

  return (
    <div className="App">
      <header className="App-header">
        <div>
        <button
          className="cybr-btn"
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            bottom: 0,
            left: 0,
            right: 300,
            zIndex: 9,
            width: 300,
            height: 120,
            mixBlendMode: "exclusion",
            fontSize: "26px",
            fontWeight: "700",
            letterSpacing: "2px",
            textTransform: "uppercase",
            outline: "transparent",
            cursor: "pointer",
          }}
          onClick={togglePlay}
          >
          <span className="cybr-btn__glitch">MUSICA</span>
          <span className="cybr-btn__tag">R25</span>
          <span style={{ transform: "rotateY(180deg)" }}>{isPlaying ? 'Play Music' : 'Pause Music'}</span>
        </button>
        {!gameStarted && (
          <button
          className="cybr-btn"
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            bottom: 0,
            left:300,
            right: 0,
            zIndex: 9,
            width: 300,
            outline: "transparent",
            transform: "rotateY(180deg)",
            height: 120,
            mixBlendMode: "exclusion",
          }}
          onClick={playGame}
          >
          <span className="cybr-btn__glitch">GAME</span>
          <span className="cybr-btn__tag">R25</span>
          {'Play Game'}
          </button>
        )}
        {gameStarted && (
          <button
          className="cybr-btn"
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            bottom: 0,
            left:300,
            right: 0,
            zIndex: 9,
            width: 300,
            outline: "transparent",
            transform: "rotateY(180deg)",
            height: 120,
            mixBlendMode: "exclusion",
          }}
          onClick={playAgain}
          >
          <span className="cybr-btn__glitch">GAME</span>
          <span className="cybr-btn__tag">R25</span>
          {'Play Again'}
          </button>
        )}
          <audio ref={audioRef} src={music[1].track} autoPlay loop volume={0.5} />
        </div>
        {selectedSign !== null && (
          <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)" }}>
            <h2>{images[selectedSign].name}</h2>
          </div>
        )}
          <div >
            <Webcam
            class="box box2"
              ref={webcamRef}
              style={{
                position: "absolute",
                marginLeft: "auto",
                marginRight: "auto",
                left: 0,
                right: 0,
                top: 101,
                textAlign: "center",
                zIndex: 9,
                width: 640,
                height: 480,
                filter: "blur(0.05em) saturate(0.7) contrast(1.5) brightness(1.2)",
                mixBlendMode: blendMode,
              }}
            />
            </div>
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 640,
            height: 480,
            mixBlendMode: "multiply",
          }}
        />
        {showedSign !== null && isImageVisible && !isGameWon &&(
          <img
            class="box box1"
            src={images[showedSign].image}
            alt={images[showedSign].name}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              bottom: 500,
              zIndex: 10,
              right: 400,
              textAlign: "center",
              height: 150,
              width: 150,
              boxShadow: "rgba(240, 46, 170, 0.4) -5px 5px, rgba(240, 46, 170, 0.3) -10px 10px, rgba(240, 46, 170, 0.2) -15px 15px, rgba(240, 46, 170, 0.1) -20px 20px, rgba(240, 46, 170, 0.05) -25px 25px",
            }}
          />
        )}
        {correctAnswers > 0 && correctAnswers <= 5 && isImageVisible && gameStarted?  (
          <img
            class="box box3"
            src={levels[correctAnswers].image}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              top: 0,
              left: 400,
              bottom: 500,
              zIndex: 11,
              right: 0,
              textAlign: "center",
              height: 150,
              width: 150,
              boxShadow: "5px 5px rgba(240, 46, 170, 0.4), 10px 10px rgba(240, 46, 170, 0.3), 15px 15px rgba(240, 46, 170, 0.2), 20px 20px rgba(240, 46, 170, 0.1), 25px 25px rgba(240, 46, 170, 0.05)",
            }}
          />
        ): null}
        {correctAnswers >= 0 && correctAnswers <= 5 && gameStarted ?  (
          <div style={{ position: "absolute", top: 60, left: "85%", transform: "translateX(-50%)" }}>
            <h2>Level: {correctAnswers}</h2>
          </div>
        ): null}
        { showComponent &&  (
          <div style={{ position: "absolute", top: 60, left: "15%", transform: "translateX(-50%)" }}>
            <h2>Round: {gameRound} Time: {roundTime}</h2>
            {gameResults.map((result, index) => (
              <p style={{top: 60 + index * 10}} key={index }>{result} </p>
            ))}
          </div>
        )}
        { isGameWon && gameRound > 1 ? (
          <img
            class="box box3"
            src={levels[6].image}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 400,
              bottom: 500,
              zIndex: 10,
              right: 0,
              textAlign: "center",
              height: 100,
            }}
          />
        ): null}
        </header>
    </div>
  );
}

export default App;
