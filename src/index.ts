import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import mqtt from "mqtt";
import { MongoClient } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "OPTIONS", "PREFLIGHT", "PATCH", "DELETE"],
    credentials: true,
  })
);

const server = app.listen(port, () => {
  console.log("Servidor WebSocket corriendo en el puerto:", port);
});

const io: Server = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Conexión a MongoDB
const mongoUri =
  "mongodb+srv://admin:admin123@cheassy.q9xcy9y.mongodb.net/cheassy?retryWrites=true&w=majority";
const client = new MongoClient(mongoUri);

async function connectToMongo() {
  try {
    await client.connect();
    console.log("Conectado a MongoDB Atlas");
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
  }
}

connectToMongo();

io.on("connection", (socket: any) => {
  console.log("Usuario Conectado con token:", socket.id);

  let currentCheeseId: string | null = null;

  const mqttClient = mqtt.connect("http://34.194.171.140", {
    username: "guest",
    password: "guest",
  });

  socket.on("startup", (cheeseId: string) => {
    console.log("Suscrito a la camara: Cheassy para el queso:", cheeseId);
    currentCheeseId = cheeseId;
    mqttClient.subscribe("mqtt");
  });

  socket.on("shutdown", () => {
    console.log("Desconectado de la camara: Cheassy");
    mqttClient.unsubscribe("mqtt");
    currentCheeseId = null;
  });

  mqttClient.on("message", async (topic, payload) => {
    console.log("Mensaje recibido:", topic, payload.toString());

    // Enviar datos al frontend
    socket.emit("data", payload.toString());

    // Guardar datos en MongoDB
    if (currentCheeseId) {
      try {
        const database = client.db("cheassy");  
        const collection = database.collection("Data");
        await collection.insertOne({
          cheeseId: currentCheeseId,
          data: payload.toString(),
        });
        console.log(
          "Datos guardados en MongoDB para el queso:",
          currentCheeseId
        );
      } catch (error) {
        console.error("Error al guardar en MongoDB:", error);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Usuario Desconectado", socket.id);
    mqttClient.unsubscribe("mqtt");
    currentCheeseId = null;
  });
});
