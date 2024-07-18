import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import mqtt from "mqtt";

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

io.on("connection", (socket: any) => {
  console.log("Usuario Conectado con token:", socket.id);

  const client = mqtt.connect("http://34.194.171.140", {
    username: "guest",
    password: "guest"
  });

  socket.on("startup", () => {
    console.log("Suscrito a la incubadora: eggssellent");
    client.subscribe("eggssellent");
  });

  socket.on("shutdown", () => {
    console.log('Desconectado de la incubadora: eggssellent')
    client.unsubscribe("eggssellent");
  })

  client.on('message', (topic, payload) => {
    // console.log('Mensaje recibido:', topic, payload.toString())
    socket.emit("data", payload.toString());
  })

  socket.on("disconnect", () => {
    console.log("Usuario Desconectado", socket.id);
    client.unsubscribe("eggssellent");
  });
}); 