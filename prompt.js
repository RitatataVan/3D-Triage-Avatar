import OpenAI from "openai";
// import Sentiment from "sentiment";

const openaiApiKey = "sk-proj-RN01Cjr2anvpMxkHPvXKT3BlbkFJZ3N7XIAGRJU18GkWkhCO";
const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true 
});

// const sentiment = new Sentiment();

function genSysGptMessages(sysprompt) {
    /**
     * Construct GPT model request parameters `messages` for 'system'
     *
     * Parameters:
     *   sysprompt: Corresponding system prompt
     */
    return { role: "system", content: sysprompt };
  }

function genUserGptMessages(userprompt) {
    /**
     * Construct GPT model request parameters `messages` for 'user'
     *
     * Parameters:
     *   userprompt: Corresponding user prompt
     */
    return { role: "user", content: userprompt };
  }

function analyzeSentiment(text) {
    const result = sentiment.analyze(text);
    const sentimentScore = result.score;
    if (sentimentScore > 0) {
        return 'positive';
    } else if (sentimentScore < 0) {
        return 'negative';
    } else {
        return 'neutral';
    }
  }

function genSentimentAnalysisMessages(sentimentAnalysis) {
    console.log('sentimentAnalysis:', sentimentAnalysis);
    return { role: "system", content: `The sentiment of the following user prompt is ${sentimentAnalysis}.` };
  }


export async function getCompletion(sysprompt, userprompt, model = 'ft:gpt-3.5-turbo-0125:hull-ellis-concussion-and-research-clinic::9oY4Y4fM', temperature = 0) {
  /**
   * Get the result of the GPT model call
   *
   * Parameters:
   *   sysprompt: Corresponding system prompt
   *   userprompt: Corresponding user prompt
   *   model: ft:gpt-3.5-turbo-0125:hull-ellis-concussion-and-research-clinic::9oY4Y4fM
   *   temperature: Temperature coefficient (0~2) of the model output, controls the randomness of the output
   */
  try {
    // const sentimentAnalysis = analyzeSentiment(userprompt);
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        genSysGptMessages(sysprompt), 
        // genSentimentAnalysisMessages(sentimentAnalysis),
        genUserGptMessages(userprompt)],
      temperature: temperature,
    });

    if (response.choices.length > 0) {
      return response.choices[0].message.content;
    }
    return 'generate answer error';
  } catch (error) {
    console.error('Error generating completion:', error);
    return 'generate answer error';
  }
 }

// // Usage
// (async () => {
//     const systemPrompt = `Generate a detailed paragraph summarizing for the following information, including demographics, current injury details and previous injury history.The summary should be accurate, standardized, and suitable for medical evaluation.`;
//     const userPrompt = `What's your name?\nTammy Bailey.\nHow old are you?\n54 years old.\nWhat's your sex?\nFemale.\nWhat was the date of your injury?\nMay 15th.\nHow did your injury occur?\nI was injured after slipping on a wet floor in kitchen.\nWhat is the last thing you remember from before your injury?\nI was reaching for a glass of water.\nWhat is the first thing you remember from after your injury?\nI woke up on the floor.\nDid you lose consciousness?\nYes, I did.\nHow long were you unconscious for?\nAbout two minutes.\nWas your injury witnessed by anyone else?\nMy partner.\nDid you feel dazed or confused at the time of your injury?\nYes, I did.\nHow long did that feeling last?\nAbout 10 minutes.\nWas your injury witnessed by anyone else?\nMy partner.\nWhen your concussion occurred, did you have any other injuries to your body, not related to the head or neck area, for example, your knees or back?\nA sprained ankle and a bruised elbow.\nBefore this injury, had you ever been diagnosed with a concussion by a medical professional?\nNo I haven't.\nBefore this injury, had you ever injured your head or neck, but were not diagnosed with a concussion?\nNo I haven't.\nPlease describe any other medical conditions that you have been diagnosed or treated for.\nI have been diagnosed with hypertension and type 2 diabetes.\nAre you currently taking any medications or regular supplements?\nYes, I am.\nPlease list all the medications and supplements that you take.\nI take Metformin for diabetes, Lisinopril for hypertension, and a daily multivitamin.\nIf 100% is “normal” for you, how would you rate yourself out of 100 today?\nI would rate myself at 70%.\nPlease tell me what makes you feel less than 100% today.\nI am experiencing headaches, dizziness, and fatigue.\nWhat are your top 3 new symptoms since your injury? What has been bothering you the most? Please describe these symptoms to me.\nMy top 3 new symptoms are persistent headaches, difficulty concentrating, and frequent dizziness. The headaches have been bothering me the most as they are constant and sometimes very intense.\n`;
//     const completion = await getCompletion(systemPrompt, userPrompt, 'gpt-4o', 0);
//     console.log('GPT completion:', completion);
//   })();