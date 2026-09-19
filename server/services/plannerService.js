import { GoogleGenAI } from '@google/genai';
import { cosineSimilarity, createLocalEmbedding, videoSearchText } from './embeddingService.js';

export async function retrieve(query, videos) {
  if (!videos || !videos.length) return [];

  const stopWords = new Set(['a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'today', 'visit', 'plan', 'me', 'my', 'i', 'want']);
  const queryTerms = query
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((term) => !stopWords.has(term)) || [];

  const scored = videos.map((video) => {
    const title = (video.title || '').toLowerCase();
    const summary = (video.summary || '').toLowerCase();
    const transcript = (video.transcript || '').toLowerCase();
    const visual = (video.visualAnalysis || '').toLowerCase();
    const onScreen = (video.onScreenText || '').toLowerCase();
    const category = (video.category || '').toLowerCase();
    const subcategory = (video.subcategory || '').toLowerCase();
    const tags = (video.tags || []).map((t) => String(t).toLowerCase()).join(' ');
    const foods = (video.foods || []).map((f) => String(f).toLowerCase()).join(' ');
    const entities = (video.entities || []).map((e) => String(e.name || '').toLowerCase()).join(' ');
    const locations = (video.locations || []).map((l) => String(l).toLowerCase()).join(' ');

    const fullText = `${title} ${summary} ${transcript} ${visual} ${onScreen} ${category} ${subcategory} ${tags} ${foods} ${entities} ${locations}`;

    let score = 0;

    // 1. Keyword match scoring
    queryTerms.forEach((term) => {
      if (title.includes(term)) score += 6;
      if (category.includes(term) || subcategory.includes(term)) score += 4;
      if (foods.includes(term) || entities.includes(term)) score += 5;
      if (tags.includes(term)) score += 3;
      if (summary.includes(term)) score += 2;
      if (transcript.includes(term)) score += 2;
      if (visual.includes(term) || onScreen.includes(term)) score += 2;
    });

    // 2. Semantic query intent matching
    if (/food|eat|meal|dine|restaurant|spot|biryani|dosa|thali|traditional|snack|street/i.test(query)) {
      if (/Food|Recipes/.test(video.category)) score += 4;
      if (/traditional|authentic|street|local|restaurant|thali|leaf|curry|dosa|biryani|chaat|meal/i.test(fullText)) score += 4;
    }

    // 3. Dense vector similarity
    const queryEmbedding = createLocalEmbedding(query);
    const videoEmbedding = video.embedding?.length ? video.embedding : createLocalEmbedding(fullText);
    const vectorSimilarity = cosineSimilarity(queryEmbedding, videoEmbedding);
    score += vectorSimilarity * 4;

    return { ...video, relevance: score };
  });

  const matched = scored
    .sort((a, b) => b.relevance - a.relevance)
    .filter((video) => video.relevance > 0.2);

  // Return top matching videos (up to 4)
  return (matched.length ? matched : scored.sort((a, b) => b.relevance - a.relevance)).slice(0, 4);
}

function buildFallbackPlan(query, sources) {
  if (!sources.length) {
    return {
      title: 'Your plan is waiting for saved ideas',
      message: "I couldn't find anything relevant in your saved Reels yet. Try saving a few videos related to this request.",
      steps: [],
      sources: []
    };
  }

  const timeSlots = ['1:00 PM', '5:30 PM', '7:30 PM', '9:00 PM'];
  const steps = sources.map((item, index) => ({
    time: timeSlots[index % timeSlots.length],
    activity: item.activities?.[0] || item.subcategory || item.category,
    place: item.entities?.[0]?.name || item.locations?.[0] || item.title,
    reason: `From your saved “${item.title}” — ${item.summary}`,
    videoId: item._id
  }));

  return {
    title: /evening|tonight|dinner|food|traditional/i.test(query) ? 'Your Food & Dining Itinerary' : 'Your Personal Plan',
    message: `Built from your ${sources.length} saved video memories — customized for your request.`,
    steps,
    sources: sources.map((item) => item._id)
  };
}

export async function buildPlan(query, sources) {

  if (!sources.length) {
    return buildFallbackPlan(query, sources);
  }

  if (!process.env.GEMINI_API_KEY) {
    return buildFallbackPlan(query, sources);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const memoryContext = sources
      .map(
        (v, i) => `[Memory #${i + 1} - ID: ${v._id}]
Title: ${v.title}
Category: ${v.category} (${v.subcategory || 'General'})
Summary: ${v.summary}
Transcript: ${v.transcript || 'None'}
Visual Analysis: ${v.visualAnalysis || 'None'}
Entities: ${(v.entities || []).map((e) => e.name).join(', ')}
Locations: ${(v.locations || []).join(', ')}
Foods/Items: ${(v.foods || []).concat(v.products || []).join(', ')}
Actionable Ideas: ${(v.actionableIdeas || []).join('; ')}`
      )
      .join('\n\n');

    const promptText = `You are ReelToReal's intelligent plan builder.
The user wants to plan: "${query}".

Here are the user's saved video memories retrieved by semantic search:
${memoryContext}

Using ONLY these retrieved video memories, create a clear, realistic, step-by-step personalized plan.
Return strictly valid JSON with this exact schema:
{
  "title": "Engaging, creative title for the plan",
  "message": "1-2 sentence overview explaining how saved memories fulfill the request",
  "steps": [
    {
      "time": "Suggested time (e.g. 7:00 PM)",
      "activity": "Specific activity or dish to try",
      "place": "Venue or entity name from the memory",
      "reason": "Detailed explanation grounded in the video transcript or visual analysis",
      "videoId": "Exact _id string of the memory used"
    }
  ],
  "sources": ["Array of all used video _id strings"]
}`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const fallbackModels = [modelName, 'gemini-3.6-flash', 'gemini-2.5-flash'].filter((v, i, a) => a.indexOf(v) === i);

    for (const model of fallbackModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          config: { responseMimeType: 'application/json', temperature: 0.3 }
        });
        const parsed = JSON.parse(response.text || '{}');
        if (parsed?.title && Array.isArray(parsed?.steps)) {
          return {
            title: String(parsed.title),
            message: String(parsed.message || 'Built from your saved memories.'),
            steps: parsed.steps.map((s) => ({
              time: String(s.time || 'Flex time'),
              activity: String(s.activity || 'Activity'),
              place: String(s.place || 'Location'),
              reason: String(s.reason || 'Based on your saved Reel.'),
              videoId: String(s.videoId || sources[0]._id)
            })),
            sources: Array.isArray(parsed.sources) ? parsed.sources.map(String) : sources.map((s) => s._id)
          };
        }
      } catch (e) {
        console.warn(`Gemini RAG model ${model} failed, trying next: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('Gemini RAG planning error:', err);
  }

  return buildFallbackPlan(query, sources);
}

export async function chatWithPlanner({ messages, query, videos }) {
  const lastUserMessage = query || messages?.filter((m) => m.role === 'user').slice(-1)[0]?.content || 'Hello';
  const fullConversationHistory = (messages || [])
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const retrievedSources = await retrieve(`${lastUserMessage} ${fullConversationHistory}`, videos);

  if (!process.env.GEMINI_API_KEY) {
    const fallback = buildFallbackPlan(lastUserMessage, retrievedSources);
    return {
      reply: 'Here is a plan built from your saved reel memories!',
      isClarifying: false,
      plan: fallback,
      sourceMemories: retrievedSources
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const memoryContext = retrievedSources
      .map(
        (v, i) => `[Memory #${i + 1} - ID: ${v._id}]
Title: ${v.title}
Category: ${v.category} (${v.subcategory || 'General'})
Summary: ${v.summary}
Transcript: ${v.transcript || 'None'}
Visual Analysis: ${v.visualAnalysis || 'None'}
On-Screen Text/Menu: ${v.onScreenText || 'None'}
Entities: ${(v.entities || []).map((e) => e.name).join(', ')}
Locations: ${(v.locations || []).join(', ')}
Foods/Items: ${(v.foods || []).concat(v.products || []).join(', ')}
Estimated Price: ${v.price || 'N/A'}
Actionable Ideas: ${(v.actionableIdeas || []).join('; ')}`
      )
      .join('\n\n');

    const promptText = `You are ReelToReal's AI Planning Agent — a friendly, highly intelligent assistant that creates perfect step-by-step plans using ONLY the user's saved video memories from their database.

Conversation History:
${fullConversationHistory || 'User just started the conversation.'}

Latest User Request: "${lastUserMessage}"

Available Retrieved Video Memories from User Database:
${memoryContext || 'No matching memories found.'}

INSTRUCTIONS:
1. EVALUATE CLARITY & SPECIFICITY:
   - Is the user's request underspecified, vague, or missing essential details needed to build a precise plan? (For example: just saying "plan a trip" without city/duration, or "what to eat" without meal time/dietary preference/location).
   - IF UNDERSPECIFIED: Set "isClarifying": true. Write a warm, helpful conversational "reply" asking 1-2 specific clarifying questions to gather the missing details before finalizing the plan. Set "plan": null.
2. IF THE REQUEST IS CLEAR (or the user has answered your questions):
   - Set "isClarifying": false.
   - Write a friendly, encouraging conversational "reply" summarizing the plan.
   - Build a highly accurate, structured "plan" object using the retrieved video memories.
   - Each step in the plan MUST reference specific dishes, venues, or activities from the memories.

Return strictly valid JSON adhering to this schema:
{
  "reply": "Warm conversational response or 1-2 clarifying questions",
  "isClarifying": boolean,
  "plan": null OR {
    "title": "Creative, clear title for the plan",
    "message": "1-2 sentence overview of the plan",
    "steps": [
      {
        "time": "Suggested time (e.g. 7:30 PM)",
        "activity": "Specific dish, workout, or activity",
        "place": "Venue or entity name from the memory",
        "reason": "Detailed rationale referencing video transcript, menu prices, or visual details",
        "videoId": "Exact _id string of the video memory used"
      }
    ],
    "sources": ["Array of used video _id strings"]
  }
}`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const fallbackModels = [modelName, 'gemini-3.6-flash', 'gemini-2.5-flash'].filter((v, i, a) => a.indexOf(v) === i);

    for (const model of fallbackModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          config: { responseMimeType: 'application/json', temperature: 0.3 }
        });
        const parsed = JSON.parse(response.text || '{}');
        if (parsed?.reply) {
          return {
            reply: String(parsed.reply),
            isClarifying: Boolean(parsed.isClarifying),
            plan: parsed.plan && Array.isArray(parsed.plan.steps) && parsed.plan.steps.length ? {
              title: String(parsed.plan.title || 'Personalized Plan'),
              message: String(parsed.plan.message || 'Built from your saved memories.'),
              steps: parsed.plan.steps.map((s) => ({
                time: String(s.time || 'Flex time'),
                activity: String(s.activity || 'Activity'),
                place: String(s.place || 'Location'),
                reason: String(s.reason || 'Based on your saved Reel.'),
                videoId: String(s.videoId || (retrievedSources[0]?._id || ''))
              })),
              sources: Array.isArray(parsed.plan.sources) ? parsed.plan.sources.map(String) : retrievedSources.map((s) => s._id)
            } : null,
            sourceMemories: retrievedSources
          };
        }
      } catch (e) {
        console.warn(`Gemini Chat model ${model} failed, trying next: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('Gemini Chat planning error:', err);
  }

  const fallback = buildFallbackPlan(lastUserMessage, retrievedSources);
  return {
    reply: 'Here is a custom plan generated from your saved video memories!',
    isClarifying: false,
    plan: fallback,
    sourceMemories: retrievedSources
  };
}

