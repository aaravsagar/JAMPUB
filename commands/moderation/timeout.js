import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Apply a timeout to a user (or make permanent via "permanent" flag)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to time out')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('Duration in minutes (optional if using permanent)')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('permanent')
        .setDescription('If true, treat as permanent action (will ban instead)') // note: permanent -> ban
        .setRequired(false))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.guild) {
      return await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('This command can only be used in a server.')],
        ephemeral: true
      });
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('You do not have permission to timeout members.')],
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user', true);
    const minutes = interaction.options.getInteger('minutes');
    const permanent = interaction.options.getBoolean('permanent') || false;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      if (permanent) {
        // Treat permanent as a ban for now
        await interaction.guild.members.ban(user.id, { reason });

        await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Banned <@${user.id}>`)] });

        interaction.logMessage = `Banned <@${user.id}>`;
        interaction.logData = {
          'User': `${user.tag} (${user.id})`,
          'Moderator': `${interaction.user.tag} (${interaction.user.id})`,
          'Reason': reason,
          'Duration': 'Permanent',
          'Timestamp': new Date().toISOString()
        };
        return;
      }

      if (!minutes || minutes <= 0) {
        return await interaction.reply({
          embeds: [new EmbedBuilder().setDescription('Please provide a valid duration in minutes, or set permanent=true to ban.')],
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(user.id);
      const durationMs = minutes * 60 * 1000;

      await member.timeout(durationMs, reason);

      await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Timed out <@${user.id}>`)] });

      interaction.logMessage = `Timed out <@${user.id}>`;
      interaction.logData = {
        'User': `${user.tag} (${user.id})`,
        'Moderator': `${interaction.user.tag} (${interaction.user.id})`,
        'Reason': reason,
        'Duration': `${minutes} minute(s)`,
        'Timestamp': new Date().toISOString()
      };
    } catch (err) {
      console.error('Timeout failed:', err);
      await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('❌ Failed to apply timeout. Ensure I have the required permissions and the user is in the guild.').setColor(0xff0000)],
        ephemeral: true
      });
    }
  }
};