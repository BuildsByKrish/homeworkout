import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';

// Embedded Home Workout Data
const homePopularWorkouts = {
  'Warm-up': [
    { name: 'Jumping Jacks', sets: '3', reps: '30 seconds', info: 'Full body warm-up, increases heart rate.' },
    { name: 'Arm Circles (Forward/Backward)', sets: '2', reps: '10-15 each direction', info: 'Shoulder mobility.' },
    { name: 'Leg Swings (Forward/Side)', sets: '2', reps: '10-15 each leg', info: 'Hip mobility.' },
    { name: 'Torso Twists', sets: '2', reps: '10-15 each side', info: 'Spinal mobility.' },
    { name: 'Light Cardio (e.g., Marching in Place)', sets: '1', reps: '2-3 minutes', info: 'Prepares cardiovascular system.' },
  ],
  'Upper Body (Bodyweight/Dumbbell)': [
    { name: 'Push-ups (Knees/Standard/Incline)', sets: '3-4', reps: 'AMRAP (As Many Reps As Possible)', info: 'Chest, shoulders, triceps. Adjust difficulty with incline.' },
    { name: 'Dumbbell Floor Press', sets: '3', reps: '8-12', info: 'Chest and triceps, good for home use with dumbbells.' },
    { name: 'Dumbbell Rows (Single Arm)', sets: '3', reps: '8-12 per arm', info: 'Back (lats) and biceps.' },
    { name: 'Dumbbell Overhead Press (Seated)', sets: '3', reps: '8-12', info: 'Shoulders.' },
    { name: 'Dumbbell Bicep Curls', sets: '3', reps: '10-15', info: 'Biceps isolation.' },
    { name: 'Dumbbell Triceps Extensions (Overhead)', sets: '3', reps: '10-15', info: 'Triceps isolation.' },
    { name: 'Dumbbell Side Raises', sets: '3', reps: '10-15', info: 'Targets side deltoids for shoulder width.' },
    { name: 'Dumbbell Front Raises', sets: '3', reps: '10-15', info: 'Targets front deltoids for shoulder strength.' },
    { name: 'Dumbbell Hammer Curls', sets: '3', reps: '10-15 per arm', info: 'Targets the biceps and forearms.' },
    { name: 'Dumbbell Skull Crushers (on the floor)', sets: '3', reps: '10-15', info: 'Excellent isolation exercise for the triceps.' },
    { name: 'Decline Push-ups', sets: '3-4', reps: 'AMRAP', info: 'Increases the difficulty of standard push-ups by elevating your feet.' },
    { name: 'T-Plank Rotations', sets: '3', reps: '8-10 per side', info: 'A dynamic core and shoulder stability exercise.' },
  ],
  'Lower Body & Core (Bodyweight/Dumbbell)': [
    { name: 'Squats (Bodyweight/Goblet Squat)', sets: '3-4', reps: '8-15', info: 'Works quads, glutes, hamstrings.' },
    { name: 'Lunges (Bodyweight/Dumbbell)', sets: '3', reps: '8-12 per leg', info: 'Quads, glutes, hamstrings, balance.' },
    { name: 'Glute Bridges', sets: '3', reps: '12-20', info: 'Targets glutes and hamstrings.' },
    { name: 'Romanian Deadlift (Dumbbell RDL)', sets: '3', reps: '10-15', info: 'Excellent for hamstrings and glutes with dumbbells.' },
    { name: 'Calf Raises (Bodyweight/Dumbbell)', sets: '3-4', reps: '15-20', info: 'Calf muscles.' },
    { name: 'Plank', sets: '3', reps: '30-60 seconds hold', info: 'Core strength.' },
    { name: 'Crunches', sets: '3', reps: '15-20', info: 'Upper abs.' },
    { name: 'Russian Twists', sets: '3', reps: '15-20 per side', info: 'Obliques.' },
    { name: 'Leg Raises', sets: '3', reps: '15-20', info: 'Targets lower abs.' },
    { name: 'Flutter Kicks', sets: '3', reps: '30-60 seconds', info: 'Engages lower abs and hip flexors.' },
    { name: 'Bulgarian Split Squats', sets: '3', reps: '8-12 per leg', info: 'Targets one leg at a time to improve balance and strength.' },
    { name: 'Single-Leg Romanian Deadlifts (RDLs)', sets: '3', reps: '8-12 per leg', info: 'Works the hamstrings, glutes, and improves stability.' },
    { name: 'Calf Raises (Single-Leg)', sets: '3', reps: '15-20 per leg', info: 'Increases the intensity of calf work.' },
    { name: 'Side Plank', sets: '3', reps: '30-60 seconds hold per side', info: 'Targets the obliques and improves core stability.' },
  ],
  'Cardio': [
    { name: 'High Knees', sets: '3', reps: '30-60 seconds', info: 'Improves cardio and leg strength.' },
    { name: 'Butt Kicks', sets: '3', reps: '30-60 seconds', info: 'Targets hamstrings and cardio.' },
    { name: 'Mountain Climbers', sets: '3', reps: '30-60 seconds', info: 'Full body, high intensity.' },
    { name: 'Burpees', sets: '3', reps: '8-12', info: 'Full body, high intensity, advanced.' },
    { name: 'Jump Rope', sets: '3', reps: '1-2 minutes', info: 'Excellent cardio and coordination.' },
  ],
  'Stretching & Mobility': [
    { name: 'Cat-Cow Stretch', sets: '2', reps: '10-15 reps', info: 'Improves spinal mobility and flexibility.' },
    { name: 'Seated Hamstring Stretch', sets: '2', reps: '30-60 seconds hold per leg', info: 'Stretches the hamstrings and lower back.' },
    { name: 'Pigeon Pose', sets: '2', reps: '30-60 seconds hold per side', info: 'A deep stretch for the hips and glutes.' },
  ]
};


// Declare global variables from the Canvas environment, if they exist.
// This helps ESLint understand they are provided externally.
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : {};
const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;


// Utility function to convert Firebase Timestamps to readable dates
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate();
  return date.toLocaleString();
};

// Custom Alert Modal Component
const CustomAlert = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
        <p className="text-gray-800 text-lg mb-6">{message}</p>
        <button
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 ease-in-out"
        >
          OK
        </button>
      </div>
    </div>
  );
};

// Stopwatch Component
const Stopwatch = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map(unit => String(unit).padStart(2, '0'))
      .join(':');
  };

  return (
    <div className="p-4 bg-yellow-50 rounded-lg shadow-md flex flex-col items-center border border-yellow-200">
      <h3 className="text-xl font-bold text-yellow-800 mb-3">Stopwatch</h3>
      <div className="text-5xl font-mono text-yellow-900 mb-4">
        {formatTime(time)}
      </div>
      <div className="flex space-x-3">
        <button
          onClick={handleStartPause}
          className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ${
            isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          } text-white shadow`}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition duration-300 shadow"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

// Rest Timer Component
const RestTimer = ({ onTimerEnd }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      clearInterval(timerRef.current);
      setIsTimerRunning(false);
      if (onTimerEnd) onTimerEnd(); // Callback when timer ends
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timeLeft, onTimerEnd]);

  const startTimer = (seconds) => {
    setTimeLeft(seconds);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setTimeLeft(0);
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="p-4 bg-pink-50 rounded-lg shadow-md flex flex-col items-center border border-pink-200">
      <h3 className="text-xl font-bold text-pink-800 mb-3">Rest Timer</h3>
      <div className="text-5xl font-mono text-pink-900 mb-4">
        {formatTime(timeLeft)}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => startTimer(30)}
          disabled={isTimerRunning}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow"
        >
          30s
        </button>
        <button
          onClick={() => startTimer(60)}
          disabled={isTimerRunning}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow"
        >
          60s
        </button>
        <button
          onClick={() => startTimer(90)}
          disabled={isTimerRunning}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow"
        >
          90s
        </button>
        {isTimerRunning && (
          <button
            onClick={stopTimer}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
};


const App = () => {
  const [db, setDb] = useState(null);
  // Removed unused auth state
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState(null); // General application errors

  // Navigation state
  const [view, setView] = useState('home'); // 'home', 'selectExercises', 'generateRoutine', 'startWorkout', 'history'

  // Workout Logging Form states
  const [workoutName, setWorkoutName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [loggedWorkouts, setLoggedWorkouts] = useState([]); // Renamed from 'workouts' to avoid confusion

  // My Exercise Bank states
  const [myExercises, setMyExercises] = useState([]); // User's selected exercises
  const [showExerciseAlert, setShowExerciseAlert] = useState(false); // Used in CustomAlert component
  const [exerciseAlertMessage, setExerciseAlertMessage] = useState('');

  // Routine Generation states
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [generatedRoutine, setGeneratedRoutine] = useState(null); // Stores the parsed routine object
  const [generatingRoutine, setGeneratingRoutine] = useState(false);
  const [routineGenerationError, setRoutineGenerationError] = useState(null);
  const [hasRoutine, setHasRoutine] = useState(false); // To check if a routine exists in Firestore

  // Current Workout states
  const [currentDayWorkout, setCurrentDayWorkout] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [progressSuggestion, setProgressSuggestion] = useState('');
  const [showWorkoutCompletionModal, setShowWorkoutCompletionModal] = useState(false);


  // Firebase Initialization and Auth
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);

      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          console.log("User authenticated:", user.uid);
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (signInError) {
            console.error("Error signing in:", signInError);
            setAppError("Failed to authenticate. Please try again.");
          }
        }
        setLoading(false);
      });

      return () => unsubscribeAuth();
    } catch (initError) {
      console.error("Firebase initialization error:", initError);
      setAppError("Failed to initialize the application.");
      setLoading(false);
    }
  }, []); // No dependencies needed; initialAuthToken is a constant

  // Fetch User's My Exercises and Routine from Firestore
  useEffect(() => {
    if (db && userId) {
      // Fetch My Exercises
      const myExercisesDocRef = doc(db, `artifacts/${appId}/users/${userId}/appData/myExercises`);
      const unsubscribeMyExercises = onSnapshot(myExercisesDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMyExercises(data.exercises || []);
        } else {
          setMyExercises([]);
        }
      }, (err) => console.error("Error fetching my exercises:", err));

      // Fetch Generated Routine
      const routineDocRef = doc(db, `artifacts/${appId}/users/${userId}/appData/generatedRoutine`);
      const unsubscribeRoutine = onSnapshot(routineDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          try {
            setGeneratedRoutine(JSON.parse(data.routine));
            setHasRoutine(true);
          } catch (e) {
            console.error("Error parsing stored routine:", e);
            setAppError("Failed to load your workout routine.");
            setGeneratedRoutine(null);
            setHasRoutine(false);
          }
        } else {
          setGeneratedRoutine(null);
          setHasRoutine(false);
        }
      }, (err) => console.error("Error fetching generated routine:", err));

      // Fetch Logged Workouts
      const workoutsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/workouts`);
      const q = query(workoutsCollectionRef, orderBy('timestamp', 'desc'));
      const unsubscribeLoggedWorkouts = onSnapshot(q, (snapshot) => {
        const fetchedWorkouts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLoggedWorkouts(fetchedWorkouts);
      }, (err) => console.error("Error fetching logged workouts:", err));


      return () => {
        unsubscribeMyExercises();
        unsubscribeRoutine();
        unsubscribeLoggedWorkouts();
      };
    }
  }, [db, userId]);

  // Helper to get today's workout based on the generated routine
  const getTodayWorkout = useCallback(() => {
    if (!generatedRoutine) return null;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const dayName = days[today.getDay()];
    return generatedRoutine[dayName] || null;
  }, [generatedRoutine]);


  // Add/Remove Exercise from My Exercises
  const toggleMyExercise = async (exercise) => {
    if (!db || !userId) {
      setAppError("Database not ready.");
      return;
    }

    const myExercisesDocRef = doc(db, `artifacts/${appId}/users/${userId}/appData/myExercises`);
    const isAlreadyAdded = myExercises.some(ex => ex.name === exercise.name);

    let updatedExercises;
    if (isAlreadyAdded) {
      updatedExercises = myExercises.filter(ex => ex.name !== exercise.name);
      setExerciseAlertMessage(`Removed "${exercise.name}" from your bank.`);
    } else {
      updatedExercises = [...myExercises, exercise];
      setExerciseAlertMessage(`Added "${exercise.name}" to your bank.`);
    }

    try {
      await setDoc(myExercisesDocRef, { exercises: updatedExercises }, { merge: true });
      setShowExerciseAlert(true); // showExerciseAlert is used here
    } catch (e) {
      console.error("Error updating my exercises:", e);
      setAppError("Failed to update your exercise bank.");
    }
  };


  // Handle adding a manual workout log entry
  const handleAddWorkoutLog = async (e) => {
    e.preventDefault();
    if (!exerciseName || !sets || !reps || !weight) {
      setAppError("Please fill in all exercise details for the log.");
      return;
    }
    if (!db || !userId) {
      setAppError("Database not ready. Please wait or refresh.");
      return;
    }

    try {
      const workoutsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/workouts`);
      await addDoc(workoutsCollectionRef, {
        workoutName: workoutName || 'Manual Log',
        exerciseName,
        sets: parseInt(sets, 10),
        reps: parseInt(reps, 10),
        weight: parseFloat(weight),
        timestamp: serverTimestamp()
      });
      setWorkoutName('');
      setExerciseName('');
      setSets('');
      setReps('');
      setWeight('');
      setAppError(null);
    } catch (addError) {
      console.error("Error adding workout:", addError);
      setAppError("Failed to add workout log. Please check your input and connection.");
    }
  };

  // Generate Routine with LLM
  const handleGenerateRoutine = async () => {
    if (myExercises.length === 0) {
      setRoutineGenerationError("Please add exercises to 'My Exercise Bank' first.");
      return;
    }
    if (!daysPerWeek || daysPerWeek < 1 || daysPerWeek > 7) {
      setRoutineGenerationError("Please specify a valid number of workout days (1-7).");
      return;
    }

    setGeneratingRoutine(true);
    setGeneratedRoutine(null);
    setRoutineGenerationError(null);

    const exercisesList = myExercises.map(ex => `${ex.name} (${ex.sets} sets, ${ex.reps} reps)`).join(', ');
    const prompt = `Given these home exercises from the user's bank: ${exercisesList}. Create a ${daysPerWeek} day per week home workout routine. Each workout day should include a short warm-up (e.g., "5 minutes of light cardio and dynamic stretches") and then list the exercises with suggested sets and reps. Distribute exercises logically across days (e.g., full-body, upper/lower split, or push/pull/legs if enough exercises). Provide the output as a JSON object with keys as day names (e.g., "Monday", "Tuesday") and values as an array of exercise objects. Each exercise object should have 'name', 'sets', 'reps', and 'type' (e.g., 'warmup', 'exercise'). Example structure:
{
  "Monday": [
    {"name": "Warm-up", "sets": "1", "reps": "5 minutes", "type": "warmup"},
    {"name": "Squats", "sets": "3", "reps": "10", "type": "exercise"}
  ],
  "Tuesday": [...]
}
Ensure all exercises from the provided list are used if possible. Make sure to only return the JSON object, do not include any other text or markdown outside the JSON.`;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          additionalProperties: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                "name": { "type": "STRING" },
                "sets": { "type": "STRING" },
                "reps": { "type": "STRING" },
                "type": { "type": "STRING", "enum": ["warmup", "exercise"] }
              },
              required: ["name", "sets", "reps", "type"]
            }
          }
        }
      }
    };
    // Corrected API key usage to explicitly pull from window.__api_key
    const apiKey = typeof window.__api_key !== 'undefined' ? window.__api_key : ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 1000;

    while (retries < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          const jsonString = result.candidates[0].content.parts[0].text;
          const parsedRoutine = JSON.parse(jsonString);

          // Save the routine to Firestore
          const routineDocRef = doc(db, `artifacts/${appId}/users/${userId}/appData/generatedRoutine`);
          await setDoc(routineDocRef, { routine: jsonString });

          setGeneratedRoutine(parsedRoutine);
          setHasRoutine(true);
          break;
        } else {
          throw new Error("Invalid response structure from Gemini API.");
        }
      } catch (apiError) {
        console.error("Error calling Gemini API:", apiError);
        retries++;
        if (retries < maxRetries) {
          const delay = baseDelay * Math.pow(2, retries - 1);
          await new Promise(res => setTimeout(res, delay));
        } else {
          setRoutineGenerationError("Failed to generate plan after multiple retries. Please try again later. Ensure your prompt is clear.");
        }
      }
    }
    setGeneratingRoutine(false);
  };

  // Start Today's Workout
  const handleStartWorkout = () => {
    const todayWorkout = getTodayWorkout();
    if (!todayWorkout || todayWorkout.length === 0) {
      setAppError("No workout planned for today. Please generate a routine first!");
      return;
    }
    setCurrentDayWorkout(todayWorkout);
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setIsWorkoutActive(true);
    setProgressSuggestion('');
    setView('startWorkout');
  };

  // Handle Next Set / Next Exercise in Workout Mode
  const handleNextSet = async () => {
    if (!currentDayWorkout) return;

    const currentExercise = currentDayWorkout[currentExerciseIndex];
    if (!currentExercise) return; // Should not happen

    // Log the completed set if it's an exercise (not warm-up)
    if (currentExercise.type === 'exercise') {
      try {
        const workoutsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/workouts`);
        await addDoc(workoutsCollectionRef, {
          workoutName: `Routine Workout (${new Date().toLocaleDateString()})`,
          exerciseName: currentExercise.name,
          sets: 1, // Log one set at a time for simplicity
          reps: currentExercise.reps.includes('AMRAP') ? 'AMRAP' : parseInt(currentExercise.reps, 10), // Capture AMRAP if applicable
          weight: 0, // Assume bodyweight for home workouts, or you could add an input later
          timestamp: serverTimestamp()
        });
      } catch (logError) {
        console.error("Error logging workout set:", logError);
        setAppError("Failed to log set. Data might not be saved.");
      }
    }

    const currentExerciseSets = currentExercise.sets.includes('-') ?
      parseInt(currentExercise.sets.split('-')[1], 10) : parseInt(currentExercise.sets, 10);


    // Move to next set
    if (currentSetIndex < currentExerciseSets - 1) {
      setCurrentSetIndex(prev => prev + 1);
    } else {
      // Move to next exercise
      if (currentExerciseIndex < currentDayWorkout.length - 1) {
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSetIndex(0); // Reset set count for new exercise
      } else {
        // Workout Finished!
        setIsWorkoutActive(false);
        const suggestion = "Great job! For progressive overload next week, try adding 1-2 more reps per set, increasing a set, or slightly decreasing your rest time (e.g., from 90s to 60s). Keep challenging yourselves!";
        setProgressSuggestion(suggestion);
        setShowWorkoutCompletionModal(true); // Show completion modal
        // Optionally, reset view to home or history after completion
        // setView('home');
      }
    }
  };

  const handleWorkoutCompletionModalClose = () => {
    setShowWorkoutCompletionModal(false);
    setView('home'); // Go back to home after closing modal
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl text-gray-700">Loading application...</p>
      </div>
    );
  }

  // Determine current workout info
  const currentWorkoutExercise = isWorkoutActive && currentDayWorkout ? currentDayWorkout[currentExerciseIndex] : null;
  const totalSetsForCurrentExercise = currentWorkoutExercise?.sets.includes('-') ?
    parseInt(currentWorkoutExercise.sets.split('-')[1], 10) :
    parseInt(currentWorkoutExercise?.sets, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 flex flex-col items-center">
      {/* Conditionally render CustomAlert for general app errors */}
      <CustomAlert message={appError} onClose={() => setAppError(null)} />

      {/* Conditionally render CustomAlert specifically for exercise bank messages */}
      {showExerciseAlert && (
        <CustomAlert message={exerciseAlertMessage} onClose={() => setShowExerciseAlert(false)} />
      )}

      {/* Workout Completion Modal */}
      {showWorkoutCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full text-center">
            <h2 className="text-3xl font-bold text-green-700 mb-4">Workout Complete! 🎉</h2>
            <p className="text-gray-800 text-lg mb-6">{progressSuggestion}</p>
            <button
              onClick={handleWorkoutCompletionModalClose}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 ease-in-out"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl p-6 sm:p-8 border border-gray-200">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-blue-800 mb-6">
          💪 Home Workout Pal
        </h1>
        <p className="text-center text-gray-600 mb-8 text-lg">
          Your personal guide for home workouts with friends & family!
        </p>

        <div className="mb-8 p-4 bg-blue-50 rounded-lg shadow-inner text-blue-800 text-sm">
          Your User ID: <span className="font-mono break-all">{userId}</span>
          <br/>
          Share this ID with your workout buddies if you share an account!
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          <button
            onClick={() => setView('home')}
            className={`px-6 py-3 rounded-lg font-semibold transition duration-300 shadow-md ${view === 'home' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-800 hover:bg-blue-100'}`}
          >
            Home
          </button>
          <button
            onClick={() => setView('selectExercises')}
            className={`px-6 py-3 rounded-lg font-semibold transition duration-300 shadow-md ${view === 'selectExercises' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-800 hover:bg-blue-100'}`}
          >
            My Exercise Bank
          </button>
          <button
            onClick={() => setView('generateRoutine')}
            className={`px-6 py-3 rounded-lg font-semibold transition duration-300 shadow-md ${view === 'generateRoutine' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-800 hover:bg-blue-100'}`}
          >
            Generate Routine
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-6 py-3 rounded-lg font-semibold transition duration-300 shadow-md ${view === 'history' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-800 hover:bg-blue-100'}`}
          >
            Workout History
          </button>
        </div>

        {/* --- Home View --- */}
        {view === 'home' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-blue-700 mb-6">Welcome!</h2>
            <p className="text-lg text-gray-700 mb-8">
              Start by building your exercise bank, generate a routine, or jump straight into today's workout!
            </p>

            {hasRoutine && (
                <div className="mt-8 p-6 bg-green-50 rounded-lg shadow-md border border-green-100 flex flex-col items-center">
                  <h3 className="text-2xl font-bold text-green-700 mb-4">Today's Workout Plan:</h3>
                  {getTodayWorkout() ? (
                    <>
                      <ul className="list-disc list-inside text-left text-gray-700 mb-6 max-w-md mx-auto">
                        {getTodayWorkout().map((ex, idx) => (
                          <li key={idx} className="mb-2">
                            <span className="font-semibold">{ex.name}:</span> {ex.sets} sets of {ex.reps} {ex.type === 'warmup' ? '(Warm-up)' : ''}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={handleStartWorkout}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                      >
                        Start Today's Workout!
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-600">No workout scheduled for today, or routine not yet generated.</p>
                  )}
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <Stopwatch />
              <RestTimer />
            </div>

            <div className="mt-10 p-6 bg-gray-50 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Manual Workout Log</h3>
              <form onSubmit={handleAddWorkoutLog} className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="Workout Name (Optional, e.g., 'Quick Session')"
                />
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="Exercise Name (e.g., 'Push-ups')"
                  required
                />
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="number"
                    className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    placeholder="Sets"
                    min="1"
                    required
                  />
                  <input
                    type="number"
                    className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="Reps"
                    min="1"
                    required
                  />
                  <input
                    type="number"
                    className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Weight (kg/lbs, 0 if bodyweight)"
                    step="0.1"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg mt-4"
                >
                  Add Log Entry
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- Select Exercises View --- */}
        {view === 'selectExercises' && (
          <div>
            <h2 className="text-3xl font-bold text-green-700 mb-6 text-center">
              Build Your Exercise Bank 💪
            </h2>
            <p className="text-center text-gray-700 mb-8">
              Select exercises you want to include in your workout routines. These are home-friendly!
            </p>
            <div className="space-y-6">
              {Object.entries(homePopularWorkouts).map(([bodyPart, exercises]) => (
                <div key={bodyPart} className="bg-green-50 p-6 rounded-lg shadow-md border border-green-100">
                  <h3 className="text-2xl font-bold text-green-800 mb-4">{bodyPart}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exercises.map((exercise, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-200 ${
                          myExercises.some(ex => ex.name === exercise.name)
                            ? 'bg-blue-200 border-blue-500'
                            : 'bg-white border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => toggleMyExercise(exercise)}
                      >
                        <p className="text-lg font-semibold text-gray-900">{exercise.name}</p>
                        <p className="text-gray-600 text-sm">Sets: {exercise.sets}, Reps: {exercise.reps}</p>
                        <p className="text-gray-500 text-xs mt-1">{exercise.info}</p>
                        {myExercises.some(ex => ex.name === exercise.name) && (
                          <span className="text-xs text-blue-700 font-bold block mt-2">Added to Bank ✅</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Generate Routine View --- */}
        {view === 'generateRoutine' && (
          <div className="p-6 bg-indigo-50 rounded-lg shadow-lg border border-indigo-200">
            <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">
              ✨ Generate Your Workout Routine
            </h2>
            <p className="text-gray-700 mb-4 text-center">
              I'll create a weekly workout plan using exercises from your "My Exercise Bank".
            </p>

            {myExercises.length === 0 ? (
              <p className="text-red-600 text-center mb-4">
                Please go to "My Exercise Bank" and select some exercises first!
              </p>
            ) : (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Your Selected Exercises:</h3>
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white rounded-lg border border-gray-200">
                  {myExercises.map((ex, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {ex.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <label htmlFor="daysPerWeek" className="block text-gray-700 text-sm font-bold mb-2">
              How many days a week do you want to workout? (1-7)
            </label>
            <input
              type="number"
              id="daysPerWeek"
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value)}
              placeholder="e.g., 3"
              min="1"
              max="7"
            />

            <div className="flex justify-center gap-4">
              <button
                onClick={handleGenerateRoutine}
                disabled={generatingRoutine || myExercises.length === 0}
                className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg ${generatingRoutine || myExercises.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {generatingRoutine ? 'Generating...' : '✨ Generate Routine'}
              </button>
              {generatedRoutine && (
                <button
                  onClick={() => {
                    setGeneratedRoutine(null);
                    setHasRoutine(false);
                    // Optionally remove from Firestore here too
                    // deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/appData/generatedRoutine`));
                  }}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                  Clear Current Routine
                </button>
              )}
            </div>

            {routineGenerationError && (
              <p className="text-red-600 text-center mt-4">{routineGenerationError}</p>
            )}

            {generatedRoutine && (
              <div className="mt-8 p-6 bg-white rounded-lg shadow-md border border-indigo-100 whitespace-pre-wrap">
                <h3 className="text-2xl font-bold text-indigo-700 mb-4">Your Generated Weekly Routine:</h3>
                {Object.entries(generatedRoutine).map(([day, exercises]) => (
                  <div key={day} className="mb-6 border-b pb-4 last:border-b-0 last:pb-0">
                    <h4 className="text-xl font-bold text-gray-800 mb-2">{day}</h4>
                    <ul className="list-disc list-inside ml-4 text-gray-700">
                      {exercises.map((exercise, idx) => (
                        <li key={idx} className="mb-1">
                          <span className="font-semibold">{exercise.name}:</span> {exercise.sets} sets of {exercise.reps} {exercise.type === 'warmup' ? '(Warm-up)' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- Start Workout View --- */}
        {view === 'startWorkout' && (
          <div className="p-6 bg-purple-50 rounded-lg shadow-lg border border-purple-200">
            <h2 className="text-3xl font-bold text-purple-700 mb-6 text-center">
              Today's Workout 🏋️‍♂️
            </h2>

            {!isWorkoutActive && !currentDayWorkout && (
              <p className="text-center text-gray-600 text-lg">
                No workout loaded. Please go to Home and click "Start Today's Workout".
              </p>
            )}

            {isWorkoutActive && currentWorkoutExercise && (
              <>
                <div className="text-center mb-6">
                  <p className="text-xl text-gray-700 mb-2">
                    Current Exercise: <span className="font-bold text-purple-800 text-2xl">{currentWorkoutExercise.name}</span>
                  </p>
                  <p className="text-xl text-gray-700 mb-4">
                    Set {currentSetIndex + 1} of {totalSetsForCurrentExercise}: <span className="font-bold text-purple-800 text-2xl">{currentWorkoutExercise.reps} Reps</span>
                  </p>
                  {currentWorkoutExercise.type === 'warmup' && (
                    <p className="text-orange-600 text-md font-semibold mb-4">
                      (Warm-up - Focus on controlled movement)
                    </p>
                  )}
                </div>

                <div className="flex justify-center gap-4 mb-8">
                  <button
                    onClick={handleNextSet}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                  >
                    {currentSetIndex < totalSetsForCurrentExercise - 1 ? 'Next Set' : 'Next Exercise / Finish Workout'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <Stopwatch />
                  <RestTimer onTimerEnd={() => setAppError("Rest time over! Get ready for your next set.")} />
                </div>
              </>
            )}

            {/* Workout Completed state */}
            {!isWorkoutActive && currentDayWorkout && progressSuggestion && showWorkoutCompletionModal === false && (
                <div className="text-center">
                    <p className="text-2xl font-bold text-green-700 mb-4">Workout Completed!</p>
                    <p className="text-lg text-gray-700 mb-6">
                        You finished today's routine. Go to Home to see the completion message!
                    </p>
                    <button
                        onClick={() => setView('home')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    >
                        Go to Home
                    </button>
                </div>
            )}
          </div>
        )}

        {/* --- Workout History View --- */}
        {view === 'history' && (
          <div>
            <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
              Workout History
            </h2>
            {loggedWorkouts.length === 0 ? (
              <p className="text-center text-gray-500 text-lg">No workouts logged yet. Start adding some!</p>
            ) : (
              <div className="space-y-6">
                {loggedWorkouts.map((workout) => (
                  <div key={workout.id} className="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-100">
                    <p className="text-sm text-gray-500 mb-2">
                      <span className="font-semibold">Logged On:</span> {formatTimestamp(workout.timestamp)}
                    </p>
                    {workout.workoutName && (
                      <p className="text-xl font-semibold text-blue-700 mb-1">
                        <span className="text-gray-600">Workout:</span> {workout.workoutName}
                      </p>
                    )}
                    <p className="text-2xl font-bold text-gray-800">
                      {workout.exerciseName}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        Sets: {workout.sets}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                        Reps: {workout.reps}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                        Weight: {workout.weight}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
