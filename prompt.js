import OpenAI from "openai";

const openaiApiKey = "sk-proj-RN01Cjr2anvpMxkHPvXKT3BlbkFJZ3N7XIAGRJU18GkWkhCO";
const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true 
});


function genSysGptMessages(sysprompt) {
    /**
     * Construct GPT model request parameters `messages` for 'system'
     *
     * Parameters:
     *   prompt: Corresponding system prompt
     */
    return { role: "system", content: sysprompt };
  }

function genUserGptMessages(userprompt) {
    /**
     * Construct GPT model request parameters `messages` for 'user'
     *
     * Parameters:
     *   prompt: Corresponding user prompt
     */
    return { role: "user", content: userprompt };
}

export async function getCompletion(sysprompt, userprompt, model = 'ft:gpt-3.5-turbo-0125:hull-ellis-concussion-and-research-clinic::9ld3alEW', temperature = 0) {
  /**
   * Get the result of the GPT model call
   *
   * Parameters:
   *   sysprompt: Corresponding system prompt
   *   userprompt: Corresponding user prompt
   *   model: ft:gpt-3.5-turbo-0125:hull-ellis-concussion-and-research-clinic::9hkmPCih
   *   temperature: Temperature coefficient (0~2) of the model output, controls the randomness of the output
   */
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [genSysGptMessages(sysprompt), genUserGptMessages(userprompt)],
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
//     const userPrompt = `What's your name?\nRita Fan\nHow old are you?\n36\nWhat's your sex?\nFemale\nWhat was the date of your injury?\nJune 28th\nHow did your injury occur?\nI was tripping over a curb while jogging\nWhat is the last thing you remember from before your injury?\nI remembered the whole incident\nWhat is the first thing you remember from after your injury?\nI remembered the whole incident\nDid you lose consciousness?\nMy friend who was jogging with me reported I did not lose consciousness\nDid you feel dazed or confused at the time of your injury?\nYes, I felt disoriented\nHow long did that feeling last?\nAbout 20 minutes\nWas your injury witnessed by anyone else?\nMy friend\nAt the time of your most recent head injury or concussion, did you have any other injuries to your body (not related to the head or neck area)?\nA bruised hip and scraped palms\nHave you ever been diagnosed with a concussion before by a medical professional?\nYes\nHow many times?\n1\nWhen was the most recent concussion before this injury?\nEight years ago\nHow long did it take you to recover from your previous concussions?\nAbout two months\nPrior to the present injury, have you ever injured your head or neck, but were not diagnosed with a concussion?\nYes\nHow many times?\n1\nWhen was the most recent injury?\nA head injury as a child when I fell off a playground\nHow long did it take you to recover from that injury?\nI don't remember\n`;
//     const completion = await getCompletion(systemPrompt, userPrompt, 'gpt-4o', 0);
//     console.log('GPT completion:', completion);
//   })();