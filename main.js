import * as THREE from "three";
import { Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SpeechConfig, AudioConfig, SpeechRecognizer } from "microsoft-cognitiveservices-speech-sdk";
import { getCompletion } from './prompt.js';

document.addEventListener('DOMContentLoaded', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;
  camera.position.y = 14;

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor("#000");
  document.body.appendChild(renderer.domElement);
  camera.lookAt(new Vector3(0, 16, 0));

  // Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(0, 0, 1).normalize();
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(0, 14, 10);
  scene.add(pointLight);

  // Background photo
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('photo/AvatarBackground.jpg', (texture) => {
    scene.background = texture;
  });

  // Load model, audio files, and question list
  const gltfLoader = new GLTFLoader();
  let mixer, model, clips;
  let currentIndex = 0;
  const audioFiles = [];
  for (let i = 1; i <=22; i++) {
      audioFiles.push(`audio/question${i}.mp3`);
  }

  async function fetchQuestions() {
    const response = await fetch('questions.json');
    const questions = await response.json();
    return questions;
  }

  gltfLoader.load(
    'model/scene.glb',
    function (gltf) {
      model = gltf.scene;
      scene.add(model);
      mixer = new THREE.AnimationMixer(model);
      clips = gltf.animations;
      model.rotation.x = THREE.MathUtils.degToRad(16);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error('Error loading GLTF model', error);
    }
  );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, false);

  // Start button event listener
  document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('startButton').style.display = 'none';
    playAudioAndAnimate();
    startRecording(); 
  });

  // Submit button event listener
  document.getElementById('submitButton').addEventListener('click', () => {
    currentIndex++;
    if (currentIndex < audioFiles.length) {
      playAudioAndAnimate();
      document.getElementById('submitButton').style.display = 'none';
    } else {
      saveTranscriptionsToExcel(transcriptions[0]);
      saveTranscriptionsToTxt(transcriptions[0]);
      stopRecording(transcriptions[0]);

      // Reset for next user
      currentIndex = 0;
      document.getElementById('submitButton').style.display = 'none';
      document.getElementById('startButton').style.display = 'block';
      transcriptions = [];
    }
  });

  // Function to play audio and animate
  function playAudioAndAnimate() {
    const audio = new Audio(audioFiles[currentIndex]);
    audio.play();

    if (clips && clips[0]) {
      const action = mixer.clipAction(clips[0]);
      action.reset();
      action.play();
    }

    audio.addEventListener('ended', () => {
      if (mixer) mixer.stopAllAction();
      startRecognition();
    });
  }

  // Animation function
  function render() {
    if (mixer) {
      mixer.update(0.01);
    }
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }
  render();

  // Azure Speech SDK setup
  const subscriptionKey = 'c92e080ce5724d488f39bdae308b6ae9';
  const serviceRegion = 'eastus';
  let transcriptions = [];
  let recognizer;
  let audioRecorder;
  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
  let chunks = [];

  // Function to start recording
  function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        audioRecorder = new MediaRecorder(stream);
        chunks = [];
  
        audioRecorder.ondataavailable = event => {
          chunks.push(event.data);
        };
  
        audioRecorder.start();
      })
      .catch(err => {
        console.error('Error starting audio recording:', err);
      });
  }
  
  // Function to stop recording
  function stopRecording(patientName) {
    if (audioRecorder && audioRecorder.state === 'recording') {
      audioRecorder.stop();
      audioRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);

        const endTime = getEndTime();
        const audioName = generateFileName(patientName, currentDate, endTime, 'mp3');
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = audioName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      };
    }
  }

  // Function to start speech recognition
  async function startRecognition() {
    const SpeechSDK = window.SpeechSDK;

    if (!SpeechSDK) {
        console.error("SpeechSDK is not loaded");
        return;
    }

    const speechConfig = SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = 'en-CA';
    const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
    recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        console.log("Recognized Text: " + e.result.text);
        transcriptions.push(e.result.text.trim().slice(0, -1)); // trim().slice(0, -1): remove end "."
        checkForSkipConditions(e.result.text.toLowerCase());
        document.getElementById('submitButton').style.display = 'block';
        stopRecognition();
      } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
        console.log("No speech recognized.");
        document.getElementById('submitButton').style.display = 'block';
        stopRecognition();
      }
    };

    recognizer.startContinuousRecognitionAsync();
  }

  // Function to stop recognition and recording
  function stopRecognition() {
    if (recognizer) {
      recognizer.stopContinuousRecognitionAsync(
        () => {
          console.log("Recognition stopped.");
          console.log("Transcriptions: ", transcriptions);
        },
        (err) => {
          console.error("Error stopping recognition: " + err);
        }
      );
    }
  }

  // Function to check for skip conditions and update currentIndex
  function checkForSkipConditions(recognizedText) {
    if (currentIndex === 7 && (recognizedText.includes('no') || recognizedText.includes('not sure') || recognizedText.includes("didn'\t") || recognizedText.includes("never"))) {
      // Skip questions 9 and 10
      currentIndex += 2;
    } else if (currentIndex === 10 && (recognizedText.includes('no') || recognizedText.includes('not sure') || recognizedText.includes("didn'\t") || recognizedText.includes("never"))) {
      // Skip questions 12 and 13
      currentIndex += 2;
    } else if (currentIndex === 14 && (recognizedText.includes('no') || recognizedText.includes('not sure') || recognizedText.includes("haven'\t") || recognizedText.includes("never"))) {
      // Skip questions 16, 17, and 18
      currentIndex += 3;
    } else if (currentIndex === 18 && (recognizedText.includes('no') || recognizedText.includes('not sure') || recognizedText.includes("haven'\t") || recognizedText.includes("never"))) {
      // Skip questions 20, 21, and 22
      currentIndex += 3;
    }
  }

  // Function to generate questions-answers
  async function generateContent(transcriptions, format = 'text') {
    const questions = await fetchQuestions();
    let content = format === 'text' ? '' : [];
    let questionIndex = 0;

    for (let i = 0; i < transcriptions.length; i++) {
      if (format === 'text') {
        content += `${questions[questionIndex]}\n${transcriptions[i]}\n`;
      } else {
        content.push([questions[questionIndex], transcriptions[i]]);
      }

      // Check for skipped questions
      if (questionIndex === 7 && (transcriptions[i].toLowerCase().includes('no') || transcriptions[i].toLowerCase().includes('not sure') || transcriptions[i].toLowerCase().includes("didn'\t") || transcriptions[i].toLowerCase().includes("never"))) {
          questionIndex += 3;
      } else if (questionIndex === 10 && (transcriptions[i].toLowerCase().includes('no') || transcriptions[i].toLowerCase().includes('not sure') || transcriptions[i].toLowerCase().includes("didn'\t") || transcriptions[i].toLowerCase().includes("never"))) {
          questionIndex += 2;
      } else if (questionIndex === 14 && (transcriptions[i].toLowerCase().includes('no') || transcriptions[i].toLowerCase().includes('not sure') || transcriptions[i].toLowerCase().includes("haven'\t") || transcriptions[i].toLowerCase().includes("never"))) {
          questionIndex += 4;
      } else if (questionIndex === 18 && (transcriptions[i].toLowerCase().includes('no') || transcriptions[i].toLowerCase().includes('not sure') || transcriptions[i].toLowerCase().includes("haven'\t") || transcriptions[i].toLowerCase().includes("never"))) {
          questionIndex += 3;
      } else {
          questionIndex++;
      }
    }
    return content;
  }

  // Function to get endtime
  function getEndTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}${minutes}`;
  }

  // Function to generate file name
  function generateFileName(patientName, currentDate, endTime, fileFormat = 'mp3') {
    const nameParts = patientName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[1];
    return `${firstName}-${lastName}-${currentDate}-${endTime}.${fileFormat}`;
  }

  // Function to save transcriptions to Excel sheet
  async function saveTranscriptionsToExcel(patientName) {
    const endTime = getEndTime();
    const fileName = generateFileName(patientName, currentDate, endTime, 'xlsx')

    const ws_data = await generateContent(transcriptions, 'array');
    
    const questionsRow = ws_data.map(item => item[0]);
    const answersRow = ws_data.map(item => item[1]);
    
    const ws = XLSX.utils.aoa_to_sheet([questionsRow, answersRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Responses");

    XLSX.writeFile(wb, fileName);
  }

  // Function to save transcriptions to TXT file
  async function saveTranscriptionsToTxt(patientName) {
    const endTime = getEndTime();
    const fileName = generateFileName(patientName, currentDate, endTime, 'txt');
    const content = await generateContent(transcriptions, 'text');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);

    await processUserPrompt(patientName, content);
  }

  // Function to call prompt.js and get GPT generated summary
  async function processUserPrompt(patientName, userPrompt) {
    const systemPrompt = `Generate a detailed paragraph summarizing the following information, including demographics, current injury details, and previous injury history. The summary should be accurate, standardized, and suitable for medical evaluation.`;
    const completion = await getCompletion(systemPrompt, userPrompt);
    console.log('GPT completion:', completion);

    // Save summary to txt
    const nameParts = patientName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[1];
    const fileName = `${firstName}-${lastName}-summary.txt`;

    const blob = new Blob([completion], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
 }

});
