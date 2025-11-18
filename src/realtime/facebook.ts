import db from "../models";
import {processBotMessage} from "./socket";

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

async function sendFacebookReply(psid: any, text: any) {
    const request_body = {
        "recipient": {
            "id": psid
        },
        "message": {
            "text": text,
        }
    };

    try {
        await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(request_body)
        });
        console.log(`Sent reply to PSID ${psid}: ${text}`);
    } catch (error) {
        console.error("Error sending Facebook message:", error);
    }
}

export async function handleFacebookMessage(psid: any, received_message: any) {
    const text = received_message.text;

    // 1. Find or create the chat session using the PSID as the chat_id
    let session;
    try {
        [session] = await db.ChatSession.findOrCreate({
            where: {chat_id: psid},
            defaults: {
                chat_id: psid,
                status: 'bot',
                channel: 'Facebook' // Track the source
            }
        });
    } catch (dbError) {
        console.error("Error finding/creating chat session:", dbError);
        return;
    }

    // 2. Save the customer's message
    await db.ChatMessage.create({
        chat_id: psid,
        sender: "customer",
        message: text,
        viewed_by_agent: "no"
    });

    // 3. Call our "brain"
    const finalBotResponse = await processBotMessage(psid, text);

    // 4. Save the bot's message
    await db.ChatMessage.create({
        chat_id: psid,
        sender: "bot",
        message: finalBotResponse,
        viewed_by_agent: "no"
    });

    // 5. Send the reply back to Facebook
    await sendFacebookReply(psid, finalBotResponse);
}