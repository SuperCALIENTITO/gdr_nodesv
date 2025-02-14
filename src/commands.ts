import { ApplicationCommandData, GuildMember, ChatInputCommandInteraction, Collection, EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { PlayerStatusInfo, SetGmodCommand } from "./types";
import { ServerEmbed, ServerStatus } from ".";
import { GDRClient } from "./client";
import { ENV } from "./env";
import { table } from "table";

interface CommandRunOptions {client: GDRClient, interaction: ChatInputCommandInteraction}
type CommandExecuteFunction = (options: CommandRunOptions) => Promise<any>;
export type GDRCommand = {ID: string, Data: ApplicationCommandData, Execute: CommandExecuteFunction}

function FormatTime(PlayerTime: number): string {
    const cuttime = (PlayerTime / 60)
    let seconds = PlayerTime % 60;
    let minutes = (cuttime) % 60;
    let hours = (cuttime) / 60;
    if (Number(hours.toFixed(0)) > 0) { return `${hours.toFixed(0)}s`; }
    else if (Number(minutes.toFixed(0)) > 0) { return `${minutes.toFixed(0)}m`; }
    return `${seconds.toFixed(0)}s`;
}

export const Commands: Collection<string, GDRCommand> = new Collection<string, GDRCommand>();
const CommandsDefinition: GDRCommand[] = [
    {
        ID: "ping",
        Data: {
            name: "ping",
            nameLocalizations: {
                ["es-ES"]: "latencia",
                ["es-419"]: "latencia"
            },
            description: "Ping test",
            descriptionLocalizations: {
                ["es-ES"]: "Prueba de latencia",
                ["es-419"]: "Prueba de latencia"
            }
        },
        async Execute({client, interaction}) {
            await interaction.deferReply({ephemeral: true});
            interaction.editReply({content: `📡 ${client.ws.ping}ms`, options: {ephemeral: true}});
        }
    },
    {
        ID: "status",
        Data: {
            name: "status",
            nameLocalizations: {
                ["es-ES"]: "estado",
                ["es-419"]: "estado"
            },
            description: "Gets the current state of the server (players, round information, etc)",
            descriptionLocalizations: {
                ["es-ES"]: "Obten el estado actual del servidor (jugadores, informacion de la ronda, entre otros)",
                ["es-419"]: "Obten el estado actual del servidor (jugadores, informacion de la ronda, entre otros)"
            }
        },
        async Execute({client, interaction}) {
            if (!ServerStatus) { // ServerEmbed
                interaction.reply({content: "Hubo un error inesperado, intentelo denuevo.", ephemeral: true});
                return;
            }

            // Embed
            const ServerInfoEmbed = new EmbedBuilder().setColor("#00ADFF")
            let hostname: string = ServerStatus.hostname;
            let hostaddress: string = ServerStatus.hostaddress;
            let gamemode: string = ServerStatus.gamemode;
            let gamemode_dir: string = ServerStatus.gamemode_dir;
            let map: string = ServerStatus.map;
            let players: PlayerStatusInfo[] = ServerStatus.players;
            let maxplayers: number = ServerStatus.maxplayers;
            let meta: any[] = ServerStatus.meta;

            let ServerDescription: string[] = [
                `**__Mapa__**: ${map}`,
                `**__Jugadores__**: ${players.length}/${maxplayers} jugadores`,
                `**__Modo de juego__*: ${gamemode}`
            ];

            ServerInfoEmbed.setTitle(hostname);
            ServerInfoEmbed.setAuthor({name: hostaddress, iconURL: ENV.DISCORD_EMBED_ICON});
            ServerInfoEmbed.setDescription(ServerDescription.join(`\n`));

            let TableString: string;
            if (players.length <= 0) {
                let TableData = [["No hay nadie jugando aun"]];
                TableString = table(TableData, {columns: [{alignment: "center"}]});
            }
            else {
                let TableData = [["Rango", "Jugador", "Puntaje", "Tiempo Jugado"]];
                for (let index = 0; index < players.length; index++) {
                    const player: PlayerStatusInfo = players[index];
                    let time = FormatTime(player.time);
                    let name = player.bot ? `[BOT] ${player.name}` : player.name;
                    TableData.push([player.usergroup, name, player.score.toString(), time])
                }
                TableString = table(TableData, {columns: [{alignment: "left"}, {alignment: "left"}, {alignment: "right"}, {alignment: "right"}]});
            }
            ServerInfoEmbed.addFields({name: "Jugadores", value: `\`\`\`\n${TableString}\n\`\`\``})
            ServerInfoEmbed.setImage(`${ENV.DISCORD_MAPS_LINK}${map}.png`)
            ServerInfoEmbed.setThumbnail(`${ENV.DISCORD_GAMEMODES_LINK}${gamemode_dir}.png`)
            interaction.reply({embeds: [ServerInfoEmbed]});
        }
    },
    {
        ID: "command",
        Data: {
            name: "command",
            nameLocalizations: {
                ["es-ES"]: "comando",
                ["es-419"]: "comando"
            },
            description: "Send a command to Garry's Mod server",
            descriptionLocalizations: {
                ["es-ES"]: "Envia un comando al servidor de Garry's Mod",
                ["es-419"]: "Envia un comando al servidor de Garry's Mod"
            },
            options: [
                {
                    name: "cmd",
                    nameLocalizations: {
                        ["es-ES"]: "cmd",
                        ["es-419"]: "cmd"
                    },
                    type: ApplicationCommandOptionType.String,
                    description: "The command to send to the Garry's Mod server",
                    descriptionLocalizations: {
                        ["es-ES"]: "El comando a enviar al servidor de Garry's Mod",
                        ["es-419"]: "El comando a enviar al servidor de Garry's Mod"
                    },
                    required: true
                }
            ]
        },
        async Execute({client, interaction}) { // Verificar si el usuario tiene el rol requerido
            const requiredRoleID = "884222069032759302"; // Reemplaza esto con el ID de tu rol
            const member = interaction.member as GuildMember;
            if (!member.roles.cache.some(role => role.id === requiredRoleID)) {
                interaction.reply({content: "No tienes permiso para usar este comando.", ephemeral: true});
                return;
            }

            const command: string = await interaction.options.getString("cmd", true);
            SetGmodCommand(command);
            interaction.reply({content: "Listo", ephemeral: true});
        }
    },
    {
        ID: "discord",
        Data: {
            name: "discord",
            description: "Sends a notification to any connected player about the Discord server",
            descriptionLocalizations: {
                ["es-ES"]: "Envia una notificacion a cualquier jugador conectado hacerca del servidor de Discord",
                ["es-419"]: "Envia una notificacion a cualquier jugador conectado hacerca del servidor de Discord"
            },
        },
        async Execute({client, interaction}) {
            const requiredRoleID = "884222069032759302"; // Reemplaza esto con el ID de tu rol
            const member = interaction.member as GuildMember;
            if (!member.roles.cache.some(role => role.id === requiredRoleID)) {
                interaction.reply({content: "No tienes permiso para usar este comando.", ephemeral: true});
                return;
            }

            const command: string = `say "Servidor de Discord: ${ENV.DISCORD_LINK}"`;
            SetGmodCommand(command);
        }
    },
    {
        ID: "player",
        Data: {
            name: "player",
            description: "Gets a player's info"
        },
        async Execute({client, interaction}) {
            
        }
    }
];

for (let Index = 0; Index < CommandsDefinition.length; Index++) {
    const Command = CommandsDefinition[Index];
    Commands.set(Command.ID, Command);
}