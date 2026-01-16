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


// fully work for web chat
// import {Server, Socket} from "socket.io";
// import db from "../models";
// import {Pinecone} from "@pinecone-database/pinecone";
// import {FeatureExtractionPipeline, pipeline} from "@xenova/transformers";
// import {QueryTypes} from "sequelize";
// import {TranslateService} from "../services/translate";
//
//
// import {ChatOpenAI} from "@langchain/openai";
// import {DynamicStructuredTool} from "@langchain/core/tools";
// import {z} from "zod";
// import {HumanMessage, AIMessage, BaseMessage} from "@langchain/core/messages";
// import {createAgent} from "langchain";
// import {ChatSession} from "../models/chatSession.model";
// import {WahaService} from "../services/waha";
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
// interface BotResponse {
//     type: 'text' | 'handoff';
//     content: string;
//     action?: 'offer_agent' | 'offer_register';
// }
//
// const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY!});
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
//         const result = await pipeline(query, {pooling: 'mean', normalize: true});
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
//         const forbiddenPatterns = [
//             /\bdrop\b/i,
//             /\bdelete\b/i,
//             /\bupdate\b/i,
//             /\binsert\b/i,
//             /\balter\b/i,
//             /\btruncate\b/i
//         ];
//
//         const isForbidden = forbiddenPatterns.some(pattern => pattern.test(sqlQuery));
//
//         const isSensitiveTable = /\busers\b/i.test(sqlQuery);
//
//         if (isForbidden || isSensitiveTable) {
//             console.warn(`Blocked Query: ${sqlQuery}`);
//             return "SECURITY_ALERT: Query blocked due to forbidden commands.";
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
// export async function processBotMessage(chat_id: string, userText: string): Promise<BotResponse> {
//     try {
//         const session = await db.ChatSession.findOne({where: {chat_id}});
//         if (!session) return {type: 'text', content: "Session expired."};
//
//         const history = await db.ChatMessage.findAll({
//             where: {chat_id},
//             order: [["createdAt", "DESC"]],
//             limit: 8
//         });
//
//         const vectorTool = new DynamicStructuredTool({
//             name: "get_general_company_info",
//             description: "PRIMARY SOURCE: Use this to check if a question is related to Indra Traders, services, locations, or policies.",
//             schema: z.object({query: z.string().describe("The specific search topic")}),
//             func: async ({query}) => await getGeneralContext(query),
//         });
//
//         const handoffTool = new DynamicStructuredTool({
//             name: "transfer_to_live_agent",
//             description: "Use this if the user explicitly asks for a human, agent, or support.",
//             schema: z.object({reason: z.string()}),
//             func: async ({reason}) => {
//                 return "HANDOFF_TRIGGERED_ACTION";
//             },
//         });
//
//         const dbTool = new DynamicStructuredTool({
//             name: "check_vehicle_inventory",
//             description: "Queries the SQL database for vehicle stock/prices, spare parts details.",
//             schema: z.object({question: z.string().describe("User question about stock")}),
//             func: async ({question}) => await queryDatabase(question),
//         });
//
//         const tools: any[] = [vectorTool, handoffTool];
//         if (session.user_type === 'registered') {
//             tools.push(dbTool);
//         }
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
//         4. **Guest Inventory Access**:
//            - If a **Guest** asks for vehicle details, stock, or prices, you MUST reply: "I apologize, but you are currently browsing as a Guest. Please register or login to view live vehicle inventory and prices."
//            - Do NOT attempt to use the database tool for guests.
//             - Registered Users: Use 'check_vehicle_inventory'.
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
//             return {type: 'handoff', content: "I am connecting you to a live agent now..."};
//         }
//
//         const lastMessage = messages[messages.length - 1];
//         const outputText = lastMessage.content as string;
//
//         let action: 'offer_agent' | 'offer_register' | undefined;
//
//         if (outputText.includes("browsing as a Guest") || outputText.includes("Please register")) {
//             action = 'offer_register';
//         } else if (outputText.toLowerCase().includes("speak to a live agent") || outputText.toLowerCase().includes("contact a live agent")) {
//             action = 'offer_agent';
//         }
//
//         if (outputText.toLowerCase().includes("connecting you to a live agent")) {
//             return {type: 'handoff', content: "I am connecting you to a live agent now..."};
//         }
//
//         return {type: 'text', content: outputText, action};
//
//     } catch (error) {
//         console.error("❌ Agent Runtime Error:", error);
//         return {type: 'text', content: "I apologize, I encountered a temporary system error. Please try again."};
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
//                     let languages: string[] = ["en"];
//
//                     if (user.languages) {
//                         if (Array.isArray(user.languages)) {
//                             languages = user.languages;
//                         } else if (typeof user.languages === 'string') {
//                             try {
//                                 const parsed = JSON.parse(user.languages);
//                                 if (Array.isArray(parsed)) {
//                                     languages = parsed;
//                                 }
//                             } catch (e) {
//                                 console.error(`Failed to parse languages for agent ${uid}`, e);
//                             }
//                         }
//                     }
//
//                     // const languages = user.languages || ["en"];
//                     onlineAgents.set(uid, {userId: uid, socketId: socket.id, languages});
//                     socket.join(`agent:${uid}`);
//                     // languages.forEach((lang: string) => {
//                     //     socket.join(getLangRoom(lang));
//                     //     console.log(`Agent ${uid} joined queue for language: ${lang}`);
//                     // });
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
//                     // io.to(chatRoom(chat_id)).emit("message.new", botMsg);
//
//                     io.to(chatRoom(chat_id)).emit("message.new", {
//                         ...botMsg.toJSON(),
//                         action: botResult.action
//                     });
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
//
//             const session = await db.ChatSession.findOne({where: {chat_id}});
//
//             if (session) {
//                 await session.update({
//                     last_message_at: new Date(), unread_count: 0
//                 });
//
//                 if (session.channel === 'WhatsApp') {
//
//                     let targetNumber = session.customer_contact || session.chat_id;
//
//                     // const wahaId = WahaService.formatPhone(targetNumber);
//
//                     // const wahaId = `${targetNumber}@c.us`;
//                     const wahaId = WahaService.formatPhone(chat_id);
//
//                     await WahaService.sendText(wahaId, text);
//                     console.log(`[Agent Reply] DB ID: ${chat_id} | Phone: ${targetNumber}`);
//                 }
//             }
//
//             // await db.ChatSession.update(
//             //     {last_message_at: new Date(), unread_count: 0},
//             //     {where: {chat_id}}
//             // );
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
//
//             if (session.channel === 'WhatsApp') {
//                 await session.update({status: "closed", agent_id: null});
//             } else {
//                 await session.update({status: "closed"});
//             }
//
//             io.to(chatRoom(chat_id)).emit("chat.closed");
//             console.log(`Chat ${chat_id} closed by agent.`);
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


import {Server, Socket} from "socket.io";
import db from "../models";
import {Pinecone} from "@pinecone-database/pinecone";
// import {FeatureExtractionPipeline, pipeline} from "@xenova/transformers";
import {QueryTypes, Op} from "sequelize";
import {TranslateService} from "../services/translate";


import {ChatOpenAI} from "@langchain/openai";
import {DynamicStructuredTool} from "@langchain/core/tools";
import {z} from "zod";
import {HumanMessage, AIMessage, BaseMessage} from "@langchain/core/messages";
import {createAgent} from "langchain";
import {ChatSession} from "../models/chatSession.model";
import {WahaService} from "../services/waha";


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

const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY!});

const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o",
    temperature: 0,
});

// let embedder: FeatureExtractionPipeline | null = null;
let embedder: any | null = null;
let dbSchemaCache: string | null = null;

const BOT_USER_ID = 1;

async function getEmbedder() {
    if (!embedder) {
        console.log("⚡ Loading Embedding Model (all-MiniLM-L6-v2)...");
        //line added to resolve crashin on windows
        const { pipeline } = await (eval('import("@xenova/transformers")') as Promise<typeof import("@xenova/transformers")>);
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedder;
}

export async function getGeneralContext(query: string): Promise<string> {
    try {
        const pipeline = await getEmbedder();

        const result = await pipeline(query, {pooling: 'mean', normalize: true});
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
        const results = await db.sequelize.query(sqlQuery, {type: QueryTypes.SELECT});

        if (!results || results.length === 0) {
            return "No records found in the database matching that criteria.";
        }

        return JSON.stringify(results);
    } catch (e) {
        console.error("SQL Tool Error:", e);
        return "Error executing database query.";
    }
};

async function ensureCustomer(phone: string, name: string) {
    let customer = await db.Customer.findOne({where: {phone_number: phone}});
    if (!customer) {
        customer = await db.Customer.create({
            id: `CUS${Date.now()}`,
            customer_name: name,
            phone_number: phone,
            lead_source: "AI Chatbot"
        });
    }
    return customer;
}


export async function processBotMessage(chat_id: string, userText: string): Promise<BotResponse> {
    try {
        const session = await db.ChatSession.findOne({where: {chat_id}});
        if (!session) return {type: 'text', content: "Session expired."};

        const history = await db.ChatMessage.findAll({
            where: {chat_id},
            order: [["createdAt", "DESC"]],
            limit: 8
        });

        const vectorTool = new DynamicStructuredTool({
            name: "get_general_company_info",
            description: "PRIMARY SOURCE: Use this to check if a question is related to Indra Traders, services, locations, or policies.",
            schema: z.object({query: z.string().describe("The specific search topic")}),
            func: async ({query}) => await getGeneralContext(query),
        });

        const handoffTool = new DynamicStructuredTool({
            name: "transfer_to_live_agent",
            description: "Use this if the user explicitly asks for a human, agent, or support.",
            schema: z.object({reason: z.string()}),
            func: async ({reason}) => {
                return "HANDOFF_TRIGGERED_ACTION";
            },
        });

        const dbTool = new DynamicStructuredTool({
            name: "check_vehicle_inventory",
            description: "Queries the SQL database for vehicle stock/prices, spare parts details.",
            schema: z.object({question: z.string().describe("User question about stock")}),
            func: async ({question}) => await queryDatabase(question),
        });

        const verifyUserTool = new DynamicStructuredTool({
            name: "verify_customer_access",
            description: "Use this when a Guest user on WhatsApp or Facebook provides their phone number to access inventory.",
            schema: z.object({
                phoneNumber: z.string().describe("The phone number provided by the user")
            }),
            func: async ({phoneNumber}) => {
                try {
                    const cleanNum = phoneNumber.replace(/\D/g, '').slice(-9);
                    const customer = await db.Customer.findOne({
                        where: {
                            phone_number: {
                                [Op.like]: `%${cleanNum}%`
                            }
                        }
                    });

                    if (customer) {
                        await session.update({
                            user_type: 'registered',
                            customer_contact: customer.phone_number,
                            customer_name: customer.customer_name
                        });
                        return `VERIFICATION_SUCCESS: User identified as ${customer.customer_name}. Access granted to inventory. Please proceed to answer their inventory question now.`;
                    } else {
                        return "VERIFICATION_FAILED: This number is not found in our customer records. Access denied.";
                    }
                } catch (e) {
                    console.error("Verification Tool Error", e);
                    return "SYSTEM_ERROR: Could not verify at this time.";
                }
            }
        });

        const vehicleSaleLeadTool = new DynamicStructuredTool({
            name: "create_vehicle_sales_lead",
            description: "Create a lead when user wants to BUY a vehicle. REQUIRES Name and Phone.",
            schema: z.object({
                customerName: z.string(),
                contactNumber: z.string(),
                vehicleMake: z.string(),
                vehicleModel: z.string(),
                year: z.number().optional(),
                budget: z.string().optional()
            }),
            func: async (input) => {
                try {
                    const customer = await ensureCustomer(input.contactNumber, input.customerName);
                    const sale = await db.VehicleSale.create({
                        ticket_number: `ITPL${Date.now()}`,
                        date: new Date(),
                        status: "NEW",
                        customer_id: customer.id,
                        call_agent_id: BOT_USER_ID,
                        branch: "KANDY",
                        current_level: 1,
                        vehicle_make: input.vehicleMake,
                        vehicle_model: input.vehicleModel,
                        manufacture_year: input.year || new Date().getFullYear(),
                        transmission: "AUTO",
                        fuel_type: "PETROL",
                        down_payment: 0,
                        price_from: 0,
                        price_to: 0,
                        additional_note: `Generated by AI. Budget: ${input.budget || 'N/A'}`
                    });
                    return `SUCCESS: Vehicle Sales Lead created (Ticket: ${sale.ticket_number}). An agent will contact you soon.`;
                } catch (e: any) {
                    console.error(e);
                    return "ERROR: Could not create lead. Please try again later.";
                }
            }
        });


        const sparePartsLeadTool = new DynamicStructuredTool({
            name: "create_spare_parts_lead",
            description: "Create a lead when user wants to BUY spare parts. REQUIRES Name and Phone.",
            schema: z.object({
                customerName: z.string(),
                contactNumber: z.string(),
                partName: z.string(),
                vehicleModel: z.string().optional()
            }),
            func: async (input) => {
                try {
                    const customer = await ensureCustomer(input.contactNumber, input.customerName);
                    const sale = await db.SparePartSale.create({
                        ticket_number: `IMS${Date.now()}`,
                        date: new Date(),
                        status: "NEW",
                        customer_id: customer.id,
                        call_agent_id: BOT_USER_ID,
                        branch: "KANDY",
                        current_level: 1,
                        part_no: input.partName,
                        vehicle_model: input.vehicleModel || "Unknown",
                        additional_note: "Generated by AI"
                    });
                    return `SUCCESS: Spare Parts Request created (Ticket: ${sale.ticket_number}).`;
                } catch (e: any) {
                    console.error(e);
                    return "ERROR: Could not create request.";
                }
            }
        });


        const serviceBookingTool = new DynamicStructuredTool({
            name: "create_service_booking",
            description: "Create a lead/booking for Vehicle Service (Service Park). REQUIRES Name and Phone.",
            schema: z.object({
                customerName: z.string(),
                contactNumber: z.string(),
                vehicleNumber: z.string(),
                serviceType: z.string().describe("e.g. Full Service, Oil Change, Repair")
            }),
            func: async (input) => {
                try {
                    const customer = await ensureCustomer(input.contactNumber, input.customerName);

                    let vehicle = null;
                    if(db.ServiceParkVehicleHistory) {
                        vehicle = await db.ServiceParkVehicleHistory.findOne({where: {vehicle_no: input.vehicleNumber}});
                        if (!vehicle) {
                            vehicle = await db.ServiceParkVehicleHistory.create({
                                vehicle_no: input.vehicleNumber,
                                customer_id: customer.id,
                                owner_name: input.customerName,
                                contact_no: input.contactNumber,
                                odometer: 0,
                                created_by: BOT_USER_ID
                            });
                        }
                    } else {
                        return "SYSTEM_ERROR: Service Park Vehicle History model not found.";
                    }

                    const sale = await db.ServiceParkSale.create({
                        ticket_number: `ISP${Date.now()}`,
                        date: new Date(),
                        status: "NEW",
                        customer_id: customer.id,
                        vehicle_id: vehicle.id,
                        branch: "KANDY",
                        sales_user_id: null,
                        current_level: 1,
                        service_category: input.serviceType,
                        vehicle_make: "Unknown",
                        vehicle_model: "Unknown",
                        year_of_manufacture: new Date().getFullYear(),
                        additional_note: `Generated by AI Booking. Created by Bot.`,
                        priority: 0
                    });
                    return `SUCCESS: Service Booking Request created (Ticket: ${sale.ticket_number}).`;
                } catch (e: any) {
                    console.error("Error creating service booking:", e);
                    return "ERROR: Could not create booking.";
                }
            }
        });


        const fastTrackLeadTool = new DynamicStructuredTool({
            name: "create_fast_track_lead",
            description: "Create a lead for Buying/Selling Used Vehicles (Fast Track). REQUIRES Name and Phone.",
            schema: z.object({
                customerName: z.string(),
                contactNumber: z.string(),
                intent: z.enum(['BUY', 'SELL']).describe("Does user want to buy or sell?"),
                vehicleDetails: z.string().describe("Make, Model, Year, etc.")
            }),
            func: async (input) => {
                try {
                    const customer = await ensureCustomer(input.contactNumber, input.customerName);

                    const request = await db.FastTrackRequest.create({
                        customer_id: customer.id,
                        status: "PENDING",
                        call_agent_id: BOT_USER_ID,
                        vehicle_type: "Car",
                        vehicle_make: "Unknown",
                        vehicle_model: "Unknown",
                        grade: "Any",
                        manufacture_year: new Date().getFullYear(),
                        mileage_min: 0,
                        mileage_max: 0,
                        no_of_owners: 0,
                        price_from: 0,
                        price_to: 0,
                    });

                    return `SUCCESS: Fast Track (${input.intent}) enquiry created. Reference: ${request.id}. Details: ${input.vehicleDetails}`;
                } catch (e: any) {
                    console.error("Error creating fast track lead:", e);
                    return "ERROR: Could not create inquiry.";
                }
            }
        });


        const tools: any[] = [vectorTool, handoffTool, vehicleSaleLeadTool, sparePartsLeadTool, serviceBookingTool, fastTrackLeadTool];
        if (session.user_type === 'registered') {
            tools.push(dbTool);
        } else {
            tools.push(verifyUserTool);
        }

        const channelContext = session.channel || "Web";

        const knownName = session.customer_name ? `(Name: ${session.customer_name})` : "(Name: Unknown)";
        const knownPhone = session.customer_contact ? `(Phone: ${session.customer_contact})` : "(Phone: Unknown)";


        const systemPrompt = `You are 'Indra Assistant', a specialized AI for Indra Traders.

        CONTEXT:
        - User: ${session.customer_name || session.user_type.toUpperCase(), knownName, knownPhone || 'Guest'}
        - Type: ${session.user_type}
        - Date: ${new Date().toDateString()}
        - Platform: ${channelContext}

        ⛔ **STRICT SCOPE PROTOCOL (MUST FOLLOW)**:
        1. **Domain Restriction**: You are ONLY allowed to answer questions about **Indra Traders, Vehicles, Spare Parts, and Services**.
        2. **General Knowledge Ban**: Do NOT answer general world questions (e.g., "Capital of India", "Who is the President", "Weather", "Math"). 
           - IF the user asks an off-topic question, you MUST reply: "I apologize, but I do not have information about that. I can only assist with inquiries related to Indra Traders vehicles and services.suggest: "Would you like to speak to a live agent?" and use the handoff tool if they agree."
        3. **Tool Reliance**: You do not know company facts internally. You MUST use 'get_general_company_info'.
           - IF the tool returns "No relevant documents found", assume the question is off-topic or unknown. Do NOT invent an answer.
        4. **Inventory Access Rules**:
           - **IF Status is REGISTERED**: You CAN use 'check_vehicle_inventory' to answer price/stock questions.
           - **IF Status is GUEST**:
             - **On WEB**: Reply exactly: "Please register or login to view live inventory and prices."
             - **On WHATSAPP / FACEBOOK**: 
               - If they ask about prices/stock, reply: "To view live inventory prices, I need to verify you. Please enter your registered phone number."
               - If they provide a number, IMMEDIATELEY use 'verify_customer_access'.
        5. **Lead Generation (New Sales/Service)**:
           - Analyze if the user wants to:
             A. Buy a Vehicle -> use 'create_vehicle_sales_lead'
             B. Buy Spare Parts -> use 'create_spare_parts_lead'
             C. Service a Vehicle -> use 'create_service_booking'
             D. Buy/Sell Used Car -> use 'create_fast_track_lead'
           - **Rule**: You CANNOT call these tools without **Name** and **Phone Number**.
           - **Logic**: 
             - If you already know Name/Phone (from Context), ask for missing vehicle details, then call the tool.
             - If you DO NOT know Name/Phone, ask the user: "To assist you further/create a request, may I have your Name and Phone Number?"
             - Once you have the info, call the specific tool immediately.
        6. **Verification**: 
           - If 'verify_customer_access' returns SUCCESS, immediately check the inventory for what they originally wanted (if known) or ask "What vehicle are you looking for?".
           - If FAILED, apologize and suggest contacting support.
        7. **Live Agent**: If you cannot answer, or if the user asks, suggest: "Would you like to speak to a live agent?" and use the handoff tool if they agree.
        8. **Formatting**: Keep answers concise and use Markdown.
        9. **Confirmation**: After a tool returns "SUCCESS...", tell the user: "Your request has been created successfully! Our team will contact you soon."
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
            return {type: 'handoff', content: "I am connecting you to a live agent now..."};
        }

        const lastMessage = messages[messages.length - 1];
        const outputText = lastMessage.content as string;

        let action: 'offer_agent' | 'offer_register' | undefined;

        if (outputText.includes("browsing as a Guest") || outputText.includes("Please register")) {
            action = 'offer_register';
        } else if (outputText.toLowerCase().includes("speak to a live agent") || outputText.toLowerCase().includes("contact a live agent")) {
            action = 'offer_agent';
        }

        if (outputText.toLowerCase().includes("connecting you to a live agent")) {
            return {type: 'handoff', content: "I am connecting you to a live agent now..."};
        }

        return {type: 'text', content: outputText, action};

    } catch (error) {
        console.error("❌ Agent Runtime Error:", error);
        return {type: 'text', content: "I apologize, I encountered a temporary system error. Please try again."};
    }
}

const onlineAgents = new Map<number, AgentPresence>();
const chatRoom = (chatId: string) => `chat:${chatId}`;
const getLangRoom = (lang: string) => `agents:lang:${lang}`;

export default function initChatSocket(io: Server) {
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

            const session = await db.ChatSession.findOne({where: {chat_id}});

            if (session) {
                await session.update({
                    last_message_at: new Date(), unread_count: 0
                });

                if (session.channel === 'WhatsApp') {

                    let targetNumber = session.customer_contact || session.chat_id;

                    // const wahaId = WahaService.formatPhone(targetNumber);

                    // const wahaId = `${targetNumber}@c.us`;
                    const wahaId = WahaService.formatPhone(chat_id);

                    await WahaService.sendText(wahaId, text);
                    console.log(`[Agent Reply] DB ID: ${chat_id} | Phone: ${targetNumber}`);
                }
            }

            // await db.ChatSession.update(
            //     {last_message_at: new Date(), unread_count: 0},
            //     {where: {chat_id}}
            // );
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

            if (session.channel === 'WhatsApp') {
                await session.update({status: "closed", agent_id: null});
            } else {
                await session.update({status: "closed"});
            }

            io.to(chatRoom(chat_id)).emit("chat.closed");
            console.log(`Chat ${chat_id} closed by agent.`);
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