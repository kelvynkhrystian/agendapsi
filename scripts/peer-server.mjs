import { PeerServer } from "peer";

const PORT = Number(process.env.PEERJS_PORT || 9000);
const PATH = process.env.PEERJS_PATH || "/peerjs";

console.log(`=======================================================`);
console.log(` 🌐 PSI — Servidor de Sinalização PeerJS WebRTC `);
console.log(`=======================================================\n`);
console.log(`[PSI PeerServer] Inicializando na porta ${PORT} no caminho '${PATH}'...`);

const peerServer = PeerServer({
  port: PORT,
  path: PATH,
  allow_discovery: true,
  corsOptions: {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  },
});

peerServer.on("connection", (client) => {
  console.log(`[PSI PeerServer] ✅ Peer conectado: ${client.getId()}`);
});

peerServer.on("disconnect", (client) => {
  console.log(`[PSI PeerServer] 🔌 Peer desconectado: ${client.getId()}`);
});

console.log(`[PSI PeerServer] Servidor de sinalização ativo e pronto!`);
console.log(`   - URL Local:   http://localhost:${PORT}${PATH}`);
console.log(`   - WebSocket:   ws://localhost:${PORT}${PATH}\n`);
