import { Configuration, OpenAIApi } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize OpenAI with API Key
const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openaiConfig);

// Initialize Google Gemini with API Key
const googleGenerativeAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const geminiModel = googleGenerativeAI.getGenerativeModel({
  model: "gemini-1.0-pro",
  generationConfig: { maxOutputTokens: 2048 },
});

interface OutputFormat {
  [key: string]: string | string[] | OutputFormat;
}

export async function getAIResponse(
  systemPrompt: string,
  userPrompt: string | string[],
  outputFormat: OutputFormat,
  model: string = "gpt-3.5-turbo",
  temperature: number = 1,
  numTries: number = 3,
  verbose: boolean = false
) {
  const isListInput = Array.isArray(userPrompt);
  const dynamicElements = /<.*?>/.test(JSON.stringify(outputFormat));
  const listOutput = /\[.*?\]/.test(JSON.stringify(outputFormat));

  let errorMsg = "";

  for (let attempt = 0; attempt < numTries; attempt++) {
    let outputFormatPrompt = `\nYou are to output ${
      listOutput ? "an array of objects in" : "the"
    } the following JSON format: ${JSON.stringify(outputFormat)}.`;

    if (listOutput) {
      outputFormatPrompt += `\nIf output field is a list, classify output into the best element of the list.`;
    }

    if (dynamicElements) {
      outputFormatPrompt += `\nAny text enclosed by < and > indicates you must generate content to replace it. Example input: "Go to <location>", Example output: "Go to the garden"`;
    }

    if (isListInput) {
      outputFormatPrompt += `\nGenerate an array of JSON, one JSON for each input element.`;
    }

    try {
      // OpenAI request
      const openaiResponse = await openai.createChatCompletion({
        model: model,
        temperature: temperature,
        messages: [
          { role: "system", content: systemPrompt + outputFormatPrompt + errorMsg },
          { role: "user", content: userPrompt.toString() },
        ],
      });

      const openaiResult = openaiResponse.data.choices[0].message?.content?.replace(/'/g, '"') ?? "";

      if (verbose) {
        console.log("OpenAI response:", openaiResult);
      }

      // Gemini request
      const geminiResponse = await geminiModel.generateContent(
        systemPrompt + outputFormatPrompt + errorMsg + "\n" + userPrompt.toString()
      );
      const geminiResult = geminiResponse.response.text.toString();

      if (verbose) {
        console.log("Gemini response:", geminiResult);
      }

      // Process OpenAI response
      let result: string = openaiResult;
      result = result.replace(/(\w)"(\w)/g, "$1'$2"); // Corrects apostrophes

      // Try-catch block to handle potential format issues
      let output: any = JSON.parse(result);

      if (isListInput) {
        if (!Array.isArray(output)) {
          throw new Error("Output format is not an array of JSON.");
        }
      } else {
        output = [output];
      }

      // Check output format
      output.forEach((item: any, index: number) => {
        for (const key in outputFormat) {
          if (/<.*?>/.test(key)) continue; // Skip dynamic elements
          if (!(key in item)) {
            throw new Error(`${key} not found in JSON output at index ${index}`);
          }

          if (Array.isArray(outputFormat[key])) {
            const choices = outputFormat[key] as string[];
            if (Array.isArray(item[key])) {
              item[key] = item[key][0];
            }

            if (!choices.includes(item[key])) {
              item[key] = choices[0]; // Default category if value is unknown
            }
          }
        }
      });

      return isListInput ? output : output[0];
    } catch (e) {
      errorMsg = `Error in attempt ${attempt + 1}: ${e.message}`;
      console.error("Error during API request:", e);
      console.log("Response:", errorMsg);
    }
  }

  return [];
}
