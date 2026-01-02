import db from "../models";

const {ActivityLog, User} = db;

interface LogData {
    userId: number;
    module: "VEHICLE" | "SPARE_PARTS" | "FAST_TRACK" | "SERVICE_PARK" | "USER_MGMT";
    actionType: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "STATUS_CHANGE";
    entityId: number;
    description: string;
    changes?: any;
}

export const logActivity = async (data: LogData) => {

    Promise.resolve().then(async () => {
        try {
            const user = await User.findByPk(data.userId);
            if (!user) return;

            await ActivityLog.create({
                user_id: data.userId,
                user_role: user.user_role,
                department: user.department,
                module: data.module,
                action_type: data.actionType,
                entity_id: data.entityId,
                description: data.description,
                changes: data.changes || null
            });
        } catch (error) {
            console.error("Failed to write activity log:", error);
        }
    });
};