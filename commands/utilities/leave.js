import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config.json' with { type: 'json' };

export default {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Configure leave messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle leave messages on/off'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test the leave message'))
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
            config.LEAVE_ENABLED = !config.LEAVE_ENABLED;
            return await interaction.reply({ 
                embeds: [new EmbedBuilder().setDescription(`Leave messages ${config.LEAVE_ENABLED ? 'enabled' : 'disabled'}`)],
                ephemeral: true 
            });
        }

        if (subcommand === 'test') {
            try {
                const leaveChannel = await interaction.guild.channels.fetch(config.LEAVE_CHANNEL_ID);
                if (!leaveChannel || !leaveChannel.isTextBased()) {
                    return await interaction.reply({ 
                        embeds: [new EmbedBuilder().setDescription('Leave channel not found or not text-based')],
                        ephemeral: true 
                    });
                }

                const message = config.LEAVE_MESSAGE
                    .replace('{user}', interaction.user.tag)
                    .replace('{server}', interaction.guild.name);

                if (config.LEAVE_USE_EMBED) {
                    const embed = new EmbedBuilder()
                        .setDescription(message)
                        .setColor(config.LEAVE_EMBED_COLOR || '#ff0000')
                        .setTimestamp();

                    await leaveChannel.send({ embeds: [embed] });
                } else {
                    await leaveChannel.send({ content: message });
                }

                return await interaction.reply({ 
                    embeds: [new EmbedBuilder().setDescription('Test leave message sent!')],
                    ephemeral: true 
                });

            } catch (err) {
                console.error('[LEAVE] Test failed:', err);
                return await interaction.reply({ 
                    embeds: [new EmbedBuilder().setDescription('Failed to send test leave message')],
                    ephemeral: true 
                });
            }
        }
    }
};