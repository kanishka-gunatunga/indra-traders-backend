import "mysql2";
import {Sequelize} from "sequelize";
import dbConfig from "../config/db.config";
import CustomerModel from "./customer.model";
import ComplaintModel from "./complaint.model";
import ComplaintReminderModel from "./complaintReminder.model";
import ComplaintFollowUpModel from "./complaintFollowup.model";
import EventModel from "./event.model";
import VehicleSaleModel from "./vehicleSale.model";
import UserModel from "./user.model";
import VehicleSaleFollowupModel from "./vehicleSaleFollowup.model";
import VehicleSaleReminderModel from "./vehicleSaleReminder.model";
import SpareInvoiceItemModel from "./spareInvoiceItem.model";
import SpareInvoiceModel from "./spareInvoice.model";
import SparePartModel from "./sparePart.model";
import SparePartSaleModel from "./sparePartSale.model";
import SparePartStockModel from "./sparePartStock.model";
import SparePartSaleReminderModel from "./sparePartSaleReminder.model";
import SparePartSaleFollowupModel from "./sparePartSaleFollowup.model";
import PromotionModel from "./promotion.model";
import VehicleListingModel from "./vehicleListing.model";
import FastTrackRequestModel from "./fastTrackRequest.model";
import FastTrackSaleModel from "./fastTrackSale.model";
import FastTrackBestMatchModel from "./fastTrackBestmatch.model";
import FastTrackReminderModel from "./fastTrackReminder.model";
import FastTrackFollowupModel from "./fastTrackFollowup.model";
import ServiceParkVehicleHistoryModel from "./serviceParkVehicleHistory.model";
import ServiceParkSaleModel from "./serviceParkSale.model";
import ServiceParkSaleFollowupModel from "./serviceParkFollowup.model";
import ServiceParkSaleReminderModel from "./serviceParkReminder.model";
import UnavailableServiceModel from "./unavailableService.model";
import UnavailableSparePartModel from "./unavailableSparePart.model";
import UnavailableVehicleSaleModel from "./unavailableVehicleSale.model";
import ChatSessionModel from "./chatSession.model";
import ChatMessageModel from "./chatMessage.model";
import OtpModel from "./otp.model";
import VehicleSaleHistoryModel from "./vehicleSaleHistory.model";
import SparePartSaleHistoryModel from "./sparePartSaleHistory.model";
import ServiceParkSaleHistoryModel from "./serviceParkSaleHistory.model";
import FastTrackSaleHistoryModel from "./fastTrackSaleHistory.model";
import LeasingBankModel from "./leasingBank.model";

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    dialect: "mysql",
    // operatorsAliases: false,
    pool: dbConfig.pool,
});


sequelize.authenticate().then(() => {
    console.log("Connected successfully");
}).catch((err) => {
    console.log("Error connecting to database!");
});

const Customer = CustomerModel(sequelize);
const Complaint = ComplaintModel(sequelize);
const ComplaintReminder = ComplaintReminderModel(sequelize);
const ComplaintFollowUp = ComplaintFollowUpModel(sequelize);
const Event = EventModel(sequelize);
const VehicleSale = VehicleSaleModel(sequelize);
const User = UserModel(sequelize);
const VehicleSaleFollowup = VehicleSaleFollowupModel(sequelize);
const VehicleSaleReminder = VehicleSaleReminderModel(sequelize);
const SparePart = SparePartModel(sequelize);
const SparePartStock = SparePartStockModel(sequelize);
const SpareInvoiceItem = SpareInvoiceItemModel(sequelize);
const SpareInvoice = SpareInvoiceModel(sequelize);
const SparePartSale = SparePartSaleModel(sequelize);
const SparePartSaleFollowup = SparePartSaleFollowupModel(sequelize);
const SparePartSaleReminder = SparePartSaleReminderModel(sequelize);
const Promotion = PromotionModel(sequelize);
const VehicleListing = VehicleListingModel(sequelize);
const FastTrackRequest = FastTrackRequestModel(sequelize);
const FastTrackSale = FastTrackSaleModel(sequelize);
const FastTrackBestMatch = FastTrackBestMatchModel(sequelize);
const FastTrackReminder = FastTrackReminderModel(sequelize);
const FastTrackFollowUp = FastTrackFollowupModel(sequelize);
const ServiceParkVehicleHistory = ServiceParkVehicleHistoryModel(sequelize);
const ServiceParkSale = ServiceParkSaleModel(sequelize);
const ServiceParkSaleReminder = ServiceParkSaleReminderModel(sequelize);
const ServiceParkSaleFollowUp = ServiceParkSaleFollowupModel(sequelize);
const UnavailableService = UnavailableServiceModel(sequelize);
const UnavailableSparePart = UnavailableSparePartModel(sequelize);
const UnavailableVehicleSale = UnavailableVehicleSaleModel(sequelize);
const ChatSession = ChatSessionModel(sequelize);
const ChatMessage = ChatMessageModel(sequelize);
const Otp = OtpModel(sequelize);
const VehicleSaleHistory = VehicleSaleHistoryModel(sequelize);
const SparePartSaleHistory = SparePartSaleHistoryModel(sequelize);
const ServiceParkSaleHistory = ServiceParkSaleHistoryModel(sequelize);
const FastTrackSaleHistory = FastTrackSaleHistoryModel(sequelize);
const LeasingBank = LeasingBankModel(sequelize);

interface DB {
    Sequelize: typeof Sequelize;
    sequelize: Sequelize;
    Customer: typeof Customer;
    Complaint: typeof Complaint;
    ComplaintReminder: typeof ComplaintReminder;
    ComplaintFollowUp: typeof ComplaintFollowUp;
    Event: typeof Event;
    VehicleSale: typeof VehicleSale;
    User: typeof User;
    VehicleSaleFollowup: typeof VehicleSaleFollowup;
    VehicleSaleReminder: typeof VehicleSaleReminder;
    SparePart: typeof SparePart;
    SparePartStock: typeof SparePartStock;
    SparePartSale: typeof SparePartSale;
    SparePartSaleFollowup: typeof SparePartSaleFollowup;
    SparePartSaleReminder: typeof SparePartSaleReminder;
    SpareInvoiceItem: typeof SpareInvoiceItem;
    SpareInvoice: typeof SpareInvoice;
    Promotion: typeof Promotion;
    VehicleListing: typeof VehicleListing;
    FastTrackRequest: typeof FastTrackRequest;
    FastTrackSale: typeof FastTrackSale;
    FastTrackBestMatch: typeof FastTrackBestMatch;
    FastTrackReminder: typeof FastTrackReminder;
    FastTrackFollowup: typeof FastTrackFollowUp;
    ServiceParkVehicleHistory: typeof ServiceParkVehicleHistory;
    ServiceParkSale: typeof ServiceParkSale;
    ServiceParkSaleReminder: typeof ServiceParkSaleReminder;
    ServiceParkSaleFollowUp: typeof ServiceParkSaleFollowUp;
    UnavailableService: typeof UnavailableService;
    UnavailableSparePart: typeof UnavailableSparePart;
    UnavailableVehicleSale: typeof UnavailableVehicleSale;
    ChatMessage: typeof ChatMessage;
    ChatSession: typeof ChatSession;
    Otp: typeof Otp;
    VehicleSaleHistory: typeof VehicleSaleHistory;
    SparePartSaleHistory: typeof SparePartSaleHistory;
    ServiceParkSaleHistory: typeof ServiceParkSaleHistory;
    FastTrackSaleHistory: typeof FastTrackSaleHistory;
    LeasingBank: typeof LeasingBank;
}


const db: DB = {
    sequelize,
    Sequelize,
} as DB;

db.Customer = Customer;
db.Complaint = Complaint;
db.ComplaintFollowUp = ComplaintFollowUp;
db.ComplaintReminder = ComplaintReminder;
db.Event = Event;
db.VehicleSale = VehicleSale;
db.User = User;

// vehicle sale
db.VehicleSaleFollowup = VehicleSaleFollowup;
db.VehicleSaleReminder = VehicleSaleReminder;
db.VehicleSaleHistory = VehicleSaleHistory;

// spare part sale
db.SparePart = SparePart;
db.SparePartStock = SparePartStock;
db.Promotion = Promotion;
db.SparePartSale = SparePartSale;
db.SparePartSaleFollowup = SparePartSaleFollowup;
db.SparePartSaleReminder = SparePartSaleReminder;
db.SpareInvoice = SpareInvoice;
db.SpareInvoiceItem = SpareInvoiceItem;
db.SparePartSaleHistory = SparePartSaleHistory;


// fast track
db.VehicleListing = VehicleListing;
db.FastTrackRequest = FastTrackRequest;
db.FastTrackSale = FastTrackSale;
db.FastTrackBestMatch = FastTrackBestMatch;
db.FastTrackReminder = FastTrackReminder;
db.FastTrackFollowup = FastTrackFollowUp;
db.FastTrackSaleHistory = FastTrackSaleHistory;

// service park
db.ServiceParkVehicleHistory = ServiceParkVehicleHistory;
db.ServiceParkSale = ServiceParkSale;
db.ServiceParkSaleFollowUp = ServiceParkSaleFollowUp;
db.ServiceParkSaleReminder = ServiceParkSaleReminder;
db.ServiceParkSaleHistory = ServiceParkSaleHistory;


// unavailable
db.UnavailableSparePart = UnavailableSparePart;
db.UnavailableVehicleSale = UnavailableVehicleSale;
db.UnavailableService = UnavailableService;

// chat
db.ChatMessage = ChatMessage;
db.ChatSession = ChatSession;

db.Otp = Otp;

db.LeasingBank = LeasingBank;


db.Customer.hasMany(db.Complaint, {foreignKey: "customerId", as: "complaints"});
db.Complaint.belongsTo(db.Customer, {foreignKey: "customerId", as: "customer"});

db.Complaint.hasMany(db.ComplaintFollowUp, {foreignKey: "complaintId", as: "followups"});
db.ComplaintFollowUp.belongsTo(db.Complaint, {foreignKey: "complaintId", as: "complaint"});

db.Complaint.hasMany(db.ComplaintReminder, {foreignKey: "complaintId", as: "reminders"});
db.ComplaintReminder.belongsTo(db.Complaint, {foreignKey: "complaintId", as: "complaint"});

db.Customer.hasMany(db.Event, {foreignKey: "customerId", as: "events"});
db.Event.belongsTo(db.Customer, {foreignKey: "customerId", as: "customer"});

db.ComplaintFollowUp.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});

db.ComplaintReminder.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});


// vehicle sale

db.VehicleSale.belongsTo(db.Customer, {foreignKey: "customer_id", as: "customer"});
db.VehicleSale.belongsTo(db.User, {foreignKey: "call_agent_id", as: "callAgent"});
db.VehicleSale.belongsTo(db.User, {foreignKey: "assigned_sales_id", as: "salesUser"});

db.VehicleSale.hasMany(db.VehicleSaleFollowup, {foreignKey: "vehicleSaleId", as: "followups"});
db.VehicleSaleFollowup.belongsTo(db.VehicleSale, {foreignKey: "vehicleSaleId", as: "vehicleSale"});

db.VehicleSale.hasMany(db.VehicleSaleReminder, {foreignKey: "vehicleSaleId", as: "reminders"});
db.VehicleSaleReminder.belongsTo(db.VehicleSale, {foreignKey: "vehicleSaleId", as: "vehicleSale"});

db.VehicleSale.hasMany(db.VehicleSaleHistory, {
    foreignKey: "vehicle_sale_id",
    as: "history",
    onDelete: "CASCADE",
});

db.VehicleSaleHistory.belongsTo(db.VehicleSale, {
    foreignKey: "vehicle_sale_id",
    as: "sale",
});

db.VehicleSaleHistory.belongsTo(db.User, {
    foreignKey: "action_by",
    as: "actor",
});

db.VehicleSaleFollowup.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});

db.VehicleSaleReminder.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});


// spare parts

db.SparePart.hasMany(db.SparePartStock, {foreignKey: "spare_part_id", as: "stocks"});
db.SparePartStock.belongsTo(db.SparePart, {foreignKey: "spare_part_id", as: "sparePart"});

db.SparePart.hasMany(db.SpareInvoiceItem, {foreignKey: "spare_part_id", as: "invoiceItems"});

db.SparePartSale.belongsTo(db.Customer, {foreignKey: "customer_id", as: "customer"});
db.SparePartSale.belongsTo(db.User, {foreignKey: "call_agent_id", as: "callAgent"});
db.SparePartSale.belongsTo(db.User, {foreignKey: "assigned_sales_id", as: "salesUser"});

db.SparePartSale.hasMany(db.SparePartSaleFollowup, {foreignKey: "spare_part_sale_id", as: "followups"});
db.SparePartSaleFollowup.belongsTo(db.SparePartSale, {foreignKey: "spare_part_sale_id", as: "sale"});

db.SparePartSale.hasMany(db.SparePartSaleReminder, {foreignKey: "spare_part_sale_id", as: "reminders"});
db.SparePartSaleReminder.belongsTo(db.SparePartSale, {foreignKey: "spare_part_sale_id", as: "sale"});

db.SpareInvoice.hasMany(db.SpareInvoiceItem, {foreignKey: "invoice_id", as: "items"});
db.SpareInvoiceItem.belongsTo(db.SpareInvoice, {foreignKey: "invoice_id", as: "invoice"});

db.SparePartSale.hasMany(db.SparePartSaleHistory, {
    foreignKey: "spare_part_sale_id",
    as: "history",
    onDelete: "CASCADE",
});

db.SparePartSaleHistory.belongsTo(db.SparePartSale, {
    foreignKey: "spare_part_sale_id",
    as: "sale",
});

db.SparePartSaleHistory.belongsTo(db.User, {
    foreignKey: "action_by",
    as: "actor",
});

db.SparePartSaleFollowup.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});

db.SparePartSaleReminder.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});


// fast track

// db.Customer.hasMany(db.FastTrackRequest, {foreignKey: "customer_id"});
// db.FastTrackRequest.belongsTo(db.Customer, {foreignKey: "customer_id", as: "customer"});
//
// db.User.hasMany(db.FastTrackRequest, {foreignKey: "call_agent_id"});
// db.FastTrackRequest.belongsTo(db.User, {as: "callAgent", foreignKey: "call_agent_id"});
//
// db.Customer.hasMany(db.FastTrackSale, {foreignKey: "customer_id"});
// db.FastTrackSale.belongsTo(db.Customer, {foreignKey: "customer_id"});
//
// db.VehicleListing.hasMany(db.FastTrackSale, {foreignKey: "vehicle_id"});
// db.FastTrackSale.belongsTo(db.VehicleListing, {foreignKey: "vehicle_id"});
//
// db.FastTrackRequest.hasMany(db.FastTrackSale, {foreignKey: "direct_request_id"});
// db.FastTrackSale.belongsTo(db.FastTrackRequest, {foreignKey: "direct_request_id"});
//
// db.User.hasMany(db.FastTrackSale, {foreignKey: "call_agent_id"});
// db.FastTrackSale.belongsTo(db.User, {as: "callAgent", foreignKey: "call_agent_id"});
//
// db.User.hasMany(db.FastTrackSale, {foreignKey: "assigned_sales_id"});
// db.FastTrackSale.belongsTo(db.User, {as: "salesUser", foreignKey: "assigned_sales_id"});
//
// db.FastTrackSale.hasMany(db.FastTrackFollowup, {foreignKey: "sale_id"});
// db.FastTrackFollowup.belongsTo(db.FastTrackSale, {foreignKey: "sale_id"});
//
// db.FastTrackSale.hasMany(db.FastTrackReminder, {foreignKey: "sale_id"});
// db.FastTrackReminder.belongsTo(db.FastTrackSale, {foreignKey: "sale_id"});
//
// db.FastTrackRequest.hasMany(db.FastTrackReminder, {foreignKey: "direct_request_id"});
// db.FastTrackReminder.belongsTo(db.FastTrackRequest, {foreignKey: "direct_request_id"});
//
// db.FastTrackRequest.hasMany(db.FastTrackBestMatch, {foreignKey: "direct_request_id"});
// db.FastTrackBestMatch.belongsTo(db.FastTrackRequest, {foreignKey: "direct_request_id"});
//
// db.VehicleListing.hasMany(db.FastTrackBestMatch, {foreignKey: "vehicle_id"});
// db.FastTrackBestMatch.belongsTo(db.VehicleListing, {foreignKey: "vehicle_id"});


// ---------------

// db.Customer.hasMany(db.FastTrackRequest, {foreignKey: "customer_id", as: "fastTrackRequests"});
// db.FastTrackRequest.belongsTo(db.Customer, {foreignKey: "customer_id", as: "customer"});
//
// db.User.hasMany(db.FastTrackRequest, {foreignKey: "call_agent_id", as: "createdRequests"});
// db.FastTrackRequest.belongsTo(db.User, {foreignKey: "call_agent_id", as: "callAgent"});
//
// db.FastTrackRequest.hasMany(db.FastTrackBestMatch, {foreignKey: "direct_request_id", as: "bestMatches"});
// db.FastTrackBestMatch.belongsTo(db.FastTrackRequest, {foreignKey: "direct_request_id", as: "directRequest"});
//
// db.VehicleListing.hasMany(db.FastTrackBestMatch, {foreignKey: "vehicle_id", as: "bestMatches"});
// db.FastTrackBestMatch.belongsTo(db.VehicleListing, {foreignKey: "vehicle_id", as: "vehicle"});
//
// db.FastTrackRequest.hasMany(db.FastTrackReminder, {foreignKey: "direct_request_id", as: "reminders"});
// db.FastTrackReminder.belongsTo(db.FastTrackRequest, {foreignKey: "direct_request_id", as: "directRequest"});
//
// db.Customer.hasMany(db.FastTrackSale, {foreignKey: "customer_id", as: "fastTrackSales"});
// db.FastTrackSale.belongsTo(db.Customer, {foreignKey: "customer_id", as: "customer"});
//
// db.VehicleListing.hasMany(db.FastTrackSale, {foreignKey: "vehicle_id", as: "sales"});
// db.FastTrackSale.belongsTo(db.VehicleListing, {foreignKey: "vehicle_id", as: "vehicle"});
//
// db.FastTrackRequest.hasMany(db.FastTrackSale, {foreignKey: "direct_request_id", as: "sales"});
// db.FastTrackSale.belongsTo(db.FastTrackRequest, {foreignKey: "direct_request_id", as: "directRequest"});
//
// db.User.hasMany(db.FastTrackSale, {foreignKey: "call_agent_id", as: "calledSales"});
// db.FastTrackSale.belongsTo(db.User, {foreignKey: "call_agent_id", as: "callAgent"});
//
// db.User.hasMany(db.FastTrackSale, {foreignKey: "assigned_sales_id", as: "assignedSales"});
// db.FastTrackSale.belongsTo(db.User, {foreignKey: "assigned_sales_id", as: "salesUser"});
//
// db.FastTrackSale.hasMany(db.FastTrackFollowup, {foreignKey: "sale_id", as: "followups"});
// db.FastTrackFollowup.belongsTo(db.FastTrackSale, {foreignKey: "sale_id", as: "sale"});
//
// db.FastTrackSale.hasMany(db.FastTrackReminder, {foreignKey: "sale_id", as: "reminders"});
// db.FastTrackReminder.belongsTo(db.FastTrackSale, {foreignKey: "sale_id", as: "sale"});

db.Customer.hasMany(db.FastTrackRequest, {foreignKey: "customer_id"});
db.FastTrackRequest.belongsTo(db.Customer, {foreignKey: "customer_id", as: "customer"});

db.User.hasMany(db.FastTrackRequest, {foreignKey: "call_agent_id"});
db.FastTrackRequest.belongsTo(db.User, {foreignKey: "call_agent_id", as: "callAgent"});

db.FastTrackRequest.hasMany(db.FastTrackBestMatch, {foreignKey: "direct_request_id", as: "bestMatches"});
db.FastTrackBestMatch.belongsTo(db.FastTrackRequest, {foreignKey: "direct_request_id"});

db.VehicleListing.hasMany(db.FastTrackBestMatch, {foreignKey: "vehicle_id"});
db.FastTrackBestMatch.belongsTo(db.VehicleListing, {foreignKey: "vehicle_id", as: "vehicle"});

db.Customer.hasMany(db.FastTrackSale, {foreignKey: "customer_id"});
db.FastTrackSale.belongsTo(db.Customer, {foreignKey: "customer_id", as: "customer"});

db.VehicleListing.hasMany(db.FastTrackSale, {foreignKey: "vehicle_id"});
db.FastTrackSale.belongsTo(db.VehicleListing, {foreignKey: "vehicle_id", as: "vehicle"});

db.FastTrackRequest.hasMany(db.FastTrackSale, {foreignKey: "direct_request_id"});
db.FastTrackSale.belongsTo(db.FastTrackRequest, {foreignKey: "direct_request_id", as: "directRequest"});

db.User.hasMany(db.FastTrackSale, {foreignKey: "call_agent_id"});
db.FastTrackSale.belongsTo(db.User, {foreignKey: "call_agent_id", as: "callAgent"});

db.User.hasMany(db.FastTrackSale, {foreignKey: "assigned_sales_id"});
db.FastTrackSale.belongsTo(db.User, {foreignKey: "assigned_sales_id", as: "salesUser"});

db.FastTrackSale.hasMany(db.FastTrackFollowup, {foreignKey: "sale_id", as: "followups"});
db.FastTrackFollowup.belongsTo(db.FastTrackSale, {foreignKey: "sale_id", as: "sale"});

db.FastTrackSale.hasMany(db.FastTrackReminder, {foreignKey: "sale_id", as: "saleReminders"});
db.FastTrackReminder.belongsTo(db.FastTrackSale, {foreignKey: "sale_id", as: "sale"});

db.FastTrackRequest.hasMany(db.FastTrackReminder, {foreignKey: "direct_request_id", as: "directReminders"});
db.FastTrackReminder.belongsTo(db.FastTrackRequest, {foreignKey: "direct_request_id", as: "directRequest"});

db.FastTrackSale.hasMany(db.FastTrackSaleHistory, {
    foreignKey: "fast_track_sale_id",
    as: "history",
    onDelete: "CASCADE",
});

db.FastTrackSaleHistory.belongsTo(db.FastTrackSale, {
    foreignKey: "fast_track_sale_id",
    as: "sale",
});

db.FastTrackSaleHistory.belongsTo(db.User, {
    foreignKey: "action_by",
    as: "actor",
});

db.FastTrackFollowup.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});

db.FastTrackReminder.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});


// service park

db.Customer.hasMany(db.ServiceParkVehicleHistory, {foreignKey: "customer_id", as: "vehicleHistories"});
db.ServiceParkVehicleHistory.belongsTo(db.Customer, {foreignKey: "customer_id", as: "customer"});

db.Customer.hasMany(db.ServiceParkSale, {foreignKey: "customer_id", as: "serviceParkSales"});
db.ServiceParkSale.belongsTo(db.Customer, {foreignKey: "customer_id", as: "customer"});

db.ServiceParkVehicleHistory.hasMany(db.ServiceParkSale, {foreignKey: "vehicle_id", as: "sales"});
db.ServiceParkSale.belongsTo(db.ServiceParkVehicleHistory, {foreignKey: "vehicle_id", as: "vehicle"});

db.User.hasMany(db.ServiceParkSale, {foreignKey: "sales_user_id", as: "serviceParkSales"});
db.ServiceParkSale.belongsTo(db.User, {foreignKey: "sales_user_id", as: "salesUser"});

db.User.hasMany(db.ServiceParkVehicleHistory, {foreignKey: "created_by", as: "createdVehicleHistories"});
db.ServiceParkVehicleHistory.belongsTo(db.User, {foreignKey: "created_by", as: "createdBy"});

db.ServiceParkSale.hasMany(db.ServiceParkSaleFollowUp, {foreignKey: "service_park_sale_id", as: "followups"});
db.ServiceParkSaleFollowUp.belongsTo(db.ServiceParkSale, {foreignKey: "service_park_sale_id", as: "sale"});

db.ServiceParkSale.hasMany(db.ServiceParkSaleReminder, {foreignKey: "service_park_sale_id", as: "reminders"});
db.ServiceParkSaleReminder.belongsTo(db.ServiceParkSale, {foreignKey: "service_park_sale_id", as: "sale"});


db.ServiceParkSale.hasMany(db.ServiceParkSaleHistory, {
    foreignKey: "service_park_sale_id",
    as: "history",
    onDelete: "CASCADE",
});

db.ServiceParkSaleHistory.belongsTo(db.ServiceParkSale, {
    foreignKey: "service_park_sale_id",
    as: "sale",
});

db.ServiceParkSaleHistory.belongsTo(db.User, {
    foreignKey: "action_by",
    as: "actor",
});

db.ServiceParkSaleFollowUp.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});

db.ServiceParkSaleReminder.belongsTo(db.User, {
    foreignKey: "created_by",
    as: "creator"
});


// unavailable items


db.User.hasMany(db.UnavailableVehicleSale, {foreignKey: "call_agent_id", as: "unavailableVehicleCalls"});
db.UnavailableVehicleSale.belongsTo(db.User, {foreignKey: "call_agent_id", as: "callAgent"});

db.User.hasMany(db.UnavailableService, {foreignKey: "call_agent_id", as: "unavailableServiceCalls"});
db.UnavailableService.belongsTo(db.User, {foreignKey: "call_agent_id", as: "callAgent"});

db.User.hasMany(db.UnavailableSparePart, {foreignKey: "call_agent_id", as: "unavailableSpareCalls"});
db.UnavailableSparePart.belongsTo(db.User, {foreignKey: "call_agent_id", as: "callAgent"});

// chat
// db.ChatSession.belongsTo(db.User, {foreignKey: "agent_id", as: "agent"});
// db.User.hasMany(db.ChatSession, {foreignKey: "agent_id", as: "assignedChats"});
//
// db.ChatSession.hasMany(db.ChatMessage, {foreignKey: "chat_id", sourceKey: "chat_id", as: "messages"});
// db.ChatMessage.belongsTo(db.ChatSession, {foreignKey: "chat_id", targetKey: "chat_id", as: "session"});

db.ChatSession.belongsTo(db.User, {foreignKey: "agent_id", as: "agent"});
db.User.hasMany(db.ChatSession, {foreignKey: "agent_id", as: "assignedChats"});

db.ChatSession.hasMany(db.ChatMessage, {
    foreignKey: "chat_id",
    sourceKey: "chat_id",
    as: "messages",
});
db.ChatMessage.belongsTo(db.ChatSession, {
    foreignKey: "chat_id",
    targetKey: "chat_id",
    as: "session",
});


export default db;