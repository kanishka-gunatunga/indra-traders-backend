// import {Server, Socket} from "socket.io";
// import db from "../models";
// import {Pinecone} from "@pinecone-database/pinecone";
// import {FeatureExtractionPipeline, pipeline} from "@xenova/transformers";
// import Groq from "groq-sdk";
// import {QueryTypes} from "sequelize"; // Import QueryTypes
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
//     if (dbSchemaCache) {
//         return dbSchemaCache;
//     }
//     try {
//         const queryInterface = db.sequelize.getQueryInterface();
//         // --- IMPORTANT: Use your *actual* table name here ---
//         const tableSchema = await queryInterface.describeTable('vehicles');
//
//         let schemaString = `Table: vehicles\nColumns:\n`;
//         for (const [column, attributes] of Object.entries(tableSchema)) {
//             // e.g., "id (INTEGER)", "make (VARCHAR(255))"
//             schemaString += `  - ${column} (${(attributes as any).type})\n`;
//         }
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
//  * It takes a natural language question and returns a natural language answer.
//  */
// async function answerVehicleQuestion(question: string) {
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
//             model: "llama-3.3-70b-versatile",
//             messages: [{role: "user", content: sqlGenPrompt}],
//             temperature: 0.0
//         });
//
//         let sqlQuery = sqlResponse.choices[0].message.content || "";
//         console.log("---------- sql query: ", sqlQuery);
//         sqlQuery = sqlQuery.replace(/```sql|```/g, "").trim(); // Clean up markdown
//
//         // --- SECURITY: Enforce Read-Only ---
//         if (!sqlQuery.toUpperCase().startsWith("SELECT")) {
//             console.warn(`Blocked non-SELECT query: ${sqlQuery}`);
//             return "I can only perform read-only operations on the vehicle database.";
//         }
//
//         // --- Step 2c: Run Query ---
//         const [queryResult] = await db.sequelize.query(sqlQuery, {type: QueryTypes.SELECT});
//         const resultString = JSON.stringify(queryResult);
//
//         // --- Step 2d (AI Pass 2): Summarize Results ---
//         const summaryPrompt = `
//             You are 'Indra Assistant'. A user asked a question, a SQL query was run, and here is the result from the database.
//             Your job is to answer the user's original question in natural, friendly language based *only* on this result.
//
//             User Question:
//             ${question}
//
//             SQL Query That Was Run:
//             ${sqlQuery}
//
//             Database Result (in JSON):
//             ${resultString}
//
//             Please provide a helpful answer to the user:
//             `;
//
//         const summaryResponse = await groq.chat.completions.create({
//             model: "llama-3.3-70b-versatile",
//             messages: [{role: "user", content: summaryPrompt}]
//         });
//
//         return summaryResponse.choices[0].message.content || "I found the data but had trouble explaining it.";
//
//     } catch (error) {
//         console.error("Text-to-SQL Error:", error);
//         return "An error occurred while checking the vehicle database.";
//     }
// }
//
//
// // --- The New Tool Definitions ---
// const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
//     {
//         type: "function",
//         function: {
//             name: "answer_vehicle_question",
//             description: "Use this tool for any questions about vehicle inventory, stock, pricing, makes, models, or specific cars.",
//             parameters: {
//                 type: "object",
//                 properties: {
//                     question: {
//                         type: "string",
//                         description: "The user's full, natural language question about vehicles."
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
//                     const history = await db.ChatMessage.findAll({
//                         where: {chat_id},
//                         order: [["createdAt", "DESC"]],
//                         limit: 4
//                     });
//
//                     const messagesForAI: Groq.Chat.Completions.ChatCompletionMessageParam[] = history
//                         .map(msg => {
//                             if (msg.sender === 'customer') {
//                                 return {role: 'user' as const, content: msg.message};
//                             } else {
//                                 return {role: 'assistant' as const, content: msg.message};
//                             }
//                         })
//                         .reverse();
//
//                     // --- AI Pass 1: Tool Router ---
//                     // No RAG context here, let the AI choose the right data source.
//                     const toolCheckResponse = await groq.chat.completions.create({
//                         model: "llama-3.3-70b-versatile",
//                         messages: messagesForAI,
//                         tools: tools,
//                         tool_choice: "auto",
//                     });
//
//                     const responseMessage = toolCheckResponse.choices[0].message;
//                     const toolCalls = responseMessage.tool_calls;
//                     let finalBotResponse = "";
//
//                     if (toolCalls) {
//                         // AI wants to use a tool
//                         const toolCall = toolCalls[0];
//                         const functionName = toolCall.function.name;
//                         const functionsArgs = JSON.parse(toolCall.function.arguments);
//
//                         let toolResponseContent = "";
//
//                         // --- Run the correct tool ---
//                         if (functionName === 'answer_vehicle_question') {
//                             toolResponseContent = await answerVehicleQuestion(functionsArgs.question);
//                         } else if (functionName === 'get_general_information') {
//                             toolResponseContent = await getContext(functionsArgs.query);
//                         }
//
//                         // --- AI Pass 2: Summarize the Tool's Answer ---
//                         // We are NOT running a third pass. The `answerVehicleQuestion`
//                         // already returns a natural language answer. We can just use it.
//                         // Same for `getContext`.
//                         finalBotResponse = toolResponseContent;
//
//                         // NOTE: For a more conversational flow, you *could* add the 2-pass
//                         // summarization logic here as I did in the previous answer.
//                         // But for simplicity and fewer API calls, we can let the tool
//                         // function do all the work and just pass its final string
//                         // response directly to the user.
//
//                     } else {
//                         // No tool was called. The AI is just "chatting".
//                         finalBotResponse = responseMessage.content || "Sorry, I'm not sure how to help with that.";
//                     }
//
//                     io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//
//                     const botMsg = await db.ChatMessage.create({
//                         chat_id,
//                         sender: "bot",
//                         message: finalBotResponse,
//                         viewed_by_agent: "no"
//                     });
//                     io.to(chatRoom(chat_id)).emit("message.new", botMsg);
//
//                 } catch (error: any) {
//                     console.error("AI Error:", error);
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

//
// import {Server, Socket} from "socket.io";
// import db from "../models";
// // import {OpenAI} from "openai"; // Not needed
// import {Pinecone} from "@pinecone-database/pinecone";
// import {FeatureExtractionPipeline, pipeline} from "@xenova/transformers";
// import Groq from "groq-sdk";
// import {QueryTypes} from "sequelize"; // Import QueryTypes
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
//                     const history = await db.ChatMessage.findAll({
//                         where: {chat_id},
//                         order: [["createdAt", "DESC"]],
//                         limit: 4
//                     });
//
//                     const messagesForAI: Groq.Chat.Completions.ChatCompletionMessageParam[] = history
//                         .map(msg => {
//                             if (msg.sender === 'customer') {
//                                 return {role: 'user' as const, content: msg.message};
//                             } else {
//                                 return {role: 'assistant' as const, content: msg.message};
//                             }
//                         })
//                         .reverse();
//
//                     const systemPrompt = `
//                     You are 'Indra Assistant', a friendly and helpful AI support agent for Indra Traders.
//                     Your job is to have a natural, helpful conversation.
//
//                     - If the user asks about vehicles, parts, stock, or pricing, use the 'answer_database_question' tool.
//                     - If the user asks about services, hours, or contact info, use the 'get_general_information' tool.
//                     - If the user just says "hi" or makes small talk, **just have a normal, friendly conversation.** - **Do not** mention your tools or functions.
//                     `
//
//                     // --- AI Pass 1: Tool Router ---
//                     const toolCheckResponse = await groq.chat.completions.create({
//                         model: "llama-3.1-8b-instant",
//                         messages: [
//                             {role: "system", content: systemPrompt},
//                             ...messagesForAI // Then pass the history
//                         ],
//                         tools: tools,
//                         tool_choice: "auto",
//                     });
//
//                     const responseMessage = toolCheckResponse.choices[0].message;
//                     const toolCalls = responseMessage.tool_calls;
//                     let finalBotResponse = "";
//
//                     if (toolCalls) {
//                         // AI wants to use a tool
//                         const toolCall = toolCalls[0];
//                         const functionName = toolCall.function.name;
//                         const functionsArgs = JSON.parse(toolCall.function.arguments);
//
//                         // --- Run the correct tool ---
//                         if (functionName === 'answer_database_question') {
//                             finalBotResponse = await answer_database_question(functionsArgs.question);
//                         } else if (functionName === 'get_general_information') {
//                             // finalBotResponse = await getContext(functionsArgs.query);
//                             // // This tool just returns a string, but it's not a full AI answer.
//                             // // We should feed it back to the AI for a natural response.
//                             // const summaryResponse = await groq.chat.completions.create({
//                             //     model: "llama-3.3-70b-versatile",
//                             //     messages: [
//                             //         { role: "system", content: "You are Indra Assistant. Answer the user's question using the context provided. Be friendly and use markdown."},
//                             //         messagesForAI[messagesForAI.length - 1], // The user's last question
//                             //         { role: "assistant", content: `I found this information: ${finalBotResponse}` }
//                             //     ]
//                             // });
//                             // finalBotResponse = summaryResponse.choices[0].message.content || "I found some information but had trouble processing it.";
//
//                             const pineconeContext = await getContext(functionsArgs.query);
//
//                             if (!pineconeContext || pineconeContext === "No general information found." || pineconeContext === "Error searching for general information") {
//                                 finalBotResponse = "I'm sorry, I couldn't find any information about that. You can click **Talk to a Live Agent** for more help.";
//                             } else {
//                                 // --- AI Pass 2 (Summarization) ---
//                                 // This is the corrected prompt structure
//                                 const summaryResponse = await groq.chat.completions.create({
//                                     model: "llama-3.1-8b-instant",
//                                     messages: [
//                                         {
//                                             role: "system",
//                                             content: `
//                                                 You are 'Indra Assistant', a friendly and helpful AI support agent.
//                                                 Answer the user's question in a natural, friendly way using ONLY the information from the 'CONTEXT' provided below.
//                                                 Use simple markdown formatting.
//
//                                                 CONTEXT:
//                                                 ${pineconeContext}
//                                             `
//                                         },
//                                         messagesForAI[messagesForAI.length - 1] // The user's last question
//                                     ]
//                                 });
//                                 finalBotResponse = summaryResponse.choices[0].message.content || "I found the information but had trouble summarizing it.";
//                             }
//                         }
//                     } else {
//                         // No tool was called. The AI is just "chatting".
//                         finalBotResponse = responseMessage.content || "Sorry, I'm not sure how to help with that.";
//                     }
//
//                     io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});
//
//                     const botMsg = await db.ChatMessage.create({
//                         chat_id,
//                         sender: "bot",
//                         message: finalBotResponse,
//                         viewed_by_agent: "no"
//                     });
//                     io.to(chatRoom(chat_id)).emit("message.new", botMsg);
//
//                 } catch (error: any) {
//                     console.error("AI Error:", error);
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


import {Server, Socket} from "socket.io";
import db from "../models";
// import {OpenAI} from "openai"; // Not needed
import {Pinecone} from "@pinecone-database/pinecone";
import {FeatureExtractionPipeline, pipeline} from "@xenova/transformers";
import Groq from "groq-sdk";
import {QueryTypes} from "sequelize";
import {TranslateService} from "../services/translate"; // Import QueryTypes

import {ChatGroq} from "@langchain/groq";
import {DynamicStructuredTool} from "@langchain/core/tools";
import {z} from "zod";
import {ChatPromptTemplate, MessagesPlaceholder} from "@langchain/core/prompts";
import {createAgent} from "langchain";
import {HumanMessage, AIMessage, BaseMessage, SystemMessage} from "@langchain/core/messages";

type AgentPresence = {
    userId: number;
    socketId: string;
}

const groq = new Groq({apiKey: process.env.OPENAI_API_KEY}); // Using your Groq key
const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY!});

let embedder: FeatureExtractionPipeline | null = null;
let dbSchemaCache: string | null = null; // Cache the schema

/**
 * Tool 1: Searches Pinecone for general information.
 */
async function getGeneralContext(query: string) {
    try {
        if (!embedder) {
            console.log("Initializing local embedding model for server...");
            embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as FeatureExtractionPipeline;
            console.log("Embedding model loaded.");
        }
        const result = await embedder(query, {pooling: 'mean', normalize: true});
        const queryEmbedding: number[] = Array.from(result.data as number[]);
        const index = pinecone.index(process.env.PINECONE_INDEX!);
        const searchRes = await index.query({
            vector: queryEmbedding,
            topK: 3,
            includeMetadata: true
        });
        const contextText = searchRes.matches
            .map((match: any) => match.metadata?.text)
            .join("\n\n");
        return contextText || "No general information found.";
    } catch (error) {
        console.error("Pinecone Error:", error);
        return "Error searching for general information";
    }
}

/**
 * Helper: Gets the database schema (with caching)
 */
async function getDatabaseSchema() {
    // Return from cache if we already have it
    if (dbSchemaCache) {
        return dbSchemaCache;
    }
    try {
        const queryInterface = db.sequelize.getQueryInterface();
        let schemaString = "";

        // --- DEFINE YOUR TABLES HERE ---
        // Add all tables you want the AI to be able to query
        const tablesToDescribe = ['vehicles', 'spare_parts']; // <<-- CHECK YOUR TABLE NAMES

        for (const tableName of tablesToDescribe) {
            try {
                const tableSchema = await queryInterface.describeTable(tableName);
                schemaString += `Table: ${tableName}\nColumns:\n`;
                for (const [column, attributes] of Object.entries(tableSchema)) {
                    schemaString += `  - ${column} (${(attributes as any).type})\n`;
                }
                schemaString += "\n"; // Add a space between tables
            } catch (tableError) {
                console.warn(`Could not describe table ${tableName}. Skipping.`);
            }
        }

        dbSchemaCache = schemaString; // Cache the result
        return dbSchemaCache;

    } catch (error) {
        console.error("Error getting schema:", error);
        return "Error: Could not retrieve DB schema.";
    }
}


const queryDatabase = async (userQuestion: string) => {
    try {
        const schema = await getDatabaseSchema();
        const sqlGenLLM = new ChatGroq({
            apiKey: process.env.OPENAI_API_KEY,
            model: "llama-3.3-70b-versatile",
            temperature: 0
        });

        const sqlPrompt = `
        You are a MySQL expert. Write a read-only SELECT query based on this schema:
        ${schema}
        
        User Question: ${userQuestion}
        
        Rules:
        1. Return ONLY the raw SQL query. No markdown, no explanations.
        2. LIMIT results to 5 unless specified.
        3. Do not use sensitive tables (users, passwords).
        `;

        const aiMsg = await sqlGenLLM.invoke([new HumanMessage(sqlPrompt)]);
        let sqlQuery = aiMsg.content.toString().replace(/```sql|```/g, "").trim();

        const forbidden = ['drop', 'delete', 'update', 'insert', 'alter', 'users'];
        if (forbidden.some(word => sqlQuery.toLowerCase().includes(word))) {
            return "I cannot perform that query for security reasons.";
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


const vectorTool = new DynamicStructuredTool({
    name: "get_general_company_info",
    description: "Use this for questions about Indra Traders, branch locations, opening hours, contact details, or services.",
    schema: z.object({
        query: z.string().describe("The search query related to company info"),
    }),
    func: async ({ query }) => await getGeneralContext(query),
});

const dbTool = new DynamicStructuredTool({
    name: "check_vehicle_inventory",
    description: "Use this for questions about specific cars, vehicle prices, stock availability, or spare parts.",
    schema: z.object({
        question: z.string().describe("The full natural language question regarding inventory"),
    }),
    func: async ({ question }) => await queryDatabase(question),
});

const tools = [vectorTool, dbTool];


const llm = new ChatGroq({
    apiKey: process.env.OPENAI_API_KEY, // Ensure this env var is set
    // model: "llama-3.1-8b-instant",
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
});

const agent = createAgent({
    model: llm,
    tools: tools,
    systemPrompt: `You are 'Indra Assistant', a friendly support agent for Indra Traders.

    CORE RULES:
    1. Use 'check_vehicle_inventory' for ANY question about cars, parts, prices, or stock.
    2. Use 'get_general_company_info' for questions about location, hours, or services.
    3. If the tool returns JSON data, convert it into a friendly, easy-to-read bulleted list.
    4. If the tool returns "No records found", politely inform the user.
    5. Keep responses concise and helpful.
    `,
});


export async function processBotMessage(chat_id: string, englishText: string) {
    try {
        // 1. Fetch Conversation History from DB
        const history = await db.ChatMessage.findAll({
            where: { chat_id },
            order: [["createdAt", "DESC"]],
            limit: 1 // Get last 6 messages for context
        });

        // 2. Convert DB messages to LangChain format
        // Note: We reverse the history so it's chronological (Oldest -> Newest)
        const messageHistory: BaseMessage[] = history.reverse().map(msg => {
            if (msg.sender === 'customer') {
                return new HumanMessage(msg.message);
            } else {
                return new AIMessage(msg.message);
            }
        });

        // 3. Add the user's NEW message to the end of the list
        messageHistory.push(new HumanMessage(englishText));

        // 4. Invoke the Agent
        // The 'createAgent' return type expects an object with a 'messages' array
        const result = await agent.invoke({
            messages: messageHistory
        });

        // 5. Extract the Final Answer
        // The result contains the full state; we want the content of the last message (the bot's answer)
        const lastMessage = result.messages[result.messages.length - 1];
        return lastMessage.content as string;

    } catch (error) {
        console.error("Bot Processing Error:", error);
        return "I'm currently experiencing high traffic and couldn't process your request. Please try again or ask for a live agent.";
    }
}

// const agent = createAgent({
//     model: llm,
//     tools: tools,
// });
//
// // ==========================================
// // 5. Bot Processing Logic
// // ==========================================
// export async function processBotMessage(chat_id: string, englishText: string) {
//     try {
//         // 1. Fetch History
//         const history = await db.ChatMessage.findAll({
//             where: { chat_id },
//             order: [["createdAt", "DESC"]],
//             limit: 6
//         });
//
//         // 2. Format Messages
//         const messageHistory: BaseMessage[] = history.reverse().map(msg => {
//             if (msg.sender === 'customer') {
//                 return new HumanMessage(msg.message);
//             } else {
//                 return new AIMessage(msg.message);
//             }
//         });
//
//         // 3. *** FIX: Inject System Prompt Manually ***
//         // This ensures the model knows its role, regardless of Agent API changes.
//         const systemPrompt = new SystemMessage(`You are 'Indra Assistant', a friendly support agent for Indra Traders.
//
//         CORE RULES:
//         1. Use 'check_vehicle_inventory' for ANY question about cars, parts, prices, or stock.
//         2. Use 'get_general_company_info' for questions about location, hours, or services.
//         3. If the tool returns JSON data, convert it into a friendly, easy-to-read bulleted list.
//         4. If the tool returns "No records found", politely inform the user.
//         5. Keep responses concise and helpful.
//         `);
//
//         // Add system prompt to the VERY BEGINNING of the array
//         messageHistory.unshift(systemPrompt);
//
//         // 4. Add Current User Message to the END
//         messageHistory.push(new HumanMessage(englishText));
//
//         // 5. Invoke Agent
//         const result = await agent.invoke({
//             messages: messageHistory
//         });
//
//         // 6. Return Result
//         const lastMessage = result.messages[result.messages.length - 1];
//         return lastMessage.content as string;
//
//     } catch (error) {
//         console.error("Bot Processing Error:", error);
//         return "I'm currently experiencing high traffic and couldn't process your request. Please try again or ask for a live agent.";
//     }
// }


/**
 * Tool 2: The new Text-to-SQL "Agent"
 */
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


// --- The New Tool Definitions ---
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

const onlineAgents = new Map<number, AgentPresence>();
const chatRoom = (chatId: string) => `chat:${chatId}`;

// ... (markUserOnline, markUserOffline functions) ...
const markUserOnline = async (userId: number, socketId: string) => {
    onlineAgents.set(userId, {userId, socketId});
}
const markUserOffline = async (userId: number) => {
    onlineAgents.delete(userId);
}


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


export default function initSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        const {role, chat_id, user_id} = socket.handshake.query as any;

        if (chat_id) socket.join(chatRoom(String(chat_id)));

        if (role === "agent" && user_id) {
            const uid = Number(user_id);
            markUserOnline(uid, socket.id);
            socket.join(`agent:${uid}`);
            io.to(socket.id).emit("agent.online", {user_id: uid});
            console.log(`Agent ${uid} connected`);
        }

        socket.on("message.customer", async ({chat_id, text}: { chat_id: string, text: string }) => {
            const session = await db.ChatSession.findOne({where: {chat_id}});
            if (!session) return;

            const customerMsg = await db.ChatMessage.create({
                chat_id, sender: "customer", message: text, viewed_by_agent: "no"
            });
            io.to(chatRoom(chat_id)).emit("message.new", customerMsg);

            if (session.status === "bot") {
                try {
                    io.to(chatRoom(chat_id)).emit("typing", {by: 'bot'});

                    // const history = await db.ChatMessage.findAll({
                    //     where: {chat_id},
                    //     order: [["createdAt", "DESC"]],
                    //     limit: 4
                    // });
                    //
                    // const messagesForAI: Groq.Chat.Completions.ChatCompletionMessageParam[] = history
                    //     .map(msg => {
                    //         if (msg.sender === 'customer') {
                    //             return {role: 'user' as const, content: msg.message};
                    //         } else {
                    //             return {role: 'assistant' as const, content: msg.message};
                    //         }
                    //     })
                    //     .reverse();
                    //
                    // const systemPrompt = `
                    // You are 'Indra Assistant', a friendly and helpful AI support agent for Indra Traders.
                    // Your job is to have a natural, helpful conversation.
                    //
                    // - If the user asks about vehicles, parts, stock, or pricing, use the 'answer_database_question' tool.
                    // - If the user asks about services, hours, or contact info, use the 'get_general_information' tool.
                    // - If the user just says "hi" or makes small talk, **just have a normal, friendly conversation.** - **Do not** mention your tools or functions.
                    // `
                    //
                    // // --- AI Pass 1: Tool Router ---
                    // const toolCheckResponse = await groq.chat.completions.create({
                    //     model: "llama-3.1-8b-instant",
                    //     messages: [
                    //         {role: "system", content: systemPrompt},
                    //         ...messagesForAI // Then pass the history
                    //     ],
                    //     tools: tools,
                    //     tool_choice: "auto",
                    // });
                    //
                    // const responseMessage = toolCheckResponse.choices[0].message;
                    // const toolCalls = responseMessage.tool_calls;
                    // let finalBotResponse = "";
                    //
                    // if (toolCalls) {
                    //     // AI wants to use a tool
                    //     const toolCall = toolCalls[0];
                    //     const functionName = toolCall.function.name;
                    //     const functionsArgs = JSON.parse(toolCall.function.arguments);
                    //
                    //     // --- Run the correct tool ---
                    //     if (functionName === 'answer_database_question') {
                    //         finalBotResponse = await answer_database_question(functionsArgs.question);
                    //     } else if (functionName === 'get_general_information') {
                    //         // finalBotResponse = await getContext(functionsArgs.query);
                    //         // // This tool just returns a string, but it's not a full AI answer.
                    //         // // We should feed it back to the AI for a natural response.
                    //         // const summaryResponse = await groq.chat.completions.create({
                    //         //     model: "llama-3.3-70b-versatile",
                    //         //     messages: [
                    //         //         { role: "system", content: "You are Indra Assistant. Answer the user's question using the context provided. Be friendly and use markdown."},
                    //         //         messagesForAI[messagesForAI.length - 1], // The user's last question
                    //         //         { role: "assistant", content: `I found this information: ${finalBotResponse}` }
                    //         //     ]
                    //         // });
                    //         // finalBotResponse = summaryResponse.choices[0].message.content || "I found some information but had trouble processing it.";
                    //
                    //         const pineconeContext = await getContext(functionsArgs.query);
                    //
                    //         if (!pineconeContext || pineconeContext === "No general information found." || pineconeContext === "Error searching for general information") {
                    //             finalBotResponse = "I'm sorry, I couldn't find any information about that. You can click **Talk to a Live Agent** for more help.";
                    //         } else {
                    //             // --- AI Pass 2 (Summarization) ---
                    //             // This is the corrected prompt structure
                    //             const summaryResponse = await groq.chat.completions.create({
                    //                 model: "llama-3.1-8b-instant",
                    //                 messages: [
                    //                     {
                    //                         role: "system",
                    //                         content: `
                    //                             You are 'Indra Assistant', a friendly and helpful AI support agent.
                    //                             Answer the user's question in a natural, friendly way using ONLY the information from the 'CONTEXT' provided below.
                    //                             Use simple markdown formatting.
                    //
                    //                             CONTEXT:
                    //                             ${pineconeContext}
                    //                         `
                    //                     },
                    //                     messagesForAI[messagesForAI.length - 1] // The user's last question
                    //                 ]
                    //             });
                    //             finalBotResponse = summaryResponse.choices[0].message.content || "I found the information but had trouble summarizing it.";
                    //         }
                    //     }
                    // } else {
                    //     // No tool was called. The AI is just "chatting".
                    //     finalBotResponse = responseMessage.content || "Sorry, I'm not sure how to help with that.";
                    // }

                    let inputForAi = text;
                    if (session.language !== 'en') {
                        inputForAi = await TranslateService.translateText(text, 'en');
                    }

                    const englishResponse = await processBotMessage(chat_id, inputForAi);

                    let finalUserResponse = englishResponse;
                    if (session.language !== 'en') {
                        finalUserResponse = await TranslateService.translateText(englishResponse, session.language);
                    }

                    // const finalBotResponse = await processBotMessage(chat_id, text);

                    // io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});

                    const botMsg = await db.ChatMessage.create({
                        chat_id,
                        sender: "bot",
                        message: finalUserResponse,
                        viewed_by_agent: "no"
                    });
                    io.to(chatRoom(chat_id)).emit("message.new", botMsg);

                } catch (error: any) {
                    console.error("Socket-level Error:", error);
                    // io.to(chatRoom(chat_id)).emit("stop_typing", {by: 'bot'});

                    let fallbackMessage = "I'm sorry, I'm experiencing technical difficulties at the moment. Please try again, or click 'Talk to a Live Agent' for immediate assistance.";
                    if (error.code === 'insufficient_quota') {
                        fallbackMessage = "I'm sorry, our AI system is currently at capacity. Please try again in a few moments or request a live agent.";
                    }
                    const fallbackMsg = await db.ChatMessage.create({
                        chat_id, sender: "bot", message: fallbackMessage, viewed_by_agent: "no"
                    });
                    io.to(chatRoom(chat_id)).emit("message.new", fallbackMsg);
                } finally {
                    io.to(chatRoom(chat_id)).emit("stop_typing", { by: 'bot' });
                }
            } else {
                await session.update({
                    last_message_at: new Date(),
                    unread_count: db.sequelize.literal("unread_count + 1")
                });
            }
        });

        // ... (Rest of your socket handlers: typing, stop_typing, message.agent, etc.) ...
        socket.on("typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
            socket.to(chatRoom(chat_id)).emit("typing", {by});
        });

        socket.on("stop_typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
            socket.to(chatRoom(chat_id)).emit("stop_typing", {by});
        });

        socket.on("message.agent", async ({chat_id, text, user_id}: {
            chat_id: string;
            text: string;
            user_id: number
        }) => {
            const msg = await db.ChatMessage.create({chat_id, sender: "agent", message: text, viewed_by_agent: "yes"});
            await db.ChatSession.update(
                {last_message_at: new Date(), unread_count: 0},
                {where: {chat_id}}
            );
            io.to(chatRoom(chat_id)).emit("message.new", msg);
        });

        socket.on("request.agent", async ({chat_id, priority = 0, channel}: any) => {
            const session = await db.ChatSession.findOne({where: {chat_id}});
            if (!session) return;

            await session.update({status: "queued", priority, channel: channel || session.channel});
            io.emit("queue.updated");
        });

        socket.on("agent.accept", async ({chat_id, user_id}: { chat_id: string; user_id: number }) => {
            const session = await db.ChatSession.findOne({where: {chat_id}});
            if (!session || session.status === "assigned" || session.status === "closed") {
                return;
            }

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
                markUserOffline(Number(user_id));
                console.log(`Agent ${user_id} disconnected`);
            }
        });
    })
}