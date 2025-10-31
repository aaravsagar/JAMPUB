// ban.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    if (!user) {
      return await interaction.reply({ 
        embeds: [new EmbedBuilder().setDescription('❌ Invalid user.').setColor(0xff0000)], 
        ephemeral: true 
      });
    }
    
    try {
      await interaction.guild.members.ban(user.id, { reason });

      // Minimal user-facing embed: single line "Banned {user}"
      const replyEmbed = new EmbedBuilder()
        .setDescription(`Banned <@${user.id}>`);
      await interaction.reply({ embeds: [replyEmbed] });

      // Detailed log for index.js to post to the log channel
      interaction.logMessage = `Banned <@${user.id}>`; // single-line description
      interaction.logData = {
        'User': `${user.tag} (${user.id})`,
        'Moderator': `${interaction.user.tag} (${interaction.user.id})`,
        'Reason': reason,
        'Duration': 'Permanent', // never empty for permanent bans
        'Timestamp': new Date().toISOString()
      };
    } catch (error) {
      console.error(error);
      await interaction.reply({ 
        embeds: [new EmbedBuilder().setDescription('❌ Failed to ban the user. Make sure I have the necessary permissions.').setColor(0xff0000)], 
        ephemeral: true 
      });
    }
  },
};