// import {Server, Socket} from "socket.io";
// import db from "../models";
// // import {OpenAI} from "openai"; // Not needed
// import {Pinecone} from "@pinecone-database/pinecone";
// import {FeatureExtractionPipeline, pipeline} from "@xenova/transformers";
// import Groq from "groq-sdk";
// import {QueryTypes} from "sequelize";
// import {TranslateService} from "../services/translate"; // Import QueryTypes
//
// type AgentPresence = {
//     userId: number;
//     socketId: string;
// }
//
// const groq = new Groq({apiKey: process.env.OPENAI_API_KEY}); // Using your Groq key
// const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY!});
//
// let embedder: FeatureExtractionPipeline | null = null;
// let dbSchemaCache: string | null = null; // Cache the schema
//
// /**
//  * Tool 1: Searches Pinecone for general information.
//  */
// async function getContext(query: string) {
//     try {
//         if (!embedder) {
//             console.log("Initializing local embedding model for server...");
//             embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as FeatureExtractionPipeline;
//             console.log("Embedding model loaded.");
//         }
//         const result = await embedder(query, {pooling: 'mean', normalize: true});
//         const queryEmbedding: number[] = Array.from(result.data as number[]);
//         const index = pinecone.index(process.env.PINECONE_INDEX!);
//         const searchRes = await index.query({
//             vector: queryEmbedding,
//             topK: 3,
//             includeMetadata: true
//         });
//         const contextText = searchRes.matches
//             .map((match: any) => match.metadata?.text)
//             .join("\n\n");
//         return contextText || "No general information found.";
//     } catch (error) {
//         console.error("Pinecone Error:", error);
//         return "Error searching for general information";
//     }
// }
//
// /**
//  * Helper: Gets the database schema (with caching)
//  */
// async function getDatabaseSchema() {
//     // Return from cache if we already have it
//     if (dbSchemaCache) {
//         return dbSchemaCache;
//     }
//     try {
//         const queryInterface = db.sequelize.getQueryInterface();
//         let schemaString = "";
//
//         // --- DEFINE YOUR TABLES HERE ---
//         // Add all tables you want the AI to be able to query
//         const tablesToDescribe = ['vehicles', 'spare_parts']; // <<-- CHECK YOUR TABLE NAMES
//
//         for (const tableName of tablesToDescribe) {
//             try {
//                 const tableSchema = await queryInterface.describeTable(tableName);
//                 schemaString += `Table: ${tableName}\nColumns:\n`;
//                 for (const [column, attributes] of Object.entries(tableSchema)) {
//                     schemaString += `  - ${column} (${(attributes as any).type})\n`;
//                 }
//                 schemaString += "\n"; // Add a space between tables
//             } catch (tableError) {
//                 console.warn(`Could not describe table ${tableName}. Skipping.`);
//             }
//         }
//
//         dbSchemaCache = schemaString; // Cache the result
//         return dbSchemaCache;
//
//     } catch (error) {
//         console.error("Error getting schema:", error);
//         return "Error: Could not retrieve DB schema.";
//     }
// }
//
// /**
//  * Tool 2: The new Text-to-SQL "Agent"
//  */
// async function answer_database_question(question: string) {
//     try {
//         // --- Step 2a: Get Schema ---
//         const schema = await getDatabaseSchema();
//         if (schema.startsWith("Error:")) return schema;
//
//         // --- Step 2b (AI Pass 1): Generate SQL Query ---
//         const sqlGenPrompt = `
//             You are a MySQL expert. Your only job is to write a single, read-only SELECT query to answer the user's question, given the database schema.
//             Only return the SQL query. Do not add any other text, explanation, or markdown.
//
//             IMPORTANT RULES:
//             - The schema provided is 100% accurate. Table and column names are case-sensitive. Use them *exactly* as they are written in the schema.
//             - Always add a 'LIMIT 10' to your queries unless the user asks for a specific count (e.g., "how many").
//             - Be sure to query the correct table based on the user's question (e.g., 'vehicles' for cars, 'spare_parts' for parts).
//
//             Schema:
//             ${schema}
//
//             User Question:
//             ${question}
//
//             SQL Query:
//             `;
//
//         const sqlResponse = await groq.chat.completions.create({
//             model: "llama-3.1-8b-instant",
//             messages: [{role: "user", content: sqlGenPrompt}],
//             temperature: 0.0
//         });
//
//         let sqlQuery = sqlResponse.choices[0].message.content || "";
//         console.log("---------- Generated SQL Query: ", sqlQuery);
//         sqlQuery = sqlQuery.replace(/```sql|```/g, "").trim();
//
//         const sensitiveTables = ['users'];
//         const queryLower = sqlQuery.toLowerCase();
//         for (const table of sensitiveTables) {
//             if (queryLower.includes(table)) {
//                 console.warn(`Blocked sensitive query: ${sqlQuery}`);
//                 return "I'm sorry, I can only provide information about vehicles and spare parts.";
//             }
//         }
//
//         if (!sqlQuery.toUpperCase().startsWith("SELECT")) {
//             console.warn(`Blocked non-SELECT query: ${sqlQuery}`);
//             return "I can only perform read-only operations on the vehicle database.";
//         }
//
//         // --- Step 2c: Run Query ---
//         // Use query to get all results, not just one
//         const queryResult = await db.sequelize.query(sqlQuery, {type: QueryTypes.SELECT});
//         const resultString = JSON.stringify(queryResult); // This will be an array
//
//         // --- Step 2d (AI Pass 2): Summarize Results ---
//         const summaryPrompt = `
//             You are 'Indra Assistant', a friendly and helpful support agent.
//             A user asked a question, a SQL query was run, and here is the result from the database (in JSON format).
//
//             Your job is to answer the user's original question in natural, friendly language based *only* on this result.
//
//             FORMATTING RULES:
//             - Use markdown (like **bold**) to highlight key items (e.g., vehicle names, part names, prices).
//             - If there are multiple items in the JSON, present them as a bulleted list ('* item 1').
//             - If the JSON result is an empty array '[]', politely tell the user you couldn't find any items matching their criteria.
//             - Do not mention the SQL query or JSON. Just give the answer.
//
//             User Question:
//             ${question}
//
//             Database Result (JSON):
//             ${resultString}
//
//             Your Friendly, Markdown-Formatted Answer:
//             `;
//
//         const summaryResponse = await groq.chat.completions.create({
//             model: "llama-3.1-8b-instant",
//             messages: [{role: "user", content: summaryPrompt}]
//         });
//
//         return summaryResponse.choices[0].message.content || "I found the data but had trouble explaining it.";
//
//     } catch (error) {
//         console.error("Text-to-SQL Error:", error);
//         return "An error occurred while checking the vehicle database. Please ask your question again.";
//     }
// }
//
//
// // --- The New Tool Definitions ---
// const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
//     {
//         type: "function",
//         function: {
//             name: "answer_database_question",
//             description: "Use this tool for any questions about vehicle inventory, spare parts, stock, pricing, makes, models, or specific cars.",
//             parameters: {
//                 type: "object",
//                 properties: {
//                     question: {
//                         type: "string",
//                         description: "The user's full, natural language question about vehicles or parts."
//                     },
//                 },
//                 required: ["question"],
//             },
//         }
//     },
//     {
//         type: "function",
//         function: {
//             name: "get_general_information",
//             description: "Use this tool for general questions about Indra Traders, such as services, branch locations, contact numbers, and opening hours.",
//             parameters: {
//                 type: "object",
//                 properties: {
//                     query: {type: "string", description: "The user's question about general topics."},
//                 },
//                 required: ["query"],
//             },
//         },
//     },
// ]
//
// const onlineAgents = new Map<number, AgentPresence>();
// const chatRoom = (chatId: string) => `chat:${chatId}`;
//
// // ... (markUserOnline, markUserOffline functions) ...
// const markUserOnline = async (userId: number, socketId: string) => {
//     onlineAgents.set(userId, {userId, socketId});
// }
// const markUserOffline = async (userId: number) => {
//     onlineAgents.delete(userId);
// }
//
//
// export async function processBotMessage(chat_id: string, englishText: string) {
//     try {
//         const history = await db.ChatMessage.findAll({
//             where: {chat_id},
//             order: [["createdAt", "DESC"]],
//             limit: 4
//         });
//
//         const messagesForAI: Groq.Chat.Completions.ChatCompletionMessageParam[] = history
//             .map(msg => {
//                 if (msg.sender === 'customer') {
//                     return {role: 'user' as const, content: msg.message};
//                 } else {
//                     return {role: 'assistant' as const, content: msg.message};
//                 }
//             })
//             .reverse();
//
//         const systemPrompt = `
//                     You are 'Indra Assistant', a friendly and helpful AI support agent for Indra Traders.
//                     Your job is to have a natural, helpful conversation.
//
//                     - If the user asks about vehicles, parts, stock, or pricing, use the 'answer_database_question' tool.
//                     - If the user asks about services, hours, or contact info, use the 'get_general_information' tool.
//                     - Reply in English. The system will handle translation.
//                     - If the user just says "hi" or makes small talk, **just have a normal, friendly conversation.** - **Do not** mention your tools or functions.
//                     `
//
//         // --- AI Pass 1: Tool Router ---
//         const toolCheckResponse = await groq.chat.completions.create({
//             model: "llama-3.1-8b-instant",
//             messages: [
//                 {role: "system", content: systemPrompt},
//                 ...messagesForAI, // Then pass the history
//                 {role: "user", content: englishText}
//             ],
//             tools: tools,
//             tool_choice: "auto",
//         });
//
//         const responseMessage = toolCheckResponse.choices[0].message;
//         const toolCalls = responseMessage.tool_calls;
//         let finalBotResponse = "";
//
//         if (toolCalls) {
//             // AI wants to use a tool
//             const toolCall = toolCalls[0];
//             const functionName = toolCall.function.name;
//             const functionsArgs = JSON.parse(toolCall.function.arguments);
//
//             // --- Run the correct tool ---
//             if (functionName === 'answer_database_question') {
//                 finalBotResponse = await answer_database_question(functionsArgs.question);
//             } else if (functionName === 'get_general_information') {
//                 // finalBotResponse = await getContext(functionsArgs.query);
//                 // // This tool just returns a string, but it's not a full AI answer.
//                 // // We should feed it back to the AI for a natural response.
//                 // const summaryResponse = await groq.chat.completions.create({
//                 //     model: "llama-3.3-70b-versatile",
//                 //     messages: [
//                 //         { role: "system", content: "You are Indra Assistant. Answer the user's question using the context provided. Be friendly and use markdown."},
//                 //         messagesForAI[messagesForAI.length - 1], // The user's last question
//                 //         { role: "assistant", content: `I found this information: ${finalBotResponse}` }
//                 //     ]
//                 // });
//                 // finalBotResponse = summaryResponse.choices[0].message.content || "I found some information but had trouble processing it.";
//
//                 const pineconeContext = await getContext(functionsArgs.query);
//
//                 if (!pineconeContext || pineconeContext === "No general information found." || pineconeContext === "Error searching for general information") {
//                     finalBotResponse = "I'm sorry, I couldn't find any information about that. You can click **Talk to a Live Agent** for more help.";
//                 } else {
//                     // --- AI Pass 2 (Summarization) ---
//                     // This is the corrected prompt structure
//                     const summaryResponse = await groq.chat.completions.create({
//                         model: "llama-3.1-8b-instant",
//                         messages: [
//                             {
//                                 role: "system",
//                                 content: `
//                                                 You are 'Indra Assistant', a friendly and helpful AI support agent.
//                                                 Answer the user's question in a natural, friendly way using ONLY the information from the 'CONTEXT' provided below.
//                                                 Use simple markdown formatting.
//
//                                                 CONTEXT:
//                                                 ${pineconeContext}
//                                             `
//                             },
//                             {role: "user", content: englishText},
//                             messagesForAI[messagesForAI.length - 1] // The user's last question
//                         ]
//                     });
//                     finalBotResponse = summaryResponse.choices[0].message.content || "I found the information but had trouble summarizing it.";
//                 }
//             }
//         } else {
//             // No tool was called. The AI is just "chatting".
//             finalBotResponse = responseMessage.content || "Sorry, I'm not sure how to help with that.";
//         }
//
//         return finalBotResponse;
//     } catch (error: any) {
//         console.error("AI Error: ", error);
//         let fallbackMessage = "I'm sorry, I'm experiencing technical difficulties at the moment. Please try again, or click 'Talk to a Live Agent' for immediate assistance.";
//         if (error.code === 'insufficient_quota') {
//             fallbackMessage = "I'm sorry, our AI system is currently at capacity. Please try again in a few moments or request a live agent.";
//         }
//         return fallbackMessage;
//     }
// }
//
//
// export default function initSocket(io: Server) {
//     io.on("connection", (socket: Socket) => {
//         const {role, chat_id, user_id} = socket.handshake.query as any;
//
//         if (chat_id) socket.join(chatRoom(String(chat_id)));
//
//         if (role === "agent" && user_id) {
//             const uid = Number(user_id);
//             markUserOnline(uid, socket.id);
//             socket.join(`agent:${uid}`);
//             io.to(socket.id).emit("agent.online", {user_id: uid});
//             console.log(`Agent ${uid} connected`);
//         }
//
//         socket.on("message.customer", async ({chat_id, text}: { chat_id: string, text: string }) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session) return;
//
//             const customerMsg = await db.ChatMessage.create({
//                 chat_id, sender: "customer", message: text, viewed_by_agent: "no"
//             });
//             io.to(chatRoom(chat_id)).emit("message.new", customerMsg);
//
//             if (session.status === "bot") {
//                 try {
//                     io.to(chatRoom(chat_id)).emit("typing", {by: 'bot'});
//
//                     // const history = await db.ChatMessage.findAll({
//                     //     where: {chat_id},
//                     //     order: [["createdAt", "DESC"]],
//                     //     limit: 4
//                     // });
//                     //
//                     // const messagesForAI: Groq.Chat.Completions.ChatCompletionMessageParam[] = history
//                     //     .map(msg => {
//                     //         if (msg.sender === 'customer') {
//                     //             return {role: 'user' as const, content: msg.message};
//                     //         } else {
//                     //             return {role: 'assistant' as const, content: msg.message};
//                     //         }
//                     //     })
//                     //     .reverse();
//                     //
//                     // const systemPrompt = `
//                     // You are 'Indra Assistant', a friendly and helpful AI support agent for Indra Traders.
//                     // Your job is to have a natural, helpful conversation.
//                     //
//                     // - If the user asks about vehicles, parts, stock, or pricing, use the 'answer_database_question' tool.
//                     // - If the user asks about services, hours, or contact info, use the 'get_general_information' tool.
//                     // - If the user just says "hi" or makes small talk, **just have a normal, friendly conversation.** - **Do not** mention your tools or functions.
//                     // `
//                     //
//                     // // --- AI Pass 1: Tool Router ---
//                     // const toolCheckResponse = await groq.chat.completions.create({
//                     //     model: "llama-3.1-8b-instant",
//                     //     messages: [
//                     //         {role: "system", content: systemPrompt},
//                     //         ...messagesForAI // Then pass the history
//                     //     ],
//                     //     tools: tools,
//                     //     tool_choice: "auto",
//                     // });
//                     //
//                     // const responseMessage = toolCheckResponse.choices[0].message;
//                     // const toolCalls = responseMessage.tool_calls;
//                     // let finalBotResponse = "";
//                     //
//                     // if (toolCalls) {
//                     //     // AI wants to use a tool
//                     //     const toolCall = toolCalls[0];
//                     //     const functionName = toolCall.function.name;
//                     //     const functionsArgs = JSON.parse(toolCall.function.arguments);
//                     //
//                     //     // --- Run the correct tool ---
//                     //     if (functionName === 'answer_database_question') {
//                     //         finalBotResponse = await answer_database_question(functionsArgs.question);
//                     //     } else if (functionName === 'get_general_information') {
//                     //         // finalBotResponse = await getContext(functionsArgs.query);
//                     //         // // This tool just returns a string, but it's not a full AI answer.
//                     //         // // We should feed it back to the AI for a natural response.
//                     //         // const summaryResponse = await groq.chat.completions.create({
//                     //         //     model: "llama-3.3-70b-versatile",
//                     //         //     messages: [
//                     //         //         { role: "system", content: "You are Indra Assistant. Answer the user's question using the context provided. Be friendly and use markdown."},
//                     //         //         messagesForAI[messagesForAI.length - 1], // The user's last question
//                     //         //         { role: "assistant", content: `I found this information: ${finalBotResponse}` }
//                     //         //     ]
//                     //         // });
//                     //         // finalBotResponse = summaryResponse.choices[0].message.content || "I found some information but had trouble processing it.";
//                     //
//                     //         const pineconeContext = await getContext(functionsArgs.query);
//                     //
//                     //         if (!pineconeContext || pineconeContext === "No general information found." || pineconeContext === "Error searching for general information") {
//                     //             finalBotResponse = "I'm sorry, I couldn't find any information about that. You can click **Talk to a Live Agent** for more help.";
//                     //         } else {
//                     //             // --- AI Pass 2 (Summarization) ---
//                     //             // This is the corrected prompt structure
//                     //             const summaryResponse = await groq.chat.completions.create({
//                     //                 model: "llama-3.1-8b-instant",
//                     //                 messages: [
//                     //                     {
//                     //                         role: "system",
//                     //                         content: `
//                     //                             You are 'Indra Assistant', a friendly and helpful AI support agent.
//                     //                             Answer the user's question in a natural, friendly way using ONLY the information from the 'CONTEXT' provided below.
//                     //                             Use simple markdown formatting.
//                     //
//                     //                             CONTEXT:
//                     //                             ${pineconeContext}
//                     //                         `
//                     //                     },
//                     //                     messagesForAI[messagesForAI.length - 1] // The user's last question
//                     //                 ]
//                     //             });
//                     //             finalBotResponse = summaryResponse.choices[0].message.content || "I found the information but had trouble summarizing it.";
//                     //         }
//                     //     }
//                     // } else {
//                     //     // No tool was called. The AI is just "chatting".
//                     //     finalBotResponse = responseMessage.content || "Sorry, I'm not sure how to help with that.";
//                     // }
//
//                     let englishInput = text;
//                     if (session.language !== 'en'){
//                         englishInput = await TranslateService.translateText(text,'en');
//                     }
//
//                     const englishResponse = await processBotMessage(chat_id, englishInput);
//
//                     let finalUserResponse = englishResponse;
//                     if (session.language !== 'en') {
//                         finalUserResponse = await TranslateService.translateText(englishResponse, session.language);
//                     }
//
//                     // const finalBotResponse = await processBotMessage(chat_id, text);
//
//                     io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//
//                     const botMsg = await db.ChatMessage.create({
//                         chat_id,
//                         sender: "bot",
//                         message: finalUserResponse,
//                         viewed_by_agent: "no"
//                     });
//                     io.to(chatRoom(chat_id)).emit("message.new", botMsg);
//
//                 } catch (error: any) {
//                     console.error("Socket-level Error:", error);
//                     io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//
//                     let fallbackMessage = "I'm sorry, I'm experiencing technical difficulties at the moment. Please try again, or click 'Talk to a Live Agent' for immediate assistance.";
//                     if (error.code === 'insufficient_quota') {
//                         fallbackMessage = "I'm sorry, our AI system is currently at capacity. Please try again in a few moments or request a live agent.";
//                     }
//                     const fallbackMsg = await db.ChatMessage.create({
//                         chat_id, sender: "bot", message: fallbackMessage, viewed_by_agent: "no"
//                     });
//                     io.to(chatRoom(chat_id)).emit("message.new", fallbackMsg);
//                 }
//             } else {
//                 await session.update({
//                     last_message_at: new Date(),
//                     unread_count: db.sequelize.literal("unread_count + 1")
//                 });
//             }
//         });
//
//         // ... (Rest of your socket handlers: typing, stop_typing, message.agent, etc.) ...
//         socket.on("typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
//             socket.to(chatRoom(chat_id)).emit("typing", {by});
//         });
//
//         socket.on("stop_typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
//             socket.to(chatRoom(chat_id)).emit("stop_typing", {by});
//         });
//
//         socket.on("message.agent", async ({chat_id, text, user_id}: {
//             chat_id: string;
//             text: string;
//             user_id: number
//         }) => {
//             const msg = await db.ChatMessage.create({chat_id, sender: "agent", message: text, viewed_by_agent: "yes"});
//             await db.ChatSession.update(
//                 {last_message_at: new Date(), unread_count: 0},
//                 {where: {chat_id}}
//             );
//             io.to(chatRoom(chat_id)).emit("message.new", msg);
//         });
//
//         socket.on("request.agent", async ({chat_id, priority = 0, channel}: any) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session) return;
//
//             await session.update({status: "queued", priority, channel: channel || session.channel});
//             io.emit("queue.updated");
//         });
//
//         socket.on("agent.accept", async ({chat_id, user_id}: { chat_id: string; user_id: number }) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session || session.status === "assigned" || session.status === "closed") {
//                 return;
//             }
//
//             await session.update({status: "assigned", agent_id: user_id});
//             io.to(chatRoom(chat_id)).emit("agent.joined", {agent_id: user_id});
//             io.emit("queue.updated");
//
//             io.to(`agent:${user_id}`).emit("chat.assigned");
//         });
//
//         socket.on("agent.read", async ({chat_id}: { chat_id: string }) => {
//             if (!chat_id) return;
//             await db.ChatSession.update(
//                 {unread_count: 0},
//                 {where: {chat_id}}
//             );
//         });
//
//         socket.on("join.chat", ({chat_id}) => {
//             if (!chat_id) return;
//             socket.join(`chat:${chat_id}`);
//             console.log(`Agent joined chat room: ${chat_id}`);
//         });
//
//         socket.on("chat.close", async ({chat_id}: { chat_id: string }) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session) return;
//             await session.update({status: "closed"});
//
//             io.to(chatRoom(chat_id)).emit("chat.closed");
//         });
//
//         socket.on("disconnect", () => {
//             if (role === "agent" && user_id) {
//                 markUserOffline(Number(user_id));
//                 console.log(`Agent ${user_id} disconnected`);
//             }
//         });
//     })
// }


// add handoff
// import {Server, Socket} from "socket.io";
// import db from "../models";
// // import {OpenAI} from "openai"; // Not needed
// import {Pinecone} from "@pinecone-database/pinecone";
// import {FeatureExtractionPipeline, pipeline} from "@xenova/transformers";
// import Groq from "groq-sdk";
// import {QueryTypes} from "sequelize";
// import {TranslateService} from "../services/translate"; // Import QueryTypes
//
// import {ChatGroq} from "@langchain/groq";
// import {DynamicStructuredTool} from "@langchain/core/tools";
// import {z} from "zod";
// import {ChatPromptTemplate, MessagesPlaceholder} from "@langchain/core/prompts";
// import {createAgent} from "langchain";
// import {HumanMessage, AIMessage, BaseMessage, SystemMessage} from "@langchain/core/messages";
// import {ChatSession} from "../models/chatSession.model";
//
// type AgentPresence = {
//     userId: number;
//     socketId: string;
//     languages: string[];
// }
//
// interface MessagePayload {
//     chat_id: string;
//     text: string;
//     attachment?: {
//         url: string;
//         type: "image" | "document";
//         name: string;
//     }
// }
//
// const groq = new Groq({apiKey: process.env.OPENAI_API_KEY}); // Using your Groq key
// const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY!});
//
// let embedder: FeatureExtractionPipeline | null = null;
// let dbSchemaCache: string | null = null; // Cache the schema
//
// /**
//  * Tool 1: Searches Pinecone for general information.
//  */
// async function getGeneralContext(query: string) {
//     try {
//         if (!embedder) {
//             console.log("Initializing local embedding model for server...");
//             embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as FeatureExtractionPipeline;
//             console.log("Embedding model loaded.");
//         }
//         const result = await embedder(query, {pooling: 'mean', normalize: true});
//         const queryEmbedding: number[] = Array.from(result.data as number[]);
//         const index = pinecone.index(process.env.PINECONE_INDEX!);
//         const searchRes = await index.query({
//             vector: queryEmbedding,
//             topK: 3,
//             includeMetadata: true
//         });
//         const contextText = searchRes.matches
//             .map((match: any) => match.metadata?.text)
//             .join("\n\n");
//         return contextText || "No general information found.";
//     } catch (error) {
//         console.error("Pinecone Error:", error);
//         return "Error searching for general information";
//     }
// }
//
// /**
//  * Helper: Gets the database schema (with caching)
//  */
// async function getDatabaseSchema() {
//     // Return from cache if we already have it
//     if (dbSchemaCache) {
//         return dbSchemaCache;
//     }
//     try {
//         const queryInterface = db.sequelize.getQueryInterface();
//         let schemaString = "";
//
//         // --- DEFINE YOUR TABLES HERE ---
//         // Add all tables you want the AI to be able to query
//         const tablesToDescribe = ['vehicles', 'spare_parts']; // <<-- CHECK YOUR TABLE NAMES
//
//         for (const tableName of tablesToDescribe) {
//             try {
//                 const tableSchema = await queryInterface.describeTable(tableName);
//                 schemaString += `Table: ${tableName}\nColumns:\n`;
//                 for (const [column, attributes] of Object.entries(tableSchema)) {
//                     schemaString += `  - ${column} (${(attributes as any).type})\n`;
//                 }
//                 schemaString += "\n"; // Add a space between tables
//             } catch (tableError) {
//                 console.warn(`Could not describe table ${tableName}. Skipping.`);
//             }
//         }
//
//         dbSchemaCache = schemaString; // Cache the result
//         return dbSchemaCache;
//
//     } catch (error) {
//         console.error("Error getting schema:", error);
//         return "Error: Could not retrieve DB schema.";
//     }
// }
//
//
// const queryDatabase = async (userQuestion: string) => {
//     try {
//         const schema = await getDatabaseSchema();
//         const sqlGenLLM = new ChatGroq({
//             apiKey: process.env.OPENAI_API_KEY,
//             model: "llama-3.3-70b-versatile",
//             temperature: 0
//         });
//
//         const sqlPrompt = `
//         You are a MySQL expert. Write a read-only SELECT query based on this schema:
//         ${schema}
//
//         User Question: ${userQuestion}
//
//         Rules:
//         1. Return ONLY the raw SQL query. No markdown, no explanations.
//         2. LIMIT results to 5 unless specified.
//         3. Do not use sensitive tables (users, passwords).
//         `;
//
//         const aiMsg = await sqlGenLLM.invoke([new HumanMessage(sqlPrompt)]);
//         let sqlQuery = aiMsg.content.toString().replace(/```sql|```/g, "").trim();
//
//         const forbidden = ['drop', 'delete', 'update', 'insert', 'alter', 'users'];
//         if (forbidden.some(word => sqlQuery.toLowerCase().includes(word))) {
//             return "I cannot perform that query for security reasons.";
//         }
//
//         console.log("Executing SQL:", sqlQuery);
//         const results = await db.sequelize.query(sqlQuery, {type: QueryTypes.SELECT});
//
//         if (!results || results.length === 0) {
//             return "No records found in the database matching that criteria.";
//         }
//
//         return JSON.stringify(results);
//     } catch (e) {
//         console.error("SQL Tool Error:", e);
//         return "Error executing database query.";
//     }
// };
//
//
// // const vectorTool = new DynamicStructuredTool({
// //     name: "get_general_company_info",
// //     description: "Use this for questions about Indra Traders, branch locations, opening hours, contact details, or services.",
// //     schema: z.object({
// //         query: z.string().describe("The search query related to company info"),
// //     }),
// //     func: async ({query}) => await getGeneralContext(query),
// // });
// //
// // const dbTool = new DynamicStructuredTool({
// //     name: "check_vehicle_inventory",
// //     description: "Use this for questions about specific cars, vehicle prices, stock availability, or spare parts.",
// //     schema: z.object({
// //         question: z.string().describe("The full natural language question regarding inventory"),
// //     }),
// //     func: async ({question}) => await queryDatabase(question),
// // });
//
// const vectorTool = new DynamicStructuredTool({
//     name: "get_general_company_info",
//     description: "Use this for questions about Indra Traders, branch locations, opening hours, contact details, or services.",
//     schema: z.object({ query: z.string().describe("The search query string") }),
//     func: async ({query}) => await getGeneralContext(query),
// });
//
// const dbTool = new DynamicStructuredTool({
//     name: "check_vehicle_inventory",
//     description: "Use this for questions about specific cars, prices, stock, or spare parts. ONLY available for registered users.",
//     schema: z.object({ question: z.string().describe("The full question about inventory") }),
//     func: async ({question}) => await queryDatabase(question),
// });
//
// const handoffTool = new DynamicStructuredTool({
//     name: "transfer_to_live_agent",
//     description: "Call this tool ONLY when the user explicitly agrees (says 'yes', 'ok', 'please') to speak with a live agent.",
//     schema: z.object({reason: z.string().describe("Reason for transfer")}),
//     func: async ({reason}) => {
//         return "__HANDOFF_TRIGGERED__";
//     },
// })
//
// // const tools = [vectorTool, dbTool];
//
//
// const llm = new ChatGroq({
//     apiKey: process.env.OPENAI_API_KEY, // Ensure this env var is set
//     // model: "llama-3.1-8b-instant",
//     model: "llama-3.3-70b-versatile",
//     temperature: 0.1,
// });
//
// // const agent = createAgent({
// //     model: llm,
// //     tools: tools,
// //     systemPrompt: `You are 'Indra Assistant', a friendly support agent for Indra Traders.
// //
// //     CORE RULES:
// //     1. Use 'check_vehicle_inventory' for ANY question about cars, parts, prices, or stock.
// //     2. Use 'get_general_company_info' for questions about location, hours, or services.
// //     3. If the tool returns JSON data, convert it into a friendly, easy-to-read bulleted list.
// //     4. If the tool returns "No records found", politely inform the user.
// //     5. Keep responses concise and helpful.
// //     `,
// // });
//
//
// export async function processBotMessage(chat_id: string, englishText: string): Promise<{
//     type: 'text' | 'handoff',
//     content: string
// }> {
//     try {
//
//         const session = await db.ChatSession.findOne({where: {chat_id}}) as ChatSession;
//         if (!session) return {type: 'text', content: "Session expired"};
//
//         // 1. Fetch Conversation History from DB
//         const history = await db.ChatMessage.findAll({
//             where: {chat_id},
//             order: [["createdAt", "DESC"]],
//             limit: 1 // Get last 6 messages for context
//         });
//
//         let activeTools: any[] = [vectorTool, handoffTool];
//
//         if (session.user_type === 'registered') {
//             activeTools.push(dbTool);
//         }
//
//         const llmWithTools = llm.bindTools(activeTools);
//
//         // const agent = createAgent({
//         //     model: llm,
//         //     tools: activeTools,
//         // })
//
//
//         // 2. Convert DB messages to LangChain format
//         // Note: We reverse the history so it's chronological (Oldest -> Newest)
//         const messageHistory: BaseMessage[] = history.reverse().map(msg => {
//             if (msg.sender === 'customer') {
//                 return new HumanMessage(msg.message);
//             } else {
//                 return new AIMessage(msg.message);
//             }
//         });
//
//         const systemPrompt = new SystemMessage(`
//         You are 'Indra Assistant', a support agent for Indra Traders.
//         User Name: ${session.customer_name || 'Guest'}
//         User Type: ${session.user_type}
//
//         CORE INSTRUCTIONS:
//         1. Answer questions using the available tools.
//         2. If 'check_vehicle_inventory' is NOT available (Guest user) and they ask about stock/prices, politely say: "Inventory details are for registered users only. Please register to view stock."
//
//         HANDOFF PROTOCOL (CRITICAL):
//         1. If you cannot answer a question using your tools, or if the user is frustrated, YOU MUST SAY:
//            "I'm sorry, I don't have that information. Would you like me to connect you with a Live Agent for immediate assistance?"
//         2. If the user replies "Yes", "Sure", or "OK" to that offer, call the 'transfer_to_live_agent' tool immediately.
//         3. Do not call the transfer tool unless the user agrees.
//         `)
//
//         messageHistory.unshift(systemPrompt);
//         messageHistory.push(new HumanMessage(englishText));
//
//         const aiMessage = await llmWithTools.invoke(messageHistory);
//
//         if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
//             const toolCall = aiMessage.tool_calls[0];
//
//             if (toolCall.name === 'transfer_to_live_agent') {
//                 return {type: 'handoff', content: "Connecting you to a live agent now..."};
//             }
//
//             let toolOutput = "";
//             if (toolCall.name === 'get_general_company_info') {
//                 toolOutput = await getGeneralContext(toolCall.args.query);
//             } else if (toolCall.name === 'check_vehicle_inventory') {
//                 // Double check permission
//                 if (session.user_type !== 'registered') {
//                     toolOutput = "Access Denied: Guest users cannot check inventory.";
//                 } else {
//                     toolOutput = await queryDatabase(toolCall.args.question);
//                 }
//             }
//
//             const summaryPrompt = new SystemMessage(`
//                 You called tool '${toolCall.name}'.
//                 Result: ${toolOutput}
//
//                 Task: Summarize this result for the user in a friendly way. Use Markdown.
//             `);
//             const summaryRes = await llm.invoke([summaryPrompt]);
//             return {type: 'text', content: summaryRes.content as string};
//         }
//
//         return {type: 'text', content: aiMessage.content as string};
//
//
//         // const result = await agent.invoke({messages: messageHistory});
//         //
//         // const responseText = result.messages[result.messages.length - 1].content as string;
//         //
//         // const lastMsg = result.messages[result.messages.length - 1];
//         // const toolCalls = lastMsg.tool_calls;
//         //
//         // if (toolCalls && toolCalls.length > 0) {
//         //     if (toolCalls.some((tc:any) => tc.name === 'transfer_to_live_agent')){
//         //         return { type: 'handoff', content: "Connecting you to a live agent now..." };
//         //     }
//         // }
//         //
//         // return {type: 'text', content: responseText};
//
//
//         // 3. Add the user's NEW message to the end of the list
//         // messageHistory.push(new HumanMessage(englishText));
//
//         // 4. Invoke the Agent
//         // The 'createAgent' return type expects an object with a 'messages' array
//         // const result = await agent.invoke({
//         //     messages: messageHistory
//         // });
//
//         // 5. Extract the Final Answer
//         // The result contains the full state; we want the content of the last message (the bot's answer)
//         // const lastMessage = result.messages[result.messages.length - 1];
//         // return lastMessage.content as string;
//
//     } catch (error) {
//         console.error("Bot Processing Error:", error);
//         // return "I'm currently experiencing high traffic and couldn't process your request. Please try again or ask for a live agent.";
//         return {type: 'text', content: "I'm having trouble. Please try again."};
//     }
// }
//
// // const agent = createAgent({
// //     model: llm,
// //     tools: tools,
// // });
// //
// // // ==========================================
// // // 5. Bot Processing Logic
// // // ==========================================
// // export async function processBotMessage(chat_id: string, englishText: string) {
// //     try {
// //         // 1. Fetch History
// //         const history = await db.ChatMessage.findAll({
// //             where: { chat_id },
// //             order: [["createdAt", "DESC"]],
// //             limit: 6
// //         });
// //
// //         // 2. Format Messages
// //         const messageHistory: BaseMessage[] = history.reverse().map(msg => {
// //             if (msg.sender === 'customer') {
// //                 return new HumanMessage(msg.message);
// //             } else {
// //                 return new AIMessage(msg.message);
// //             }
// //         });
// //
// //         // 3. *** FIX: Inject System Prompt Manually ***
// //         // This ensures the model knows its role, regardless of Agent API changes.
// //         const systemPrompt = new SystemMessage(`You are 'Indra Assistant', a friendly support agent for Indra Traders.
// //
// //         CORE RULES:
// //         1. Use 'check_vehicle_inventory' for ANY question about cars, parts, prices, or stock.
// //         2. Use 'get_general_company_info' for questions about location, hours, or services.
// //         3. If the tool returns JSON data, convert it into a friendly, easy-to-read bulleted list.
// //         4. If the tool returns "No records found", politely inform the user.
// //         5. Keep responses concise and helpful.
// //         `);
// //
// //         // Add system prompt to the VERY BEGINNING of the array
// //         messageHistory.unshift(systemPrompt);
// //
// //         // 4. Add Current User Message to the END
// //         messageHistory.push(new HumanMessage(englishText));
// //
// //         // 5. Invoke Agent
// //         const result = await agent.invoke({
// //             messages: messageHistory
// //         });
// //
// //         // 6. Return Result
// //         const lastMessage = result.messages[result.messages.length - 1];
// //         return lastMessage.content as string;
// //
// //     } catch (error) {
// //         console.error("Bot Processing Error:", error);
// //         return "I'm currently experiencing high traffic and couldn't process your request. Please try again or ask for a live agent.";
// //     }
// // }
//
//
// /**
//  * Tool 2: The new Text-to-SQL "Agent"
//  */
// // async function answer_database_question(question: string) {
// //     try {
// //         // --- Step 2a: Get Schema ---
// //         const schema = await getDatabaseSchema();
// //         if (schema.startsWith("Error:")) return schema;
// //
// //         // --- Step 2b (AI Pass 1): Generate SQL Query ---
// //         const sqlGenPrompt = `
// //             You are a MySQL expert. Your only job is to write a single, read-only SELECT query to answer the user's question, given the database schema.
// //             Only return the SQL query. Do not add any other text, explanation, or markdown.
// //
// //             IMPORTANT RULES:
// //             - The schema provided is 100% accurate. Table and column names are case-sensitive. Use them *exactly* as they are written in the schema.
// //             - Always add a 'LIMIT 10' to your queries unless the user asks for a specific count (e.g., "how many").
// //             - Be sure to query the correct table based on the user's question (e.g., 'vehicles' for cars, 'spare_parts' for parts).
// //
// //             Schema:
// //             ${schema}
// //
// //             User Question:
// //             ${question}
// //
// //             SQL Query:
// //             `;
// //
// //         const sqlResponse = await groq.chat.completions.create({
// //             model: "llama-3.1-8b-instant",
// //             messages: [{role: "user", content: sqlGenPrompt}],
// //             temperature: 0.0
// //         });
// //
// //         let sqlQuery = sqlResponse.choices[0].message.content || "";
// //         console.log("---------- Generated SQL Query: ", sqlQuery);
// //         sqlQuery = sqlQuery.replace(/```sql|```/g, "").trim();
// //
// //         const sensitiveTables = ['users'];
// //         const queryLower = sqlQuery.toLowerCase();
// //         for (const table of sensitiveTables) {
// //             if (queryLower.includes(table)) {
// //                 console.warn(`Blocked sensitive query: ${sqlQuery}`);
// //                 return "I'm sorry, I can only provide information about vehicles and spare parts.";
// //             }
// //         }
// //
// //         if (!sqlQuery.toUpperCase().startsWith("SELECT")) {
// //             console.warn(`Blocked non-SELECT query: ${sqlQuery}`);
// //             return "I can only perform read-only operations on the vehicle database.";
// //         }
// //
// //         // --- Step 2c: Run Query ---
// //         // Use query to get all results, not just one
// //         const queryResult = await db.sequelize.query(sqlQuery, {type: QueryTypes.SELECT});
// //         const resultString = JSON.stringify(queryResult); // This will be an array
// //
// //         // --- Step 2d (AI Pass 2): Summarize Results ---
// //         const summaryPrompt = `
// //             You are 'Indra Assistant', a friendly and helpful support agent.
// //             A user asked a question, a SQL query was run, and here is the result from the database (in JSON format).
// //
// //             Your job is to answer the user's original question in natural, friendly language based *only* on this result.
// //
// //             FORMATTING RULES:
// //             - Use markdown (like **bold**) to highlight key items (e.g., vehicle names, part names, prices).
// //             - If there are multiple items in the JSON, present them as a bulleted list ('* item 1').
// //             - If the JSON result is an empty array '[]', politely tell the user you couldn't find any items matching their criteria.
// //             - Do not mention the SQL query or JSON. Just give the answer.
// //
// //             User Question:
// //             ${question}
// //
// //             Database Result (JSON):
// //             ${resultString}
// //
// //             Your Friendly, Markdown-Formatted Answer:
// //             `;
// //
// //         const summaryResponse = await groq.chat.completions.create({
// //             model: "llama-3.1-8b-instant",
// //             messages: [{role: "user", content: summaryPrompt}]
// //         });
// //
// //         return summaryResponse.choices[0].message.content || "I found the data but had trouble explaining it.";
// //
// //     } catch (error) {
// //         console.error("Text-to-SQL Error:", error);
// //         return "An error occurred while checking the vehicle database. Please ask your question again.";
// //     }
// // }
//
//
// // --- The New Tool Definitions ---
// // const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
// //     {
// //         type: "function",
// //         function: {
// //             name: "answer_database_question",
// //             description: "Use this tool for any questions about vehicle inventory, spare parts, stock, pricing, makes, models, or specific cars.",
// //             parameters: {
// //                 type: "object",
// //                 properties: {
// //                     question: {
// //                         type: "string",
// //                         description: "The user's full, natural language question about vehicles or parts."
// //                     },
// //                 },
// //                 required: ["question"],
// //             },
// //         }
// //     },
// //     {
// //         type: "function",
// //         function: {
// //             name: "get_general_information",
// //             description: "Use this tool for general questions about Indra Traders, such as services, branch locations, contact numbers, and opening hours.",
// //             parameters: {
// //                 type: "object",
// //                 properties: {
// //                     query: {type: "string", description: "The user's question about general topics."},
// //                 },
// //                 required: ["query"],
// //             },
// //         },
// //     },
// // ]
//
// const onlineAgents = new Map<number, AgentPresence>();
// const chatRoom = (chatId: string) => `chat:${chatId}`;
//
// const getLangRoom = (lang: string) => `agents:lang:${lang}`;
//
// // ... (markUserOnline, markUserOffline functions) ...
// // const markUserOnline = async (userId: number, socketId: string) => {
// //     onlineAgents.set(userId, {userId, socketId});
// // }
// // const markUserOffline = async (userId: number) => {
// //     onlineAgents.delete(userId);
// // }
//
//
// // export async function processBotMessage(chat_id: string, englishText: string) {
// //     try {
// //         const history = await db.ChatMessage.findAll({
// //             where: {chat_id},
// //             order: [["createdAt", "DESC"]],
// //             limit: 4
// //         });
// //
// //         const messagesForAI: Groq.Chat.Completions.ChatCompletionMessageParam[] = history
// //             .map(msg => {
// //                 if (msg.sender === 'customer') {
// //                     return {role: 'user' as const, content: msg.message};
// //                 } else {
// //                     return {role: 'assistant' as const, content: msg.message};
// //                 }
// //             })
// //             .reverse();
// //
// //         const systemPrompt = `
// //                     You are 'Indra Assistant', a friendly and helpful AI support agent for Indra Traders.
// //                     Your job is to have a natural, helpful conversation.
// //
// //                     - If the user asks about vehicles, parts, stock, or pricing, use the 'answer_database_question' tool.
// //                     - If the user asks about services, hours, or contact info, use the 'get_general_information' tool.
// //                     - Reply in English. The system will handle translation.
// //                     - If the user just says "hi" or makes small talk, **just have a normal, friendly conversation.** - **Do not** mention your tools or functions.
// //                     `
// //
// //         // --- AI Pass 1: Tool Router ---
// //         const toolCheckResponse = await groq.chat.completions.create({
// //             model: "llama-3.1-8b-instant",
// //             messages: [
// //                 {role: "system", content: systemPrompt},
// //                 ...messagesForAI, // Then pass the history
// //                 {role: "user", content: englishText}
// //             ],
// //             tools: tools,
// //             tool_choice: "auto",
// //         });
// //
// //         const responseMessage = toolCheckResponse.choices[0].message;
// //         const toolCalls = responseMessage.tool_calls;
// //         let finalBotResponse = "";
// //
// //         if (toolCalls) {
// //             // AI wants to use a tool
// //             const toolCall = toolCalls[0];
// //             const functionName = toolCall.function.name;
// //             const functionsArgs = JSON.parse(toolCall.function.arguments);
// //
// //             // --- Run the correct tool ---
// //             if (functionName === 'answer_database_question') {
// //                 finalBotResponse = await answer_database_question(functionsArgs.question);
// //             } else if (functionName === 'get_general_information') {
// //                 // finalBotResponse = await getContext(functionsArgs.query);
// //                 // // This tool just returns a string, but it's not a full AI answer.
// //                 // // We should feed it back to the AI for a natural response.
// //                 // const summaryResponse = await groq.chat.completions.create({
// //                 //     model: "llama-3.3-70b-versatile",
// //                 //     messages: [
// //                 //         { role: "system", content: "You are Indra Assistant. Answer the user's question using the context provided. Be friendly and use markdown."},
// //                 //         messagesForAI[messagesForAI.length - 1], // The user's last question
// //                 //         { role: "assistant", content: `I found this information: ${finalBotResponse}` }
// //                 //     ]
// //                 // });
// //                 // finalBotResponse = summaryResponse.choices[0].message.content || "I found some information but had trouble processing it.";
// //
// //                 const pineconeContext = await getContext(functionsArgs.query);
// //
// //                 if (!pineconeContext || pineconeContext === "No general information found." || pineconeContext === "Error searching for general information") {
// //                     finalBotResponse = "I'm sorry, I couldn't find any information about that. You can click **Talk to a Live Agent** for more help.";
// //                 } else {
// //                     // --- AI Pass 2 (Summarization) ---
// //                     // This is the corrected prompt structure
// //                     const summaryResponse = await groq.chat.completions.create({
// //                         model: "llama-3.1-8b-instant",
// //                         messages: [
// //                             {
// //                                 role: "system",
// //                                 content: `
// //                                                 You are 'Indra Assistant', a friendly and helpful AI support agent.
// //                                                 Answer the user's question in a natural, friendly way using ONLY the information from the 'CONTEXT' provided below.
// //                                                 Use simple markdown formatting.
// //
// //                                                 CONTEXT:
// //                                                 ${pineconeContext}
// //                                             `
// //                             },
// //                             {role: "user", content: englishText},
// //                             messagesForAI[messagesForAI.length - 1] // The user's last question
// //                         ]
// //                     });
// //                     finalBotResponse = summaryResponse.choices[0].message.content || "I found the information but had trouble summarizing it.";
// //                 }
// //             }
// //         } else {
// //             // No tool was called. The AI is just "chatting".
// //             finalBotResponse = responseMessage.content || "Sorry, I'm not sure how to help with that.";
// //         }
// //
// //         return finalBotResponse;
// //     } catch (error: any) {
// //         console.error("AI Error: ", error);
// //         let fallbackMessage = "I'm sorry, I'm experiencing technical difficulties at the moment. Please try again, or click 'Talk to a Live Agent' for immediate assistance.";
// //         if (error.code === 'insufficient_quota') {
// //             fallbackMessage = "I'm sorry, our AI system is currently at capacity. Please try again in a few moments or request a live agent.";
// //         }
// //         return fallbackMessage;
// //     }
// // }
//
//
// export default function initSocket(io: Server) {
//     io.on("connection", (socket: Socket) => {
//         const {role, chat_id, user_id} = socket.handshake.query as any;
//
//         if (chat_id) socket.join(chatRoom(String(chat_id)));
//
//         if (role === "agent" && user_id) {
//             const uid = Number(user_id);
//
//             db.User.findByPk(uid).then((user: any) => {
//                 if (user) {
//                     const languages = user.languages || ["en"];
//
//                     onlineAgents.set(uid, {userId: uid, socketId: socket.id, languages});
//                     socket.join(`agent:${uid}`);
//
//                     languages.forEach((lang: string) => {
//                         socket.join(getLangRoom(lang));
//                         console.log(`Agent ${uid} joined queue for language: ${lang}`);
//                     });
//
//                     io.to(socket.id).emit("agent.online", {user_id: uid});
//                     console.log(`Agent ${uid} connected with languages: ${languages.join(", ")}`);
//                 }
//             }).catch((err: any) => console.error("Error fetching agent details", err));
//
//
//             // markUserOnline(uid, socket.id);
//
//             // socket.join(`agent:${uid}`);
//             // io.to(socket.id).emit("agent.online", {user_id: uid});
//             // console.log(`Agent ${uid} connected`);
//         }
//
//         // socket.on("message.customer", async ({chat_id, text}: { chat_id: string, text: string }) => {
//         socket.on("message.customer", async (payload: MessagePayload) => {
//
//             const {chat_id, text, attachment} = payload;
//
//             const session = await db.ChatSession.findOne({where: {chat_id}}) as ChatSession;
//             if (!session) return;
//
//             // const customerMsg = await db.ChatMessage.create({
//             //     chat_id, sender: "customer", message: text, viewed_by_agent: "no"
//             // });
//
//             const customerMsg = await db.ChatMessage.create({
//                 chat_id,
//                 sender: "customer",
//                 message: text || "",
//                 viewed_by_agent: "no",
//                 attachment_url: attachment?.url || null,
//                 attachment_type: attachment?.type || "none",
//                 file_name: attachment?.name || null,
//             });
//
//             io.to(chatRoom(chat_id)).emit("message.new", customerMsg);
//
//             if (session.status === "bot" && text) {
//                 try {
//                     io.to(chatRoom(chat_id)).emit("typing", {by: 'bot'});
//
//                     // const history = await db.ChatMessage.findAll({
//                     //     where: {chat_id},
//                     //     order: [["createdAt", "DESC"]],
//                     //     limit: 4
//                     // });
//                     //
//                     // const messagesForAI: Groq.Chat.Completions.ChatCompletionMessageParam[] = history
//                     //     .map(msg => {
//                     //         if (msg.sender === 'customer') {
//                     //             return {role: 'user' as const, content: msg.message};
//                     //         } else {
//                     //             return {role: 'assistant' as const, content: msg.message};
//                     //         }
//                     //     })
//                     //     .reverse();
//                     //
//                     // const systemPrompt = `
//                     // You are 'Indra Assistant', a friendly and helpful AI support agent for Indra Traders.
//                     // Your job is to have a natural, helpful conversation.
//                     //
//                     // - If the user asks about vehicles, parts, stock, or pricing, use the 'answer_database_question' tool.
//                     // - If the user asks about services, hours, or contact info, use the 'get_general_information' tool.
//                     // - If the user just says "hi" or makes small talk, **just have a normal, friendly conversation.** - **Do not** mention your tools or functions.
//                     // `
//                     //
//                     // // --- AI Pass 1: Tool Router ---
//                     // const toolCheckResponse = await groq.chat.completions.create({
//                     //     model: "llama-3.1-8b-instant",
//                     //     messages: [
//                     //         {role: "system", content: systemPrompt},
//                     //         ...messagesForAI // Then pass the history
//                     //     ],
//                     //     tools: tools,
//                     //     tool_choice: "auto",
//                     // });
//                     //
//                     // const responseMessage = toolCheckResponse.choices[0].message;
//                     // const toolCalls = responseMessage.tool_calls;
//                     // let finalBotResponse = "";
//                     //
//                     // if (toolCalls) {
//                     //     // AI wants to use a tool
//                     //     const toolCall = toolCalls[0];
//                     //     const functionName = toolCall.function.name;
//                     //     const functionsArgs = JSON.parse(toolCall.function.arguments);
//                     //
//                     //     // --- Run the correct tool ---
//                     //     if (functionName === 'answer_database_question') {
//                     //         finalBotResponse = await answer_database_question(functionsArgs.question);
//                     //     } else if (functionName === 'get_general_information') {
//                     //         // finalBotResponse = await getContext(functionsArgs.query);
//                     //         // // This tool just returns a string, but it's not a full AI answer.
//                     //         // // We should feed it back to the AI for a natural response.
//                     //         // const summaryResponse = await groq.chat.completions.create({
//                     //         //     model: "llama-3.3-70b-versatile",
//                     //         //     messages: [
//                     //         //         { role: "system", content: "You are Indra Assistant. Answer the user's question using the context provided. Be friendly and use markdown."},
//                     //         //         messagesForAI[messagesForAI.length - 1], // The user's last question
//                     //         //         { role: "assistant", content: `I found this information: ${finalBotResponse}` }
//                     //         //     ]
//                     //         // });
//                     //         // finalBotResponse = summaryResponse.choices[0].message.content || "I found some information but had trouble processing it.";
//                     //
//                     //         const pineconeContext = await getContext(functionsArgs.query);
//                     //
//                     //         if (!pineconeContext || pineconeContext === "No general information found." || pineconeContext === "Error searching for general information") {
//                     //             finalBotResponse = "I'm sorry, I couldn't find any information about that. You can click **Talk to a Live Agent** for more help.";
//                     //         } else {
//                     //             // --- AI Pass 2 (Summarization) ---
//                     //             // This is the corrected prompt structure
//                     //             const summaryResponse = await groq.chat.completions.create({
//                     //                 model: "llama-3.1-8b-instant",
//                     //                 messages: [
//                     //                     {
//                     //                         role: "system",
//                     //                         content: `
//                     //                             You are 'Indra Assistant', a friendly and helpful AI support agent.
//                     //                             Answer the user's question in a natural, friendly way using ONLY the information from the 'CONTEXT' provided below.
//                     //                             Use simple markdown formatting.
//                     //
//                     //                             CONTEXT:
//                     //                             ${pineconeContext}
//                     //                         `
//                     //                     },
//                     //                     messagesForAI[messagesForAI.length - 1] // The user's last question
//                     //                 ]
//                     //             });
//                     //             finalBotResponse = summaryResponse.choices[0].message.content || "I found the information but had trouble summarizing it.";
//                     //         }
//                     //     }
//                     // } else {
//                     //     // No tool was called. The AI is just "chatting".
//                     //     finalBotResponse = responseMessage.content || "Sorry, I'm not sure how to help with that.";
//                     // }
//
//                     let inputForAi = text;
//                     if (session.language !== 'en') {
//                         inputForAi = await TranslateService.translateText(text, 'en');
//                     }
//
//                     const botResult = await processBotMessage(chat_id, inputForAi);
//
//                     if (typeof botResult === 'object' && botResult.type === 'handoff') {
//                         await session.update({status: 'queued', priority: 1});
//
//                         io.emit("queue.updated");
//
//                         let finalResponse = botResult.content;
//                         if (session.language !== 'en') {
//                             finalResponse = await TranslateService.translateText(finalResponse, session.language);
//                         }
//
//                         const sysMsg = await db.ChatMessage.create({
//                             chat_id, sender: "system", message: finalResponse, viewed_by_agent: "no"
//                         });
//
//                         io.to(chatRoom(chat_id)).emit("message.new", sysMsg);
//                         io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//                         return;
//                     }
//
//                     // const englishResponse = (botResult as any).content || botResult;
//
//                     let finalUserResponse = botResult.content;
//                     if (session.language !== 'en') {
//                         finalUserResponse = await TranslateService.translateText(finalUserResponse, session.language);
//                     }
//
//                     // const finalBotResponse = await processBotMessage(chat_id, text);
//
//                     // io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//
//                     const botMsg = await db.ChatMessage.create({
//                         chat_id,
//                         sender: "bot",
//                         message: finalUserResponse,
//                         viewed_by_agent: "no"
//                     });
//                     io.to(chatRoom(chat_id)).emit("message.new", botMsg);
//
//                 } catch (error: any) {
//                     console.error("Socket-level Error:", error);
//                     // io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//
//                     let fallbackMessage = "I'm sorry, I'm experiencing technical difficulties at the moment. Please try again, or click 'Talk to a Live Agent' for immediate assistance.";
//                     if (error.code === 'insufficient_quota') {
//                         fallbackMessage = "I'm sorry, our AI system is currently at capacity. Please try again in a few moments or request a live agent.";
//                     }
//                     const fallbackMsg = await db.ChatMessage.create({
//                         chat_id, sender: "bot", message: fallbackMessage, viewed_by_agent: "no"
//                     });
//                     io.to(chatRoom(chat_id)).emit("message.new", fallbackMsg);
//                 } finally {
//                     io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//                 }
//             } else if (session.status === "bot" && attachment) {
//                 const botReply = await db.ChatMessage.create({
//                     chat_id, sender: "bot",
//                     message: "I received your attachment. An agent will review it shortly.",
//                     viewed_by_agent: "no"
//                 });
//                 io.to(chatRoom(chat_id)).emit("message.new", botReply);
//             } else {
//                 await session.update({
//                     last_message_at: new Date(),
//                     unread_count: db.sequelize.literal("unread_count + 1")
//                 });
//             }
//         });
//
//         // ... (Rest of your socket handlers: typing, stop_typing, message.agent, etc.) ...
//         socket.on("typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
//             socket.to(chatRoom(chat_id)).emit("typing", {by, chat_id});
//         });
//
//         socket.on("stop_typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
//             socket.to(chatRoom(chat_id)).emit("stop_typing", {by, chat_id});
//         });
//
//         // socket.on("message.agent", async ({chat_id, text, user_id}: {
//         //     chat_id: string;
//         //     text: string;
//         //     user_id: number
//         // }) => {
//         socket.on("message.agent", async (payload: {
//             chat_id: string;
//             text: string;
//             user_id: number;
//             attachment?: any
//         }) => {
//             const {chat_id, text, attachment} = payload;
//
//             const msg = await db.ChatMessage.create({
//                 chat_id,
//                 sender: "agent",
//                 message: text || "",
//                 viewed_by_agent: "yes",
//                 attachment_url: attachment?.url || null,
//                 attachment_type: attachment?.type || "none",
//                 file_name: attachment?.name || null,
//             });
//             await db.ChatSession.update(
//                 {last_message_at: new Date(), unread_count: 0},
//                 {where: {chat_id}}
//             );
//             io.to(chatRoom(chat_id)).emit("message.new", msg);
//         });
//
//         // socket.on("request.agent", async ({chat_id, priority = 0, channel}: any) => {
//         //     const session = await db.ChatSession.findOne({where: {chat_id}});
//         //     if (!session) return;
//         //
//         //     await session.update({status: "queued", priority, channel: channel || session.channel});
//         //     io.emit("queue.updated");
//         // });
//
//         // -------------------------
//         socket.on("request.agent", async ({chat_id, priority = 0, channel}: any) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session) return;
//
//             // Determine the target language from the session
//             const requiredLanguage = session.language || 'en';
//
//             await session.update({status: "queued", priority, channel: channel || session.channel});
//
//             // BROADCAST STRATEGY:
//             // Only emit "queue.updated" to agents who speak the required language.
//             // This prevents agents who don't know Tamil from seeing Tamil chats in their queue (if your frontend filters based on this event)
//
//             console.log(`Chat ${chat_id} queuing for language: ${requiredLanguage}`);
//
//             // Emit to the specific language room
//             io.to(getLangRoom(requiredLanguage)).emit("queue.updated");
//
//             // Optional: Also emit to 'agents:lang:en' as a fallback if it's a critical issue?
//             // For now, we stick to strict routing.
//         });
//         // ------------------------------------------------------
//
//         socket.on("agent.accept", async ({chat_id, user_id}: { chat_id: string; user_id: number }) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session || session.status === "assigned" || session.status === "closed") {
//                 return;
//             }
//
//             await session.update({status: "assigned", agent_id: user_id});
//             io.to(chatRoom(chat_id)).emit("agent.joined", {agent_id: user_id});
//             io.emit("queue.updated");
//
//             io.to(`agent:${user_id}`).emit("chat.assigned");
//         });
//
//         socket.on("agent.read", async ({chat_id}: { chat_id: string }) => {
//             if (!chat_id) return;
//             await db.ChatSession.update(
//                 {unread_count: 0},
//                 {where: {chat_id}}
//             );
//         });
//
//         socket.on("join.chat", ({chat_id}) => {
//             if (!chat_id) return;
//             socket.join(`chat:${chat_id}`);
//             console.log(`Agent joined chat room: ${chat_id}`);
//         });
//
//         socket.on("chat.close", async ({chat_id}: { chat_id: string }) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session) return;
//             await session.update({status: "closed"});
//
//             io.to(chatRoom(chat_id)).emit("chat.closed");
//         });
//
//         socket.on("disconnect", () => {
//             if (role === "agent" && user_id) {
//                 // markUserOffline(Number(user_id));
//                 const uid = Number(user_id);
//                 onlineAgents.delete(uid);
//                 console.log(`Agent ${user_id} disconnected`);
//             }
//         });
//     })
// }



//with OpenAi and LangChain Agent
// import { Server, Socket } from "socket.io";
// import db from "../models";
// import { Pinecone } from "@pinecone-database/pinecone";
// import { FeatureExtractionPipeline, pipeline } from "@xenova/transformers";
// import { QueryTypes } from "sequelize";
// import { TranslateService } from "../services/translate";
//
//
// import { ChatOpenAI } from "@langchain/openai";
// import { DynamicStructuredTool } from "@langchain/core/tools";
// import { z } from "zod";
// import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
// import { createAgent } from "langchain";
// import { ChatSession } from "../models/chatSession.model";
//
//
// type AgentPresence = {
//     userId: number;
//     socketId: string;
//     languages: string[];
// }
//
// interface MessagePayload {
//     chat_id: string;
//     text: string;
//     attachment?: {
//         url: string;
//         type: "image" | "document";
//         name: string;
//     }
// }
//
// const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
//
// const llm = new ChatOpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//     model: "gpt-4o",
//     temperature: 0,
// });
//
// let embedder: FeatureExtractionPipeline | null = null;
// let dbSchemaCache: string | null = null;
//
// async function getEmbedder() {
//     if (!embedder) {
//         console.log("⚡ Loading Embedding Model (all-MiniLM-L6-v2)...");
//         embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
//     }
//     return embedder;
// }
//
// export async function getGeneralContext(query: string): Promise<string> {
//     try {
//         const pipeline = await getEmbedder();
//
//         const result = await pipeline(query, { pooling: 'mean', normalize: true });
//         const queryEmbedding = Array.from(result.data as number[]);
//
//         const index = pinecone.index(process.env.PINECONE_INDEX!);
//         const searchRes = await index.query({
//             vector: queryEmbedding,
//             topK: 3,
//             includeMetadata: true
//         });
//
//         if (!searchRes.matches || searchRes.matches.length === 0) {
//             return "NO_DATA_FOUND";
//         }
//
//         const validMatches = searchRes.matches.filter(match => match.score && match.score > 0.45);
//
//         if (validMatches.length === 0) {
//             return "NO_RELEVANT_DATA_FOUND";
//         }
//
//         return validMatches
//             .map(match => `[Verified Company Info]: ${match.metadata?.text}`)
//             .join("\n\n");
//
//     } catch (error) {
//         console.error("Vector Search Error:", error);
//         return "System Error: Unable to retrieve company information.";
//     }
// }
//
// async function getDatabaseSchema() {
//     if (dbSchemaCache) return dbSchemaCache;
//     try {
//         const queryInterface = db.sequelize.getQueryInterface();
//         let schemaString = "";
//         const tablesToDescribe = ['vehicles', 'spare_parts'];
//
//         for (const tableName of tablesToDescribe) {
//             try {
//                 const tableSchema = await queryInterface.describeTable(tableName);
//                 schemaString += `Table: ${tableName}\nColumns:\n`;
//                 for (const [column, attributes] of Object.entries(tableSchema)) {
//                     schemaString += `  - ${column} (${(attributes as any).type})\n`;
//                 }
//                 schemaString += "\n";
//             } catch (tableError) {
//                 console.warn(`Could not describe table ${tableName}. Skipping.`);
//             }
//         }
//         dbSchemaCache = schemaString;
//         return dbSchemaCache;
//     } catch (error) {
//         console.error("Error getting schema:", error);
//         return "Error: Could not retrieve DB schema.";
//     }
// }
//
// // const queryDatabase = async (userQuestion: string) => {
// //     try {
// //         const schema = await getDatabaseSchema();
// //         const sqlGenLLM = new ChatOpenAI({
// //             apiKey: process.env.OPENAI_API_KEY,
// //             model: "gpt-4o",
// //             temperature: 0
// //         });
// //
// //         const sqlPrompt = `
// //         You are a MySQL expert. Write a read-only SELECT query based on this schema:
// //         ${schema}
// //
// //         User Question: ${userQuestion}
// //
// //         Rules:
// //         1. Return ONLY the raw SQL query. No markdown, no explanations.
// //         2. LIMIT results to 5 unless specified.
// //         3. Do not use sensitive tables (users, passwords).
// //         `;
// //
// //         const aiMsg = await sqlGenLLM.invoke([new HumanMessage(sqlPrompt)]);
// //         let sqlQuery = aiMsg.content.toString().replace(/```sql|```/g, "").trim();
// //
// //         const forbidden = ['drop', 'delete', 'update', 'insert', 'alter', 'users'];
// //         if (forbidden.some(word => sqlQuery.toLowerCase().includes(word))) {
// //             return "SECURITY_ALERT: Query blocked due to forbidden keywords.";
// //         }
// //
// //         console.log("Executing SQL:", sqlQuery);
// //         const results = await db.sequelize.query(sqlQuery, { type: QueryTypes.SELECT });
// //
// //         if (!results || results.length === 0) {
// //             return "No records found in the database matching that criteria.";
// //         }
// //
// //         return JSON.stringify(results);
// //     } catch (e) {
// //         console.error("SQL Tool Error:", e);
// //         return "Error executing database query.";
// //     }
// // };
//
// const queryDatabase = async (userQuestion: string) => {
//     try {
//         const schema = await getDatabaseSchema();
//         const sqlGenLLM = new ChatOpenAI({
//             apiKey: process.env.OPENAI_API_KEY,
//             model: "gpt-4o",
//             temperature: 0
//         });
//
//         const sqlPrompt = `
//         You are a MySQL expert. Write a read-only SELECT query based on this schema:
//         ${schema}
//
//         User Question: ${userQuestion}
//
//         Rules:
//         1. Return ONLY the raw SQL query. Do not use Markdown (no \`\`\`sql tags).
//         2. LIMIT results to 5 unless specified.
//         3. Do not use sensitive tables (users, passwords).
//         `;
//
//         const aiMsg = await sqlGenLLM.invoke([new HumanMessage(sqlPrompt)]);
//
//         // 1. IMPROVED CLEANING: Remove markdown tags and whitespace
//         let sqlQuery = aiMsg.content.toString()
//             .replace(/```sql/g, "")
//             .replace(/```/g, "")
//             .trim();
//
//         // 2. CRITICAL FIX: Smart Security Check
//         // We use Regex to match whole words only.
//         // This allows columns like "updatedAt" but blocks the command "UPDATE"
//         const forbiddenPatterns = [
//             /\bdrop\b/i,
//             /\bdelete\b/i,
//             /\bupdate\b/i, // Matches "UPDATE" but not "updated_at"
//             /\binsert\b/i,
//             /\balter\b/i,
//             /\btruncate\b/i
//         ];
//
//         // Check for forbidden SQL commands
//         const isForbidden = forbiddenPatterns.some(pattern => pattern.test(sqlQuery));
//
//         // Check for specific forbidden tables (like 'users')
//         const isSensitiveTable = /\busers\b/i.test(sqlQuery);
//
//         if (isForbidden || isSensitiveTable) {
//             console.warn(`Blocked Query: ${sqlQuery}`);
//             return "SECURITY_ALERT: Query blocked due to forbidden commands.";
//         }
//
//         console.log("Executing SQL:", sqlQuery);
//         const results = await db.sequelize.query(sqlQuery, { type: QueryTypes.SELECT });
//
//         if (!results || results.length === 0) {
//             return "No records found in the database matching that criteria.";
//         }
//
//         return JSON.stringify(results);
//     } catch (e) {
//         console.error("SQL Tool Error:", e);
//         return "Error executing database query.";
//     }
// };
//
//
// export async function processBotMessage(chat_id: string, userText: string): Promise<{ type: 'text' | 'handoff', content: string }> {
//     try {
//         const session = await db.ChatSession.findOne({ where: { chat_id } });
//         if (!session) return { type: 'text', content: "Session expired." };
//
//         const history = await db.ChatMessage.findAll({
//             where: { chat_id },
//             order: [["createdAt", "DESC"]],
//             limit: 8
//         });
//
//         const vectorTool = new DynamicStructuredTool({
//             name: "get_general_company_info",
//             description: "PRIMARY SOURCE: Use this to check if a question is related to Indra Traders, services, locations, or policies.",
//             schema: z.object({ query: z.string().describe("The specific search topic") }),
//             func: async ({ query }) => await getGeneralContext(query),
//         });
//
//         const handoffTool = new DynamicStructuredTool({
//             name: "transfer_to_live_agent",
//             description: "Use this if the user explicitly asks for a human, agent, or support.",
//             schema: z.object({ reason: z.string() }),
//             func: async ({ reason }) => {
//                 return "HANDOFF_TRIGGERED_ACTION";
//             },
//         });
//
//         const dbTool = new DynamicStructuredTool({
//             name: "check_vehicle_inventory",
//             description: "Queries the SQL database for vehicle stock/prices, spare parts details.",
//             schema: z.object({ question: z.string().describe("User question about stock") }),
//             func: async ({ question }) => await queryDatabase(question),
//         });
//
//         const tools: any[] = [vectorTool, handoffTool];
//         if (session.user_type === 'registered') {
//             tools.push(dbTool);
//         }
//
//         // const systemPrompt = `You are 'Indra Assistant', the official AI for Indra Traders.
//         //
//         // CONTEXT:
//         // - User: ${session.customer_name || 'Guest'}
//         // - Type: ${session.user_type}
//         // - Date: ${new Date().toDateString()}
//         //
//         // CRITICAL INSTRUCTIONS:
//         // 1. **Knowledge Retrieval**: You do NOT know facts about Indra Traders internally. You MUST use the 'get_general_company_info' tool.
//         // 2. **Hallucination Check**: If 'get_general_company_info' returns "NO_DATA_FOUND", politely say you don't have that information. Do NOT make up an answer.
//         // 3. **Inventory**:
//         //    - Registered Users: Use 'check_vehicle_inventory'.
//         //    - Guests: Politely decline stock checks, but allow them to ask general questions or speak to an agent.
//         // 4. **Live Agent**: Guests ARE allowed to speak to agents. Use the handoff tool if asked.
//         // 5. **Formatting**: Keep answers concise and use Markdown.`;
//
//         const systemPrompt = `You are 'Indra Assistant', a specialized AI for Indra Traders.
//
//         CONTEXT:
//         - User: ${session.customer_name || 'Guest'}
//         - Type: ${session.user_type}
//         - Date: ${new Date().toDateString()}
//
//         ⛔ **STRICT SCOPE PROTOCOL (MUST FOLLOW)**:
//         1. **Domain Restriction**: You are ONLY allowed to answer questions about **Indra Traders, Vehicles, Spare Parts, and Services**.
//         2. **General Knowledge Ban**: Do NOT answer general world questions (e.g., "Capital of India", "Who is the President", "Weather", "Math").
//            - IF the user asks an off-topic question, you MUST reply: "I apologize, but I do not have information about that. I can only assist with inquiries related to Indra Traders vehicles and services.suggest: "Would you like to speak to a live agent?" and use the handoff tool if they agree."
//         3. **Tool Reliance**: You do not know company facts internally. You MUST use 'get_general_company_info'.
//            - IF the tool returns "No relevant documents found", assume the question is off-topic or unknown. Do NOT invent an answer.
//         4. **Inventory**:
//            - Registered Users: Use 'check_vehicle_inventory'.
//            - Guests: Politely decline stock checks.
//         5. **Live Agent**: If you cannot answer, or if the user asks, suggest: "Would you like to speak to a live agent?" and use the handoff tool if they agree.
//         6. **Formatting**: Keep answers concise and use Markdown.
//         `;
//
//         const agent = createAgent({
//             model: llm,
//             tools,
//             systemPrompt,
//         });
//
//         const chat_history = history.reverse().map(msg =>
//             msg.sender === 'customer' ? new HumanMessage(msg.message) : new AIMessage(msg.message)
//         );
//
//         const result = await agent.invoke({
//             messages: [...chat_history, new HumanMessage(userText)],
//         });
//
//         const messages = result.messages as BaseMessage[];
//         const isHandoffTriggered = messages.some((msg) => {
//             return (msg._getType() === "tool" && msg.content.toString().includes("HANDOFF_TRIGGERED_ACTION"));
//         });
//
//         if (isHandoffTriggered) {
//             console.log("🚀 Handoff Signal Detected via Tool Output");
//             return { type: 'handoff', content: "I am connecting you to a live agent now..." };
//         }
//
//         const lastMessage = messages[messages.length - 1];
//         const outputText = lastMessage.content as string;
//
//         if (outputText.toLowerCase().includes("connecting you to a live agent")) {
//             return { type: 'handoff', content: "I am connecting you to a live agent now..." };
//         }
//
//         return { type: 'text', content: outputText };
//
//     } catch (error) {
//         console.error("❌ Agent Runtime Error:", error);
//         return { type: 'text', content: "I apologize, I encountered a temporary system error. Please try again." };
//     }
// }
//
// const onlineAgents = new Map<number, AgentPresence>();
// const chatRoom = (chatId: string) => `chat:${chatId}`;
// const getLangRoom = (lang: string) => `agents:lang:${lang}`;
//
// export default function initSocket(io: Server) {
//     io.on("connection", (socket: Socket) => {
//         const {role, chat_id, user_id} = socket.handshake.query as any;
//
//         if (chat_id) socket.join(chatRoom(String(chat_id)));
//
//         if (role === "agent" && user_id) {
//             const uid = Number(user_id);
//
//             db.User.findByPk(uid).then((user: any) => {
//                 if (user) {
//                     const languages = user.languages || ["en"];
//                     onlineAgents.set(uid, {userId: uid, socketId: socket.id, languages});
//                     socket.join(`agent:${uid}`);
//                     languages.forEach((lang: string) => {
//                         socket.join(getLangRoom(lang));
//                         console.log(`Agent ${uid} joined queue for language: ${lang}`);
//                     });
//                     io.to(socket.id).emit("agent.online", {user_id: uid});
//                     console.log(`Agent ${uid} connected with languages: ${languages.join(", ")}`);
//                 }
//             }).catch((err: any) => console.error("Error fetching agent details", err));
//         }
//
//         socket.on("message.customer", async (payload: MessagePayload) => {
//             const {chat_id, text, attachment} = payload;
//             const session = await db.ChatSession.findOne({where: {chat_id}}) as ChatSession;
//             if (!session) return;
//
//             const customerMsg = await db.ChatMessage.create({
//                 chat_id,
//                 sender: "customer",
//                 message: text || "",
//                 viewed_by_agent: "no",
//                 attachment_url: attachment?.url || null,
//                 attachment_type: attachment?.type || "none",
//                 file_name: attachment?.name || null,
//             });
//
//             io.to(chatRoom(chat_id)).emit("message.new", customerMsg);
//
//             if (session.status === "bot" && text) {
//                 try {
//                     io.to(chatRoom(chat_id)).emit("typing", {by: 'bot'});
//                     let inputForAi = text;
//                     if (session.language !== 'en') {
//                         inputForAi = await TranslateService.translateText(text, 'en');
//                     }
//
//                     const botResult = await processBotMessage(chat_id, inputForAi);
//
//                     if (typeof botResult === 'object' && botResult.type === 'handoff') {
//                         await session.update({status: 'queued', priority: 1});
//                         io.emit("queue.updated");
//                         let finalResponse = botResult.content;
//                         if (session.language !== 'en') {
//                             finalResponse = await TranslateService.translateText(finalResponse, session.language);
//                         }
//                         const sysMsg = await db.ChatMessage.create({
//                             chat_id, sender: "system", message: finalResponse, viewed_by_agent: "no"
//                         });
//                         io.to(chatRoom(chat_id)).emit("message.new", sysMsg);
//                         io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//                         return;
//                     }
//
//                     let finalUserResponse = botResult.content;
//                     if (session.language !== 'en') {
//                         finalUserResponse = await TranslateService.translateText(finalUserResponse, session.language);
//                     }
//
//                     const botMsg = await db.ChatMessage.create({
//                         chat_id,
//                         sender: "bot",
//                         message: finalUserResponse,
//                         viewed_by_agent: "no"
//                     });
//                     io.to(chatRoom(chat_id)).emit("message.new", botMsg);
//
//                 } catch (error: any) {
//                     console.error("Socket-level Error:", error);
//                     let fallbackMessage = "I'm sorry, I'm experiencing technical difficulties at the moment.";
//                     if (error.code === 'insufficient_quota') {
//                         fallbackMessage = "I'm sorry, our AI system is currently at capacity.";
//                     }
//                     const fallbackMsg = await db.ChatMessage.create({
//                         chat_id, sender: "bot", message: fallbackMessage, viewed_by_agent: "no"
//                     });
//                     io.to(chatRoom(chat_id)).emit("message.new", fallbackMsg);
//                 } finally {
//                     io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//                 }
//             } else if (session.status === "bot" && attachment) {
//                 const botReply = await db.ChatMessage.create({
//                     chat_id, sender: "bot",
//                     message: "I received your attachment. An agent will review it shortly.",
//                     viewed_by_agent: "no"
//                 });
//                 io.to(chatRoom(chat_id)).emit("message.new", botReply);
//             } else {
//                 await session.update({
//                     last_message_at: new Date(),
//                     unread_count: db.sequelize.literal("unread_count + 1")
//                 });
//             }
//         });
//
//         socket.on("typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
//             socket.to(chatRoom(chat_id)).emit("typing", {by, chat_id});
//         });
//
//         socket.on("stop_typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
//             socket.to(chatRoom(chat_id)).emit("stop_typing", {by, chat_id});
//         });
//
//         socket.on("message.agent", async (payload: {
//             chat_id: string;
//             text: string;
//             user_id: number;
//             attachment?: any
//         }) => {
//             const {chat_id, text, attachment} = payload;
//             const msg = await db.ChatMessage.create({
//                 chat_id,
//                 sender: "agent",
//                 message: text || "",
//                 viewed_by_agent: "yes",
//                 attachment_url: attachment?.url || null,
//                 attachment_type: attachment?.type || "none",
//                 file_name: attachment?.name || null,
//             });
//             await db.ChatSession.update(
//                 {last_message_at: new Date(), unread_count: 0},
//                 {where: {chat_id}}
//             );
//             io.to(chatRoom(chat_id)).emit("message.new", msg);
//         });
//
//         socket.on("request.agent", async ({chat_id, priority = 0, channel}: any) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session) return;
//             const requiredLanguage = session.language || 'en';
//             await session.update({status: "queued", priority, channel: channel || session.channel});
//             console.log(`Chat ${chat_id} queuing for language: ${requiredLanguage}`);
//             io.to(getLangRoom(requiredLanguage)).emit("queue.updated");
//         });
//
//         socket.on("agent.accept", async ({chat_id, user_id}: { chat_id: string; user_id: number }) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session || session.status === "assigned" || session.status === "closed") return;
//
//             await session.update({status: "assigned", agent_id: user_id});
//             io.to(chatRoom(chat_id)).emit("agent.joined", {agent_id: user_id});
//             io.emit("queue.updated");
//             io.to(`agent:${user_id}`).emit("chat.assigned");
//         });
//
//         socket.on("agent.read", async ({chat_id}: { chat_id: string }) => {
//             if (!chat_id) return;
//             await db.ChatSession.update(
//                 {unread_count: 0},
//                 {where: {chat_id}}
//             );
//         });
//
//         socket.on("join.chat", ({chat_id}) => {
//             if (!chat_id) return;
//             socket.join(`chat:${chat_id}`);
//             console.log(`Agent joined chat room: ${chat_id}`);
//         });
//
//         socket.on("chat.close", async ({chat_id}: { chat_id: string }) => {
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//             if (!session) return;
//             await session.update({status: "closed"});
//             io.to(chatRoom(chat_id)).emit("chat.closed");
//         });
//
//         socket.on("disconnect", () => {
//             if (role === "agent" && user_id) {
//                 const uid = Number(user_id);
//                 onlineAgents.delete(uid);
//                 console.log(`Agent ${user_id} disconnected`);
//             }
//         });
//     });
// }


import { Server, Socket } from "socket.io";
import db from "../models";
import { Pinecone } from "@pinecone-database/pinecone";
import { FeatureExtractionPipeline, pipeline } from "@xenova/transformers";
import { QueryTypes } from "sequelize";
import { TranslateService } from "../services/translate";


import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";
import { ChatSession } from "../models/chatSession.model";


type AgentPresence = {
    userId: number;
    socketId: string;
    languages: string[];
}

interface MessagePayload {
    chat_id: string;
    text: string;
    attachment?: {
        url: string;
        type: "image" | "document";
        name: string;
    }
}

interface BotResponse {
    type: 'text' | 'handoff';
    content: string;
    action?: 'offer_agent' | 'offer_register';
}

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o",
    temperature: 0,
});

let embedder: FeatureExtractionPipeline | null = null;
let dbSchemaCache: string | null = null;

async function getEmbedder() {
    if (!embedder) {
        console.log("⚡ Loading Embedding Model (all-MiniLM-L6-v2)...");
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedder;
}

export async function getGeneralContext(query: string): Promise<string> {
    try {
        const pipeline = await getEmbedder();

        const result = await pipeline(query, { pooling: 'mean', normalize: true });
        const queryEmbedding = Array.from(result.data as number[]);

        const index = pinecone.index(process.env.PINECONE_INDEX!);
        const searchRes = await index.query({
            vector: queryEmbedding,
            topK: 3,
            includeMetadata: true
        });

        if (!searchRes.matches || searchRes.matches.length === 0) {
            return "NO_DATA_FOUND";
        }

        const validMatches = searchRes.matches.filter(match => match.score && match.score > 0.45);

        if (validMatches.length === 0) {
            return "NO_RELEVANT_DATA_FOUND";
        }

        return validMatches
            .map(match => `[Verified Company Info]: ${match.metadata?.text}`)
            .join("\n\n");

    } catch (error) {
        console.error("Vector Search Error:", error);
        return "System Error: Unable to retrieve company information.";
    }
}

async function getDatabaseSchema() {
    if (dbSchemaCache) return dbSchemaCache;
    try {
        const queryInterface = db.sequelize.getQueryInterface();
        let schemaString = "";
        const tablesToDescribe = ['vehicles', 'spare_parts'];

        for (const tableName of tablesToDescribe) {
            try {
                const tableSchema = await queryInterface.describeTable(tableName);
                schemaString += `Table: ${tableName}\nColumns:\n`;
                for (const [column, attributes] of Object.entries(tableSchema)) {
                    schemaString += `  - ${column} (${(attributes as any).type})\n`;
                }
                schemaString += "\n";
            } catch (tableError) {
                console.warn(`Could not describe table ${tableName}. Skipping.`);
            }
        }
        dbSchemaCache = schemaString;
        return dbSchemaCache;
    } catch (error) {
        console.error("Error getting schema:", error);
        return "Error: Could not retrieve DB schema.";
    }
}

const queryDatabase = async (userQuestion: string) => {
    try {
        const schema = await getDatabaseSchema();
        const sqlGenLLM = new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o",
            temperature: 0
        });

        const sqlPrompt = `
        You are a MySQL expert. Write a read-only SELECT query based on this schema:
        ${schema}

        User Question: ${userQuestion}

        Rules:
        1. Return ONLY the raw SQL query. Do not use Markdown (no \`\`\`sql tags).
        2. LIMIT results to 5 unless specified.
        3. Do not use sensitive tables (users, passwords).
        `;

        const aiMsg = await sqlGenLLM.invoke([new HumanMessage(sqlPrompt)]);

        // 1. IMPROVED CLEANING: Remove markdown tags and whitespace
        let sqlQuery = aiMsg.content.toString()
            .replace(/```sql/g, "")
            .replace(/```/g, "")
            .trim();

        const forbiddenPatterns = [
            /\bdrop\b/i,
            /\bdelete\b/i,
            /\bupdate\b/i,
            /\binsert\b/i,
            /\balter\b/i,
            /\btruncate\b/i
        ];

        const isForbidden = forbiddenPatterns.some(pattern => pattern.test(sqlQuery));

        const isSensitiveTable = /\busers\b/i.test(sqlQuery);

        if (isForbidden || isSensitiveTable) {
            console.warn(`Blocked Query: ${sqlQuery}`);
            return "SECURITY_ALERT: Query blocked due to forbidden commands.";
        }

        console.log("Executing SQL:", sqlQuery);
        const results = await db.sequelize.query(sqlQuery, { type: QueryTypes.SELECT });

        if (!results || results.length === 0) {
            return "No records found in the database matching that criteria.";
        }

        return JSON.stringify(results);
    } catch (e) {
        console.error("SQL Tool Error:", e);
        return "Error executing database query.";
    }
};


export async function processBotMessage(chat_id: string, userText: string): Promise<BotResponse> {
    try {
        const session = await db.ChatSession.findOne({ where: { chat_id } });
        if (!session) return { type: 'text', content: "Session expired." };

        const history = await db.ChatMessage.findAll({
            where: { chat_id },
            order: [["createdAt", "DESC"]],
            limit: 8
        });

        const vectorTool = new DynamicStructuredTool({
            name: "get_general_company_info",
            description: "PRIMARY SOURCE: Use this to check if a question is related to Indra Traders, services, locations, or policies.",
            schema: z.object({ query: z.string().describe("The specific search topic") }),
            func: async ({ query }) => await getGeneralContext(query),
        });

        const handoffTool = new DynamicStructuredTool({
            name: "transfer_to_live_agent",
            description: "Use this if the user explicitly asks for a human, agent, or support.",
            schema: z.object({ reason: z.string() }),
            func: async ({ reason }) => {
                return "HANDOFF_TRIGGERED_ACTION";
            },
        });

        const dbTool = new DynamicStructuredTool({
            name: "check_vehicle_inventory",
            description: "Queries the SQL database for vehicle stock/prices, spare parts details.",
            schema: z.object({ question: z.string().describe("User question about stock") }),
            func: async ({ question }) => await queryDatabase(question),
        });

        const tools: any[] = [vectorTool, handoffTool];
        if (session.user_type === 'registered') {
            tools.push(dbTool);
        }

        const systemPrompt = `You are 'Indra Assistant', a specialized AI for Indra Traders.

        CONTEXT:
        - User: ${session.customer_name || 'Guest'}
        - Type: ${session.user_type}
        - Date: ${new Date().toDateString()}

        ⛔ **STRICT SCOPE PROTOCOL (MUST FOLLOW)**:
        1. **Domain Restriction**: You are ONLY allowed to answer questions about **Indra Traders, Vehicles, Spare Parts, and Services**.
        2. **General Knowledge Ban**: Do NOT answer general world questions (e.g., "Capital of India", "Who is the President", "Weather", "Math"). 
           - IF the user asks an off-topic question, you MUST reply: "I apologize, but I do not have information about that. I can only assist with inquiries related to Indra Traders vehicles and services.suggest: "Would you like to speak to a live agent?" and use the handoff tool if they agree."
        3. **Tool Reliance**: You do not know company facts internally. You MUST use 'get_general_company_info'.
           - IF the tool returns "No relevant documents found", assume the question is off-topic or unknown. Do NOT invent an answer.
        4. **Guest Inventory Access**: 
           - If a **Guest** asks for vehicle details, stock, or prices, you MUST reply: "I apologize, but you are currently browsing as a Guest. Please register or login to view live vehicle inventory and prices."
           - Do NOT attempt to use the database tool for guests.
            - Registered Users: Use 'check_vehicle_inventory'.
        5. **Live Agent**: If you cannot answer, or if the user asks, suggest: "Would you like to speak to a live agent?" and use the handoff tool if they agree.
        6. **Formatting**: Keep answers concise and use Markdown.
        `;

        const agent = createAgent({
            model: llm,
            tools,
            systemPrompt,
        });

        const chat_history = history.reverse().map(msg =>
            msg.sender === 'customer' ? new HumanMessage(msg.message) : new AIMessage(msg.message)
        );

        const result = await agent.invoke({
            messages: [...chat_history, new HumanMessage(userText)],
        });

        const messages = result.messages as BaseMessage[];
        const isHandoffTriggered = messages.some((msg) => {
            return (msg._getType() === "tool" && msg.content.toString().includes("HANDOFF_TRIGGERED_ACTION"));
        });

        if (isHandoffTriggered) {
            console.log("🚀 Handoff Signal Detected via Tool Output");
            return { type: 'handoff', content: "I am connecting you to a live agent now..." };
        }

        const lastMessage = messages[messages.length - 1];
        const outputText = lastMessage.content as string;

        let action: 'offer_agent' | 'offer_register' | undefined;

        if (outputText.includes("browsing as a Guest") || outputText.includes("Please register")) {
            action = 'offer_register';
        }
        else if (outputText.toLowerCase().includes("speak to a live agent") || outputText.toLowerCase().includes("contact a live agent")) {
            action = 'offer_agent';
        }

        if (outputText.toLowerCase().includes("connecting you to a live agent")) {
            return { type: 'handoff', content: "I am connecting you to a live agent now..." };
        }

        return { type: 'text', content: outputText, action };

    } catch (error) {
        console.error("❌ Agent Runtime Error:", error);
        return { type: 'text', content: "I apologize, I encountered a temporary system error. Please try again." };
    }
}

const onlineAgents = new Map<number, AgentPresence>();
const chatRoom = (chatId: string) => `chat:${chatId}`;
const getLangRoom = (lang: string) => `agents:lang:${lang}`;

export default function initSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        const {role, chat_id, user_id} = socket.handshake.query as any;

        if (chat_id) socket.join(chatRoom(String(chat_id)));

        if (role === "agent" && user_id) {
            const uid = Number(user_id);

            db.User.findByPk(uid).then((user: any) => {
                if (user) {
                    let languages: string[] = ["en"];

                    if (user.languages) {
                        if (Array.isArray(user.languages)) {
                            languages = user.languages;
                        } else if (typeof user.languages === 'string') {
                            try {
                                const parsed = JSON.parse(user.languages);
                                if (Array.isArray(parsed)) {
                                    languages = parsed;
                                }
                            } catch (e) {
                                console.error(`Failed to parse languages for agent ${uid}`, e);
                            }
                        }
                    }

                    // const languages = user.languages || ["en"];
                    onlineAgents.set(uid, {userId: uid, socketId: socket.id, languages});
                    socket.join(`agent:${uid}`);
                    // languages.forEach((lang: string) => {
                    //     socket.join(getLangRoom(lang));
                    //     console.log(`Agent ${uid} joined queue for language: ${lang}`);
                    // });

                    languages.forEach((lang: string) => {
                        socket.join(getLangRoom(lang));
                        console.log(`Agent ${uid} joined queue for language: ${lang}`);
                    });

                    io.to(socket.id).emit("agent.online", {user_id: uid});
                    console.log(`Agent ${uid} connected with languages: ${languages.join(", ")}`);
                }
            }).catch((err: any) => console.error("Error fetching agent details", err));
        }

        socket.on("message.customer", async (payload: MessagePayload) => {
            const {chat_id, text, attachment} = payload;
            const session = await db.ChatSession.findOne({where: {chat_id}}) as ChatSession;
            if (!session) return;

            const customerMsg = await db.ChatMessage.create({
                chat_id,
                sender: "customer",
                message: text || "",
                viewed_by_agent: "no",
                attachment_url: attachment?.url || null,
                attachment_type: attachment?.type || "none",
                file_name: attachment?.name || null,
            });

            io.to(chatRoom(chat_id)).emit("message.new", customerMsg);

            if (session.status === "bot" && text) {
                try {
                    io.to(chatRoom(chat_id)).emit("typing", {by: 'bot'});
                    let inputForAi = text;
                    if (session.language !== 'en') {
                        inputForAi = await TranslateService.translateText(text, 'en');
                    }

                    const botResult = await processBotMessage(chat_id, inputForAi);

                    if (typeof botResult === 'object' && botResult.type === 'handoff') {
                        await session.update({status: 'queued', priority: 1});
                        io.emit("queue.updated");
                        let finalResponse = botResult.content;
                        if (session.language !== 'en') {
                            finalResponse = await TranslateService.translateText(finalResponse, session.language);
                        }
                        const sysMsg = await db.ChatMessage.create({
                            chat_id, sender: "system", message: finalResponse, viewed_by_agent: "no"
                        });
                        io.to(chatRoom(chat_id)).emit("message.new", sysMsg);
                        io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
                        return;
                    }

                    let finalUserResponse = botResult.content;
                    if (session.language !== 'en') {
                        finalUserResponse = await TranslateService.translateText(finalUserResponse, session.language);
                    }

                    const botMsg = await db.ChatMessage.create({
                        chat_id,
                        sender: "bot",
                        message: finalUserResponse,
                        viewed_by_agent: "no"
                    });
                    // io.to(chatRoom(chat_id)).emit("message.new", botMsg);

                    io.to(chatRoom(chat_id)).emit("message.new", {
                        ...botMsg.toJSON(),
                        action: botResult.action
                    });

                } catch (error: any) {
                    console.error("Socket-level Error:", error);
                    let fallbackMessage = "I'm sorry, I'm experiencing technical difficulties at the moment.";
                    if (error.code === 'insufficient_quota') {
                        fallbackMessage = "I'm sorry, our AI system is currently at capacity.";
                    }
                    const fallbackMsg = await db.ChatMessage.create({
                        chat_id, sender: "bot", message: fallbackMessage, viewed_by_agent: "no"
                    });
                    io.to(chatRoom(chat_id)).emit("message.new", fallbackMsg);
                } finally {
                    io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
                }
            } else if (session.status === "bot" && attachment) {
                const botReply = await db.ChatMessage.create({
                    chat_id, sender: "bot",
                    message: "I received your attachment. An agent will review it shortly.",
                    viewed_by_agent: "no"
                });
                io.to(chatRoom(chat_id)).emit("message.new", botReply);
            } else {
                await session.update({
                    last_message_at: new Date(),
                    unread_count: db.sequelize.literal("unread_count + 1")
                });
            }
        });

        socket.on("typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
            socket.to(chatRoom(chat_id)).emit("typing", {by, chat_id});
        });

        socket.on("stop_typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
            socket.to(chatRoom(chat_id)).emit("stop_typing", {by, chat_id});
        });

        socket.on("message.agent", async (payload: {
            chat_id: string;
            text: string;
            user_id: number;
            attachment?: any
        }) => {
            const {chat_id, text, attachment} = payload;
            const msg = await db.ChatMessage.create({
                chat_id,
                sender: "agent",
                message: text || "",
                viewed_by_agent: "yes",
                attachment_url: attachment?.url || null,
                attachment_type: attachment?.type || "none",
                file_name: attachment?.name || null,
            });
            await db.ChatSession.update(
                {last_message_at: new Date(), unread_count: 0},
                {where: {chat_id}}
            );
            io.to(chatRoom(chat_id)).emit("message.new", msg);
        });

        socket.on("request.agent", async ({chat_id, priority = 0, channel}: any) => {
            const session = await db.ChatSession.findOne({where: {chat_id}});
            if (!session) return;
            const requiredLanguage = session.language || 'en';
            await session.update({status: "queued", priority, channel: channel || session.channel});
            console.log(`Chat ${chat_id} queuing for language: ${requiredLanguage}`);
            io.to(getLangRoom(requiredLanguage)).emit("queue.updated");
        });

        socket.on("agent.accept", async ({chat_id, user_id}: { chat_id: string; user_id: number }) => {
            const session = await db.ChatSession.findOne({where: {chat_id}});
            if (!session || session.status === "assigned" || session.status === "closed") return;

            await session.update({status: "assigned", agent_id: user_id});
            io.to(chatRoom(chat_id)).emit("agent.joined", {agent_id: user_id});
            io.emit("queue.updated");
            io.to(`agent:${user_id}`).emit("chat.assigned");
        });

        socket.on("agent.read", async ({chat_id}: { chat_id: string }) => {
            if (!chat_id) return;
            await db.ChatSession.update(
                {unread_count: 0},
                {where: {chat_id}}
            );
        });

        socket.on("join.chat", ({chat_id}) => {
            if (!chat_id) return;
            socket.join(`chat:${chat_id}`);
            console.log(`Agent joined chat room: ${chat_id}`);
        });

        socket.on("chat.close", async ({chat_id}: { chat_id: string }) => {
            const session = await db.ChatSession.findOne({where: {chat_id}});
            if (!session) return;
            await session.update({status: "closed"});
            io.to(chatRoom(chat_id)).emit("chat.closed");
        });

        socket.on("disconnect", () => {
            if (role === "agent" && user_id) {
                const uid = Number(user_id);
                onlineAgents.delete(uid);
                console.log(`Agent ${user_id} disconnected`);
            }
        });
    });
}