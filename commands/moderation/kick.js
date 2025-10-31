import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    if (!interaction.guild) {
      return await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('This command can only be used in a server.')],
        ephemeral: true
      });
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      return await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('You do not have permission to kick members.')],
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.guild.members.kick(user.id, reason);

      // User-facing single-line embed
      await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Kicked <@${user.id}>`)] });

      // Detailed log data for index.js
      interaction.logMessage = `Kicked <@${user.id}>`;
      interaction.logData = {
        'User': `${user.tag} (${user.id})`,
        'Moderator': `${interaction.user.tag} (${interaction.user.id})`,
        'Reason': reason,
        'Duration': 'N/A', // Kick has no duration, ensure not empty
        'Timestamp': new Date().toISOString()
      };
    } catch (err) {
      console.error('Kick failed:', err);
      await interaction.reply({
        embeds: [new EmbedBuilder().setDescription('❌ Failed to kick the user.').setColor(0xff0000)],
        ephemeral: true
      });
    }
  }
};