/*==================================================
                Types and Interfaces
==================================================*/

export interface ServerCommandType {
    cmd: "none" | "status" | "players" | "map" | "gamemode" | "hostname" | "hostaddress" | "maxplayers" | "meta";
}

/**
 * Contains information about a player
 */
export type PlayerStatusInfo = {
    /**
     * The player's name
     */
    name: string,

    /**
     * The player's rank/usergroup
     */
    usergroup: string,

    /**
     * The player's score/frags
     */
    score: number,

    /**
     * The player's total playtime
     */
    time: number,

    /**
     * If the player is actually a bot or not
     */
    bot: boolean
};

/**
 * Contains information about the server status and any possible extra data
 */
export type ServerStatusInfo = {
    /**
     * The server's display name
     */
    hostname: string,

    /**
     * The server's address
     */
    hostaddress: string,

    /**
     * The server's current gamemode on a visual name
     */
    gamemode: string,

    /**
     * The server's current gamemode on a internal name
     */
    gamemode_dir: string,

    /**
     * The server's current map
     */
    map: string,

    /**
     * The server's current player formation
     */
    players: PlayerStatusInfo[],

    /**
     * The server's maximum of players
     */
    maxplayers: number,

    /**
     * Extra data to be used here
     */
    meta: any[]
};

export type ServerCommand = {cmd: string};

export let GmodCommand: ServerCommand = {cmd: "none"};

export function SetGmodCommand(cmd: string) { GmodCommand.cmd = cmd; }
export function GetGmodCommand(): string { return GmodCommand.cmd; }