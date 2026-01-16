import express from "express";
import cors from "cors";
// import http from "http";
import userRoutes from "./routes/user.routes";
import complaintRoutes from "./routes/complaint.routes";
import customerRoutes from "./routes/customer.routes";
import complaintFollowupRoutes from "./routes/complaintFollowup.routes";
import complaintReminderRoutes from "./routes/complaintReminder.routes";
import eventRoutes from "./routes/event.routes";
import vehicleSaleRoutes from "./routes/vehicleSale.routes";
import vehicleSaleFollowupRoutes from "./routes/vehicleSaleFollowup.routes";
import vehicleSaleReminderRoutes from "./routes/vehicleSaleReminder.routes";
import sparePartsRoutes from "./routes/spareParts.routes";
import sparePartSalesRoutes from "./routes/sparePartSales.routes";
import spareInvoiceRoutes from "./routes/spareInvoice.routes";
import fastTrackRoutes from "./routes/fastTrack.routes";
import serviceParkRoutes from "./routes/servicePark.routes";
import unavailableRoutes from "./routes/unavailable.routes";
import chatRoutes from "./routes/chat.routes";
import logsRoutes from "./routes/logs.routes";
import notificationRoutes from "./routes/notification.routes";
import dashboardRoutes from "./routes/dashboard.routes";
// import initSocket from "./realtime/socket";
// import {Server} from "socket.io";
// import path from "node:path";
// import indexRouter from './routes/index';
import serviceBookingAuthRoutes from "./routes/serviceBookingAuth.routes";

import {handleFacebookMessage} from "./realtime/facebook";
import path from "path";
import leasingBankRoutes from "./routes/leasingBank.routes";
import {handleWahaWebhook} from "./realtime/wahaWebhook";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// app.use("/api/v1/uploads", express.static(path.join(process.cwd(), "public/uploads")));

// const httpServer = http.createServer(app);
// const io = new Server(httpServer, {
//     cors: { origin: "*" },
// });
// initSocket(io);

app.get("/", (req, res) => {
    res.json({message: "Hello World!"});
});

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

app.get("/webhook", (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post("/webhook", (req, res) => {
    let body = req.body;

    if (body.object === "page") {
        body.entry.forEach(function (entry: { messaging: any[]; }) {
            let webhook_event = entry.messaging[0];
            let sender_psid = webhook_event.sender.id;

            if (webhook_event.message && webhook_event.message.text) {
                handleFacebookMessage(sender_psid, webhook_event.message);
            }
        });

        res.status(200).send("EVENT_RECEIVED");
    } else {
        res.sendStatus(404);
    }
});

app.post('/api/webhook/waha', handleWahaWebhook);


// app.use('/', indexRouter);

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/complaints", complaintRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/complaint-followups", complaintFollowupRoutes);
app.use("/api/v1/complaint-reminders", complaintReminderRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/vehicle-sales", vehicleSaleRoutes);
app.use("/api/v1/vehicle-sales-followups", vehicleSaleFollowupRoutes);
app.use("/api/v1/vehicle-sales-reminders", vehicleSaleReminderRoutes);
app.use("/api/v1/spare-parts", sparePartsRoutes);
app.use("/api/v1/spare-part-sales", sparePartSalesRoutes);
app.use("/api/v1/spare-part-invoices", spareInvoiceRoutes);
app.use("/api/v1/fast-track", fastTrackRoutes);
app.use("/api/v1/service-park", serviceParkRoutes);
app.use("/api/v1/unavailable", unavailableRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/leasing-banks", leasingBankRoutes);
app.use("/api/v1/admin", logsRoutes)
app.use("/api/v1/notification", notificationRoutes)
app.use("/api/v1", dashboardRoutes)
app.use("/api/v1/service-booking", serviceBookingAuthRoutes);


export default app;