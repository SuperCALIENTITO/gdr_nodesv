/*==================================================
                Dotenv Configuration
==================================================*/

import dotenv from 'dotenv';
dotenv.config();

interface ENV_INTERFACE {
    PORT: number;
    STEAM_KEY: string;
    DISCORD_KEY: string;
    DISCORD_CHANNEL: string;
    DISCORD_TOKEN: string;
    DISCORD_LINK: string;
}

export const ENV: ENV_INTERFACE = {
    PORT: Number(process.env.PORT) || 3000,
    STEAM_KEY: process.env.STEAM_KEY,
    DISCORD_KEY: process.env.DISCORD_KEY,
    DISCORD_CHANNEL: process.env.DISCORD_CHANNEL,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    DISCORD_LINK: process.env.DISCORD_LINK
};