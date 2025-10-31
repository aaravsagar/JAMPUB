import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, PermissionsBitField } from 'discord.js';
import fs from 'fs';
import path from 'path';
import config from '../../config.json' with { type: 'json' };

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
    console.error('[AUTOMOD] Failed writing warnings file:', err);
  }
}
function addWarning(guildId, user, moderator, reason) {
  const warnings = readWarnings();
  warnings[guildId] ??= {};
  warnings[guildId][user.id] ??= [];
  warnings[guildId][user.id].push({
    moderator,
    reason,
    timestamp: new Date().toISOString()
  });
  writeWarnings(warnings);
  return warnings[guildId][user.id].length;
}

const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord(?:\.gg|(?:app)?\.com\/invite)\/)[\w-]+/i;
const urlRegex = /https?:\/\/[^\s]+/i;

function hasExemptRole(member) {
  if (!config.AUTOMOD_EXEMPT_ROLES || !Array.isArray(config.AUTOMOD_EXEMPT_ROLES)) return false;
  return member.roles.cache.some(r => config.AUTOMOD_EXEMPT_ROLES.includes(r.id) || config.AUTOMOD_EXEMPT_ROLES.includes(r.name));
}
function containsBlacklistedWord(content) {
  if (!config.AUTOMOD_BLACKLIST_WORDS || !Array.isArray(config.AUTOMOD_BLACKLIST_WORDS)) return false;
  const lower = content.toLowerCase();
  return config.AUTOMOD_BLACKLIST_WORDS.some(w => w && lower.includes(w.toLowerCase()));
}

async function sendLog(client, title, description, fields = []) {
  const TEST_MODE = process.env.TEST_MODE === 'true' || config.TEST_MODE === true;
  const targetChannelId = TEST_MODE ? (config.TEST_CHANNEL_ID || config.LOG_CHANNEL_ID) : config.LOG_CHANNEL_ID;
  if (!targetChannelId) {
    console.warn('[AUTOMOD] No LOG_CHANNEL_ID configured.');
    return;
  }
  try {
    const ch = await client.channels.fetch(targetChannelId);
    if (!ch || !ch.isTextBased()) {
      console.warn('[AUTOMOD] Log channel unavailable or not text-based.');
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description || '')
      .setColor(0xffa500)
      .addFields(fields)
      .setTimestamp(new Date());
    if (TEST_MODE) embed.setFooter({ text: 'TEST MODE' });
    await ch.send({ embeds: [embed] });
  } catch (err) {
    console.error('[AUTOMOD] Failed to send log embed:', err);
  }
}

export default {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure automod settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle automod on/off'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('View current automod configuration'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!interaction.guild) {
            return await interaction.reply({
                embeds: [new EmbedBuilder().setDescription('This command can only be used in a server')],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'toggle') {
            config.AUTOMOD_ENABLED = !config.AUTOMOD_ENABLED;
            return await interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`Automod ${config.AUTOMOD_ENABLED ? 'enabled' : 'disabled'}`)],
                ephemeral: true
            });
        }

        if (subcommand === 'config') {
            const configEmbed = new EmbedBuilder()
                .setTitle('Automod Configuration')
                .addFields(
                    { name: 'Status', value: config.AUTOMOD_ENABLED ? 'Enabled' : 'Disabled', inline: true },
                    { name: 'Check Invites', value: config.AUTOMOD_CHECK_INVITES ? 'Yes' : 'No', inline: true },
                    { name: 'Check Links', value: config.AUTOMOD_CHECK_LINKS ? 'Yes' : 'No', inline: true },
                    { name: 'Check Caps', value: config.AUTOMOD_CHECK_CAPS ? 'Yes' : 'No', inline: true },
                    { name: 'Max Caps %', value: String(config.AUTOMOD_MAX_CAPS_PERCENT ?? 70), inline: true },
                    { name: 'Min Length', value: String(config.AUTOMOD_MIN_LENGTH ?? 8), inline: true },
                    { name: 'Allow All Caps', value: config.AUTOMOD_ALLOW_ALL_CAPS ? 'Yes' : 'No', inline: true },
                    { name: 'Blacklisted Words', value: config.AUTOMOD_BLACKLIST_WORDS?.length ? 'Set' : 'None', inline: true },
                    { name: 'Exempt Roles', value: config.AUTOMOD_EXEMPT_ROLES?.length ? 'Set' : 'None', inline: true }
                );

            return await interaction.reply({ embeds: [configEmbed], ephemeral: true });
        }
    },

    registerEvents(client) {
        if (!config.AUTOMOD_ENABLED) return;
        
        client.on('messageCreate', async message => {
            try {
              if (!message.guild || message.author?.bot) return;
              const member = message.member;
              if (!member) return;

              // skip moderators / exempt roles
              const modPerms = [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers];
              if (member.permissions.has(modPerms) || hasExemptRole(member)) return;

              const content = String(message.content || '').trim();
              if (!content) return;

              let reason = null;

              if (config.AUTOMOD_CHECK_INVITES && inviteRegex.test(content)) reason = 'Posting Discord invites';
              if (!reason && config.AUTOMOD_CHECK_LINKS && urlRegex.test(content)) reason = 'Posting links';
              if (!reason && containsBlacklistedWord(content)) reason = 'Blacklisted word detected';
              if (!reason && config.AUTOMOD_CHECK_CAPS) {
                const letters = content.replace(/[^A-Za-z]/g, '');
                if (letters.length >= (config.AUTOMOD_MIN_LENGTH || 8)) {
                  const upper = letters.replace(/[^A-Z]/g, '').length;
                  const capsPercent = letters.length > 0 ? (upper / letters.length) * 100 : 0;
                  if (capsPercent >= (config.AUTOMOD_MAX_CAPS_PERCENT ?? 70) && !config.AUTOMOD_ALLOW_ALL_CAPS) {
                    reason = 'Excessive caps';
                  }
                }
              }

              if (!reason) return;

              // Attempt to delete message (best-effort)
              try {
                await message.delete().catch(() => null);
              } catch { /* ignore */ }

              // Add warning via warnings.json
              const guildId = message.guild.id;
              const newCount = addWarning(guildId, message.author, 'AutoMod', reason);

              // Send DM to user with reason and info (embed)
              try {
                const dmEmbed = new EmbedBuilder()
                  .setTitle('You have been warned')
                  .setDescription(`Reason: ${reason}`)
                  .addFields(
                    { name: 'Server', value: `${message.guild.name} (${message.guild.id})`, inline: false },
                    { name: 'Warn Count', value: `${newCount}`, inline: false }
                  );
                await message.author.send({ embeds: [dmEmbed] }).catch(() => null);
              } catch { /* ignore DM failures */ }

              // Send a temporary channel message notifying the user (single-line embed), then delete it
              try {
                const tempEmbed = new EmbedBuilder()
                  .setDescription(`You have been warned: ${reason}`);
                const tempMsg = await message.channel.send({ embeds: [tempEmbed] }).catch(() => null);

                // delete the temp message after configured delay (default 7s). best-effort.
                const DELAY_MS = Number(config.AUTOMOD_NOTIFY_DELETE_MS ?? 7000);
                if (tempMsg) {
                  setTimeout(() => {
                    tempMsg.delete().catch(() => null);
                  }, DELAY_MS);
                }
              } catch (err) {
                // ignore send/delete errors
              }

              // Check and apply threshold action
              const threshold = Number(config.WARN_THRESHOLD ?? 3);
              const thresholdAction = String((config.WARN_THRESHOLD_ACTION ?? 'NONE')).toUpperCase();
              const thresholdDuration = Number(config.WARN_THRESHOLD_DURATION ?? 15);

              let actionTaken = 'None';
              let durationText = 'N/A';

              // fetch bot member and target member for role position checks
              const botMember = await message.guild.members.fetch(client.user.id).catch(() => null);
              const targetMember = await message.guild.members.fetch(message.author.id).catch(() => null);

              if (threshold > 0 && thresholdAction !== 'NONE' && newCount >= threshold) {
                try {
                  // ensure bot has required permissions and role hierarchy
                  if (thresholdAction === 'BAN') {
                    if (!botMember?.permissions.has(PermissionsBitField.Flags.BanMembers)) throw new Error('Missing BAN_MEMBERS permission');
                    if (targetMember && botMember.roles.highest.position <= targetMember.roles.highest.position) throw new Error('Cannot ban: role hierarchy');
                    await message.guild.members.ban(message.author.id, { reason: `AutoMod threshold reached (${newCount} warns): ${reason}` });
                    actionTaken = 'BANNED';
                    durationText = 'Permanent';
                  } else if (thresholdAction === 'KICK') {
                    if (!botMember?.permissions.has(PermissionsBitField.Flags.KickMembers)) throw new Error('Missing KICK_MEMBERS permission');
                    if (targetMember && botMember.roles.highest.position <= targetMember.roles.highest.position) throw new Error('Cannot kick: role hierarchy');
                    await message.guild.members.kick(message.author.id, `AutoMod threshold reached (${newCount} warns): ${reason}`);
                    actionTaken = 'KICKED';
                    durationText = 'N/A';
                  } else if (thresholdAction === 'TIMEOUT') {
                    if (!botMember?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) throw new Error('Missing MODERATE_MEMBERS permission');
                    if (targetMember && botMember.roles.highest.position <= targetMember.roles.highest.position) throw new Error('Cannot timeout: role hierarchy');
                    const minutes = Math.max(1, thresholdDuration || 15);
                    if (targetMember) {
                      await targetMember.timeout(minutes * 60 * 1000, `AutoMod threshold reached (${newCount} warns): ${reason}`);
                      actionTaken = 'TIMED OUT';
                      durationText = `${minutes} minute(s)`;
                    } else {
                      actionTaken = 'Member not in guild';
                    }
                  }

                  // DM the user about the action taken (best-effort)
                  try {
                    const actionDm = new EmbedBuilder()
                      .setTitle('Moderation action taken')
                      .setDescription(`An automatic moderation action was taken against you in ${message.guild.name}`)
                      .addFields(
                        { name: 'Action', value: actionTaken, inline: false },
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Warn Count', value: `${newCount}`, inline: false },
                        { name: 'Duration', value: durationText === '' ? 'Permanent' : String(durationText), inline: false }
                      );
                    await message.author.send({ embeds: [actionDm] }).catch(() => null);
                  } catch { /* ignore DM errors */ }

                } catch (err) {
                  console.error('[AUTOMOD] Threshold action failed:', err);
                  actionTaken = 'Action failed';
                  durationText = String(err?.message ?? err);
                  // DM user the failure info (best-effort)
                  try {
                    const failDm = new EmbedBuilder()
                      .setTitle('Moderation action failed')
                      .setDescription(`Attempted automatic action in ${message.guild.name}`)
                      .addFields(
                        { name: 'Attempted Action', value: thresholdAction, inline: false },
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Error', value: String(err?.message ?? err), inline: false }
                      );
                    await message.author.send({ embeds: [failDm] }).catch(() => null);
                  } catch { /* ignore */ }
                }
              }

              // Build log fields
              const fields = [
                { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: false },
                { name: 'Channel', value: `${message.channel?.name ?? 'unknown'} (${message.channelId})`, inline: false },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Message', value: content.length > 1024 ? content.slice(0, 1021) + '...' : content, inline: false },
                { name: 'Warn Count', value: `${newCount}`, inline: false },
                { name: 'Action', value: actionTaken, inline: false },
                { name: 'Duration', value: durationText === '' ? 'Permanent' : String(durationText), inline: false }
              ];

              await sendLog(client, 'AutoMod Action', `AutoMod triggered for <@${message.author.id}>`, fields);
            } catch (err) {
              console.error('[AUTOMOD] Handler error:', err);
            }
          });
    }
};