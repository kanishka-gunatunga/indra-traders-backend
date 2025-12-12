import {Request, Response} from 'express';
import db from '../models';
import {TranslateService} from '../services/translate';

import {processBotMessage} from "./socket";
import {WahaService} from "../services/waha";
import {io} from "../server";

export const handleWahaWebhook = async (req: Request, res: Response) => {
    const {event, payload} = req.body;

    if (event !== 'message') return res.status(200).send('OK');

    const message = payload;
    if (message.fromMe) return res.status(200).send('OK');

    const wahaId = message.from;

    let phoneNumber = wahaId.split('@')[0];


    if (wahaId.includes('@lid')) {
        if (message.author && message.author.includes('@c.us')) {
            phoneNumber = message.author.split('@')[0];
        } else if (message._data?.id?.participant?.includes('@c.us')) {
            phoneNumber = message._data.id.participant.split('@')[0];
        }
    }


    const text = message.body;
    const senderName = message.notifyName || "WhatsApp User";

    console.log("customer phone number :", phoneNumber);

    try {
        let session = await db.ChatSession.findOne({where: {chat_id: wahaId}});

        if (session && session.status === 'closed') {
            console.log(`Reactivating closed session for ${phoneNumber}`);
            await session.update({
                status: 'bot',
                agent_id: null,
                updatedAt: new Date()
            });
            session.status = 'bot';
        }

        if (!session) {
            session = await db.ChatSession.create({
                chat_id: wahaId,
                customer_contact: phoneNumber,
                customer_name: senderName,
                status: 'bot',
                channel: 'WhatsApp',
                language: 'en',
                user_type: 'guest'
            });
        }

        const customerMsg = await db.ChatMessage.create({
            chat_id: wahaId,
            sender: "customer",
            message: text,
            viewed_by_agent: "no"
        });

        if (io) {
            io.to(`chat:${phoneNumber}`).emit("message.new", customerMsg);

            if (session.status === 'bot') {
                io.emit("session.updated", session);
            }
        }

        if (session.status === 'bot') {

            let inputForAi = text;
            if (session.language && session.language !== 'en') {
                inputForAi = await TranslateService.translateText(text, 'en');
            }

            const botResult = await processBotMessage(wahaId, inputForAi);

            if (botResult.type === 'handoff') {
                await session.update({status: 'queued', priority: 1});

                if (io) io.emit("queue.updated");

                let finalResponse = botResult.content;
                if (session.language !== 'en') {
                    finalResponse = await TranslateService.translateText(finalResponse, session.language);
                }

                const sysMsg = await db.ChatMessage.create({
                    chat_id: wahaId, sender: "system", message: finalResponse, viewed_by_agent: "no"
                });
                if (io) io.to(`chat:${wahaId}`).emit("message.new", sysMsg);

                await WahaService.sendText(message.from, finalResponse);
                return res.status(200).send('OK');
            }

            let finalUserResponse = botResult.content;
            if (session.language !== 'en') {
                finalUserResponse = await TranslateService.translateText(finalUserResponse, session.language);
            }

            const botMsg = await db.ChatMessage.create({
                chat_id: wahaId, sender: "bot", message: finalUserResponse, viewed_by_agent: "no"
            });

            if (io) io.to(`chat:${wahaId}`).emit("message.new", botMsg);

            await WahaService.sendText(message.from, finalUserResponse);
        }
    } catch
        (error) {
        console.error("WhatsApp Bot Error:", error);
    }

    res.status(200).send('OK');
};