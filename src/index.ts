import Koa from "koa"
import Router from "@koa/router"
import io from "socket.io-client"

if (process.argv.length < 4) {
    console.log("Usage: auethermuteproxy <url> <code>")
    process.exit(1)
}

console.log(process.argv)

const app = new Koa()
const router = new Router()

const socket = io(process.argv[2], {
    autoConnect: false,
    transports: ["websocket"],
})

const sleep = (x: number) => new Promise(resolve => setTimeout(resolve, x))

socket.on("connect", () => {
    console.log("connected")
    socket.emit("connectCode", process.argv[3])
})
socket.on("disconnect", (reason: any) => {
    console.log("disconnected", reason)
})
socket.on("connect_error", (error: any) => {
    console.log("failed", error)
})

socket.on("modify", (data: any) => console.log("modify", data))
socket.on("killself", (data: any) => {
    console.log("killself", data)
    process.exit(0)
})
socket.on("requestdata", (data: any) => console.log("requestdata", data))


console.log(socket)
console.log("start")

router.post("/state/:id", async ctx => {
    socket.emit("state", JSON.stringify(parseInt(ctx.params.id, 10)))
    ctx.status = 200
    ctx.body = "OK"
})

router.post("/lobby/:lobbyCode/:region/:map", async ctx => {
    socket.emit("lobby", JSON.stringify({
        LobbyCode: decodeURIComponent(ctx.params.lobbyCode),
        Region: parseInt(ctx.params.region, 10),
        Map: parseInt(ctx.params.map, 10),
    }))
    ctx.status = 200
    ctx.body = "OK"
})

router.post("/player/:name/:action/:is_dead/:is_disconnected/:color", async ctx => {
    socket.emit("player", JSON.stringify({
        Action: parseInt(ctx.params.action, 10),
        Name: decodeURIComponent(ctx.params.name).slice(0, -1),
        IsDead: ctx.params.is_dead === "1",
        Disconnected: ctx.params.is_disconnected === "1",
        Color: parseInt(ctx.params.color, 10),
    }))
    ctx.status = 200
    ctx.body = "OK"
})

router.post("/gameover/:reason/:players", async ctx => {
    socket.emit("gameover", JSON.stringify({
        GameOverReason: parseInt(ctx.params.reason, 10),
        PlayerInfos: ctx.params.players.split(",").map(a => {
            const [encodedName, isImpostor] = a.split("_")
            return {
                Name: decodeURIComponent(encodedName),
                isImpostor: isImpostor === "1",
            }
        }),
    }))
})

app.use(async (ctx, next) => {
    console.log(ctx.path)
    return await next()
})
app.use(router.routes())
app.listen(process.env.PORT != null ? parseInt(process.env.PORT, 10) : 4494, process.env.LISTEN_HOST || "127.0.0.1", () => {
    socket.connect()
})
