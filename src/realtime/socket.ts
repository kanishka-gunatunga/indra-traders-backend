import {Server, Socket} from "socket.io";
import db from "../models";
import {OpenAI} from "openai";
import {Pinecone} from "@pinecone-database/pinecone";
import {FeatureExtractionPipeline, pipeline} from "@xenova/transformers";
import Groq from "groq-sdk";

type AgentPresence = {
    userId: number;
    socketId: string;
}

const openai = new Groq({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

let embedder : FeatureExtractionPipeline | null = null;

async function getContext(query: string) {
    try {
        if (!embedder) {
            console.log("Initializing local embedding model for server...");
            embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as FeatureExtractionPipeline;
            console.log("Embedding model loaded.");
        }

        const result = await embedder(query, { pooling: 'mean', normalize: true });
        const queryEmbedding: number[] = Array.from(result.data as number[]);

        // A. Create Embedding for user query
        // const queryEmbedding = await openai.embeddings.create({
        //     model: "text-embedding-3-small",
        //     input: query,
        // });

        // B. Search Pinecone
        const index = pinecone.index(process.env.PINECONE_INDEX!);
        const searchRes = await index.query({
            vector: queryEmbedding,
            topK: 3, // Retrieve top 3 most relevant chunks
            includeMetadata: true
        });

        // C. Extract text
        const contextText = searchRes.matches
            .map((match: any) => match.metadata?.text)
            .join("\n\n");

        return contextText || "";
    } catch (error) {
        console.error("Pinecone Error:", error);
        return ""; // Fallback to no context if error
    }
}

const onlineAgents = new Map<number, AgentPresence>();
const chatRoom = (chatId: string) => `chat:${chatId}`;

const markUserOnline = async (userId: number, socketId: string) => {
    onlineAgents.set(userId, {userId, socketId});
}

const markUserOffline = async (userId: number) => {
    onlineAgents.delete(userId);
}

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

        socket.on("message.customer", async ({chat_id,text}: {chat_id: string, text: string}) => {
            const session = await db.ChatSession.findOne({where:{chat_id}});
            if (!session) return;

            const customerMsg = await db.ChatMessage.create({
                chat_id, sender: "customer", message: text, viewed_by_agent:"no"
            });

            io.to(chatRoom(chat_id)).emit("message.new", customerMsg);

            if (session.status === "bot"){
                try {
                    io.to(chatRoom(chat_id)).emit("typing",{by:'bot'});

                    const context = await getContext(text);

                    const systemPrompt = `
                    You are 'Indra Assistant', a helpful support agent for Indra Traders.
                    
                    Use the following CONTEXT to answer the user's question. 
                    If the answer is not in the context, politely say you don't have that information 
                    and suggest they use the 'Talk to a Live Agent' button.
                    
                    CONTEXT:
                    ${context}
                    `;

                    const history = await db.ChatMessage.findAll({
                        where: { chat_id },
                        order: [["createdAt", "DESC"]],
                        limit: 4
                    });

                    const messagesForAI = history.map(msg => ({
                        role: (msg.sender === 'customer') ? 'user' : 'assistant',
                        content: msg.message
                    })).reverse();

                    const completion = await openai.chat.completions.create({
                        // model: "gpt-3.5-turbo",
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...messagesForAI as any
                        ],
                    });

                    const botResponse = completion.choices[0].message.content;

                    io.to(chatRoom(chat_id)).emit("stop_typing", { by: 'bot' });

                    // const botMsg = await db.ChatMessage.create({
                    //     chat_id, sender: "bot", message: botResponse, viewed_by_agent: "no"
                    // });
                    const botMsg = await db.ChatMessage.create({
                        chat_id,
                        sender: "bot",
                        message: botResponse || "Sorry, I am unable to provide a response at this time.", // Fallback here
                        viewed_by_agent: "no"
                    });

                    io.to(chatRoom(chat_id)).emit("message.new", botMsg);


                } catch (error: any) {
                    // console.error("AI Error:", error);
                    // io.to(chatRoom(chat_id)).emit("stop_typing", { by: 'bot' });

                    console.error("AI Error:", error); // For your server logs
                    io.to(chatRoom(chat_id)).emit("stop_typing", { by: 'bot' });

                    // --- PROFESSIONAL ERROR HANDLING ---
                    // Send a helpful error message to the customer

                    let fallbackMessage = "I'm sorry, I'm experiencing technical difficulties at the moment. Please try again, or click 'Talk to a Live Agent' for immediate assistance.";

                    // Check if it's the specific quota error
                    if (error.code === 'insufficient_quota') {
                        fallbackMessage = "I'm sorry, our AI system is currently at capacity. Please try again in a few moments or request a live agent.";
                    }

                    const fallbackMsg = await db.ChatMessage.create({
                        chat_id,
                        sender: "bot",
                        message: fallbackMessage,
                        viewed_by_agent: "no"
                    });
                    io.to(chatRoom(chat_id)).emit("message.new", fallbackMsg);
                }
            } else {
                // If status is "assigned" or "queued", just update the database for the human agent
                await session.update({
                    last_message_at: new Date(),
                    unread_count: db.sequelize.literal("unread_count + 1")
                });
            }
        });

        if (role === "customer" && chat_id) {
            console.log(`Customer joined chat ${chat_id}`);
        }

        socket.on("typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
            socket.to(chatRoom(chat_id)).emit("typing", {by});
        });

        socket.on("stop_typing", ({chat_id, by}: { chat_id: string; by: "customer" | "agent" }) => {
            socket.to(chatRoom(chat_id)).emit("stop_typing", {by});
        });

        // socket.on("message.customer", async ({chat_id, text}: { chat_id: string; text: string }) => {
        //     const msg = await db.ChatMessage.create({
        //         chat_id,
        //         sender: "customer",
        //         message: text,
        //         viewed_by_agent: "no"
        //     });
        //     await db.ChatSession.update(
        //         {last_message_at: new Date(), unread_count: db.sequelize.literal("unread_count + 1")},
        //         {where: {chat_id}}
        //     );
        //     io.to(chatRoom(chat_id)).emit("message.new", msg);
        // });

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

        socket.on("agent.read", async ({ chat_id }: { chat_id: string }) => {
            if (!chat_id) return;
            await db.ChatSession.update(
                { unread_count: 0 },
                { where: { chat_id } }
            );
            // No need to emit back, UI was updated optimistically
        });

        socket.on("join.chat", ({ chat_id }) => {
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