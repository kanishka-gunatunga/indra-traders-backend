// import db from "../models";
// import { Op, Sequelize } from "sequelize";
// import dayjs from "dayjs";
//
// const {
//     VehicleSale,
//     SparePartSale,
//     ServiceParkSale,
//     FastTrackSale,
//     Complaint,
//     ServiceParkBooking,
//     User
// } = db;
//
// interface DashboardFilters {
//     startDate?: string;
//     endDate?: string;
//     sbu?: "ITPL" | "ISP" | "IMS" | "IFT" | "All";
//     branch?: string;
//     salesUserId?: number;
// }
//
// export const getDashboardData = async (filters: DashboardFilters) => {
//     // 1. Prepare Date Range Clause
//     // Default to last 30 days if not provided
//     const start = filters.startDate ? new Date(filters.startDate) : dayjs().subtract(30, 'day').toDate();
//     const end = filters.endDate ? new Date(filters.endDate) : new Date();
//
//     // Ensure end date covers the full day
//     end.setHours(23, 59, 59, 999);
//
//     const dateClause = {
//         [Op.between]: [start, end]
//     };
//
//     // 2. Prepare Branch/User Clauses
//     const commonWhere: any = { createdAt: dateClause };
//     if (filters.branch) commonWhere.branch = filters.branch;
//     if (filters.salesUserId) commonWhere.assigned_sales_id = filters.salesUserId;
//
//     // --- PARALLEL DATA FETCHING ---
//     const [
//         itplStats,
//         imsStats,
//         ispStats,
//         iftStats,
//         complaintStats,
//         overdueLeads
//     ] = await Promise.all([
//         // A. ITPL (Vehicle Sales)
//         filters.sbu === "ITPL" || filters.sbu === "All" || !filters.sbu ?
//             getSaleStats(VehicleSale, commonWhere) : null,
//
//         // B. IMS (Spare Parts)
//         filters.sbu === "IMS" || filters.sbu === "All" || !filters.sbu ?
//             getSaleStats(SparePartSale, commonWhere) : null,
//
//         // C. ISP (Service Park)
//         filters.sbu === "ISP" || filters.sbu === "All" || !filters.sbu ?
//             getSaleStats(ServiceParkSale, { ...commonWhere, sales_user_id: filters.salesUserId }, true) : null, // Note: ServicePark uses 'sales_user_id'
//
//         // D. IFT (Fast Track)
//         filters.sbu === "IFT" || filters.sbu === "All" || !filters.sbu ?
//             getSaleStats(FastTrackSale, commonWhere) : null,
//
//         // E. Complaints (Cross-SBU)
//         Complaint.findAll({
//             where: { createdAt: dateClause },
//             attributes: ['status', 'category', [Sequelize.fn('COUNT', 'id'), 'count']],
//             group: ['status', 'category']
//         }),
//
//         // F. Overdue Leads (Across All SBUs)
//         getOverdueLeads(dateClause)
//     ]);
//
//     // 3. Aggregate Overall KPIs
//     const totalNew = (itplStats?.new || 0) + (imsStats?.new || 0) + (ispStats?.new || 0) + (iftStats?.new || 0);
//     const totalOngoing = (itplStats?.ongoing || 0) + (imsStats?.ongoing || 0) + (ispStats?.ongoing || 0) + (iftStats?.ongoing || 0);
//     const totalClosed = (itplStats?.won || 0) + (imsStats?.won || 0) + (ispStats?.won || 0) + (iftStats?.won || 0);
//     const totalLost = (itplStats?.lost || 0) + (imsStats?.lost || 0) + (ispStats?.lost || 0) + (iftStats?.lost || 0);
//
//     // Calculate Conversion Rate (Won / (Won + Lost))
//     const totalDecided = totalClosed + totalLost;
//     const conversionRate = totalDecided > 0 ? ((totalClosed / totalDecided) * 100).toFixed(1) : 0;
//
//     return {
//         kpis: {
//             overall: {
//                 totalLeads: totalNew + totalOngoing + totalClosed + totalLost,
//                 new: totalNew,
//                 inProgress: totalOngoing,
//                 won: totalClosed,
//                 lost: totalLost,
//                 conversionRate: `${conversionRate}%`
//             },
//             sbuSpecific: {
//                 itpl: itplStats,
//                 ims: imsStats,
//                 isp: ispStats,
//                 ift: iftStats
//             }
//         },
//         operational: {
//             // overdueLeadsCount: overdueLeads.length,
//             overdueLeadsCount: overdueLeads.total,
//             complaints: formatComplaintStats(complaintStats),
//             // You can add 'overdueLeads' list here if you want to display the table
//         },
//         // Add more sections here (Customer Insights, etc.) based on requirement 4, 5, 6
//     };
// };
//
// // --- HELPER FUNCTIONS ---
//
// // Generic function to aggregate Status counts for any Sales Model
// async function getSaleStats(Model: any, whereClause: any, isServicePark = false) {
//     // Adjust foreign key for Service Park if needed
//     // The whereClause passed already handles the column name diff
//
//     const stats = await Model.findAll({
//         where: whereClause,
//         attributes: [
//             'status',
//             [Sequelize.fn('COUNT', 'id'), 'count']
//         ],
//         group: ['status']
//     });
//
//     // Transform array to object { NEW: 10, WON: 5 ... }
//     const result: any = { new: 0, ongoing: 0, won: 0, lost: 0 };
//     stats.forEach((s: any) => {
//         const status = s.getDataValue('status').toLowerCase();
//         const count = Number(s.getDataValue('count'));
//         if (result[status] !== undefined) result[status] = count;
//     });
//
//     return result;
// }
//
// // Logic for Overdue Leads (> 30 Days Old AND (New OR Ongoing))
// async function getOverdueLeads(dateClause: any) {
//     const overdueDate = dayjs().subtract(30, 'day').toDate();
//
//     // We strictly want leads OLDER than 30 days that are NOT closed
//     const overdueWhere = {
//         createdAt: { [Op.lt]: overdueDate },
//         status: { [Op.in]: ['NEW', 'ONGOING'] }
//     };
//
//     const [itpl, ims, isp, ift] = await Promise.all([
//         VehicleSale.count({ where: overdueWhere }),
//         SparePartSale.count({ where: overdueWhere }),
//         ServiceParkSale.count({ where: overdueWhere }),
//         FastTrackSale.count({ where: overdueWhere })
//     ]);
//
//     return {
//         itpl, ims, isp, ift,
//         total: itpl + ims + isp + ift
//     };
// }
//
// function formatComplaintStats(stats: any[]) {
//     const resolved = ['Completed', 'Approval'];
//     let openCount = 0;
//     let resolvedCount = 0;
//
//     stats.forEach((s: any) => {
//         const status = s.getDataValue('status');
//         const count = Number(s.getDataValue('count'));
//         if (resolved.includes(status)) {
//             resolvedCount += count;
//         } else {
//             openCount += count;
//         }
//     });
//
//     return {
//         open: openCount,
//         resolved: resolvedCount,
//         breakdown: stats
//     };
// }


import db from "../models";
import {Op, Sequelize} from "sequelize";
import dayjs from "dayjs";

const {
    VehicleSale,
    SparePartSale,
    ServiceParkSale,
    FastTrackSale,
    Complaint
} = db;

interface DashboardFilters {
    startDate?: string;
    endDate?: string;
    sbu?: "ITPL" | "ISP" | "IMS" | "IFT" | "All";
    branch?: string;
    salesUserId?: number;
}

export const getDashboardData = async (filters: DashboardFilters) => {

    const start = filters.startDate ? new Date(filters.startDate) : dayjs().subtract(30, 'day').toDate();
    const end = filters.endDate ? new Date(filters.endDate) : new Date();

    end.setHours(23, 59, 59, 999);

    const dateClause = {
        [Op.between]: [start, end]
    };

    const commonWhere: any = {createdAt: dateClause};
    if (filters.branch) commonWhere.branch = filters.branch;
    if (filters.salesUserId) commonWhere.assigned_sales_id = filters.salesUserId;

    const ispWhere: any = {createdAt: dateClause};
    if (filters.branch) ispWhere.branch = filters.branch;
    if (filters.salesUserId) ispWhere.sales_user_id = filters.salesUserId;

    const [
        itplStats,
        imsStats,
        ispStats,
        iftStats,
        complaintStats,
        overdueLeads
    ] = await Promise.all([
        filters.sbu === "ITPL" || filters.sbu === "All" || !filters.sbu ?
            getSaleStats(VehicleSale, commonWhere) : null,

        filters.sbu === "IMS" || filters.sbu === "All" || !filters.sbu ?
            getSaleStats(SparePartSale, commonWhere) : null,

        filters.sbu === "ISP" || filters.sbu === "All" || !filters.sbu ?
            getSaleStats(ServiceParkSale, ispWhere) : null,

        filters.sbu === "IFT" || filters.sbu === "All" || !filters.sbu ?
            getSaleStats(FastTrackSale, commonWhere) : null,

        Complaint.findAll({
            where: {createdAt: dateClause},
            attributes: ['status', 'category', [Sequelize.fn('COUNT', 'id'), 'count']],
            group: ['status', 'category']
        }),

        getOverdueLeads(dateClause)
    ]);

    const totalNew = (itplStats?.new || 0) + (imsStats?.new || 0) + (ispStats?.new || 0) + (iftStats?.new || 0);
    const totalOngoing = (itplStats?.ongoing || 0) + (imsStats?.ongoing || 0) + (ispStats?.ongoing || 0) + (iftStats?.ongoing || 0);
    const totalClosed = (itplStats?.won || 0) + (imsStats?.won || 0) + (ispStats?.won || 0) + (iftStats?.won || 0);
    const totalLost = (itplStats?.lost || 0) + (imsStats?.lost || 0) + (ispStats?.lost || 0) + (iftStats?.lost || 0);

    // Calculate Conversion Rate (Won / (Won + Lost))
    const totalDecided = totalClosed + totalLost;
    const conversionRate = totalDecided > 0 ? ((totalClosed / totalDecided) * 100).toFixed(1) : 0;

    return {
        kpis: {
            overall: {
                totalLeads: totalNew + totalOngoing + totalClosed + totalLost,
                new: totalNew,
                inProgress: totalOngoing,
                won: totalClosed,
                lost: totalLost,
                conversionRate: `${conversionRate}%`
            },
            sbuSpecific: {
                itpl: itplStats,
                ims: imsStats,
                isp: ispStats,
                ift: iftStats
            }
        },
        operational: {
            overdueLeadsCount: overdueLeads.total,
            complaints: formatComplaintStats(complaintStats),
        },
    };
};


async function getSaleStats(Model: any, whereClause: any) {
    const stats = await Model.findAll({
        where: whereClause,
        attributes: [
            'status',
            [Sequelize.fn('COUNT', 'id'), 'count']
        ],
        group: ['status']
    });

    const result: any = {new: 0, ongoing: 0, won: 0, lost: 0};
    stats.forEach((s: any) => {
        const status = s.getDataValue('status').toLowerCase();
        const count = Number(s.getDataValue('count'));
        if (result[status] !== undefined) result[status] = count;
    });

    return result;
}

async function getOverdueLeads(dateClause: any) {
    const overdueDate = dayjs().subtract(30, 'day').toDate();

    // We strictly want leads OLDER than 30 days that are NOT closed
    // And logically, they should be within the dashboard timeframe if we strictly follow dashboard date logic,
    // OR usually overdue implies "Currently Active but Old", regardless of start date filter.
    // Assuming user wants "Current Overdue":
    const overdueWhere = {
        createdAt: {[Op.lt]: overdueDate},
        status: {[Op.in]: ['NEW', 'ONGOING']}
    };

    const [itpl, ims, isp, ift] = await Promise.all([
        VehicleSale.count({where: overdueWhere}),
        SparePartSale.count({where: overdueWhere}),
        ServiceParkSale.count({where: overdueWhere}),
        FastTrackSale.count({where: overdueWhere})
    ]);

    return {
        itpl, ims, isp, ift,
        total: itpl + ims + isp + ift
    };
}

function formatComplaintStats(stats: any[]) {
    const resolved = ['Completed', 'Approval'];
    let openCount = 0;
    let resolvedCount = 0;

    stats.forEach((s: any) => {
        const status = s.getDataValue('status');
        const count = Number(s.getDataValue('count'));
        if (resolved.includes(status)) {
            resolvedCount += count;
        } else {
            openCount += count;
        }
    });

    return {
        open: openCount,
        resolved: resolvedCount,
        breakdown: stats
    };
}