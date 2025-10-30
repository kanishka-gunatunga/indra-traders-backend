import db from "./models";
import app from "./app";

const PORT = process.env.PORT || 8081;

db.sequelize.sync({alter: true, force: false}).then(() => {
    console.log("Database synced successfully!!");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});