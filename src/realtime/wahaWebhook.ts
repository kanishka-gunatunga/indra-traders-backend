import {Request, Response} from 'express';
import db from '../models';
import {TranslateService} from '../services/translate';
// Import your IO instance if you want to update the dashboard in real-time

import {processBotMessage} from "./socket";
import {WahaService} from "../services/waha";
import {io} from "../server"; // Assuming you export 'io' from your main server file

export const handleWahaWebhook = async (req: Request, res: Response) => {
    const {event, payload} = req.body;

    if (event !== 'message') return res.status(200).send('OK');

    const message = payload;
    if (message.fromMe) return res.status(200).send('OK'); // Ignore self-messages

    // 1. Identify User
    const chatId = message.from.split('@')[0]; // Use phone number as chat_id
    const phoneNumber = message.from.split('@')[0];
    const text = message.body;
    const senderName = message.notifyName || "WhatsApp User";

    try {

        // 2. Find or Create Session (Similar to socket logic)
        let session = await db.ChatSession.findOne({where: {chat_id: chatId}});

        if (session && session.status === 'closed') {
            console.log(`Reactivating closed session for ${chatId}`);
            await session.update({
                status: 'bot',
                agent_id: null,
                updatedAt: new Date()
            });
            session.status = 'bot';
        }

        if (!session) {
            session = await db.ChatSession.create({
                chat_id: chatId,
                customer_name: senderName,
                customer_contact: phoneNumber,
                status: 'bot',
                channel: 'WhatsApp', // Mark as WhatsApp
                language: 'en', // Default, or detect
                user_type: 'guest'
            });
        }

        // 3. Save User Message to DB
        const customerMsg = await db.ChatMessage.create({
            chat_id: chatId,
            sender: "customer",
            message: text,
            viewed_by_agent: "no"
        });

        // 4. Emit to Dashboard (So agents see the WhatsApp message live!)
        // Assuming you have a helper or can access io
        if (io) {
            io.to(`chat:${chatId}`).emit("message.new", customerMsg);

            if (session.status === 'bot') {
                io.emit("session.updated", session);
            }
        }

        // 5. Bot Processing (If status is 'bot')
        if (session.status === 'bot') {
            // Typing indicator on WhatsApp
            // await WahaService.sendTypingState(message.from);

            // Translation Logic
            let inputForAi = text;
            if (session.language && session.language !== 'en') {
                inputForAi = await TranslateService.translateText(text, 'en');
            }

            // --- RUN THE BRAIN ---
            const botResult = await processBotMessage(chatId, inputForAi);

            // Handle Handoff
            if (botResult.type === 'handoff') {
                await session.update({status: 'queued', priority: 1});

                // Notify Dashboard Agents
                if (io) io.emit("queue.updated");

                // Translate Final Response
                let finalResponse = botResult.content;
                if (session.language !== 'en') {
                    finalResponse = await TranslateService.translateText(finalResponse, session.language);
                }

                // Save System Message
                const sysMsg = await db.ChatMessage.create({
                    chat_id: chatId, sender: "system", message: finalResponse, viewed_by_agent: "no"
                });
                if (io) io.to(`chat:${chatId}`).emit("message.new", sysMsg);

                // Send to WhatsApp
                await WahaService.sendText(message.from, finalResponse);
                return res.status(200).send('OK');
            }

            // Normal Bot Response
            let finalUserResponse = botResult.content;
            if (session.language !== 'en') {
                finalUserResponse = await TranslateService.translateText(finalUserResponse, session.language);
            }

            // Save Bot Message
            const botMsg = await db.ChatMessage.create({
                chat_id: chatId, sender: "bot", message: finalUserResponse, viewed_by_agent: "no"
            });

            if (io) io.to(`chat:${chatId}`).emit("message.new", botMsg);

            // Send to WhatsApp
            await WahaService.sendText(message.from, finalUserResponse);

        }
    } catch
        (error) {
        console.error("WhatsApp Bot Error:", error);
        // await WahaService.sendText(message.from, "I'm experiencing a temporary error.");

    }

    res.status(200).send('OK');
};