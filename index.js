import { Client, Collection, GatewayIntentBits, REST, Routes, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import config from './config.json' with { type: 'json' };

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
const commands = [];

// Recursively load all commands from commands/ and its subfolders
function loadCommands(dirPath = './commands') {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      loadCommands(filePath);
    } else if (file.name.endsWith('.js')) {
      import(`./${filePath.replace(/\\/g, '/')}`).then(command => {
        const cmd = command.default;
        if ('data' in cmd && 'execute' in cmd) {
          client.commands.set(cmd.data.name, cmd);
          commands.push(cmd.data.toJSON());
        } else {
          console.warn(`[⚠️] Skipped loading ${filePath} — missing data or execute`);
        }
      }).catch(err => {
        console.error(`[❌] Failed importing ${filePath}:`, err);
      });
    }
  }
}

loadCommands();

// Register slash commands once imports are done
setTimeout(async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log('[🔁] Refreshing application (/) commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, config.GUILD_ID),
      { body: commands }
    );
    console.log('[✅] Successfully reloaded commands.');
  } catch (error) {
    console.error('[❌] Failed to reload commands:', error);
  }
}, 1500);

// Welcome event handler
client.on('guildMemberAdd', async member => {
    if (!config.WELCOME_ENABLED) return;
    try {
        const welcomeChannel = await member.guild.channels.fetch(config.WELCOME_CHANNEL_ID);
        if (!welcomeChannel?.isTextBased()) return;

        const message = config.WELCOME_MESSAGE
            .replace('{user}', `<@${member.id}> (${member.user.tag})`)
            .replace('{server}', member.guild.name)
            .replace('{count}', member.guild.memberCount.toString());

        if (config.WELCOME_USE_EMBED) {
            const embed = new EmbedBuilder()
                .setDescription(message)
                .setColor(config.WELCOME_EMBED_COLOR || '#00ff00')
                .setTimestamp()
                .setAuthor({ 
                    name: member.user.tag, 
                    iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                });
            await welcomeChannel.send({ embeds: [embed] });
        } else {
            await welcomeChannel.send({ content: message });
        }
    } catch (err) {
        console.error('[WELCOME] Failed:', err);
    }
});

// Leave event handler
client.on('guildMemberRemove', async member => {
    if (!config.LEAVE_ENABLED) return;
    try {
        const leaveChannel = await member.guild.channels.fetch(config.LEAVE_CHANNEL_ID);
        if (!leaveChannel?.isTextBased()) return;

        const userTag = member.user.tag;
        const userId = member.user.id;
        const avatarURL = member.user.displayAvatarURL({ dynamic: true });

        const message = config.LEAVE_MESSAGE
            .replace('{user}', `<@${userId}> (${userTag})`)
            .replace('{server}', member.guild.name);

        if (config.LEAVE_USE_EMBED) {
            const embed = new EmbedBuilder()
                .setDescription(message)
                .setColor(config.LEAVE_EMBED_COLOR || '#ff0000')
                .setTimestamp()
                .setAuthor({ 
                    name: userTag, 
                    iconURL: avatarURL 
                });
            await leaveChannel.send({ embeds: [embed] });
        } else {
            await leaveChannel.send({ content: message });
        }
    } catch (err) {
        console.error('[LEAVE] Failed:', err);
    }
});

// Ready event
client.on('ready', () => {
    console.log(`[🤖] Logged in as ${client.user.tag}`);
});

// Login the client
client.login(process.env.TOKEN).catch(err => {
    console.error('[❌] Failed to login:', err);
});