import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import config from '../../config.json' with { type: 'json' };

// Warnings storage
const WARN_FILE = path.join(process.cwd(), 'warnings.json');

function readWarnings() {
  try {
    if (!fs.existsSync(WARN_FILE)) return {};
    return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function writeWarnings(data) {
  try {
    fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write warnings file:', err);
  }
}

const WARN_THRESHOLD = Number(config.WARN_THRESHOLD ?? 3);
const WARN_THRESHOLD_ACTION = String((config.WARN_THRESHOLD_ACTION ?? 'NONE')).toUpperCase();
const WARN_THRESHOLD_DURATION = Number(config.WARN_THRESHOLD_DURATION ?? 15);

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user. Logs warning and triggers threshold action.')
    .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(false))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Optional timeout duration in minutes (overrides config)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setDescription('This command can only be used in a server.')],
        ephemeral: true
      });
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setDescription('You do not have permission to warn members.')],
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const overrideDuration = interaction.options.getInteger('duration'); // optional override for timeout minutes

    // Load and increment warnings
    const warnings = readWarnings();
    const guildId = interaction.guildId;
    warnings[guildId] ??= {};
    warnings[guildId][targetUser.id] ??= [];

    warnings[guildId][targetUser.id].push({
      moderator: `${interaction.user.tag} (${interaction.user.id})`,
      reason,
      timestamp: new Date().toISOString()
    });

    writeWarnings(warnings);

    const userWarnCount = warnings[guildId][targetUser.id].length;

    // Prepare detailed log data (will be sent by index.js)
    const logData = {
      User: `${targetUser.tag} (${targetUser.id})`,
      Moderator: `${interaction.user.tag} (${interaction.user.id})`,
      Reason: reason,
      'Warn Count': `${userWarnCount}`,
      Duration: 'N/A',
      Action: 'None',
      Timestamp: new Date().toISOString()
    };

    // Check threshold and take configured action
    if (WARN_THRESHOLD > 0 && userWarnCount >= WARN_THRESHOLD && WARN_THRESHOLD_ACTION !== 'NONE') {
      const action = WARN_THRESHOLD_ACTION;
      logData.Action = action;
      try {
        if (action === 'BAN') {
          await interaction.guild.members.ban(targetUser.id, { reason: `Warn threshold reached (${userWarnCount} warns): ${reason}` });
          logData.Duration = 'Permanent';
        } else if (action === 'KICK') {
          await interaction.guild.members.kick(targetUser.id, `Warn threshold reached (${userWarnCount} warns): ${reason}`);
          logData.Duration = 'N/A';
        } else if (action === 'TIMEOUT') {
          const minutes = Number.isInteger(overrideDuration) ? overrideDuration : (Number.isFinite(WARN_THRESHOLD_DURATION) ? WARN_THRESHOLD_DURATION : 15);
          const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
          if (member) {
            const durationMs = Math.max(1, minutes) * 60 * 1000;
            await member.timeout(durationMs, `Warn threshold reached (${userWarnCount} warns): ${reason}`);
            logData.Duration = `${minutes} minute(s)`;
          } else {
            logData.Duration = 'Member not in guild';
          }
        }
      } catch (err) {
        console.error('Threshold action failed:', err);
        logData.Error = String(err?.message ?? err);
      }
    }

    // Minimal user-facing embed (single line)
    interaction.logMessage = `Warned <@${targetUser.id}>`;
    interaction.logData = logData;

    // Reply to moderator (single-line embed)
    await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Warned <@${targetUser.id}>`)] });
  }
};