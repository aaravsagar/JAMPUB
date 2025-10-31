import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config.json' with { type: 'json' };

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure welcome messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle welcome messages on/off'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test the welcome message'))
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
            config.WELCOME_ENABLED = !config.WELCOME_ENABLED;
            return await interaction.reply({ 
                embeds: [new EmbedBuilder().setDescription(`Welcome messages ${config.WELCOME_ENABLED ? 'enabled' : 'disabled'}`)],
                ephemeral: true 
            });
        }

        if (subcommand === 'test') {
            try {
                const welcomeChannel = await interaction.guild.channels.fetch(config.WELCOME_CHANNEL_ID);
                if (!welcomeChannel || !welcomeChannel.isTextBased()) {
                    return await interaction.reply({ 
                        embeds: [new EmbedBuilder().setDescription('Welcome channel not found or not text-based')],
                        ephemeral: true 
                    });
                }

                const message = config.WELCOME_MESSAGE
                    .replace('{user}', `<@${interaction.user.id}>`)
                    .replace('{server}', interaction.guild.name)
                    .replace('{count}', interaction.guild.memberCount.toString());

                if (config.WELCOME_USE_EMBED) {
                    const embed = new EmbedBuilder()
                        .setDescription(message)
                        .setColor(config.WELCOME_EMBED_COLOR || '#00ff00')
                        .setTimestamp();

                    await welcomeChannel.send({ embeds: [embed] });
                } else {
                    await welcomeChannel.send({ content: message });
                }

                return await interaction.reply({ 
                    embeds: [new EmbedBuilder().setDescription('Test welcome message sent!')],
                    ephemeral: true 
                });

            } catch (err) {
                console.error('[WELCOME] Test failed:', err);
                return await interaction.reply({ 
                    embeds: [new EmbedBuilder().setDescription('Failed to send test welcome message')],
                    ephemeral: true 
                });
            }
        }
    }
};