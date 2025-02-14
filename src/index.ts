/*==================================================
            Gmod Relay Discord - Node.js
                 TypeScript Edition
==================================================*/

import { APIEmbed, ApplicationCommandDataResolvable, Embed, Events, Guild, Interaction, Message, TextChannel, Webhook } from "discord.js"
import Express, { json, Request, Response } from "express"
import { GDRCommand } from "./commands"
import { GDRClient, LogType } from "./client"

import { ServerStatusInfo } from "./types"
import { GmodCommand, SetGmodCommand } from "./types"
import { ENV } from "./env"

/*==========================
        Main Constants
==========================*/

const REST = Express();
export let ServerStatus: ServerStatusInfo;
export let ServerEmbed: APIEmbed;

/*==========================
        Functions
==========================*/

function IsAllowed(request: Request): boolean {
    return true;
}

let MessageList: string[][] = [];
const GDR = new GDRClient({ChannelID: ENV.DISCORD_CHANNEL, SteamKey: ENV.STEAM_KEY});

process.on("unhandledRejection", (error: Error) => {
    GDR.WriteLog(LogType.Error, `Unhandled Rejection`);
    GDR.WriteLog(LogType.Error, `${error.stack}`);
});

process.on("uncaughtException", (error: Error) => {
    GDR.WriteLog(LogType.Error, `Unhandled Exception`);
    GDR.WriteLog(LogType.Error, `${error.stack}`);
});

/*==========================
         Discord bot
==========================*/

GDR.on(Events.ClientReady, async(): Promise<void> => {
    GDR.WriteLog(LogType.Discord, `Client is ready as ${GDR.user.displayName}, initializing the bot`);

    let channel: TextChannel = await GDR.channels.cache.get(GDR.ChannelID)?.fetch(true) as TextChannel;
    if (!channel) {
        throw new Error("Invalid specified Channel ID");
    }

    if (channel.isDMBased()) {
        throw new Error("Specified Channel ID is a Direct Message channel, not a Guild channel");
    }

    if (!channel.isTextBased()) {
        throw new Error("Specified Channel ID is not a Guild Text-based channel, impossible to read/send messages there");
    }
    GDR.WriteLog(LogType.Discord, `Reading and sending messages from channel: ${channel.name}`);
    if (!GDR.CheckChannelPermissions(channel)) { return; };

    const Webhooks = await channel.fetchWebhooks();
    GDR.WriteLog(LogType.Discord, `Getting Webhook`);
    
    let Webhook: Webhook|void = Webhooks.find((hook) => hook.name === "GDR");
    if (!Webhook) {
        GDR.WriteLog(LogType.Discord, `The Webhook doesn't exists, creating a new one`);
        Webhook = await channel.createWebhook({name: "GDR", reason: "GM Discord Relay Webhook"});
    }

    if (Webhook.owner.id != GDR.user.id) {
        throw new Error(`Webhook found in channel ${channel.name} but is not possible to use since it's owned by ${Webhook.owner.username}`);
    }
    GDR.Webhook = Webhook;
    GDR.WriteLog(LogType.Discord, `Got Webhook for message bridging`);

    let commands: ApplicationCommandDataResolvable[] = [];
    GDR.WriteLog(LogType.Discord, `Getting Commands`);

    GDR.Commands.forEach((Command: GDRCommand) => { commands.push(Command.Data); });
    GDR.guilds.cache.forEach(async (guild: Guild) => { await guild.commands.set(commands); });
    GDR.WriteLog(LogType.Discord, `Got ${GDR.Commands.size} commands`);
    GDR.WriteLog(LogType.Discord, `The Bot is ready`)
});

GDR.on(Events.InteractionCreate, async (interaction: Interaction): Promise<void> => {
    if (!interaction.inGuild()) { return; }
    if (!interaction.isChatInputCommand()) { return; }
    
    let Command: GDRCommand|void = GDR.Commands.get(interaction.commandName);
    if (!Command) { return; }

    Command.Execute({client: GDR, interaction: interaction}).catch((Error: Error) => {
        GDR.WriteLog(LogType.Error, `Failed during execution of /${interaction.commandName}`);
        GDR.WriteLog(LogType.Error, `${Error}`);
    });
})

GDR.on(Events.MessageCreate, async (message: Message): Promise<void> => {
    if (!GDR.CheckMessage(message)) { return; }
   
    const Author = await message.member?.fetch(true);
    if (!Author) { return; }

    let fileURL: string = message.attachments.first()?.url ?? message.stickers.first()?.url;
    if (fileURL) {
        GDR.WriteLog(LogType.Chat, `${Author.displayName}: ${message.cleanContent}\n${fileURL}`);
        MessageList.push([Author.displayName, `${message.cleanContent}\n${fileURL}`]);
        return;
    }
    GDR.WriteLog(LogType.Chat, `${Author.displayName}: ${message.cleanContent}`);
    MessageList.push([Author.displayName, `${message.cleanContent}`]);
});

GDR.on(Events.Error, (error) => {
    GDR.WriteLog(LogType.Error, `Client Error: ${error}`);
});

GDR.login(ENV.DISCORD_TOKEN).catch((error) => {
    GDR.WriteLog(LogType.Error, `Unable to log in to Discord`);
    GDR.WriteLog(LogType.Error, `${error.stack}`);
    process.exit();
});

/*==========================
          SERVER
==========================*/

REST.get("/getmessages", async (Request: Request, Response: Response): Promise<void> => {
    if ( !IsAllowed(Request) ) { Response.status(403).send("Forbidden"); return; }

    Response.send(JSON.stringify(MessageList));
    MessageList = [];
});

REST.get("/command", async (Request, Response): Promise<void> => {
    if ( !IsAllowed(Request) ) { Response.status(403).send("Forbidden"); return; }
    if ( GmodCommand.cmd == "none" ) { Response.status(204).send("No Content") ; return;}

    Response.send(JSON.stringify({cmd: GmodCommand.cmd}))
    SetGmodCommand("none");
})

REST.get("/helloworld", async (Request, Response): Promise<void> => {
    Response.send("<h1>STFU</h1>");
});

REST.use(json());
REST.post("/sendmessage", async (Request, Response): Promise<void> => {
    if ( !IsAllowed(Request) ) { Response.status(403).send("Forbidden"); return; }

    let MsgInfo = Request.body;
    Response.end();

    let sAvatar = await GDR.GetSteamAvatar(MsgInfo[0]) as string;
    GDR.WriteLog(LogType.GMOD, `${MsgInfo[1]}: ${MsgInfo[2]}`);
    GDR.SendMessage(sAvatar, MsgInfo[1], MsgInfo[2]);
});

REST.post("/sendmessagehook", async (Request, Response): Promise<void> => {
    if ( !IsAllowed(Request) ) { Response.status(403).send("Forbidden"); return; }

    let MsgInfo = Request.body;
    Response.end();
    GDR.WriteLog(LogType.GMOD, `${MsgInfo[1]}: ${MsgInfo[2]}`);
    GDR.SendMessage(MsgInfo[0], MsgInfo[1], MsgInfo[2]);
});

REST.post("/status", async(Request, Response): Promise<void> => {
    if ( !IsAllowed(Request) ) { Response.status(403).send("Forbidden"); return; }

    let StatusInfo = Request.body;
    ServerStatus = StatusInfo as ServerStatusInfo;
    Response.end();
});

REST.post("/statusembed", async(Request, Response): Promise<void> => {
    if ( !IsAllowed(Request) ) { Response.status(403).send("Forbidden"); return; }

    let EmbedInfo = Request.body as APIEmbed;
    if (!EmbedInfo.description) { Response.status(400).send("Bad Request"); return; }

    ServerEmbed = EmbedInfo;
    Response.end();
});

const Server = REST.listen(ENV.PORT, () => {
    GDR.WriteLog(LogType.Rest, `Server ready, listening on port ${ENV.PORT}`);
})