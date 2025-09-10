import type { Message, ApiProvider, AllSettings, MessagePart } from './types';

// This line ensures MessagePart is considered 'used' by TypeScript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ensureMessagePartUsed: MessagePart | undefined = undefined;


// Helper to transform messages for Gemini API
const transformMessagesForGemini = (messages: Message[]) => {
  return messages.map(msg => {
    if (typeof msg.content === 'string') {
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      };
    } else { // Multi-modal content
      const parts = msg.content.map(part => {
        if (part.type === 'text') {
          return { text: part.text };
        } else if (part.type === 'image') {
          return {
            inline_data: {
              mime_type: part.mimeType,
              data: part.data,
            },
          };
        }
        return {}; // Should not happen
      });
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts,
      };
    }
  });
};

// Helper to transform messages for OpenAI/Cerebras Vision API
const transformMessagesForOpenAIVision = (messages: Message[]) => {
  return messages.map(msg => {
    if (typeof msg.content === 'string') {
      return {
        role: msg.role,
        content: msg.content,
      };
    } else { // Multi-modal content
      const content = msg.content.map(part => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text };
        } else if (part.type === 'image') {
          return {
            type: 'image_url',
            image_url: {
              url: `data:${part.mimeType};base64,${part.data}`,
            },
          };
        }
        return {}; // Should not happen
      });
      return {
        role: msg.role,
        content: content,
      };
    }
  });
};

export const sendMessage = async (provider: ApiProvider, messages: Message[]): Promise<string> => {
  const { apiSettings } = await chrome.storage.sync.get('apiSettings') as { apiSettings?: AllSettings };

  if (!apiSettings || !apiSettings[provider] || !apiSettings[provider].apiKey) {
    throw new Error(`API Key for ${provider} is not configured.`);
  }

  const config = apiSettings[provider];
  let response;

  try {
    switch (provider) {
      case 'openai':
      case 'cerebras':
        const openAICompatibleUrl = (config.baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
        const openAIMessages = transformMessagesForOpenAIVision(messages);

        response = await fetch(openAICompatibleUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: openAIMessages,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.error.message}`);
        }

        const openAIData = await response.json();
        // OpenAI Vision API might return content as an array of parts
        const firstChoice = openAIData.choices[0];
        if (firstChoice.message.content) {
          return firstChoice.message.content;
        } else if (firstChoice.message.parts && firstChoice.message.parts.length > 0) {
          // Handle cases where content is an array of parts (e.g., for vision models)
          return firstChoice.message.parts.map((part: any) => part.text || '').join(' ');
        }
        return '';

      case 'gemini':
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
        const geminiContents = transformMessagesForGemini(messages);

        response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contents: geminiContents }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.error.message}`);
        }

        const geminiData = await response.json();
        return geminiData.candidates[0].content.parts[0].text;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    if (error instanceof Error) {
        throw new Error(error.message);
    } else {
        throw new Error('An unknown error occurred during the API request.');
    }
  }
};
