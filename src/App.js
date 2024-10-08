import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'exists' : 'missing');

let supabase;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized');
} else {
  console.error('Supabase URL or Key is missing. Please check your environment variables.');
}

const conditions = ['A', 'B', 'C'];
const vignettes = {
  'A': ['Vignette A1', 'Vignette A2', 'Vignette A3'],
  'B': ['Vignette B1', 'Vignette B2', 'Vignette B3'],
  'C': ['Vignette C1', 'Vignette C2', 'Vignette C3']
};
const questions = [
  {
    'id': 'q1', 
    'text': 'What is your opinion?', 
    'type': 'likert', 
    'options': ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    'required': true
  },
  {
    'id': 'q2', 
    'text': 'Please explain:', 
    'type': 'text',
    'required': false
  }
];

const commonQuestions = [
  {
    'id': 'common1',
    'text': 'What is your age?',
    'type': 'text',
    'required': true
  },
  {
    'id': 'common2',
    'text': 'What is your gender?',
    'type': 'radio',
    'options': ['Male', 'Female', 'Other', 'Prefer not to say'],
    'required': true
  }
];

const MIN_COMPLETED_PER_CONDITION = 10;

function App() {
  const [survey, setSurvey] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [surveyId, setSurveyId] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (supabase) {
      assignCondition();
    } else {
      console.error('Supabase client is not initialized. Cannot assign condition.');
    }
  }, []);

  const assignCondition = async () => {
    if (!supabase) {
      console.error('Supabase client is not initialized. Cannot assign condition.');
      return;
    }

    try {
      const { data: counts, error: countError } = await supabase
        .from('survey_responses')
        .select('condition, submitted');

      if (countError) throw countError;

      const completedCounts = {};
      conditions.forEach(condition => {
        completedCounts[condition] = counts.filter(c => c.condition === condition && c.submitted).length;
      });

      console.log('Completed surveys per condition:', completedCounts);

      const eligibleConditions = conditions.filter(condition => completedCounts[condition] < MIN_COMPLETED_PER_CONDITION);
      console.log('Eligible conditions:', eligibleConditions);

      let condition = eligibleConditions.length > 0
        ? eligibleConditions[Math.floor(Math.random() * eligibleConditions.length)]
        : Object.keys(completedCounts).reduce((a, b) => completedCounts[a] <= completedCounts[b] ? a : b);

      console.log('Assigned condition:', condition);

      const { data: surveyData, error: surveyError } = await supabase
        .from('survey_responses')
        .insert({ condition: condition, submitted: false })
        .select()
        .single();

      if (surveyError) throw surveyError;

      console.log('Created survey response:', surveyData);

      setSurveyId(surveyData.id);
      setSurvey({
        condition,
        questions: [...commonQuestions, ...vignettes[condition].flatMap(vignette => 
          questions.map(q => ({ ...q, text: `${vignette}\n\n${q.text}` }))
        )]
      });

      console.log('Survey set up complete');
    } catch (error) {
      console.error('Error assigning condition:', error);
      alert('Error starting survey. Please try again.');
    }
  };

  const handleResponse = (response) => {
    console.log(`Response for question ${currentQuestionIndex}:`, response);
    setResponses(prev => ({
      ...prev,
      [currentQuestionIndex]: response
    }));
    setErrors({});
  };

  const validateResponse = () => {
    const currentQuestion = survey.questions[currentQuestionIndex];
    if (currentQuestion.required && !responses[currentQuestionIndex]) {
      console.log(`Validation failed for question ${currentQuestionIndex}`);
      setErrors({ [currentQuestionIndex]: 'This question is required' });
      return false;
    }
    return true;
  };

  const nextQuestion = () => {
    if (validateResponse()) {
      if (currentQuestionIndex < survey.questions.length - 1) {
        console.log(`Moving to question ${currentQuestionIndex + 1}`);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        console.log('Survey complete, ready for submission');
        setIsComplete(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (validateResponse()) {
      try {
        console.log('Submitting survey responses:', responses);
        const { error } = await supabase
          .from('survey_responses')
          .update({ 
            responses: responses,
            submitted: true 
          })
          .eq('id', surveyId);

        if (error) throw error;
        console.log('Survey submitted successfully');
        setIsSubmitted(true);
      } catch (error) {
        console.error('Error submitting survey:', error);
        alert('Error submitting survey. Please try again.');
      }
    }
  };

  if (!survey) return <div>Loading...</div>;

  if (isSubmitted) {
    return (
      <div className="App">
        <h1>Thank You</h1>
        <p>Your responses have been recorded.</p>
      </div>
    );
  }

  const currentQuestion = survey.questions[currentQuestionIndex];

  return (
    <div className="App">
      <h1>Survey</h1>
      {!isComplete ? (
        <div>
          <p>{currentQuestion.text}</p>
          {currentQuestion.type === 'likert' ? (
            currentQuestion.options.map(option => (
              <button 
                key={option} 
                onClick={() => handleResponse(option)}
                style={{
                  backgroundColor: responses[currentQuestionIndex] === option ? 'lightblue' : 'white'
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <textarea 
              value={responses[currentQuestionIndex] || ''}
              onChange={(e) => handleResponse(e.target.value)} 
            />
          )}
          {errors[currentQuestionIndex] && <p style={{ color: 'red' }}>{errors[currentQuestionIndex]}</p>}
          <button onClick={nextQuestion}>
            {currentQuestionIndex < survey.questions.length - 1 ? 'Next' : 'Finish'}
          </button>
        </div>
      ) : (
        <div>
          <p>Thank you for completing the survey. Click submit to record your responses.</p>
          <button onClick={handleSubmit}>Submit</button>
        </div>
      )}
    </div>
  );
}

export default App;