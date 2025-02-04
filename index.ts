/*==================================================
            Gmod Relay Discord - Node.js
                 TypeScript Edition
==================================================*/

import { ApplicationCommandDataResolvable, Events, Guild, Interaction, Message, TextChannel, Webhook } from "discord.js"
import Express, { json } from "express"
import { ChannelID, Token, SteamKey, Port, DiscordLink } from "./config.json"
import { GDRCommand } from "./commands"
import { GDRClient, LogType } from "./client"

/*==========================
        Main Constants
==========================*/

const REST = Express();

/*==========================
        Functions
==========================*/

function IsValidAddress(address: string): boolean {
    //const ipAddress = address.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/)[0];
    return true;
}

export type PlayerStatusInfo = {
    name: string,
    usergroup: string,
    score: number,
    time: number,
    bot: boolean
};

export type ServerStatusInfo = {
    hostname: string,
    hostaddress: string,
    gamemode: string,
    map: string,
    players: PlayerStatusInfo[],
    maxplayers: number,
    meta: any[]
};

export type ServerCommand = {cmd: string};

export let ServerStatus: ServerStatusInfo;
export let GmodCommand: ServerCommand = {cmd: "none"};
export function SetGmodCommand(cmd: string) { GmodCommand.cmd = cmd; }

let MessageList: string[][] = [];
const GDR = new GDRClient({ChannelID: ChannelID, SteamKey: SteamKey});

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
    GDR.Webhook = Webhook;

    let commands: ApplicationCommandDataResolvable[] = [];
    GDR.WriteLog(LogType.Discord, `Getting Commands`);

    GDR.Commands.forEach((Command: GDRCommand) => { commands.push(Command.Data); });
    GDR.guilds.cache.forEach(async (guild: Guild) => { await guild.commands.set(commands); });
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

GDR.login(Token).catch((error) => {
    GDR.WriteLog(LogType.Error, `Unable to log in to Discord`);
    GDR.WriteLog(LogType.Error, `${error.stack}`);
});

/*==========================
          SERVER
==========================*/

REST.get("/getmessages", async (Request, Response): Promise<void> => {
    if ( !IsValidAddress(Request.ip) ) { Response.status(403).send("Forbidden"); return; }

    Response.send(JSON.stringify(MessageList));
    MessageList = [];
});

REST.get("/command", async (Request, Response): Promise<void> => {
    if ( !IsValidAddress(Request.ip) ) { Response.status(403).send("Forbidden"); return; }
    if ( GmodCommand.cmd == "none" ) { Response.status(204).send("No Content") ; return;}

    Response.send(JSON.stringify({cmd: GmodCommand.cmd}))
    SetGmodCommand("none");
})

REST.use(json());
REST.post("/sendmessage", async (Request, Response): Promise<void> => {
    if ( !IsValidAddress(Request.ip) ) { Response.status(403).send("Forbidden"); return; }

    let MsgInfo = Request.body;
    Response.end();

    let sAvatar = await GDR.GetSteamAvatar(MsgInfo[0]) as string;
    GDR.SendMessage(sAvatar, MsgInfo[1], MsgInfo[2]);
});

REST.post("/sendmessagehook", async (Request, Response): Promise<void> => {
    if ( !IsValidAddress(Request.ip) ) { Response.status(403).send("Forbidden"); return; }

    let MsgInfo = Request.body;
    Response.end();
    GDR.SendMessage(MsgInfo[0], MsgInfo[1], MsgInfo[2]);
});

REST.post("/status", async(Request, Response): Promise<void> => {
    if ( !IsValidAddress(Request.ip) ) { Response.status(403).send("Forbidden"); return; }

    let StatusInfo = Request.body;
    ServerStatus = StatusInfo as ServerStatusInfo;
    Response.end();
});

const Server = REST.listen(Port, () => {
    GDR.WriteLog(LogType.Rest, `Server ready, listening on port ${Port}`);
})