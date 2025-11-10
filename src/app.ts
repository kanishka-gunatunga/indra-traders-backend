import express from "express";
import cors from "cors";
import http from "http";
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
import initSocket from "./realtime/socket";
import {Server} from "socket.io";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" },
});
initSocket(io);

app.get("/", (req, res) => {
    res.json({message: "Hello World!"});
});

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

export default app;