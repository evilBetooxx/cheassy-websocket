"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const mqtt_1 = __importDefault(require("mqtt"));
const mongodb_1 = require("mongodb");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3002;
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST", "PUT", "OPTIONS", "PREFLIGHT", "PATCH", "DELETE"],
    credentials: true,
}));
const server = app.listen(port, () => {
    console.log("Servidor WebSocket corriendo en el puerto:", port);
});
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
// Conexión a MongoDB
const mongoUri = "mongodb+srv://admin:admin123@cheassy.q9xcy9y.mongodb.net/cheassy?retryWrites=true&w=majority";
const client = new mongodb_1.MongoClient(mongoUri);
function connectToMongo() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client.connect();
            console.log("Conectado a MongoDB Atlas");
        }
        catch (error) {
            console.error("Error al conectar a MongoDB:", error);
        }
    });
}
connectToMongo();
io.on("connection", (socket) => {
    console.log("Usuario Conectado con token:", socket.id);
    let currentCheeseId = null;
    const mqttClient = mqtt_1.default.connect("http://34.194.171.140", {
        username: "guest",
        password: "guest",
    });
    socket.on("startup", (cheeseId) => {
        console.log("Suscrito a la camara: Cheassy para el queso:", cheeseId);
        currentCheeseId = cheeseId;
        mqttClient.subscribe("mqtt");
    });
    socket.on("shutdown", () => {
        console.log("Desconectado de la camara: Cheassy");
        mqttClient.unsubscribe("mqtt");
        currentCheeseId = null;
    });
    mqttClient.on("message", (topic, payload) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("Mensaje recibido:", topic, payload.toString());
        // Enviar datos al frontend
        socket.emit("data", payload.toString());
        // Guardar datos en MongoDB
        if (currentCheeseId) {
            try {
                const database = client.db("cheassy");
                const collection = database.collection("Data");
                yield collection.insertOne({
                    cheeseId: currentCheeseId,
                    data: payload.toString(),
                });
                console.log("Datos guardados en MongoDB para el queso:", currentCheeseId);
            }
            catch (error) {
                console.error("Error al guardar en MongoDB:", error);
            }
        }
    }));
    socket.on("disconnect", () => {
        console.log("Usuario Desconectado", socket.id);
        mqttClient.unsubscribe("mqtt");
        currentCheeseId = null;
    });
});
