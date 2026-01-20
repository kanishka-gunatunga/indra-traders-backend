import db from "./models";
import app from "./app";
import http from "http";
import { Server } from "socket.io";
// import initSocket from "./realtime/socket";
import initSocket from "./realtime/indexSocket"

const PORT = process.env.PORT || 8081;

const httpServer = http.createServer(app);

//Attach socket server
export const io = new Server(httpServer, {
    cors: { origin: "*" }
});

//Initialize socket handlers
initSocket(io);

db.sequelize.sync({alter: true, force: false}).then(() => {
// db.sequelize.sync({ alter: false, force: false }).then(() => {
    console.log("Database synced successfully!!");
    // app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    httpServer.listen(PORT, () => {
        console.log(`Server + Socket.io running on port ${PORT}`);
    });
});
