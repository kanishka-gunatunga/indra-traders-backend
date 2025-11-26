import {Router} from "express";
import * as Chat from "../controllers/chat.controller";
import {uploadMiddleware} from "../utils/upload";

const r = Router();

// customer starts a chat (bot mode)
r.post("/start", Chat.startChat);

// customer requests agent (moves to queue with priority)
r.post("/:chat_id/request-agent", Chat.requestAgent);

// dashboard: queued list
r.get("/queue", Chat.listQueue);

// agent claims chat manually
r.post("/:chat_id/assign", Chat.assignChat);

// close chat
r.post("/:chat_id/close", Chat.closeChat);

// messages
r.get("/:chat_id/messages", Chat.getMessages);

// agent's assigned chats
r.get("/assigned/:user_id", Chat.myAssigned);

r.post("/:chat_id/rate", Chat.rateAgent);

r.post("/upload", uploadMiddleware.single("file"), Chat.uploadAttachment);

r.get("/ratings", Chat.getSessionHistory);

r.post("/verify-customer", Chat.verifyCustomer);
r.post("/verify-otp", Chat.validateOtp);


export default r;
