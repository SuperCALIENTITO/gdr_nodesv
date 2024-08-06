import { Client, Collection, Webhook, GuildTextBasedChannel, GuildMember, PermissionsBitField, PermissionFlagsBits, Message, Events, TextChannel, ApplicationCommandDataResolvable, Guild, Interaction } from "discord.js";
import { RequestOptions, request } from 'http';
import { GDRCommand, Commands } from "./commands";
import NodeCache from "node-cache";

export enum LogType {
	Discord = "\x1b[31m [Discord] \x1b[39m",
	Chat = "\x1b[36m [Chat] \x1b[39m",
	Rest = "\x1b[95m [REST] \x1b[39m",
	Error = "\x1b[31m [Error] \x1b[39m"
}

const Cache = new NodeCache();
const DateObj = new Date();

/*==========================
        Main Class
==========================*/

export class GDRClient extends Client {
    public constructor({ChannelID, SteamKey}) {
        super({
            allowedMentions: {repliedUser: false, parse: []},
            intents: ["Guilds", "GuildMessages", "GuildWebhooks", "MessageContent"]},
        );
        this.ChannelID = ChannelID;
        this.SteamKey = SteamKey;
    }

    public Commands: Collection<string, GDRCommand> = Commands;
    public ChannelID: string;
    public SteamKey: string;
    public Webhook: Webhook;

    public GetTime(): string {
        return `${DateObj.getHours()}:${DateObj.getMinutes()}:${DateObj.getSeconds()}`
    }

    public WriteLog(type: LogType = LogType.Error, log: string): void {
        let CurrentTime = this.GetTime()
        console.log(CurrentTime + " -" + type + log)
    }

    /**
     * Check if on the specified channel have permissions to view, manage webhooks and send messages
     * @param channel 
     * @returns boolean
     */
    public async CheckChannelPermissions(channel: GuildTextBasedChannel): Promise<boolean> {
        let myself: GuildMember = await channel.guild.members.fetchMe();
        let permissions: PermissionsBitField = channel.permissionsFor(myself);
        if (!permissions.has(PermissionFlagsBits.ViewChannel)) {
            this.WriteLog(LogType.Error, "Not allowed to view that channel");
            return false;
        }

        if (!permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            this.WriteLog(LogType.Error, "Not allowed to manage webhooks to that channel");
            return false;
        }

        if (!permissions.has(PermissionFlagsBits.SendMessages)) {
            this.WriteLog(LogType.Error, "Not allowed to send messages to that channel");
            return false;
        }
        return true;
    }

    public CheckMessage(message: Message): boolean {
        if (message.author.bot) { return false; }
        if (message.channelId != this.ChannelID) { return false; }
        return true;
    }

    public SendMessage(imageURL: string, username: string, content: string): void {
        if (!this.Webhook) { return; }
        if (content.length <= 0) { return; }
        this.Webhook.send({username: username, content: content, avatarURL: imageURL});
    }

    public async GetSteamAvatar(id64: string): Promise<string> {
        let avatarURL = Cache.get(id64) as string;
        if (avatarURL) { return avatarURL; }

        const RequestOptions = this.GenerateSteamUserRequest(id64);
        const RequestPromise = this.RequestPromise(RequestOptions);

        const Response = await RequestPromise as any;
        avatarURL = Response.response.players[0].avatarfull;
        Cache.set(id64, avatarURL)
        return avatarURL;
    }

    private GenerateSteamUserRequest(id64: string): RequestOptions {
        return {
            hostname: `api.steampowered.com`,
            path: `/ISteamUser/GetPlayerSummaries/v0002/?key=${this.SteamKey}&steamids=${id64}`,
            method: `GET`
        }
    }

    private RequestPromise(RequestOptions: string | RequestOptions | URL): Promise<unknown> {
        return new Promise((Resolve, Reject): void => {
            let Result: string = "";
            request(RequestOptions, (Response) => {
                Response.on("data", (Data) => { Result += Data; });
                Response.on("end", () => { Resolve(JSON.parse(Result)); });
                Response.on("error", (Error) => {
                    this.WriteLog(LogType.Error, `Steam API request failed: ${Error}`);
                    Reject(Error);
                })
            }).end();
        });
    }
}