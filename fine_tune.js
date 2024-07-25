import OpenAI from "openai";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const openai = new OpenAI({
  apiKey: "sk-proj-RN01Cjr2anvpMxkHPvXKT3BlbkFJZ3N7XIAGRJU18GkWkhCO",
});

async function uploadTrainFile() {
    try {
        const response = await openai.files.create({
            file: fs.createReadStream("training_data.jsonl"),
            purpose: "fine-tune"
        });

        return response.id;
    } catch (error) {
        console.error("Error uploading file:", error);
        return null;
    }
}

async function createFineTuneJob(fileId) {
    try {
        const fineTune = await openai.fineTuning.jobs.create({
            training_file: fileId,
            model: "gpt-3.5-turbo"
        });

        return fineTune;
    } catch (error) {
        console.error("Error creating fine-tune job:", error);
    }
}

async function checkFineTuneJobStatus(jobId) {
  try {
      const fineTuneJob = await openai.fineTuning.jobs.retrieve(jobId);
      console.log("Fine-tune job status:", fineTuneJob.status);
      if (fineTuneJob.status === 'succeeded') {
          console.log("Fine-tuning completed successfully.");
          console.log("Fine-tuned model:", fineTuneJob.fine_tuned_model);
      } else if (fineTuneJob.status === 'failed') {
          console.log("Fine-tuning job failed. Error:", fineTuneJob.error);
      } else {
          console.log("Fine-tuning job still in progress.");
          console.log("Estimated finish time:", fineTuneJob.estimated_finish);
      }
  } catch (error) {
      console.error("Error retrieving fine-tune job status:", error);
  }
}

(async () => {
  const fileId = await uploadTrainFile();
  if (fileId) {
      console.log("File uploaded successfully. File ID:", fileId);
      const fineTuneJob = await createFineTuneJob(fileId);
      console.log("Fine-tune job created:", fineTuneJob);
      if (fineTuneJob && fineTuneJob.id) {
          checkFineTuneJobStatus(fineTuneJob.id);
      }
  }
})();