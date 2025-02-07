/*==================================================
                Types and Interfaces
==================================================*/

export interface ServerCommandType {
    cmd: "none" | "status" | "players" | "map" | "gamemode" | "hostname" | "hostaddress" | "maxplayers" | "meta";
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

export let GmodCommand: ServerCommand = {cmd: "none"};

export function SetGmodCommand(cmd: string) { GmodCommand.cmd = cmd; }
export function GetGmodCommand(): string { return GmodCommand.cmd; }